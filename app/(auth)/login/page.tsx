"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!res || res.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8 sm:p-10 rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-block">
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            LOOP
          </span>
        </Link>
        <h1 className="text-xl font-bold text-white">Welcome back</h1>
        <p className="text-xs text-slate-400">
          Sign in to access your company’s feedback intelligence
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="email">
            Work Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-slate-300" htmlFor="password">
              Password
            </label>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-600/20"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      {/* Demo Credentials Hint */}
      <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/40 text-left space-y-1.5 text-[11px] text-slate-400">
        <div className="font-semibold text-slate-300">Demo Accounts Available:</div>
        <div className="flex flex-col gap-0.5 text-slate-400">
          <div><span className="text-indigo-400 font-mono">admin@loop.demo</span> (Admin)</div>
          <div><span className="text-indigo-400 font-mono">analyst@loop.demo</span> (Analyst)</div>
          <div><span className="text-indigo-400 font-mono">viewer@loop.demo</span> (Viewer)</div>
          <div className="text-slate-500 pt-0.5">Password: <span className="font-mono text-slate-300">DemoPass123!</span></div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/60">
        Need a new workspace?{" "}
        <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-slate-950 text-slate-100">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/70 text-center text-xs text-slate-400">
            Loading login...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
