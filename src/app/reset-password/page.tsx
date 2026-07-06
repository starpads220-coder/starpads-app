"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "";
      if (msg.includes("auth/user-not-found")) {
        setError("No account found with this email address.");
      } else if (msg.includes("auth/invalid-email")) {
        setError("Please enter a valid email address.");
      } else if (msg.includes("auth/too-many-requests")) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/herobest.jpg')" }}
    >
      <div className="flex flex-col md:flex-row w-full max-w-4xl min-h-[550px] bg-transparent rounded-2xl animate-border-morph overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/20">
        <div className="hidden md:block md:w-1/2 bg-transparent" />
        <div className="w-full md:w-1/2 flex flex-col bg-[#fdfaf6] p-8 md:p-12 justify-center">
          <div className="w-full max-w-sm mx-auto flex flex-col">
            <div className="mb-6 text-center md:text-left">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase mb-1">
                Account Recovery
              </h3>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Reset Password
              </h1>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl mb-4">
                {error}
              </div>
            )}

            {sent ? (
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-xl mb-6">
                  Check your email. If an account exists with that email, you will
                  receive a password reset link shortly.
                </div>
                <Link
                  href="/login"
                  className="inline-block w-full py-3.5 px-6 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 shadow-md text-center transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <p className="text-sm text-gray-500 mb-4">
                  Enter your email address and we will send you a link to reset
                  your password.
                </p>
                <div className="space-y-1">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-5 py-3 bg-black border border-transparent rounded-full text-sm text-white placeholder-gray-400 focus:outline-none focus:bg-[#111] focus:border-gray-500 transition-all shadow-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 py-3.5 px-6 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 disabled:opacity-50 shadow-md transition-colors"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-3">
              <span className="text-xs font-semibold text-gray-600 tracking-wider uppercase">
                StarPads Automation
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
