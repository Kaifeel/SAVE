FROM eclipse-temurin:17-jdk@sha256:36d9a76dc231587873b103c68a789b85d91b41d314dda69730d6bc43a777f2a9 AS builder
WORKDIR /app
COPY gradlew build.gradle settings.gradle gradle.properties ./
COPY gradle ./gradle
RUN chmod +x gradlew
COPY src ./src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:17-jre@sha256:c6f2875c05ea10f16398bdc5f73405c384991506f2f1ead8bcc6582ae8adea79
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
