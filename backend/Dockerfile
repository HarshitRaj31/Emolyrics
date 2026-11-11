# ==============================================================================
# Production Dockerfile for EmoLyrics Node.js Backend API
# Lightweight Node.js 20 Alpine container with non-root security
# ==============================================================================
FROM node:20-alpine

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY . .

# Run as non-root user 'node' for container security
USER node

# Expose backend REST API port
EXPOSE 5000

# Health check probing /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the Node.js production server
CMD ["node", "server.js"]

