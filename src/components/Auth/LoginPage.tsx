import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <button
        onClick={signInWithGoogle}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg"
      >
        {loading ? 'Łączenie...' : 'Zaloguj się przez Google'}
      </button>
    </div>
  );
}