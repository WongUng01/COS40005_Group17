// providers.tsx
'use client';

import { AuthProvider } from '../app/context/authContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
