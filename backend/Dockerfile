# ── Estágio 1: build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

# Copia os arquivos de build primeiro (cache de dependências)
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# Dá permissão de execução ao wrapper
RUN chmod +x gradlew

# Baixa dependências sem compilar (cache layer)
RUN ./gradlew dependencies --no-daemon 2>/dev/null || true

# Copia o código fonte e compila
COPY src src
RUN ./gradlew bootJar --no-daemon -x test

# ── Estágio 2: runtime ────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copia apenas o JAR gerado no estágio de build
COPY --from=build /app/build/libs/*.jar app.jar

# Porta padrão do Spring Boot
EXPOSE 8080

# Sobrescreve a porta para 8080 (Render usa 8080 por padrão)
ENTRYPOINT ["java", "-jar", "-Dserver.port=8080", "app.jar"]
