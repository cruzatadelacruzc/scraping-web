FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20 AS production
WORKDIR /app
# Copy only production dependencies from the build stage
COPY package*.json ./
RUN npm ci --omit=dev
# Copy compiled output folder from  build stage 
COPY --from=build /app/dist/main ./dist/main
EXPOSE 80

CMD ["npm", "start"]
