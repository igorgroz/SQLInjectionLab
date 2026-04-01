# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package manifests + .npmrc before installing.
# .npmrc sets legacy-peer-deps=true — required because express-graphql@0.12
# (graphql peer ^15) conflicts with @apollo/server@4 (graphql peer ^16).
# Must be copied here (not after npm ci) to benefit Docker layer caching.
COPY package.json package-lock.json .npmrc ./

# Install production dependencies
RUN npm ci --omit=dev

# Add tools for troubleshooting (must run as root before switching user)
RUN apt-get update && apt-get install -y iputils-ping postgresql-client net-tools \
  && rm -rf /var/lib/apt/lists/*

# Copy the remaining project files and set ownership to the built-in node user (UID 1000)
COPY --chown=node:node . .

# Expose the port your backend runs on (5001)
EXPOSE 5001

# Switch to non-root user — node:18 image includes this user at UID 1000
USER node

# Command to start your backend
CMD ["node", "/app/index.js"]
