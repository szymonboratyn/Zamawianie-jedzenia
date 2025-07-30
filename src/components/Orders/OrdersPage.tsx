import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, addDoc, setDoc, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { ShoppingCart, DollarSign, Phone, Lock, User, UtensilsCrossed, CheckCircle } from 'lucide-react';
import { addDays, startOfWeek, endOfWeek, format, isWithinInterval, parseISO } from 'date-fns';

type Restaurant = {
  id: string;
  name: string;
  menu_url: string;
  added_by: string;
  times_used: number;
  created_at: any;
};

type Order = {
  id: string;
  userId: string;
  restaurantId: string;
  dish_name: string;
  price: number;
  order_date: string;
  is_closed: boolean;
  is_paid: boolean;
  created_at: any;
  updated_at: any;
  delivery_price?: number;
};

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_admin?: boolean;
};

export function OrdersPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [todayRestaurant, setTodayRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userOrder, setUserOrder] = useState<Order | null>(null);
  const [orderForm, setOrderForm] = useState({ dish_name: '', price: '' });
  const [loading, setLoading] = useState(true);
  const [isOrdersClosed, setIsOrdersClosed] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [votingEnded, setVotingEnded] = useState(false);
  const [historyWeekOffset, setHistoryWeekOffset] = useState(0);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryPrice, setDeliveryPrice] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);

  useEffect(() => {
    const fetchAndCheck = () => {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0); // 12:00
      setVotingEnded(now > end);
      fetchTodayData();
    };
    fetchAndCheck();
    const timer = setInterval(fetchAndCheck, 1000 * 30);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    fetchTodayData();
  }, [user, votingEnded]);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      // Pobierz głosy z votes
      const votesQ = query(collection(db, 'votes'), where('vote_date', '==', today));
      const votesSnap = await getDocs(votesQ);
      const votesData = votesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      let winningRestaurant = null;
      if (votesData.length > 0) {
        const voteCounts = votesData.reduce((acc: any, vote: any) => {
          acc[vote.restaurantId] = (acc[vote.restaurantId] || 0) + 1;
          return acc;
        }, {});
        const winningRestaurantId = Object.keys(voteCounts).reduce((a, b) => voteCounts[a] > voteCounts[b] ? a : b);
        // Pobierz restaurację
        const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
        const restaurantsData = restaurantsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Restaurant));
        winningRestaurant = restaurantsData.find(r => r.id === winningRestaurantId) || null;
      }
      setTodayRestaurant(winningRestaurant);
      // Pobierz zamówienia dla zwycięskiej restauracji
      let ordersData: Order[] = [];
      if (winningRestaurant) {
        const ordersQ = query(collection(db, 'orders'), where('order_date', '==', today), where('restaurantId', '==', winningRestaurant.id));
        const ordersSnap = await getDocs(ordersQ);
        ordersData = ordersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
        // Fetch user profiles for all users in today's orders
        const userIds = Array.from(new Set(ordersData.map(order => order.userId)));
        const profiles: Record<string, UserProfile> = {};
        for (const uid of userIds) {
          try {
            const profileSnap = await getDocs(query(collection(db, 'user_profiles')));
            // Try to get by doc id (Firestore best practice)
            const docRef = doc(db, 'user_profiles', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              profiles[uid] = { id: uid, ...docSnap.data() } as UserProfile;
            }
          } catch (e) {
            // fallback: do nothing
          }
        }
        setUserProfiles(profiles);
      }
      setOrders(ordersData);
      const userOrderData = user && ordersData ? ordersData.find(order => order.userId === user.uid) : null;
      setUserOrder(userOrderData || null);
      setIsOrdersClosed(ordersData?.[0]?.is_closed || false);
      if (userOrderData) {
        setOrderForm({
          dish_name: userOrderData.dish_name,
          price: userOrderData.price.toString(),
        });
      }
    } catch (error) {
      console.error('Error fetching today data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !todayRestaurant || isOrdersClosed) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const price = parseFloat(orderForm.price);
      if (userOrder) {
        // Update existing order
        await updateDoc(doc(db, 'orders', userOrder.id), {
          dish_name: orderForm.dish_name,
          price,
          updated_at: new Date(),
        });
      } else {
        // Create new order
        await addDoc(collection(db, 'orders'), {
          userId: user.uid,
          restaurantId: todayRestaurant.id,
          dish_name: orderForm.dish_name,
          price,
          order_date: today,
          is_closed: false,
          is_paid: false,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 2000);
      fetchTodayData();
    } catch (error) {
      console.error('Error submitting order:', error);
    }
  };

  const handleCloseOrders = async () => {
    setShowDeliveryModal(true);
  };

  const saveDeliveryPrice = async () => {
    if (!todayRestaurant) return;
    setSavingDelivery(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const ordersQ = query(collection(db, 'orders'), where('order_date', '==', today), where('restaurantId', '==', todayRestaurant.id));
      const ordersSnap = await getDocs(ordersQ);
      for (const orderDoc of ordersSnap.docs) {
        await updateDoc(doc(db, 'orders', orderDoc.id), { is_closed: true, delivery_price: parseFloat(deliveryPrice) });
      }
      setShowDeliveryModal(false);
      setDeliveryPrice('');
      fetchTodayData();
    } catch (error) {
      console.error('Error saving delivery price:', error);
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleTogglePaid = async (orderId: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { is_paid: !current });
      fetchTodayData();
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const getTotalAmount = () => {
    return orders.reduce((sum, order) => sum + parseFloat(order.price.toString()), 0);
  };

  const isOrderer = todayRestaurant?.added_by === user?.uid;
  const isAdmin = !!profile?.is_admin;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!todayRestaurant) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <ShoppingCart className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Restauracja nie została jeszcze wybrana
          </h2>
          <p className="text-yellow-700">
            Głosowanie jeszcze trwa. Po zakończeniu głosowania pojawi się tutaj zwycięska restauracja i będzie można złożyć zamówienie.
          </p>
        </div>
      </div>
    );
  }

  // Przed renderowaniem formularza i listy zamówień:
  if (!votingEnded) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <ShoppingCart className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Głosowanie jeszcze trwa
          </h2>
          <p className="text-yellow-700">
            Po zakończeniu głosowania pojawi się tutaj możliwość składania zamówień.
          </p>
        </div>
      </div>
    );
  }

  // Filtruj zamówienia tylko z dzisiejszego dnia
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(order => order.order_date === todayStr);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        {isOrdersClosed ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <Lock className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2 flex items-center justify-center gap-2">
              Zamówienia zamknięte
            </h2>
            <p className="text-red-700">
              Zamówienia z {todayRestaurant?.name} zostały zamknięte. Nie można już dodawać nowych zamówień.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-8 h-8 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Zamówienia z {todayRestaurant?.name}
                </h2>
              </div>
              <a
                href={todayRestaurant.menu_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Zobacz menu
              </a>
              {isAdmin && !isOrdersClosed && (
                <button
                  onClick={handleCloseOrders}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Zamknij zamówienia (admin)</span>
                </button>
              )}
              {isOrderer && !isOrdersClosed && orders.length > 0 && (
                <button
                  onClick={handleCloseOrders}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Zamknij zamówienia</span>
                </button>
              )}
            </div>

            {orderSuccess && (
              <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-6 text-center text-green-700 font-semibold">
                Zamówienie zapisane!
              </div>
            )}

            <form onSubmit={handleSubmitOrder} className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                {userOrder ? 'Edytuj swoje zamówienie' : 'Dodaj swoje zamówienie'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Nazwa dania"
                  value={orderForm.dish_name}
                  onChange={(e) => setOrderForm({ ...orderForm, dish_name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Cena (zł)"
                  value={orderForm.price}
                  onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {userOrder ? 'Zaktualizuj zamówienie' : 'Dodaj zamówienie'}
              </button>
            </form>
          </>
        )}

        {showDeliveryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-xs text-center">
              <h2 className="text-xl font-bold mb-4">Podaj cenę dostawy</h2>
              <input
                type="number"
                min="0"
                step="0.01"
                value={deliveryPrice}
                onChange={e => setDeliveryPrice(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <div className="flex gap-2 justify-center">
                <button
                  onClick={saveDeliveryPrice}
                  disabled={!deliveryPrice || savingDelivery}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Zapisz
                </button>
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}

        {orders.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Wszystkie zamówienia</h3>
            <div className="overflow-x-auto">
              <table className="w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700"><User className="inline w-4 h-4 mr-1 text-gray-500" />Osoba</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700"><UtensilsCrossed className="inline w-4 h-4 mr-1 text-gray-500" />Danie</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700"><DollarSign className="inline w-4 h-4 mr-1 text-gray-500" />Cena</th>
                    {isOrderer && isOrdersClosed && (
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700"><CheckCircle className="inline w-4 h-4 mr-1 text-gray-500" />Zapłacone</th>
                    )}
                    {!isOrderer && isOrdersClosed && (
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => {
                    const profile = userProfiles[order.userId];
                    return (
                      <tr key={order.id} className={user?.uid === order.userId ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="inline-flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-400" />
                            {profile ? (
                              <span className="font-semibold">{profile.first_name} {profile.last_name}</span>
                            ) : (
                              <span className="text-xs text-gray-400">Brak profilu</span>
                            )}
                            {user?.uid === order.userId && (
                              <span className="ml-2 text-xs text-blue-600 font-semibold">(Twoje zamówienie)</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="inline-flex items-center gap-2">
                            <UtensilsCrossed className="w-4 h-4 text-green-500" />
                            {order.dish_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="inline-flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-yellow-500" />
                            {order.price} zł
                          </span>
                        </td>
                        {isOrderer && isOrdersClosed && (
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!order.is_paid}
                                onChange={() => handleTogglePaid(order.id, !!order.is_paid)}
                                className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                aria-label="Oznacz jako zapłacone"
                              />
                              {order.is_paid && <CheckCircle className="w-4 h-4 text-green-600" />}
                            </span>
                          </td>
                        )}
                        {!isOrderer && isOrdersClosed && (
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span className="inline-flex items-center gap-2">
                              {order.is_paid ? <CheckCircle className="w-4 h-4 text-green-600" /> : <DollarSign className="w-4 h-4 text-gray-400" />}
                              {order.is_paid ? 'Zapłacone' : 'Oczekuje'}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {isOrdersClosed && todayRestaurant && userProfiles[todayRestaurant.added_by] && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 flex flex-col items-center space-y-3">
                {/* Wylicz sumę zamówienia użytkownika i udział w dostawie */}
                {user && (() => {
                  const userOrders = orders.filter(o => o.userId === user.uid);
                  const userSum = userOrders.reduce((sum, o) => sum + parseFloat(o.price.toString()), 0);
                  const delivery = orders.length > 0 && orders[0].delivery_price ? Math.ceil((orders[0].delivery_price / orders.length) * 100) / 100 : 0;
                  const total = Math.ceil((userSum + delivery) * 100) / 100;
                  return (
                    <div className="mb-2 text-lg font-semibold text-blue-900">
                      Do zapłaty: <span className="font-mono">{total.toFixed(2)} zł</span> (zamówienie: {userSum.toFixed(2)} zł + dostawa: {delivery.toFixed(2)} zł)
                    </div>
                  );
                })()}
                <div className="flex items-center space-x-3">
                  <Phone className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">Przelej pieniądze na numer telefonu osoby zamawiającej:</span><br />
                    <span className="text-lg">{userProfiles[todayRestaurant.added_by].first_name} {userProfiles[todayRestaurant.added_by].last_name} — <span className="font-mono">{userProfiles[todayRestaurant.added_by].phone_number}</span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}