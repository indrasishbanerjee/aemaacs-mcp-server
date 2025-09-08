# Multi-stage build for AEM Read Server
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/read-server/package*.json ./packages/read-server/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/read-server ./packages/read-server
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/read-server

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aemuser -u 1001

# Copy built application
COPY --from=builder --chown=aemuser:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=aemuser:nodejs /app/packages/read-server/dist ./packages/read-server/dist
COPY --from=builder --chown=aemuser:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=aemuser:nodejs /app/packages/read-server/package.json ./packages/read-server/
COPY --from=builder --chown=aemuser:nodejs /app/node_modules ./node_modules

# Set user
USER aemuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "packages/read-server/dist/index.js"]