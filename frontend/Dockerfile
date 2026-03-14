# ---- Build stage ----
FROM node:18-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production stage ----
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback: send all non-file requests to index.html
RUN printf 'server {\n\
  listen 3000;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / { try_files $uri $uri/ /index.html; }\n\
  location /auth/ { proxy_pass http://backend:5000; }\n\
  location /api/ { proxy_pass http://backend:5000; }\n\
  location /health { proxy_pass http://backend:5000; }\n\
  # Security headers\n\
  add_header X-Content-Type-Options nosniff;\n\
  add_header X-Frame-Options DENY;\n\
  add_header X-XSS-Protection "1; mode=block";\n\
  # Cache static assets\n\
  location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\n\
    expires 1y;\n\
    add_header Cache-Control "public, immutable";\n\
  }\n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/ || exit 1
CMD ["nginx", "-g", "daemon off;"]