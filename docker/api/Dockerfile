# Base stage for shared dependencies
FROM node:alpine AS base

WORKDIR /app

# Enable corepack for Yarn 4
RUN corepack enable

# Install dependencies only when needed
COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN yarn install --immutable

# Development stage
FROM base AS development

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start development server
CMD ["yarn", "workspace", "@app/api", "dev"]

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build the application
RUN yarn workspace @app/api build

# Production stage
FROM node:alpine AS production

WORKDIR /app

# Enable corepack for Yarn 4
RUN corepack enable

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy package files
COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install production dependencies only
RUN yarn install --immutable --production

# Copy built application
COPY --from=build --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=nestjs:nodejs /app/packages/config/dist ./packages/config/dist

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Start production server
CMD ["yarn", "workspace", "@app/api", "start:prod"] 