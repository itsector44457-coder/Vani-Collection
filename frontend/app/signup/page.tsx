"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import type { SignupData } from "../../context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading } = useAuth();
  
  const [formData, setFormData] = useState<SignupData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    newsletter: true,
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Account Details

  const handleNext = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      await signup(formData);
      router.push("/account");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
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
              backgroundImage: "url('https://images.unsplash.com/photo-1594736797933-d0d617949b16?q=80&w=1400&auto=format&fit=crop')",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#881337]/30 via-transparent to-[#dfc28c]/20" />
          </div>
          
          <div className="absolute bottom-8 left-8 z-10 max-w-md text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-3 py-1.5 backdrop-blur-md mb-4">
              <span className="h-2 w-2 rounded-full bg-[#dfc28c]" />
              <span className="text-xs font-semibold uppercase tracking-wider">Join Our Family</span>
            </div>
            <h2 className="font-serif text-3xl font-light leading-tight mb-2">
              Start Your Journey with Vani Collection
            </h2>
            <p className="text-white/80 text-sm">
              Experience authentic handcrafted luxury, exclusive collections, and personalized styling
            </p>
          </div>
        </div>

        {/* Right Side - Signup Form */}
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
              <h1 className="text-2xl font-serif font-semibold text-gray-900">Create Your Account</h1>
              <p className="mt-2 text-sm text-gray-600">Join thousands of women who trust Vani Collection</p>
              
              {/* Step Indicator */}
              <div className="flex items-center justify-center mt-4 gap-2">
                <div className={`w-8 h-2 rounded-full transition-colors ${step >= 1 ? 'bg-[#881337]' : 'bg-gray-200'}`} />
                <div className={`w-8 h-2 rounded-full transition-colors ${step >= 2 ? 'bg-[#881337]' : 'bg-gray-200'}`} />
              </div>
            </div>
          </div>

          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-6 shadow-lg rounded-2xl border border-gray-200">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="space-y-6">
                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                          {error}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] text-sm"
                          placeholder="Enter your first name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] text-sm"
                          placeholder="Enter your last name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] text-sm"
                          placeholder="Enter your mobile number"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full bg-[#881337] text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-[#701a35] transition"
                      >
                        Continue →
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                          {error}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] text-sm"
                          placeholder="Enter your email"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Password *
                        </label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] text-sm"
                          placeholder="Create a password (min 6 characters)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] text-sm"
                          placeholder="Confirm your password"
                        />
                      </div>

                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={formData.newsletter}
                          onChange={(e) => setFormData(prev => ({ ...prev, newsletter: e.target.checked }))}
                          className="mt-1 h-4 w-4 text-[#881337] focus:ring-[#881337] border-gray-300 rounded"
                        />
                        <label className="text-sm text-gray-600">
                          I'd like to receive emails about new collections, exclusive offers, and styling tips
                        </label>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="flex-1 border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
                        >
                          ← Back
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 bg-[#881337] text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-[#701a35] transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? "Creating..." : "Create Account"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-[#881337] hover:underline">
                    Sign in here
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