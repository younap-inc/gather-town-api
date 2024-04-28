# syntax=docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=16.10.0
FROM node:${NODE_VERSION}-slim as base

# Set labels for metadata
LABEL maintainer="Your Name <shimoda.masaya@younap.jp>"
LABEL description="Node.js application for Cloud Run"

# Set work directory
WORKDIR /app

# Set the timezone
ENV TZ=Asia/Tokyo

# Prepare the base image with necessary tools
RUN apt-get update && apt-get install -y \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update && apt-get install -y \
    pkg-config \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install node modules
COPY --link package.json yarn.lock ./
RUN yarn install --production=false

# Copy application code
COPY --link . .

# Build application
RUN yarn run build

# Remove development dependencies
RUN yarn install --production=true \
    && yarn cache clean

# Final stage for app image
FROM base

# Copy built application from the build stage
COPY --from=build /app /app

# Set production environment
ENV NODE_ENV=production

# Start the server by default, this can be overwritten at runtime
CMD ["yarn", "run", "start"]
