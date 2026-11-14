# Sivatagi GTA – többjátékos szerver a Google Cloud Runon (ADR-0046). Függőség nélkül: csak a Node és a három fájl.
FROM node:22-slim
WORKDIR /app
COPY server.js index.html game.js ./
ENV NODE_ENV=production
# a Cloud Run a PORT változóban adja meg, hol figyeljen a szerver (alapból 8080)
CMD ["node", "server.js"]
