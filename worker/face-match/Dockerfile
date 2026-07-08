# Full Debian node image (not -slim) so @tensorflow/tfjs-node's native libtensorflow
# install has the toolchain/glibc it needs. Deploy this image to a container host.
FROM node:20-bookworm

WORKDIR /app

# Install deps first (better layer caching). tfjs-node fetches its prebuilt binary here.
COPY package.json ./
RUN npm install --omit=dev

# App + models (run `node copy-models.mjs` before building to populate ./models).
COPY index.js ./
COPY models ./models

ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.js"]
