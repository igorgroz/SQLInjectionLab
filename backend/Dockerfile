# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy only package.json and package-lock.json first to leverage Docker caching
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy the remaining project files into the container
COPY . .

# Expose the port your backend runs on (5001)
EXPOSE 5001

# Add tools for troubleshooting
RUN apt-get update && apt-get install -y iputils-ping postgresql-client net-tools

# Command to start your backend
CMD ["node", "/app/index.js"] 
