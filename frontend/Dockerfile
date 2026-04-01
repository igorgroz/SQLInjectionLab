# Stage 1: Build the React app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve static files with nginx
# nginx-unprivileged runs as UID 101 (nginx user) — no root required.
# Pre-configured with writable pid/cache dirs; listens on 8080 (non-privileged port).
# k8s service maps external port 80 → targetPort 8080 so the ingress is unchanged.
FROM nginxinc/nginx-unprivileged:alpine

# Copy built React app from Stage 1
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
