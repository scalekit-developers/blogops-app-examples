#!/usr/bin/env bash
# Build and run the GraalVM native image, passing secrets via -D system properties.
# Mirrors run-with-env.sh behavior but targets the native binary for fast startup.

set -euo pipefail

if [[ -f ./.env ]]; then
  # Load environment variables from .env
  set -a
  source ./.env
  set +a
else
  echo ".env file not found. Please create one with SCALEKIT_* variables."
  exit 1
fi

# Ensure required variables exist
required=(SCALEKIT_CLIENT_ID SCALEKIT_CLIENT_SECRET SCALEKIT_ENVIRONMENT_URL)
for v in "${required[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "Missing required env var: $v"
    exit 1
  fi
done

# Ensure GraalVM native-image is available
if ! command -v native-image >/dev/null 2>&1; then
  cat <<'EOF'
ERROR: GraalVM native-image was not found on PATH.

Quick install (Linux/macOS):
  curl -s "https://get.sdkman.io" | bash
  source "$HOME/.sdkman/bin/sdkman-init.sh"
  sdk install java 21.0.5-graal
  sdk use java 21.0.5-graal
  gu install native-image
  export GRAALVM_HOME="$JAVA_HOME"

Alternatively, set GRAALVM_HOME to your GraalVM install and ensure native-image is on PATH.
EOF
  exit 1
fi

# Warn if GRAALVM_HOME is not set (the Maven plugin may require it)
if [[ -z "${GRAALVM_HOME:-}" ]]; then
  echo "WARNING: GRAALVM_HOME is not set. Set it to your GraalVM installation (e.g., export GRAALVM_HOME=\"$JAVA_HOME\")." >&2
fi

# Build native image if missing
BIN="target/passwordless-auth"
if [[ ! -x "$BIN" ]]; then
  echo "Native binary not found. Building with: mvn -Pnative -DskipTests native:compile"
  mvn -Pnative -DskipTests native:compile
fi

# Pass the same system properties to the native binary
SYSPROPS=(
  -Dserver.shutdown=graceful
  -Dspring.lifecycle.timeout-per-shutdown-phase=30s
  -Dscalekit.client_id="${SCALEKIT_CLIENT_ID}"
  -Dscalekit.client_secret="${SCALEKIT_CLIENT_SECRET}"
  -Dscalekit.environment_url="${SCALEKIT_ENVIRONMENT_URL}"
)

# Allow overriding the magic link callback via env if desired
if [[ -n "${SCALEKIT_MAGICLINK_AUTH_URI:-}" ]]; then
  SYSPROPS+=( -Dscalekit.magiclink_auth_uri="${SCALEKIT_MAGICLINK_AUTH_URI}" )
fi

echo "Starting native app: $BIN"
exec "$BIN" "${SYSPROPS[@]}" "$@"
