FROM node:10-alpine

WORKDIR /histograph

COPY ./package.json .
COPY ./package-lock.json .
RUN npm install --production

COPY . .

