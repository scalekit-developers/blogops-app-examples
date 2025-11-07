#!/bin/sh
# Load .env and run the built Spring Boot JAR with secrets as JVM args (production style)
# Graceful shutdown: rely on Spring Boot handling SIGINT/SIGTERM directly by replacing the shell with the Java process (exec).

set -e
set -a
. ./.env
set +a

JAR="target/passwordless-auth-1.0.0.jar"

# Build if jar is missing or sources are newer than the jar
needs_build=false
if [ ! -f "$JAR" ]; then
  needs_build=true
else
  if find src -type f -newer "$JAR" | read _; then
    needs_build=true
  fi
  if [ "pom.xml" -nt "$JAR" ]; then
    needs_build=true
  fi
fi

if [ "$needs_build" = true ]; then
  echo "Building application (changes detected)..."
  mvn -q -DskipTests package || exit 1
fi

# JVM and Spring Boot options
JAVA_FLAGS="--enable-native-access=ALL-UNNAMED"
JAVA_SYSPROPS="\
  -Dserver.shutdown=graceful \
  -Dspring.lifecycle.timeout-per-shutdown-phase=30s \
  -Dscalekit.client_id=$SCALEKIT_CLIENT_ID \
  -Dscalekit.client_secret=$SCALEKIT_CLIENT_SECRET \
  -Dscalekit.environment_url=$SCALEKIT_ENVIRONMENT_URL"

# Replace the shell with the Java process so Ctrl+C (SIGINT) and SIGTERM go straight to Spring Boot
exec java $JAVA_FLAGS $JAVA_SYSPROPS -jar "$JAR" "$@"
