"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const { login, configured, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/check-admin");
        const data = await res.json();
        if (data.adminExists) {
          setAdminExists(true);
        }
      } catch {
        // API unavailable, assume first-run
      } finally {
        setChecking(false);
      }
    }
    check();
  }, []);

  useEffect(() => {
    if (user) {
      router.push("/production");
    }
  }, [user, router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] text-gray-400">
        Checking...
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Admin Already Exists
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            An admin account has already been set up. Please log in.
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block py-2 px-6 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Go to Login
            </Link>
            <Link
              href="/signup"
              className="block py-2 px-6 bg-white text-gray-900 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Firebase Not Configured
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in the project root with your Firebase project credentials.
          </p>
          <div className="bg-gray-50 rounded-md p-4 text-xs font-mono text-gray-700 space-y-1 mb-4">
            <div>NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key</div>
            <div>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com</div>
            <div>NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id</div>
            <div>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com</div>
            <div>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id</div>
            <div>NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id</div>
          </div>
          <p className="text-xs text-gray-400 text-center">
            Restart the dev server after creating <code className="bg-gray-100 px-1 rounded">.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

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
      const res = await fetch("/api/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create admin account");
        return;
      }

      await login(email, password);
      router.push("/production");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Set Up Admin Account
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Create the first admin user to get started
        </p>
        {error && (
          <div className="bg-performance-red/10 text-performance-red text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stock-blue focus:border-transparent"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stock-blue focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stock-blue focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Admin Account"}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">
          Already set up?{" "}
          <Link href="/login" className="text-stock-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
