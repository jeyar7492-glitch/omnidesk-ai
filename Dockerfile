# ==============================================================================
# OmniDesk AI — Production Multi-Stage Dockerfile
# ==============================================================================

# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/validation/package*.json ./packages/validation/
COPY packages/config/package*.json ./packages/config/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install all dependencies
RUN npm ci

# Copy full source tree
COPY . .

# Generate Prisma Client
RUN cd apps/api && npx prisma generate

# Build shared packages and frontend/backend bundles
RUN npm run build

# Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Install runtime dependencies for Prisma and native modules
RUN apk add --no-cache openssl

# Copy package manifests for production install
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/validation/package*.json ./packages/validation/
COPY packages/config/package*.json ./packages/config/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install production dependencies
RUN npm ci --omit=dev

# Copy generated Prisma engine and schema
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/apps/api/node_modules/@prisma ./apps/api/node_modules/@prisma
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy built code
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Expose web service port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-4000}/api/v1/health || exit 1

# Start the fullstack Express & WebSocket API gateway (which also serves the web SPA)
CMD ["node", "apps/api/dist/server.js"]
