package main

import (
	"log"
	"net/http"
	_ "net/http/pprof"
	"net/mail"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/session/v2"
	"github.com/joho/godotenv"
	"github.com/scalekit-inc/scalekit-sdk-go/v2"
)

func main() {

	app := fiber.New()
	// Middleware: recover from panics and log requests
	app.Use(recover.New())
	app.Use(logger.New())

	// Session store (defaults)
	store := session.New()

	// Load .env file once
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error loading .env")
	}

	// Cache environment variables and init Scalekit client
	clientID := os.Getenv("SCALEKIT_CLIENT_ID")
	clientSecret := os.Getenv("SCALEKIT_CLIENT_SECRET")
	environmentURL := os.Getenv("SCALEKIT_ENVIRONMENT_URL")
	redirectURI := os.Getenv("SCALEKIT_REDIRECT_URI")
	scalekitClient := scalekit.NewScalekitClient(
		environmentURL,
		clientID,
		clientSecret,
	)

	// Unified /request-auth endpoint (handles magic link or OTP)
	app.Post("/request-auth", func(c *fiber.Ctx) error {
		type reqBody struct {
			Email string `json:"email"`
		}
		var body reqBody
		if err := c.BodyParser(&body); err != nil {
			log.Println("Invalid request body for /request-auth")
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		email := body.Email
		if email == "" {
			log.Println("No email provided for /request-auth")
			return c.Status(400).JSON(fiber.Map{"error": "Email required"})
		}
		if _, err := mail.ParseAddress(email); err != nil {
			log.Println("Invalid email format for /request-auth")
			return c.Status(400).JSON(fiber.Map{"error": "Invalid email"})
		}
		// Ask Scalekit backend to handle appropriate flow
		templateType := scalekit.TemplateTypeSignin
		resp, err := scalekitClient.Passwordless().SendPasswordlessEmail(
			c.Context(),
			email,
			&scalekit.SendPasswordlessOptions{
				MagiclinkAuthUri:  redirectURI,
				State:             "state",
				Template:          &templateType,
				ExpiresIn:         600,
				TemplateVariables: map[string]string{},
			},
		)
		if err != nil {
			log.Printf("Error sending passwordless email for %s: %v", email, err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to send passwordless email"})
		}
		// Store authRequestId and pending email in session
		sess := store.Get(c)
		if sess == nil {
			log.Println("Session error: could not get session for /request-auth")
			return c.Status(500).SendString("Session error")
		}
		sess.Set("authRequestId:"+email, resp.AuthRequestId)
		sess.Set("pendingEmail", email)
		sess.Save()
		log.Printf("Passwordless email sent to %s, authRequestId: %v", email, resp.AuthRequestId)
		return c.JSON(fiber.Map{"message": "Passwordless email sent! Check your email.", "email": email})
	})

	// Start pprof server for profiling (on :6060)
	go func() {
		log.Println("pprof profiling enabled at :6060")
		log.Println(http.ListenAndServe(":6060", nil))
	}()

	// Serve Swagger UI and spec
	app.Get("/docs", func(c *fiber.Ctx) error {
		return c.SendFile("swagger-ui.html")
	})
	app.Get("/swagger.json", func(c *fiber.Ctx) error {
		return c.SendFile("swagger.json")
	})

	// Magic link callback endpoint for browser-based flows
	// Example: GET /callback?link_token=...&redirect=/docs
	app.Get("/callback", func(c *fiber.Ctx) error {
		// If already authenticated, redirect immediately
		sess := store.Get(c)
		if sess != nil {
			if authedEmail, ok := sess.Get("email").(string); ok && authedEmail != "" {
				redirectTo := c.Query("redirect")
				if redirectTo == "" {
					redirectTo = "/docs"
				}
				return c.Redirect(redirectTo, fiber.StatusFound)
			}
		}
		// Read link_token from query
		token := c.Query("link_token")
		if token == "" {
			// Accept alternative param names for convenience
			token = c.Query("token")
		}
		if token == "" {
			return c.Status(400).Type("html").SendString("Missing link_token. Please use the link from your email.")
		}

		// Optional redirect target, defaults to /docs
		redirectTo := c.Query("redirect")
		if redirectTo == "" {
			redirectTo = "/docs"
		}

		// Retrieve authRequestId from session (created by /request-auth)
		// Reuse the session obtained above or fetch if nil
		if sess == nil {
			sess = store.Get(c)
		}
		if sess == nil {
			return c.Status(400).Type("html").SendString("No session found. Please start from /request-auth again.")
		}
		email, ok := sess.Get("pendingEmail").(string)
		if !ok || email == "" {
			return c.Status(400).Type("html").SendString("No pending login found. Please request a new magic link.")
		}
		authRequestId, ok := sess.Get("authRequestId:" + email).(string)
		if !ok || authRequestId == "" {
			// Fallback to query param if provided
			authRequestId = c.Query("authRequestId")
			if authRequestId == "" {
				authRequestId = c.Query("auth_request_id")
			}
			if authRequestId == "" {
				return c.Status(400).Type("html").SendString("Missing auth request. Please request a new magic link.")
			}
		}

		// Verify with Scalekit
		_, err := scalekitClient.Passwordless().VerifyPasswordlessEmail(
			c.Context(),
			&scalekit.VerifyPasswordlessOptions{
				LinkToken:     token,
				AuthRequestId: authRequestId,
			},
		)
		if err != nil {
			log.Printf("Callback verify failed: %v", err)
			return c.Status(401).Type("html").SendString("Magic link invalid or expired. Please request a new one.")
		}

		// Promote session to authenticated and clear pending markers
		sess.Set("email", email)
		sess.Delete("pendingEmail")
		sess.Delete("authRequestId:" + email)
		sess.Save()
		return c.Redirect(redirectTo, fiber.StatusFound)
	})

	// Root route: show styled instructions page
	app.Get("/", func(c *fiber.Ctx) error {
		log.Println("Accessed root route (browser)")
		html := `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Scalekit Go Passwordless Auth API</title>
			<style>
				body {
					background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
					font-family: 'Segoe UI', Arial, sans-serif;
					color: #22223b;
					margin: 0;
					padding: 0;
				}
				.container {
					max-width: 500px;
					margin: 60px auto;
					background: #fff;
					border-radius: 16px;
					box-shadow: 0 4px 24px rgba(60,72,88,0.08);
					padding: 32px 24px;
					text-align: center;
				}
				h1 {
					color: #3f51b5;
					margin-bottom: 16px;
				}
				p {
					font-size: 1.1rem;
					margin-bottom: 24px;
				}
				.slug {
					background: #e3eafe;
					color: #3f51b5;
					padding: 6px 12px;
					border-radius: 6px;
					font-weight: 500;
					display: inline-block;
					margin: 4px 0;
				}
				a {
					color: #2196f3;
					text-decoration: none;
					font-weight: 500;
				}
				a:hover {
					text-decoration: underline;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<h1>Scalekit Go Passwordless Auth API</h1>
				<p>
					Welcome!<br>
					To test the passwordless authentication endpoints, please visit the <a href="/docs">API Docs</a> page.<br>
					You can interact with all endpoints directly in your browser.
				</p>
				<div>
					<span class="slug">/request-auth</span>
					<span class="slug">/verify-otp</span>
					<span class="slug">/verify-magic-link</span>
					<span class="slug">/callback</span>
					<span class="slug">/whoami</span>
				</div>
				<p style="margin-top:32px;font-size:0.95rem;color:#666;">
					Powered by <a href="https://scalekit.com" target="_blank">Scalekit</a> &amp; <a href="https://gofiber.io" target="_blank">Go Fiber</a>.<br>
					<span style="font-size:0.9rem;">Container-ready, performance optimized.</span>
				</p>
			</div>
		</body>
		</html>
		`
		return c.Type("html").SendString(html)
	})

	// Removed legacy /request-magic-link and /request-otp in favor of /request-auth

	// Verify OTP (only OTP, email and authRequestId from session)
	app.Post("/verify-otp", func(c *fiber.Ctx) error {
		// If already authenticated, short-circuit
		if s := store.Get(c); s != nil {
			if authedEmail, ok := s.Get("email").(string); ok && authedEmail != "" {
				return c.JSON(fiber.Map{"message": "Already authenticated", "email": authedEmail})
			}
		}
		type reqBody struct {
			OTP string `json:"otp"`
		}
		var body reqBody
		if err := c.BodyParser(&body); err != nil {
			log.Println("Invalid request body for OTP verification")
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		otp := body.OTP
		if otp == "" {
			log.Println("Missing OTP for verification")
			return c.Status(400).JSON(fiber.Map{"error": "OTP required"})
		}
		// Retrieve from session
		sess := store.Get(c)
		if sess == nil {
			log.Println("Session error: could not get session for OTP verify")
			return c.Status(500).JSON(fiber.Map{"error": "Session error"})
		}
		email, ok := sess.Get("pendingEmail").(string)
		if !ok || email == "" {
			log.Println("No pending email found in session for OTP verify")
			return c.Status(400).JSON(fiber.Map{"error": "No OTP request found. Please request OTP again."})
		}
		authRequestId, ok := sess.Get("authRequestId:" + email).(string)
		if !ok || authRequestId == "" {
			log.Println("No authRequestId found in session for email: " + email)
			return c.Status(400).JSON(fiber.Map{"error": "No OTP request found for this email. Please request OTP again."})
		}
		log.Printf("OTP verification attempt for email: %s, otp: %s, authRequestId: %s", email, otp, authRequestId)
		_, err := scalekitClient.Passwordless().VerifyPasswordlessEmail(
			c.Context(),
			&scalekit.VerifyPasswordlessOptions{
				Code:          otp,
				AuthRequestId: authRequestId,
			},
		)
		if err != nil {
			log.Printf("OTP verification failed for %s: %v", email, err)
			return c.Status(401).JSON(fiber.Map{"error": "Invalid OTP"})
		}
		// Create session and clear pending markers
		sess.Set("email", email)
		sess.Delete("pendingEmail")
		sess.Delete("authRequestId:" + email)
		sess.Save()
		log.Printf("User authenticated via OTP: %s", email)
		return c.JSON(fiber.Map{"message": "OTP verified!", "email": email})
	})

	// Verify Magic Link (accepts only token from the magic link URL: link_token)
	app.Post("/verify-magic-link", func(c *fiber.Ctx) error {
		// If already authenticated, short-circuit
		if s := store.Get(c); s != nil {
			if authedEmail, ok := s.Get("email").(string); ok && authedEmail != "" {
				return c.JSON(fiber.Map{"message": "Already authenticated", "email": authedEmail})
			}
		}
		type reqBody struct {
			Token string `json:"token"`
		}
		var body reqBody
		if err := c.BodyParser(&body); err != nil {
			log.Println("Invalid request body for magic link verification")
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		token := body.Token
		if token == "" {
			log.Println("Missing token for magic link verification")
			return c.Status(400).JSON(fiber.Map{"error": "Token required (value of link_token from the magic link)"})
		}
		// Retrieve authRequestId from session (stored during /request-auth)
		sess := store.Get(c)
		if sess == nil {
			log.Println("Session error: could not get session for magic link verify")
			return c.Status(400).JSON(fiber.Map{"error": "No session found. Please request auth again."})
		}
		email, ok := sess.Get("pendingEmail").(string)
		if !ok || email == "" {
			log.Println("No pending email found in session for magic link verify")
			return c.Status(400).JSON(fiber.Map{"error": "No magic link request found. Please request auth again."})
		}
		authRequestId, ok := sess.Get("authRequestId:" + email).(string)
		if !ok || authRequestId == "" {
			log.Println("No authRequestId found in session for magic link verify")
			return c.Status(400).JSON(fiber.Map{"error": "Missing auth request. Please request auth again."})
		}
		log.Printf("Magic link verification attempt: authRequestId=%s", authRequestId)
		_, err := scalekitClient.Passwordless().VerifyPasswordlessEmail(
			c.Context(),
			&scalekit.VerifyPasswordlessOptions{
				LinkToken:     token,
				AuthRequestId: authRequestId,
			},
		)
		if err != nil {
			log.Printf("Magic link verification failed: %v", err)
			return c.Status(401).JSON(fiber.Map{"error": "Invalid magic link or request ID"})
		}
		// Promote pending email to authenticated and clear pending markers
		sess.Set("email", email)
		sess.Delete("pendingEmail")
		sess.Delete("authRequestId:" + email)
		sess.Save()
		log.Printf("User authenticated via magic link: %s", email)
		return c.JSON(fiber.Map{"message": "Magic link verified!", "email": email})
	})

	// Whoami endpoint: returns current signed-in user's email or not authorized
	app.Get("/whoami", func(c *fiber.Ctx) error {
		sess := store.Get(c)
		if sess == nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "Not authorized",
			})
		}
		email, ok := sess.Get("email").(string)
		if !ok || email == "" {
			return c.Status(401).JSON(fiber.Map{
				"error": "Not authorized",
			})
		}
		return c.JSON(fiber.Map{
			"email": email,
		})
	})

	// Logout
	app.Get("/logout", func(c *fiber.Ctx) error {
		sess := store.Get(c)
		if sess != nil {
			log.Printf("User logged out: %v", sess.Get("email"))
			sess.Destroy()
		}
		return c.SendString("Logged out. Use /request-auth to log in again.")
	})

	log.Fatal(app.Listen(":3000"))
}
