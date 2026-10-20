# Étape 1 : construction de l'interface (React / Vite).
FROM node:22-alpine AS front
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Étape 2 : le service. Bibliothèque standard Python seule : rien à installer.
FROM python:3.12-slim
WORKDIR /app
COPY backend/ ./backend/
COPY --from=front /build/frontend/dist/ ./frontend/dist/
RUN mkdir -p /data

# Référence des variables : `backend/config.py`.
ENV DB_PATH=/data/app.db \
    LISTEN_PORT=8080 \
    SESSION_TTL=3600 \
    TRUST_PROXY=0 \
    COOKIE_SECURE=0 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Volume monté sur /data pour conserver la base entre deux exécutions.
VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["python", "-c", "import os,urllib.request; \
urllib.request.urlopen('http://127.0.0.1:%s/api/sante' \
% os.environ['LISTEN_PORT'], timeout=4).read()"]

CMD ["python", "-m", "backend"]
