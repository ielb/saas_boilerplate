# Base stage for shared dependencies
FROM node:alpine AS base

WORKDIR /app

# Enable corepack for Yarn 4
RUN corepack enable

# Install dependencies only when needed
COPY package.json yarn.lock ./
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN yarn install --immutable

# Development stage
FROM base AS development

# Copy source code
COPY . .

# Expose ports for Expo
EXPOSE 19000 19001 19002

# Start Expo development server
CMD ["yarn", "workspace", "@app/mobile", "start"] 