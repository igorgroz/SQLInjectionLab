# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy only package.json and package-lock.json first to leverage Docker caching
COPY package*.json ./

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
