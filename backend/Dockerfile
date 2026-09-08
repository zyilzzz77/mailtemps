FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/mailtemps-api ./cmd/api \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/mailtemps-smtp ./cmd/smtp \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/mailtemps-worker ./cmd/worker

FROM alpine:3.22 AS runtime
RUN addgroup -S mailtemps && adduser -S -G mailtemps mailtemps
WORKDIR /app
COPY --from=build /out/mailtemps-* /app/
USER mailtemps
EXPOSE 8081 2525
ENTRYPOINT []
CMD ["/app/mailtemps-api"]
