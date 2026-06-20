FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/investment-platform-0.1.0.jar app.jar
EXPOSE 10000
ENTRYPOINT ["sh", "-c", "export SPRING_DATASOURCE_URL=\"jdbc:postgresql://$(printf '%s' \"$SPRING_DATASOURCE_URL\" | sed -E 's|^[^:]+://[^@]+@||')\"; exec java -jar app.jar"]

