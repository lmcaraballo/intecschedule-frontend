FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG ACADEMIC_API_MODE=http
ENV VITE_ACADEMIC_API_MODE=${ACADEMIC_API_MODE}
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/19-check-upstream.sh /docker-entrypoint.d/19-check-upstream.sh
RUN chmod +x /docker-entrypoint.d/19-check-upstream.sh
EXPOSE 8080
