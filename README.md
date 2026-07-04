# Memeboat MCP

MCP server for [Memeboat](https://memebo.at) — search **25,000+ meme templates** and create real, shareable memes straight from your AI assistant. Free, anonymous, no API key.

Ask your assistant things like:

> "Make a Buzz Lightyear *everywhere* meme about code reviews"

…and it will search the catalog, caption the template, and hand you back a live meme URL:

```
https://memebo.at/meme/x-x-everywhere-code-reviews-code-reviews-everywhere-ab12cd
```

## Install

Requires Node.js 18+.

### Claude Code

```bash
claude mcp add memeboat -- npx -y memeboat-mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memeboat": {
      "command": "npx",
      "args": ["-y", "memeboat-mcp"]
    }
  }
}
```

### Cursor / other MCP clients

Any client that speaks stdio MCP works the same way: run `npx -y memeboat-mcp`.

## Tools

| Tool | What it does |
|---|---|
| `search_meme_templates` | Search templates by name or topic (`query`, optional `limit`). Returns slugs, image URLs and a `suggestedCaptionCount` per template. |
| `get_meme_template` | Details for one template by slug: dimensions, image URL, caption count. |
| `create_meme` | Caption a template (`template` slug + `texts[]`, top-to-bottom) and get back the meme's page URL and direct image URL. |

Caption placement: 1 text = bottom caption, 2 texts = classic top/bottom, more texts fill the template's own caption boxes in order — matching `suggestedCaptionCount` gives the best results.

## How it works

This package is a thin stdio client over Memeboat's public JSON API (`https://memebo.at/api/...`). Created memes are rendered server-side by Memeboat and hosted there — the image URL is immediately shareable. Creation is rate-limited per IP; be a good citizen.

Point the server at another instance with `MEMEBOAT_API_URL` (useful for development).

## About Memeboat

[Memeboat](https://memebo.at) is a free, anonymous meme generator — no sign-up, no login walls. Browse the full catalog at [memebo.at/templates](https://memebo.at/templates).

## License

[MIT](./LICENSE)
