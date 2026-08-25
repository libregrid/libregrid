FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY packages ./packages
RUN npm ci
RUN npx nx build ai-protocol && npx nx build ai-gateway

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
COPY --from=build /app/packages/ai-gateway/dist/server.js ./server.js
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
