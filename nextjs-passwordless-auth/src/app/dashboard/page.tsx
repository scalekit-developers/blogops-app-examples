
"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          setEmail(data.email || null);
        } else {
          setEmail(null);
        }
      } catch {
        setEmail(null);
      }
    }
    fetchSession();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.replace("/");
      } else {
        setError("Logout failed. Please try again.");
      }
    } catch {
      setError("Logout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex bg-[#0b0b10]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#18182a] border-r border-[#232336] p-8 justify-between min-h-screen">
        <div>
          <div className="flex flex-col items-center gap-3 mb-10">
            <Image src="/scalekit.png" alt="Scalekit Logo" width={128} height={40} className="w-32 h-auto" priority />
          </div>
          <nav className="mt-8">
            <div className="text-[#b3b3c6] text-sm font-medium mb-2">Navigation</div>
            <ul className="space-y-2">
              <li className="text-[#4f5eff] font-semibold">Dashboard</li>
              <li>
                <a href="https://docs.scalekit.com/passwordless/quickstart/" target="_blank" rel="noopener noreferrer" className="text-[#4f5eff] underline text-sm font-bold">Scalekit Quickstart</a>
              </li>
              <li>
                <a href="https://docs.scalekit.com/" target="_blank" rel="noopener noreferrer" className="text-[#4f5eff] underline text-sm font-bold">Scalekit Docs</a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="text-xs text-[#b3b3c6]">Scalekit Magic Link Auth Demo &mdash; Next.js 15</div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl bg-[#18182a] rounded-2xl shadow-xl border border-[#232336] p-10 flex flex-col items-center">
          <div className="flex flex-col items-center mb-6">
            <Image src="/scalekit.png" alt="Scalekit Logo" width={180} height={56} className="w-40 h-auto mb-2" priority />
            <h1 className="text-4xl font-extrabold text-center" style={{ color: "#fff", letterSpacing: "-0.02em" }}>Welcome to your Dashboard</h1>
            <div className="text-[#b3b3c6] text-base mt-1">Scalekit Passwordless Auth Demo</div>
          </div>
          {email ? (
            <>
              <div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full justify-center">
                <div className="flex items-center gap-3 bg-[#232336] px-5 py-3 rounded-lg">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                  <span className="text-lg font-semibold text-[#ededed]">{email}</span>
                </div>
                <span className="text-[#b3b3c6] text-base">Session: <span className="text-[#4f5eff] font-semibold">JWT</span></span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
                <div className="bg-[#232336] rounded-xl p-6 flex flex-col items-center">
                  <div className="text-[#ededed] text-lg font-bold mb-1">User Details</div>
                  <div className="text-[#b3b3c6] text-sm">Email: <span className="text-[#ededed]">{email}</span></div>
                  <div className="text-[#b3b3c6] text-sm">Session Type: <span className="text-[#ededed]">JWT</span></div>
                  <div className="text-[#b3b3c6] text-sm">Status: <span className="text-green-400">Active</span></div>
                </div>
                <div className="bg-[#232336] rounded-xl p-6 flex flex-col items-center">
                  <div className="text-[#ededed] text-lg font-bold mb-1">About Scalekit Auth</div>
                  <div className="text-[#b3b3c6] text-sm mb-2">This dashboard demonstrates secure, passwordless authentication using magic links and OTPs, powered by Scalekit and JWT-based sessions.</div>
                  <ul className="text-[#b3b3c6] text-sm list-disc pl-5 mb-2">
                    <li>Persistent, secure sessions</li>
                    <li>Modern UI/UX</li>
                    <li>Magic Link & OTP login</li>
                    <li>Next.js 15 App Router</li>
                  </ul>
                </div>
              </div>
              <button className="btn-primary w-full max-w-xs" onClick={handleLogout} disabled={loading}>
                {loading ? "Logging out..." : "Log out"}
              </button>
              {error && <div className="text-error text-sm mt-2">{error}</div>}
            </>
          ) : (
            <div className="text-error">Session invalid or expired. Please sign in again.</div>
          )}
        </div>
      </section>
    </main>
  );
}
