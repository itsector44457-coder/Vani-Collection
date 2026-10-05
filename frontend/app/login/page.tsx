"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "../../context/AuthContext";
import { isApiConfigured } from "../../lib/api-client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const { login, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      await login(formData.email, formData.password);
      router.push(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/account");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Side - Hero Image */}
        <div className="relative hidden lg:block">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1583391733956-6c78276477e3?q=80&w=1400&auto=format&fit=crop')",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#881337]/30 via-transparent to-[#dfc28c]/20" />
          </div>
          
          <div className="absolute bottom-8 left-8 z-10 max-w-md text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-3 py-1.5 backdrop-blur-md mb-4">
              <span className="h-2 w-2 rounded-full bg-[#dfc28c]" />
              <span className="text-xs font-semibold uppercase tracking-wider">Customer Portal</span>
            </div>
            <h2 className="font-serif text-3xl font-light leading-tight mb-2">
              Welcome to Vani Collection
            </h2>
            <p className="text-white/80 text-sm">
              Discover handcrafted luxury in authentic Mul Cotton and festive ensembles
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex flex-col justify-center px-6 py-12 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            {/* Logo */}
            <Link href="/" className="flex items-center justify-center gap-3 mb-8">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#dfc28c] via-[#c9a56b] to-[#8a6d3f]" />
                <div className="absolute inset-[2px] rounded-[6px] bg-white" />
                <span className="relative font-serif text-xl font-bold text-[#881337]">V</span>
              </div>
              <div className="leading-tight">
                <div className="font-serif text-lg font-semibold text-stone-900">Vani Collection</div>
                <div className="text-[8px] font-semibold uppercase tracking-wider text-stone-400">Artisanal Luxury</div>
              </div>
            </Link>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-serif font-semibold text-gray-900">Welcome Back</h1>
              <p className="mt-2 text-sm text-gray-600">Sign in to your account to continue shopping</p>
            </div>
          </div>

          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-6 shadow-lg rounded-2xl border border-gray-200">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
                  >
                    {error}
                  </motion.div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] text-sm"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] text-sm"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                      className="h-4 w-4 text-[#881337] focus:ring-[#881337] border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-sm text-[#881337] hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#881337] text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-[#701a35] focus:outline-none focus:ring-2 focus:ring-[#881337]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>

                {/* Demo credentials are only meaningful while the backend is not connected. */}
                {!isApiConfigured() && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">Demo Account</p>
                    <p className="text-xs text-amber-600">
                      Email: <span className="font-mono">customer@vanicollection.com</span><br />
                      Password: <span className="font-mono">customer123</span>
                    </p>
                  </div>
                )}
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-semibold text-[#881337] hover:underline">
                    Create one here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
          <p className="text-sm text-stone-500">Loading…</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
