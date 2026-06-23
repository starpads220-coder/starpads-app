"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/production");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Login failed";
      if (msg.includes("auth/invalid-credential")) {
        setError("Invalid email or password");
      } else if (msg.includes("auth/user-not-found")) {
        setError("No account found with this email");
      } else if (msg.includes("auth/wrong-password")) {
        setError("Incorrect password");
      } else if (msg.includes("auth/too-many-requests")) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(msg);
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
        {/* Left Side: Transparent Panel */}
        <div className="hidden md:block md:w-1/2 bg-transparent" />

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 flex flex-col bg-[#fdfaf6] p-8 md:p-12 justify-center">
          <div className="w-full max-w-sm mx-auto flex flex-col">
            
            {/* Header */}
            <div className="mb-8 text-center md:text-left">
              <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase mb-1">
                Welcome Back
              </h3>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Star Durable Pads
              </h1>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl mb-6">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-5 py-3.5 bg-black border border-transparent rounded-full text-sm text-white placeholder-gray-400 focus:outline-none focus:bg-[#111] focus:border-gray-500 transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-5 py-3.5 bg-black border border-transparent rounded-full text-sm text-white placeholder-gray-400 focus:outline-none focus:bg-[#111] focus:border-gray-500 transition-all shadow-sm"
                />
              </div>

              <div className="text-center pt-2">
                <span className="text-xs text-gray-500">
                  First time here?{" "}
                  <Link href="/signup" className="text-blue-600 font-semibold hover:underline">
                    Sign Up
                  </Link>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3.5 px-6 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 disabled:opacity-50 shadow-md transition-colors"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Footer / Branding */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-3">
              <span className="text-xs font-semibold text-gray-600 tracking-wider uppercase">
                Starpads production Platform
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
