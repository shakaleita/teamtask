FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && npm install --omit=dev --no-audit --no-fund && apt-get purge -y --auto-remove python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY server.js ./
COPY public ./public
ENV PORT=3000 DB_FILE=/data/app.db
RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.js"]
