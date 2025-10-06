'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const RegisterPage = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ id: userId, email, full_name: fullName }]);

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push('/'); // Redirect to login page
  };

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-xl rounded-2xl max-w-md w-full p-8 border-t-4 border-[#e60028]">
        {/* Logo / Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold text-[#e60028] tracking-tight">
            Swinburne Study Planner
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Create an account to get started
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          {error && (
            <p className="text-red-600 mb-3 text-sm bg-red-50 border border-red-200 p-2 rounded-md">
              {error}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@studentmail.swin.edu.my"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e60028] focus:border-[#e60028] transition"
            />
          </div>

          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-semibold text-gray-700"
            >
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="John Doe"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e60028] focus:border-[#e60028] transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e60028] focus:border-[#e60028] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md font-semibold text-white transition-all duration-300 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#b71c1c] hover:bg-[#e60028] shadow-md'
            }`}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link
            href="/"
            className="text-[#b71c1c] hover:underline font-semibold"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
