"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import ThemeToggle from "@/components/layout/ThemeToggle";

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
    <div className="w-full max-w-md space-y-6 p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl relative">
      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <Link href="/" className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            LOOP
          </span>
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome back
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sign in to access your company’s customer feedback intelligence
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="email">
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
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-lg font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-blue-600/20"
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
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-left space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="font-semibold text-slate-800 dark:text-slate-200">Demo Accounts Available:</div>
        <div className="flex flex-col gap-0.5 font-mono text-[11px]">
          <div><span className="text-blue-600 dark:text-blue-400 font-semibold">admin@loop.demo</span> (Admin)</div>
          <div><span className="text-blue-600 dark:text-blue-400 font-semibold">analyst@loop.demo</span> (Analyst)</div>
          <div><span className="text-blue-600 dark:text-blue-400 font-semibold">viewer@loop.demo</span> (Viewer)</div>
          <div className="text-slate-500 pt-0.5">Password: <span className="font-sans font-semibold text-slate-800 dark:text-slate-200">DemoPass123!</span></div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
        Need a new workspace?{" "}
        <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold transition-colors">
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-400">
            Loading login...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
