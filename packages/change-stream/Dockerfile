# packages/change-stream/Dockerfile

# Stage 1: Build & Prepare (using Bun as the unified runtime)
# We'll use this single stage for both building and running
FROM oven/bun:1.2.20 AS builder_and_runtime

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

# --- Final Production Setup ---
# The previous steps have created the necessary /app/packages/change-stream/dist output.
# Bun will be used to run the compiled JavaScript.

# Expose the port your application listens on
# (Assuming your change-stream app listens on port 3000)
EXPOSE 3000

# Entrypoint for the application
# Specify the path to the compiled entry file relative to /app
# 'bun run' will execute the JavaScript directly with the Bun runtime.
# Ensure your `change-stream`'s `package.json` has a "start" script, e.g.:
# "start": "bun run dist/index.js"
CMD ["bun", "run", "--cwd", "packages/change-stream", "start"]
# Alternatively, if you want to directly run the built file without a script:
# CMD ["bun", "run", "packages/change-stream/dist/index.js"]