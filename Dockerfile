# Production Dockerfile for ruleta-web (Dokploy)
# Multi-stage build: builder (Node) -> production (nginx)

# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --production=false

# Copy sources
COPY . .

# Allow passing VITE_* build args so Vite picks them up at build time
ARG VITE_API_URL
ARG VITE_REVERB_SCHEME
ARG VITE_REVERB_HOST
ARG VITE_REVERB_PORT
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_REVERB_SCHEME=${VITE_REVERB_SCHEME}
ENV VITE_REVERB_HOST=${VITE_REVERB_HOST}
ENV VITE_REVERB_PORT=${VITE_REVERB_PORT}
ENV NODE_ENV=production

# Build the app
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production

# Remove default content and copy build output
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA (should exist in repo as .docker/nginx.frontend.conf)
COPY .docker/nginx.frontend.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
