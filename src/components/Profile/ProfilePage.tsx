import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User, Phone, Save, Calendar, Mail } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Pobierz profil użytkownika z Firestore
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const profileRef = doc(db, 'user_profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setProfile(data);
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setPhoneNumber(data.phone_number || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // Walidacja
  const validateName = (name: string) => /^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]+$/.test(name);
  const validatePhone = (phone: string) => /^\d{9}$/.test(phone);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validateName(firstName)) {
      alert('Imię może zawierać tylko litery.');
      return;
    }
    if (!validateName(lastName)) {
      alert('Nazwisko może zawierać tylko litery.');
      return;
    }
    if (!validatePhone(phoneNumber)) {
      alert('Telefon musi mieć dokładnie 9 cyfr.');
      return;
    }
    setLoading(true);
    try {
      const profileRef = doc(db, 'user_profiles', user.uid);
      await setDoc(profileRef, {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        updated_at: new Date(),
      }, { merge: true });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-8 text-center">Musisz być zalogowany, aby zobaczyć profil.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-4 mb-6">
          <User className="w-10 h-10 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Twój profil</h2>
        </div>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Imię</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Nazwisko</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Telefon</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
          >
            <Save className="w-5 h-5 mr-2" />
            <span>Zapisz zmiany</span>
          </button>
          {showSuccess && (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4 text-center text-green-700 font-semibold mt-4">
              Zmiany zapisane!
            </div>
          )}
        </form>
      </div>
    </div>
  );
}