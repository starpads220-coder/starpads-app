"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";


export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "PRODUCTION_SUPERVISOR">("PRODUCTION_SUPERVISOR");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      let data: { error?: string };
      try {
        data = await res.json();
      } catch {
        let bodyText = "";
        try { bodyText = await res.text(); } catch {}
        setError(`Server error (${res.status}): ${bodyText || "No response body"}`);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: "url('/herobest.jpg')" }}
      >
        <div className="flex flex-col md:flex-row w-full max-w-4xl min-h-[550px] bg-transparent rounded-2xl animate-border-morph overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/20">
          {/* Left Side: Transparent Panel */}
          <div className="hidden md:block md:w-1/2 bg-transparent" />

          {/* Right Side: Success Content */}
          <div className="w-full md:w-1/2 flex flex-col bg-[#fdfaf6] p-8 md:p-12 justify-center">
            <div className="w-full max-w-sm mx-auto flex flex-col text-center">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">
                Registration Submitted
              </h1>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Your account has been created and is pending admin approval.
                You will be able to log in once an administrator approves your account.
              </p>
              <Link
                href="/login"
                className="w-full py-3.5 px-6 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 shadow-md text-center transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/herobest.jpg')" }}
    >
      <div className="flex flex-col md:flex-row w-full max-w-4xl min-h-[550px] bg-transparent rounded-2xl animate-border-morph overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/20">
        {/* Left Side: Transparent Panel */}
        <div className="hidden md:block md:w-1/2 bg-transparent" />

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 flex flex-col bg-[#fdfaf6] p-8 md:p-12 justify-center">
          <div className="w-full max-w-sm mx-auto flex flex-col">
            
            {/* Header */}
            <div className="mb-6 text-center md:text-left">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase mb-1">
                Get Started
              </h3>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Create Account
              </h1>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl mb-4">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
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

              <div className="space-y-1">
                <input
                  type="password"
                  placeholder="Create password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-5 py-3 bg-black border border-transparent rounded-full text-sm text-white placeholder-gray-400 focus:outline-none focus:bg-[#111] focus:border-gray-500 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-5 py-3 bg-black border border-transparent rounded-full text-sm text-white placeholder-gray-400 focus:outline-none focus:bg-[#111] focus:border-gray-500 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "ADMIN" | "PRODUCTION_SUPERVISOR")}
                  className="w-full px-5 py-3 bg-black border border-transparent rounded-full text-sm text-white focus:outline-none focus:bg-[#111] focus:border-gray-500 transition-all shadow-sm cursor-pointer"
                >
                  <option value="PRODUCTION_SUPERVISOR">Production Supervisor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="text-center pt-2">
                <span className="text-xs text-gray-500">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                    Sign in
                  </Link>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3.5 px-6 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 disabled:opacity-50 shadow-md transition-colors"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            {/* Footer / Branding */}
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
