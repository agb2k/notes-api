# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for TypeScript build)
RUN npm ci && npm cache clean --force

# Copy source files
COPY tsconfig.json ./
COPY tsoa.json ./
COPY .sequelizerc ./
# Copy src directory structure (recursive copy handles all subdirectories)
COPY src ./src
COPY config ./config
COPY migrations ./migrations
COPY scripts ./scripts

# Build TypeScript
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies (though we'll copy node_modules from builder anyway)
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# Copy source files for Swagger documentation (JSDoc comments are in .ts files)
COPY --from=builder /app/src/routes ./src/routes
COPY --from=builder /app/src/controllers ./src/controllers
# Copy .sequelizerc directly (same file in both stages)
COPY .sequelizerc ./

# Copy entrypoint script (before switching user)
COPY docker-entrypoint.sh /usr/local/bin/
# Fix line endings (CRLF to LF) and set executable permissions
RUN tr -d '\r' < /usr/local/bin/docker-entrypoint.sh > /usr/local/bin/docker-entrypoint.sh.tmp && \
    mv /usr/local/bin/docker-entrypoint.sh.tmp /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create uploads directory
RUN mkdir -p /app/uploads

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start application
CMD ["node", "dist/server.js"]
