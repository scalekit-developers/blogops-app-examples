"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyMagicLinkInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const linkToken = searchParams.get("link_token");
    const authRequestId = typeof window !== "undefined" ? localStorage.getItem("authRequestId") : null;
    if (!linkToken) {
      setStatus("error");
      setError("The magic link is missing or invalid. Please use the link sent to your email.");
      return;
    }
    if (!authRequestId) {
      setStatus("error");
      setError("We couldn't find your login session. Please use the same browser and device where you requested the magic link, or request a new link.");
      return;
    }
  signIn("scalekit", { redirect: false, linkToken, authRequestId })
    .then((result) => {
      if (result?.ok && !result.error) {
        setStatus("success");
        setTimeout(() => router.replace("/dashboard"), 1200);
      } else {
        let errorMsg = "Invalid or expired magic link.";
        const err = result?.error || "";
        if (err) {
          if (err.includes("expired")) errorMsg = "This magic link has expired. Please request a new one.";
          else if (err.includes("auth_request_id")) errorMsg = "We couldn't verify your session. Please use the same browser and device where you requested the link.";
          else if (err.toLowerCase().includes("verification failed")) errorMsg = "This magic link is invalid or has already been used. Please request a new one.";
          else errorMsg = err;
        }
        setStatus("error");
        setError(errorMsg);
      }
    })
    .catch(() => {
      setStatus("error");
      setError("A network error occurred. Please check your connection and try again.");
    });
  }, [searchParams, router]);

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #0b0b10 70%, #4f5eff 100%)",
      }}
    >
      <div
        className="w-full max-w-md p-0 rounded-2xl shadow-xl border border-[#232336]"
        style={{
          background:
            "radial-gradient(ellipse at 80% 0%, rgba(79,94,255,0.10) 0%, rgba(11,11,16,0.98) 60%, #0b0b10 100%)",
          boxShadow:
            "0 4px 32px 0 rgba(79,94,255,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.15)",
        }}
      >
        <div className="flex flex-col items-center px-8 py-12">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-6">
            <circle cx="24" cy="24" r="24" fill="#232336" />
            <path d="M16 24.5L22 30.5L32 18.5" stroke="#4f5eff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1
            className="text-3xl font-extrabold mb-3 tracking-tight"
            style={{ color: "#fff", letterSpacing: "-0.02em" }}
          >
            {status === "verifying" && "Verifying Magic Link..."}
            {status === "success" && "Login Successful!"}
            {status === "error" && "Magic Link Error"}
          </h1>
          {status === "verifying" && (
            <div className="text-base text-[#b3b3c6] font-medium">Verifying your link, please wait...</div>
          )}
          {status === "success" && (
            <div className="text-lg font-semibold text-[#4f5eff] mt-2 mb-2">
              You are now logged in!
            </div>
          )}
          {status === "success" && (
            <div className="text-base text-[#b3b3c6] mb-2">You may close this tab or go to your dashboard.</div>
          )}
          {status === "error" && (
            <div className="text-base font-medium text-[#ff4f5e] mb-2">
              {error}
            </div>
          )}
          {status === "error" && (
            <button
              className="mt-4 px-5 py-2 bg-[#232336] text-[#fff] rounded-lg border border-[#4f5eff] hover:bg-[#18182a] transition"
              onClick={() => window.location.href = "/"}
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense>
      <VerifyMagicLinkInner />
    </Suspense>
  );
}
