# ===========================================
# FreeboxOS Ultra Dashboard - Docker Build
# Multi-stage build for production deployment
# ===========================================

# Stage 1: Build frontend AND bundle backend (native platform for speed)
# The server is pre-compiled to plain JavaScript via esbuild so the
# production image does NOT need tsx/esbuild at runtime. This fixes the
# multi-arch "You installed esbuild for another platform" crash on ARM64
# hosts (Freebox Ultra VM, Raspberry Pi, Apple Silicon) that hit issue #69
# after #63.
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# VITE_* vars are embedded at build time — must be ARG before npm run build
ARG VITE_LOGO_DEV_TOKEN
ENV VITE_LOGO_DEV_TOKEN=$VITE_LOGO_DEV_TOKEN

# Build frontend (Vite -> dist/) AND bundle backend (esbuild -> dist-server/index.js)
RUN npm run build

# Stage 2: Install production dependencies on native platform
# (QEMU crashes running npm under arm64 emulation — --ignore-scripts keeps
# node_modules pure-JS so it's safe to copy across architectures)
FROM --platform=$BUILDPLATFORM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Stage 3: Production image (target platform)
# Runs plain Node on a pre-bundled JS entrypoint — no TypeScript, no tsx,
# no native esbuild binary required at runtime.
FROM node:20-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S freebox -u 1001 -G nodejs

WORKDIR /app

# Create data directory for persistent token storage
RUN mkdir -p /app/data && chown -R freebox:nodejs /app/data

# Copy package files and pre-installed production node_modules from deps stage
COPY --chown=freebox:nodejs package*.json ./
COPY --chown=freebox:nodejs --from=deps /app/node_modules ./node_modules

# Copy built frontend and pre-bundled backend from builder
COPY --chown=freebox:nodejs --from=builder /app/dist ./dist
COPY --chown=freebox:nodejs --from=builder /app/dist-server ./dist-server

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV FREEBOX_TOKEN_FILE=/app/data/freebox_token.json
ENV FREEBOX_HOST=mafreebox.freebox.fr

# Health check (use 127.0.0.1 instead of localhost to avoid IPv6 issues in Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

# Switch to non-root user
USER freebox

# Expose port
EXPOSE 3000

# Run the pre-bundled server directly with Node (no tsx, no runtime transpile)
CMD ["node", "dist-server/index.js"]
