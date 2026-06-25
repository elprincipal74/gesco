# Stage 1: Build the React frontend
FROM node:20 AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN npm install --prefix frontend
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# Stage 2: Production runner for Express server
FROM node:20
WORKDIR /app

# Copy backend package configuration
COPY package*.json ./

# Install only production dependencies for the Express backend
RUN npm install --omit=dev

# Copy Express server source code
COPY src/ ./src/

# Copy the built React assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy seed files for database initialization
COPY database.json.bak ./database.json.bak
COPY database.json ./database.json

# Configure production environment
ENV PORT=5000
ENV NODE_ENV=production
ENV DB_PATH=/app/data/database.db
ENV LEGACY_DB_PATH=/app/database.json
ENV BACKUP_DB_PATH=/app/database.json.bak

# Create persistent data directory for SQLite volume mount
RUN mkdir -p /app/data

EXPOSE 5000

# Start server
CMD ["node", "src/server.js"]
