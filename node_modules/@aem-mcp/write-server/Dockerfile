# Multi-stage build for AEM Write Server
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/write-server/package*.json ./packages/write-server/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/write-server ./packages/write-server
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/write-server

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aemuser -u 1001

# Copy built application
COPY --from=builder --chown=aemuser:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=aemuser:nodejs /app/packages/write-server/dist ./packages/write-server/dist
COPY --from=builder --chown=aemuser:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=aemuser:nodejs /app/packages/write-server/package.json ./packages/write-server/
COPY --from=builder --chown=aemuser:nodejs /app/node_modules ./node_modules

# Set user
USER aemuser

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "packages/write-server/dist/index.js"]