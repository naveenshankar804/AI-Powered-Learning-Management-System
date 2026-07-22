FROM node:20-alpine

WORKDIR /app

# Copy root and workspace package files for install
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install all workspace dependencies from root
RUN npm install

# Copy backend source
COPY backend/ ./backend/

WORKDIR /app/backend

CMD ["npm", "start"]
