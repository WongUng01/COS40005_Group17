// 'use client';

// import { useEffect, useState } from 'react';
// import Link from 'next/link';
// // import Button from '@/components/Button';


// const LandingPage = () => {
//   const [fastApiStatus, setFastApiStatus] = useState<string>('Checking...');
//   const [fastApiConnected, setFastApiConnected] = useState<boolean | null>(null);

//   const [supabaseStatus, setSupabaseStatus] = useState<string>('Checking...');
//   const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

//   useEffect(() => {
//     const checkConnections = async () => {
//       try {
//         const fastApiResponse = await fetch('http://localhost:8000/ping');
//         if (fastApiResponse.ok) {
//           setFastApiStatus('FastAPI is connected.');
//           setFastApiConnected(true);
//         } else {
//           setFastApiStatus('FastAPI connection failed.');
//           setFastApiConnected(false);
//         }

//         const supabaseResponse = await fetch('http://localhost:8000/test-connection');
//         if (supabaseResponse.ok) {
//           setSupabaseStatus('Supabase is connected.');
//           setSupabaseConnected(true);
//         } else {
//           setSupabaseStatus('Supabase connection failed.');
//           setSupabaseConnected(false);
//         }
//       } catch (error) {
//         setFastApiStatus('Error connecting to FastAPI.');
//         setSupabaseStatus('Error connecting to Supabase.');
//         setFastApiConnected(false);
//         setSupabaseConnected(false);
//       }
//     };

//     checkConnections();
//   }, []);

//   return (
//     <div className="flex flex-1 items-center justify-center">
//       <div className="text-center p-8 bg-white shadow-md rounded-md w-full max-w-md">
//         <h1 className="text-4xl font-semibold mb-4 text-blue-700">Student Study Planner</h1>
//         <p className="text-xl text-gray-600 mb-6">Plan your study schedule and track your progress effectively!</p>

//         <div className="mb-6 text-gray-700 space-y-1 text-center">
//           <p>
//             {fastApiConnected === null ? '🔄' : fastApiConnected ? '✅' : '❌'} {fastApiStatus}
//           </p>
//           <p>
//             {supabaseConnected === null ? '🔄' : supabaseConnected ? '✅' : '❌'} {supabaseStatus}
//           </p>
//         </div>

//         <div className="space-y-4">
//         <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
//           <Link href="/login">
//             Login
//           </Link>
//         </button>
//         <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
//           <Link href="/dashboard">
//             Dashboard
//           </Link>
//         </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LandingPage;

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const LoginPage = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert('Login failed: ' + error.message);
    } else {
      router.push('/dashboard'); // Change this to your post-login page
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg max-w-md w-full p-8">
        {/* Logo / Brand */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-blue-700">Student Study Planner</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back! Please login to continue.</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              type="email"
              id="email"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-gray-700">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-300"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
