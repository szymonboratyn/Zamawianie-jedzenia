import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Plus, ExternalLink, Clock, Trophy } from 'lucide-react';
import { useUserProfile } from '../../hooks/useUserProfile';

declare global {
  interface Window {
    __WINNER__?: Restaurant | null;
  }
}

type Restaurant = {
  id: string;
  name: string;
  menu_url: string;
  added_by: string;
  times_used: number;
  created_at: any;
};

type Vote = {
  id: string;
  userId: string;
  restaurantId: string;
  vote_date: string;
};

export function VotingPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({ name: '', menu_url: '' });
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [votingEnded, setVotingEnded] = useState(false);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const isAdmin = !!profile?.is_admin;
  const [allRestaurants, setAllRestaurants] = useState<{ name: string; menu_url: string }[]>([]);
  const [suggestions, setSuggestions] = useState<{ name: string; menu_url: string }[]>([]);
  const [lastResetDate, setLastResetDate] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [wasVotingEnded, setWasVotingEnded] = useState<boolean | null>(null);

  useEffect(() => {
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Poproś o zgodę na powiadomienia przy wejściu na stronę
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (votingEnded && window.Notification && Notification.permission === 'granted') {
      new Notification('Głosowanie zakończone!', {
        body: 'Możesz już składać zamówienia.'
      });
    }
  }, [votingEnded]);

  const updateTimer = () => {
    const now = new Date();
          const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0); // 12:00
    if (now > end) {
      setVotingEnded(true);
      setTimeLeft('Głosowanie zakończone');
    } else {
      setVotingEnded(false);
      const diff = end.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }
  };

  useEffect(() => {
    fetchData();
  }, [votingEnded, user]);

  // Resetuj restauracje zawsze na nowy dzień
  useEffect(() => {
    (async () => {
      const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
      for (const d of restaurantsSnap.docs) {
        const created = d.data().created_at;
        if (!created || (created.toDate ? created.toDate().toISOString().split('T')[0] : created.split('T')[0]) !== today) {
          await deleteDoc(doc(db, 'restaurants', d.id));
        }
      }
      setLastResetDate(today);
      setRestaurants([]);
    })();
  }, [today]);

  // Przy rozpoczęciu nowego głosowania (votingEnded z true na false) usuń wszystkie restauracje
  useEffect(() => {
    if (wasVotingEnded === true && votingEnded === false) {
      (async () => {
        const snap = await getDocs(collection(db, 'restaurants'));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'restaurants', d.id));
        }
        setRestaurants([]);
      })();
    }
    setWasVotingEnded(votingEnded);
  }, [votingEnded]);

  // Pobieraj podpowiedzi zawsze przy otwarciu formularza i zmianie inputa
  useEffect(() => {
    if (showAddForm) {
      (async () => {
        const snap = await getDocs(collection(db, 'all_restaurants'));
        setAllRestaurants(snap.docs.map(doc => doc.data() as { name: string; menu_url: string }));
      })();
    }
  }, [showAddForm]);

  useEffect(() => {
    // Pobierz wszystkie restauracje do podpowiedzi
    (async () => {
      const snap = await getDocs(collection(db, 'all_restaurants'));
      setAllRestaurants(snap.docs.map(doc => doc.data() as { name: string; menu_url: string }));
    })();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Pobierz wszystkie restauracje (bez filtrowania po dacie)
      const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
      const restaurantsData = restaurantsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Restaurant));
      setRestaurants(restaurantsData);

      // Fetch today's votes
      const votesQ = query(collection(db, 'votes'), where('vote_date', '==', today));
      const votesSnap = await getDocs(votesQ);
      const votesData = votesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vote));
      setVotes(votesData);
      const userVotesArr = votesData.filter(vote => vote.userId === user?.uid).map(vote => vote.restaurantId) || [];
      setUserVotes(userVotesArr);

      // Calculate winner
      if (votingEnded) {
        if (votesData.length > 0) {
          const voteCounts = votesData.reduce((acc: any, vote) => {
            acc[vote.restaurantId] = (acc[vote.restaurantId] || 0) + 1;
            return acc;
          }, {});
          const winningRestaurantId = Object.keys(voteCounts).reduce((a, b) => voteCounts[a] > voteCounts[b] ? a : b);
          const winningRestaurant = restaurantsData.find(r => r.id === winningRestaurantId) || null;
          setWinner(winningRestaurant);
        } else {
          setWinner(null);
        }
      } else {
        setWinner(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (restaurantId: string) => {
    if (!user || votingEnded || voteLoading || userVotes.includes(restaurantId)) return;
    setVoteLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, 'votes'), {
        userId: user.uid,
        restaurantId,
        vote_date: today,
      });
      setUserVotes(prev => [...prev, restaurantId]);
      await fetchData();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Błąd zapisu głosu: ' + ((error as any)?.message || error));
    } finally {
      setVoteLoading(false);
    }
  };

  const handleUnvote = async (restaurantId: string) => {
    if (!user || votingEnded || voteLoading || !userVotes.includes(restaurantId)) return;
    setVoteLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      // Znajdź głos użytkownika na tę restaurację
      const votesQ = query(collection(db, 'votes'), where('userId', '==', user.uid), where('restaurantId', '==', restaurantId), where('vote_date', '==', today));
      const votesSnap = await getDocs(votesQ);
      for (const voteDoc of votesSnap.docs) {
        await deleteDoc(doc(db, 'votes', voteDoc.id));
      }
      setUserVotes(prev => prev.filter(id => id !== restaurantId));
      await fetchData();
    } catch (error) {
      console.error('Error unvoting:', error);
      alert('Błąd usuwania głosu: ' + ((error as any)?.message || error));
    } finally {
      setVoteLoading(false);
    }
  };

  const validatePhone = (phone: string) => /^\d{9}$/.test(phone);

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newRestaurant.name || !newRestaurant.menu_url) return;
    if (!profile || !validatePhone(profile.phone_number)) {
      alert('Twój numer telefonu w profilu jest nieprawidłowy. Uzupełnij go w ustawieniach profilu (9 cyfr, bez spacji).');
      return;
    }
    // Sprawdź, czy link już istnieje w restauracjach
    if (restaurants.some(r => r.menu_url.trim() === newRestaurant.menu_url.trim())) {
      alert('Restauracja z tym linkiem już została dodana.');
      return;
    }
    try {
      await addDoc(collection(db, 'restaurants'), {
        name: newRestaurant.name,
        menu_url: newRestaurant.menu_url,
        added_by: user.uid,
        times_used: 0,
        created_at: new Date(),
        order_date: today
      });
      // Dodaj do all_restaurants jeśli nie istnieje (case-insensitive)
      const exists = allRestaurants.some(r => r.name.toLowerCase() === newRestaurant.name.toLowerCase());
      if (!exists) {
        await setDoc(doc(collection(db, 'all_restaurants')), {
          name: newRestaurant.name,
          menu_url: newRestaurant.menu_url
        });
      }
      setNewRestaurant({ name: '', menu_url: '' });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      console.error('Error adding restaurant:', error);
      alert('Błąd dodawania restauracji: ' + ((error as any)?.message || error));
    }
  };

  const getVoteCount = (restaurantId: string) => {
    return votes.filter(vote => vote.restaurantId === restaurantId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (votingEnded && winner) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Głosowanie zakończone</h2>
            <span className="text-red-600 font-mono">{timeLeft}</span>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-yellow-800">
                Dzisiaj zamawiamy z restauracji {winner.name.charAt(0).toUpperCase() + winner.name.slice(1)}. Możesz złożyć zamówienie w zakładce Zamówienia.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (votingEnded) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Głosowanie zakończone</h2>
            <span className="text-red-600 font-mono">{timeLeft}</span>
          </div>
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6 text-center text-gray-700">
            Brak zwycięskiej restauracji (brak głosów)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Dzisiejsze głosowanie</h2>
          <div className="flex items-center space-x-2 text-lg font-mono">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className={votingEnded ? 'text-red-600' : 'text-blue-600'}>
              {timeLeft}
            </span>
          </div>
        </div>

        {isAdmin && !votingEnded && (
          <button
            onClick={() => setVotingEnded(true)}
            className="mb-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Zakończ głosowanie
          </button>
        )}

        {winner && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Trophy className="w-6 h-6 text-yellow-600" />
              <span className="font-semibold text-yellow-800">
                Zwycięska restauracja: {winner.name}
              </span>
            </div>
          </div>
        )}

        {!votingEnded && (
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              {userVotes.length > 0 ? 'Możesz zmienić swój głos do 12:00' : 'Wybierz restaurację na dzisiaj'}
            </p>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj restaurację</span>
            </button>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleAddRestaurant} className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nazwa restauracji"
                value={newRestaurant.name}
                onChange={(e) => {
                  setNewRestaurant({ ...newRestaurant, name: e.target.value });
                  if (e.target.value.length > 1) {
                    setSuggestions(
                      allRestaurants.filter(r =>
                        r.name.toLowerCase().includes(e.target.value.toLowerCase())
                      )
                    );
                  } else {
                    setSuggestions([]);
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-md mt-1 w-full max-h-40 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="px-4 py-2 hover:bg-green-100 cursor-pointer"
                      onClick={() => {
                        setNewRestaurant({ name: s.name, menu_url: s.menu_url });
                        setSuggestions([]);
                      }}
                    >
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
              <input
                type="url"
                placeholder="Link do menu (np. Pyszne.pl)"
                value={newRestaurant.menu_url}
                onChange={(e) => setNewRestaurant({ ...newRestaurant, menu_url: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Dodaj
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Anuluj
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((restaurant) => {
            const voteCount = getVoteCount(restaurant.id);
            const isUserVote = userVotes.includes(restaurant.id);
            const isWinner = winner?.id === restaurant.id;

            return (
              <div
                key={restaurant.id}
                className={`border-2 rounded-lg p-4 transition-all ${
                  isWinner
                    ? 'border-yellow-400 bg-yellow-50'
                    : isUserVote
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                  <span className="bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded-full">
                    {voteCount} {voteCount === 1 ? 'głos' : 'głosów'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <a
                    href={restaurant.menu_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Menu</span>
                  </a>

                  {!votingEnded && (
                    isUserVote ? (
                      <button
                        onClick={() => handleUnvote(restaurant.id)}
                        className="px-3 py-1 rounded-lg text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
                        disabled={voteLoading}
                      >
                        Usuń głos
                      </button>
                    ) : (
                      <button
                        onClick={() => handleVote(restaurant.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          isUserVote
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        disabled={voteLoading || userVotes.includes(restaurant.id) || votingEnded}
                      >
                        {isUserVote ? 'Wybrane' : 'Głosuj'}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}