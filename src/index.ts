#!/usr/bin/env node
/**
 * Memeboat MCP server — search meme templates and create memes on
 * https://memebo.at from any MCP-capable AI assistant.
 *
 * Tools:
 * - search_meme_templates: find templates by name/tags
 * - get_meme_template:     full details for one template (by urlName slug)
 * - create_meme:           caption a template; returns page + image URLs
 *
 * The server is a thin client over Memeboat's public JSON API. It is
 * anonymous and needs no API key; creation is rate-limited per IP by the
 * server. Set MEMEBOAT_API_URL to point at a different instance (dev).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = (process.env.MEMEBOAT_API_URL || 'https://memebo.at').replace(/\/+$/, '');
const USER_AGENT = 'memeboat-mcp/0.3.0 (+https://github.com/memebo-at/memeboat-mcp)';

/**
 * Fonts the server accepts for the `font` params (validated server-side; listed
 * here only for the tool descriptions). Keep in sync with the API's FONT_IDS.
 */
const FONT_IDS = [
  'impact', 'arial', 'helvetica', 'times', 'courier',
  'titillium', 'thick', 'kalam', 'comic', 'notosans', 'notosanshebrew',
];

/**
 * A create_meme caption: a plain string, or an object opting into per-caption
 * styling. Colors are a hex value (#rgb/#rrggbb) or one of
 * white/black/red/yellow/blue/green; the server validates and rejects others.
 */
const captionInput = z.union([
  z.string().max(200),
  z.object({
    text: z.string().max(200),
    color: z.string().optional().describe('Fill color: hex (#rgb/#rrggbb) or white/black/red/yellow/blue/green'),
    outline: z.string().optional().describe('Outline color; omit for an auto-picked readable outline'),
    font: z.string().optional().describe(`Font for this caption, one of: ${FONT_IDS.join(', ')}`),
  }),
]);

interface RawTemplate {
  id: number;
  urlName: string;
  name: string;
  tags?: string[];
  imgFull?: string;
  img?: string;
  width?: number;
  height?: number;
  fileType?: string;
  popularity?: number;
  defaultItems?: unknown[];
  styles?: Record<string, { img: string; width: number; height: number }> | null;
}

/** Trims an API template row down to what an assistant actually needs. */
function toToolTemplate(t: RawTemplate) {
  const styleNames = t.styles ? Object.keys(t.styles) : [];
  return {
    name: t.name,
    slug: t.urlName,
    imageUrl: t.imgFull || t.img || null,
    width: t.width ?? null,
    height: t.height ?? null,
    // Curated caption boxes when > 0 — a good default for texts[] length.
    suggestedCaptionCount: Array.isArray(t.defaultItems) && t.defaultItems.length > 0
      ? t.defaultItems.length
      : 2,
    pageUrl: `${BASE_URL}/templates/${t.urlName}`,
    tags: (t.tags || []).slice(0, 10),
    // Alternate background styles (Epic 6.7): pass one as create_meme's `style`.
    ...(styleNames.length ? { availableStyles: styleNames } : {}),
  };
}

async function apiFetch(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message || `HTTP ${response.status}`;
    const retryAfter = response.headers.get('retry-after');
    throw new Error(
      response.status === 429 && retryAfter
        ? `${message} (retry after ${retryAfter}s)`
        : message
    );
  }
  return body;
}

/** Wraps a JSON payload as an MCP text result. */
function jsonResult(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  };
}

const server = new McpServer({
  name: 'memeboat',
  version: '0.3.0',
});

server.registerTool(
  'search_meme_templates',
  {
    title: 'Search meme templates',
    description:
      'Search memebo.at\'s catalog of 25,000+ meme templates by name or topic ' +
      '(e.g. "drake", "distracted boyfriend", "cat"). Returns matching templates ' +
      'with their slug (use it with create_meme), image URL and a suggested caption count.',
    inputSchema: {
      query: z.string().min(1).max(100).describe('Search terms, e.g. "surprised pikachu"'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results (default 10)'),
    },
  },
  async ({ query, limit }) => {
    try {
      const data = await apiFetch(
        `/api/templates?search=${encodeURIComponent(query)}&limit=${limit ?? 10}&page=1`
      );
      const templates = (data.templates || []).map(toToolTemplate);
      return jsonResult({
        totalMatches: data.pagination?.totalItems ?? templates.length,
        templates,
      });
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  'get_meme_template',
  {
    title: 'Get meme template details',
    description:
      'Fetch one meme template by its slug (from search_meme_templates or a ' +
      'memebo.at/templates/<slug> URL): dimensions, image URL and suggested caption count.',
    inputSchema: {
      slug: z.string().min(1).max(200).describe('Template slug, e.g. "x-x-everywhere"'),
    },
  },
  async ({ slug }) => {
    try {
      const template = await apiFetch(`/api/templates/${encodeURIComponent(slug)}`);
      return jsonResult(toToolTemplate(template));
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  'create_meme',
  {
    title: 'Create a meme',
    description:
      'Create a real, shareable meme on memebo.at by captioning a template. ' +
      'texts are placed top-to-bottom: 1 caption = bottom text, 2 captions = ' +
      'classic top/bottom, N captions fill the template\'s boxes in order ' +
      '(match suggestedCaptionCount when possible). Captions can be plain ' +
      'strings or objects with per-caption color/outline/font; optional global ' +
      'font and layout ("top" = captions in a white bar above the image). ' +
      'Returns the meme page URL and a direct image URL. Rate-limited per IP — ' +
      'space out repeated calls.',
    inputSchema: {
      template: z.string().min(1).max(200).describe('Template slug, e.g. "x-x-everywhere"'),
      texts: z
        .array(captionInput)
        .min(1)
        .max(10)
        .describe(
          'Captions, top-to-bottom. Each is a string or { text, color?, outline?, font? }. ' +
          'At least one must be non-empty.'
        ),
      font: z.string().optional().describe(`Default font for all captions, one of: ${FONT_IDS.join(', ')}`),
      layout: z
        .enum(['default', 'top'])
        .optional()
        .describe('layout:"top" puts captions in a white bar above the image; "default" overlays them on the image'),
      style: z
        .string()
        .optional()
        .describe('Alternate background style name from get_meme_template\'s availableStyles, e.g. "maga"'),
    },
  },
  async ({ template, texts, font, layout, style }) => {
    try {
      const data = await apiFetch('/api/memes/create', {
        method: 'POST',
        body: JSON.stringify({ template, texts, font, layout, style }),
      });
      return jsonResult(data.data);
    } catch (error) {
      return errorResult(error);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`memeboat-mcp ready (API: ${BASE_URL})`);
}

main().catch((error) => {
  console.error('memeboat-mcp failed to start:', error);
  process.exit(1);
});
