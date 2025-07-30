import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './useAuth';

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setError(null);
      const profileRef = doc(db, 'user_profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setProfile(profileSnap.data());
      } else {
        setProfile(null);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<any>) => {
    if (!user) return false;
    try {
      setError(null);
      const profileRef = doc(db, 'user_profiles', user.uid);
      await setDoc(profileRef, {
        ...updates,
        updated_at: new Date(),
      }, { merge: true });
      await fetchProfile();
      return true;
    } catch (error: any) {
      setError(error.message);
      return false;
    }
  };

  const createProfile = async (profileData: {
    first_name: string;
    last_name: string;
    phone_number: string;
  }) => {
    if (!user) return false;
    try {
      setError(null);
      const profileRef = doc(db, 'user_profiles', user.uid);
      await setDoc(profileRef, {
        ...profileData,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await fetchProfile();
      return true;
    } catch (error: any) {
      setError(error.message);
      return false;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    createProfile,
    refetch: fetchProfile,
  };
}