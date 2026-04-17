# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libpangocairo-1.0-0 \
    libcairo2 \
    libffi-dev \
    libpq-dev \
    curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN pip install --upgrade pip hatchling

FROM base AS deps
COPY pyproject.toml ./
COPY src ./src
RUN pip install -e ".[dev]"

FROM deps AS dev
COPY . .
EXPOSE 8000
CMD ["uvicorn", "netwatt.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
