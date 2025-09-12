 # Start from the official Golang image
FROM golang:1.21.5-alpine3.20 AS builder
WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
	--mount=type=cache,target=/root/.cache/go-build \
	go mod tidy && go build -trimpath -ldflags="-s -w" -o /app/app main.go

# Use a minimal image for running
FROM alpine:3.20
WORKDIR /app
RUN apk update && apk upgrade && addgroup -S app && adduser -S app -G app
COPY --from=builder /app/app ./app
COPY --from=builder /app/swagger.json ./swagger.json
COPY --from=builder /app/swagger-ui.html ./swagger-ui.html
# .env is optional; if present, copy it during build stage
COPY --from=builder /app/.env ./.env
USER app:app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/whoami || exit 1
CMD ["./app"]
