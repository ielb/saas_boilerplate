# Base stage for shared dependencies
FROM node:alpine AS base

WORKDIR /app

# Enable corepack for Yarn 4
RUN corepack enable

# Install dependencies only when needed
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN yarn install --immutable

# Development stage
FROM base AS development

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["yarn", "workspace", "@app/web", "dev"]

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build the application
RUN yarn workspace @app/web build

# Production stage
FROM node:alpine AS production

WORKDIR /app

# Enable corepack for Yarn 4
RUN corepack enable

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install production dependencies only
RUN yarn install --immutable --production

# Copy built application
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=build --chown=nextjs:nodejs /app/packages/ui/dist ./packages/ui/dist
COPY --from=build --chown=nextjs:nodejs /app/packages/shared/dist ./packages/shared/dist

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start production server
CMD ["yarn", "workspace", "@app/web", "start"] 