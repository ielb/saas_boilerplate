# Use Node.js Alpine image
FROM node:alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install dependencies using npm
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the application using npm
CMD ["npm", "run", "start:dev", "--prefix", "apps/api"] 