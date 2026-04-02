# Use Node.js 20 LTS on Alpine — smaller surface area, actively supported.
# node:18 reached EOL April 2025 and carries HIGH/CRITICAL CVEs in Trivy.
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Patch Alpine base packages before installing app deps.
# Eliminates Trivy-flagged CVEs in musl, libssl, etc. that ship with the base image.
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Copy package manifests + .npmrc before installing.
# .npmrc sets legacy-peer-deps=true — required because express-graphql@0.12
# (graphql peer ^15) conflicts with @apollo/server@4 (graphql peer ^16).
# Must be copied here (not after npm ci) to benefit Docker layer caching.
COPY package.json package-lock.json .npmrc ./

# Install production dependencies
RUN npm ci --omit=dev

# Add tools for troubleshooting (must run as root before switching user).
# Alpine equivalents: iputils → iputils, postgresql-client → postgresql-client, net-tools → net-tools.
RUN apk add --no-cache iputils postgresql-client net-tools

# Copy the remaining project files and set ownership to the built-in node user (UID 1000)
COPY --chown=node:node . .

# Expose the port your backend runs on (5001)
EXPOSE 5001

# Switch to non-root user — node:20-alpine image includes this user at UID 1000
USER node

# Command to start your backend
CMD ["node", "/app/index.js"]
