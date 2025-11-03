'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('A password reset link has been sent to your email.');
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-xl rounded-2xl max-w-md w-full p-8 border-t-4 border-[#e60028]">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold text-[#e60028] tracking-tight">
            Forgot Password
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Enter your Swinburne email to receive a reset link.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handlePasswordReset} className="space-y-5">
          {error && (
            <p className="text-red-600 bg-red-50 border border-red-200 p-2 rounded-md text-sm">
              {error}
            </p>
          )}
          {message && (
            <p className="text-green-700 bg-green-50 border border-green-200 p-2 rounded-md text-sm">
              {message}
            </p>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700"
            >
              Email address
            </label>
            <input
              type="email"
              id="email"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e60028] focus:border-[#e60028] transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@studentmail.swin.edu.my"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md font-semibold text-white transition-all duration-300 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#e60028] hover:bg-[#e60028] shadow-md'
            }`}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          <Link
            href="/"
            className="text-[#e60028] hover:underline font-semibold"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
