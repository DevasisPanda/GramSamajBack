FROM node:20-alpine

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests and patches
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install dependencies
RUN pnpm install

# Copy application source
COPY . .

# Set Node memory limit for Docker build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build application
RUN pnpm build

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["pnpm", "start"]
