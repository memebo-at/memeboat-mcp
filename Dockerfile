# Builds and runs the memeboat-mcp stdio server.
# Used by MCP hosts/inspectors (e.g. Glama) that verify the server starts
# and responds to introspection. No env vars required.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY src ./src

RUN npm ci && npm run build && npm prune --omit=dev

CMD ["node", "dist/index.js"]
