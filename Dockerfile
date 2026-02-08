# Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Accept build-time API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app

# Install serve
RUN npm install -g serve@14

# Copy built assets from build stage
COPY --from=build /app/dist ./dist

# Railway injects PORT automatically
ENV PORT=3000
EXPOSE 3000

# serve -s = SPA mode, -p = port
CMD ["sh", "-c", "serve -s dist -p $PORT"]
