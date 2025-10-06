'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const LoginPage = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert('Login failed: ' + error.message);
    } else {
      router.push('/units'); // Redirect after login
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Main Card */}
      <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-2xl max-w-md w-full p-8 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold tracking-wide text-[#e60028]">
            Student Study Planner
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Welcome back! Please log in to continue.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#e60028]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#e60028]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div className="text-right text-sm">
            <Link
              href="/forgot-password"
              className="text-[#b71c1c] hover:text-[#e60028] hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-semibold transition duration-300 shadow-sm hover:shadow-md ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#e60028] hover:bg-[#cc0023]'
            }`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 border-t border-gray-200"></div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600">
          Don’t have an account?{' '}
          <Link
            href="/register"
            className="text-[#e60028] font-semibold hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
