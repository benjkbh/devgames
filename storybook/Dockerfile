# Bibliothèque de composants et son catalogue, servis en statique. Depuis ce
# dossier :
#   docker build -t storybook .
#   docker run --rm -p 6006:8080 storybook        (http://localhost:6006)

# Étape 1 : vérification du catalogue et construction (React / Vite).
FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run verifier && npm run build

# Étape 2 : fichiers statiques derrière nginx, sans droits root.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/ /usr/share/nginx/html/
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/"]
