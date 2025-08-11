

"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authRequestId, setAuthRequestId] = useState<string | null>(null);
  const router = useRouter();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.email) {
            router.replace("/dashboard");
          }
        }
      } catch {}
    }
    checkSession();
  }, [router]);
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/send-passwordless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthRequestId(data.authRequestId); // Save request ID for OTP verification
        if (typeof window !== "undefined") {
          localStorage.setItem("authRequestId", data.authRequestId);
        }
        setStep("otp"); // Move to OTP entry step
      } else {
        setError(data.error || "Failed to send magic link.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }


  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
        setLoading(true);
        setError(null);
        // Client-side validation: OTP must be exactly 6 digits
        if (!/^[0-9]{6}$/.test(otp)) {
          setError("OTP must be exactly 6 digits.");
          setLoading(false);
          return;
        }
        try {
          const res = await fetch("/api/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: otp, authRequestId }),
          });
          const data = await res.json();
          if (res.ok) {
            setStep("success");
            // Redirect to dashboard after short delay for UX
            setTimeout(() => {
              router.replace("/dashboard");
            }, 1000);
          } else {
            // Show a user-friendly error for Scalekit error
            if (data.error) {
              if (data.error.toLowerCase().includes("auth request expired")) {
                setError("Your login session has expired. Please request a new code or magic link.");
              } else if (data.error.toLowerCase().includes("verification failed")) {
                setError("The code you entered is incorrect or expired. Please check and try again.");
              } else {
                setError(data.error || "Invalid or expired code. Please check and try again.");
              }
            } else {
              setError("Invalid or expired code. Please check and try again.");
            }
          }
        } catch {
          setError("Network error. Please try again.");
        } finally {
          setLoading(false);
        }
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0b0b10 70%, #4f5eff 100%)" }}>
      <div className="card w-full max-w-md mx-auto">
        <div className="flex flex-col items-center mb-6">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" className="mb-4">
            <circle cx="24" cy="24" r="24" fill="#232336" />
            <path d="M16 24.5L22 30.5L32 18.5" stroke="#4f5eff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="text-2xl font-extrabold mb-1 tracking-tight" style={{ color: "#fff", letterSpacing: "-0.02em" }}>Sign in</h1>
        </div>
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#b3b3c6] mb-1">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[#232336] bg-[#18182a] text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#4f5eff] placeholder-[#b3b3c6]"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
            {error && <div className="text-error text-sm text-center mt-2">{error}</div>}
          </form>
        )}
        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-[#b3b3c6] mb-1">Enter OTP code</label>
              <input
                id="otp"
                type="text"
                required
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[#232336] bg-[#18182a] text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#4f5eff] placeholder-[#b3b3c6]"
                placeholder="6-digit code"
                autoComplete="one-time-code"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              type="button"
              className="w-full py-2 px-4 bg-[#232336] text-[#ededed] rounded-lg border border-[#4f5eff] hover:bg-[#18182a] transition"
              onClick={() => setStep("email")}
              disabled={loading}
            >
              Back to Email
            </button>
            {error && <div className="text-error text-sm text-center mt-2">{error}</div>}
          </form>
        )}
        {step === "success" && (
          <div className="text-success text-center font-semibold text-lg">
            Login successful! Redirecting to your dashboard...
          </div>
        )}
      </div>
    </main>
  );
}
