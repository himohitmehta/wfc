# One container: FastAPI serves the API and the built React app on port 8000.
# Build: docker build -t wind-forecast .    Run: docker run --rm -p 8000:8000 wind-forecast

# 1) Build the React app
FROM node:24-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) Python backend, installed with uv from the lockfile
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.12.17 /uv /bin/uv
WORKDIR /app
# Dependencies first, so code changes don't reinstall them
COPY backend/pyproject.toml backend/uv.lock backend/README.md ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/src ./src
COPY backend/data ./data
RUN uv sync --frozen --no-dev
COPY --from=web /web/dist ./static

ENV FRONTEND_DIST=/app/static
EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000"]
