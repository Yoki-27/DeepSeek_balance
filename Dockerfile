FROM python:3.12-slim

# System deps — curl for the API client
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy entire project, preserving directory structure
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Run from backend directory so relative paths resolve correctly
WORKDIR /app/backend

# Cloud platforms inject PORT env var
ENV PORT=5000

EXPOSE 5000

# Gunicorn production server (shell form so ${PORT} expands)
CMD gunicorn --bind "0.0.0.0:${PORT:-5000}" --workers 2 --timeout 30 app:app
