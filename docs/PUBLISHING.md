# Publishing checklist

One-time setup and the submission round for each release. Steps marked 👤 need
the owner's accounts; everything else is scriptable.

## Release (every version)

1. Bump `version` in `package.json` AND `server.json` (both places).
2. `npm run build` — sanity check the compile.
3. 👤 `npm publish` (needs `npm login` once; the package is public, no scope).
4. Tag: `git tag v0.x.y && git push --tags`.

## MCP Registry (once per version)

The official registry at `registry.modelcontextprotocol.io` — several
directories crawl it automatically (Glama, PulseMCP, …).

1. Install the publisher CLI: `brew install mcp-publisher` (or download from
   https://github.com/modelcontextprotocol/registry/releases).
2. 👤 `mcp-publisher login github` — authenticates the `io.github.memebo-at/*`
   namespace via the GitHub org.
3. `mcp-publisher publish` — validates and submits `server.json`.

Note: the npm package must already be published (the registry verifies it),
and `server.json`'s schema evolves — if publish fails validation, re-check
against the current schema URL in the file.

## Directories (one-time, ~1 hour total)

- 👤 **Smithery** (https://smithery.ai) — sign in with GitHub → Add server.
- 👤 **mcp.so** — submit form / GitHub issue on their repo.
- **Glama / PulseMCP** — auto-index GitHub + the registry; just claim the
  listing if ownership matters.
- 👤 **awesome-mcp-servers** (https://github.com/punkpeye/awesome-mcp-servers)
  — PR adding one line under the appropriate category (Art & Culture or
  Image/Media). Follow their alphabetical ordering + format.
- 👤 **Anthropic connectors directory** — submission form, reviewed manually.

## Launch echo (optional, owner's call)

- Product Hunt: launch as "Memeboat API + MCP" (dev tool angle), not the meme
  site itself. PH links are nofollow; the value is newsletter/roundup echo.
- r/mcp, r/ClaudeAI, MCP Discord #showcase — a demo GIF of an assistant
  making a meme does the selling.
