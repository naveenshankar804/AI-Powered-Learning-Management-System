FROM node:20-alpine

WORKDIR /app

# Copy root and workspace package files for install
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# Install all workspace dependencies from root
RUN npm install

# Copy frontend source
COPY frontend/ ./frontend/

WORKDIR /app/frontend

# Bind to all interfaces for Docker
CMD ["npm", "run", "dev", "--", "--host"]
