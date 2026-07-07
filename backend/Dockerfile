# Use the official Astral UV image with Python 3.13
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# Set environment variables
ENV UV_PROJECT_ENVIRONMENT=/app/.venv \
    UV_COMPILE_BYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Copy configuration and lock files
COPY pyproject.toml uv.lock ./

# Install project dependencies. Since we mount the cache, it speeds up successive builds.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Copy the rest of the application
COPY . .

# Install the project itself (registers app modules if needed)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Expose the API port
EXPOSE 8000

# Run the FastAPI server via uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
