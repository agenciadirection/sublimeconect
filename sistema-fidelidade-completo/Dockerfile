# Sistema de Fidelidade - Railway Deployment
FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm@10.15.1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "run", "start"]