import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

// Create a JWT session token
export function createSession(email: string): string {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Validate and decode JWT session token
export function getSessionEmail(token: string): string | undefined {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    return decoded.email;
  } catch {
    return undefined;
  }
}

// No-op for JWT, but kept for API compatibility
export function deleteSession(_sessionId: string): boolean {
  return true;
}
