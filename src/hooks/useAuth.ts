import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut as fbSignOut, User } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    await signInWithPopup(auth, new GoogleAuthProvider());
    setLoading(false);
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return { user, loading, signInWithGoogle, signOut };
}