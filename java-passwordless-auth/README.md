

# Spring Boot 3 + Scalekit: Passwordless Auth (OTP & Magic Link)

Minimal Spring Boot app with [Scalekit](http://scalekit.com/) headless passwordless auth. Secrets in `.env`, passed as `-D` JVM/system properties. One command to run.



## Quickstart

1. Copy `.env.example` to `.env` and fill in your Scalekit credentials.
2. Run:

	```zsh
	./run-with-env.sh
	```

3. Open [http://localhost:8080](http://localhost:8080) and follow the UI.



## Native build (optional)

Requires GraalVM JDK 21+ with `native-image`:

```zsh
./run-native-with-env.sh
```

If it says native-image missing, download GraalVM (tarball), set `GRAALVM_HOME`, run `gu install native-image`, then re-run.



## Project structure

```text
java-passwordless-auth/
├── run-with-env.sh              # JVM run script
├── run-native-with-env.sh       # Native run script
├── pom.xml                      # Maven build file
├── src/
│   ├── main/
│   │   ├── java/com/example/auth/
│   │   │   ├── AuthService.java            # Scalekit SDK logic, user upsert
│   │   │   ├── AuthController.java         # Thymeleaf UI (login, verify, callback)
│   │   │   ├── api/AuthApiController.java  # REST API (send, verify, me)
│   │   │   ├── security/SecurityConfig.java# Route protection
│   │   │   └── user/
│   │   │       ├── UserAccount.java
│   │   │       └── UserAccountRepository.java
│   │   └── resources/templates/            # UI pages (Bootstrap)
│   └── test/                               # Minimal tests
└── .env.example                            # Example secrets
```

How it fits: UI and REST both call `AuthService` for all auth logic. JPA persists users. SecurityConfig protects routes. Scripts load secrets from `.env`.



## Notes

- Logs: INFO by default; SDK payloads at DEBUG; expected invalid/expired are friendly.
- Tests: minimal, coverage optional.
- Native: if build fails on reflection/grpc, add reachability metadata (ask for help if needed).

## Links

- [Scalekit](http://scalekit.com/)
- [Scalekit Docs](https://docs.scalekit.com/)
- [Scalekit Java SDK](https://github.com/scalekit-inc/scalekit-sdk-java)
