# Use a small official Node.js image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# App listens on this port
EXPOSE 3000

# Run as the non-root user that ships with the node image
USER node

# Start the app
CMD ["node", "server.js"]
