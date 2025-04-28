'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';


const LandingPage = () => {
  const [fastApiStatus, setFastApiStatus] = useState<string>('Checking...');
  const [fastApiConnected, setFastApiConnected] = useState<boolean | null>(null);

  const [supabaseStatus, setSupabaseStatus] = useState<string>('Checking...');
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkConnections = async () => {
      try {
        const fastApiResponse = await fetch('http://localhost:8000/ping');
        if (fastApiResponse.ok) {
          setFastApiStatus('FastAPI is connected.');
          setFastApiConnected(true);
        } else {
          setFastApiStatus('FastAPI connection failed.');
          setFastApiConnected(false);
        }

        const supabaseResponse = await fetch('http://localhost:8000/test-connection');
        if (supabaseResponse.ok) {
          setSupabaseStatus('Supabase is connected.');
          setSupabaseConnected(true);
        } else {
          setSupabaseStatus('Supabase connection failed.');
          setSupabaseConnected(false);
        }
      } catch (error) {
        setFastApiStatus('Error connecting to FastAPI.');
        setSupabaseStatus('Error connecting to Supabase.');
        setFastApiConnected(false);
        setSupabaseConnected(false);
      }
    };

    checkConnections();
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center p-8 bg-white shadow-md rounded-md w-full max-w-md">
        <h1 className="text-4xl font-semibold mb-4 text-blue-700">Student Study Planner</h1>
        <p className="text-xl text-gray-600 mb-6">Plan your study schedule and track your progress effectively!</p>

        <div className="mb-6 text-gray-700 space-y-1 text-center">
          <p>
            {fastApiConnected === null ? '🔄' : fastApiConnected ? '✅' : '❌'} {fastApiStatus}
          </p>
          <p>
            {supabaseConnected === null ? '🔄' : supabaseConnected ? '✅' : '❌'} {supabaseStatus}
          </p>
        </div>

        <div className="space-y-4">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
          <Link href="/login">
            Login
          </Link>
        </button>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full">
          <Link href="/dashboard">
            Dashboard
          </Link>
        </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
