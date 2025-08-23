# packages/change-stream/Dockerfile

# Stage 1: Build & Prepare (using Bun as the unified runtime)
# We'll use this single stage for both building and running
FROM oven/bun:1.2.20 AS builder

# Set working directory inside the container to the monorepo root (conceptually)
WORKDIR /app

# --- Bun Dependency Installation ---
# Copy the essential monorepo files first for caching
COPY ../../package.json ./package.json
COPY ../../bun.lock ./bun.lock
COPY ../../tsconfig.json ./tsconfig.json

# Copy all package.json files from the 'packages' directory
# This ensures Bun correctly identifies and links all workspace packages
RUN mkdir -p packages
COPY ../../packages/*/package.json ./packages/

# Install all dependencies for the monorepo using Bun
# This will install both dev and prod dependencies. For a production image,
# Bun's default behavior is often acceptable as it's very efficient.
# If you absolutely need to prune for size, Bun has `bun install --production`
# or `bun install --frozen-lockfile --production` but often not strictly needed here.
RUN bun install

# Copy all source code (this ensures all workspace sources are available for bundling)
# This includes packages/core and packages/change-stream
COPY ../../packages ./packages

# --- Build the 'change-stream' package ---
# Run bun build from the /app (monorepo root) context.
# The 'build' script in packages/change-stream/package.json is:
# "bun build ./src/index.ts --outdir dist --target node"
# `bun run --cwd` will execute this from the change-stream package's perspective.
RUN bun install --cwd packages/change-stream
RUN bun run --cwd packages/change-stream build

FROM node:22-slim AS runtime

WORKDIR /app

# Copy only built output + package.json
COPY --from=builder /app/packages/change-stream/package.json ./package.json
COPY --from=builder /app/packages/change-stream/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]