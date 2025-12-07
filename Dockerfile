FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only, but we need tsx which is in dependencies)
RUN npm ci --omit=dev

# Copy tsconfig.json (needed for some potential path resolutions)
COPY tsconfig.json ./

# Copy backend source code
COPY server ./server

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Create a volumen for persistence
VOLUME ["/app/data"]

# Set environment variables
ENV NODE_ENV=production
ENV SERVER_PORT=3001
ENV FREEBOX_TOKEN_FILE=/app/data/.freebox_token

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "run", "start"]
