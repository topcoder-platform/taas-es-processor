# Use the base image with Node.js 8.11.3
FROM node:21.6.0

# Set working directory for future use
WORKDIR /taas-es-processor

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files from host computer to the container
COPY . ./

# Run the app
CMD [ "node", "src/app.js" ]
