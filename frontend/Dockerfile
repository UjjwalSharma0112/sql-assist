# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency definition files
COPY package*.json ./

# Install all dependencies (dev and production)
RUN npm ci

# Copy the application source code and configs
COPY . .

# Pass build-time environment variable for Next.js build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Set up a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy runtime config files and output from builder
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

# Apply user permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["npm", "run", "start"]
