FROM node:20-alpine AS ui
WORKDIR /ui
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend .
RUN npx ng build --configuration production

FROM eclipse-temurin:17-jdk AS api
WORKDIR /src
COPY backend .
COPY --from=ui /ui/dist/frontend/browser src/main/resources/static
RUN chmod +x mvnw && ./mvnw -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=api /src/target/quran-api-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["java","-jar","app.jar"]
