import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { History, Calendar, UtensilsCrossed, DollarSign } from 'lucide-react';
import { addDays, startOfWeek, endOfWeek, format, isWithinInterval, parseISO } from 'date-fns';

export function HistoryPage() {
  const { user } = useAuth();
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyWeekOffset, setHistoryWeekOffset] = useState(0); // 0 = bieżący tydzień, -1 = poprzedni itd.

  useEffect(() => {
    fetchOrderHistory();
  }, [user]);

  const fetchOrderHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('order_date', 'desc')
      );
      const snapshot = await getDocs(q);
      setOrderHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching order history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do pobrania zakresu dat tygodnia
  const getWeekRange = (offset: number) => {
    const now = new Date();
    const start = startOfWeek(addDays(now, offset * 7), { weekStartsOn: 1 }); // poniedziałek
    const end = endOfWeek(addDays(now, offset * 7), { weekStartsOn: 1 }); // niedziela
    return { start, end };
  };

  // Filtrowanie zamówień z historii do wybranego tygodnia
  const { start: weekStart, end: weekEnd } = getWeekRange(historyWeekOffset);
  const weekOrders = orderHistory.filter(order => {
    if (!order.order_date) return false;
    const date = typeof order.order_date === 'string' ? parseISO(order.order_date) : order.order_date;
    return isWithinInterval(date, { start: weekStart, end: weekEnd });
  });

  const getTotalSpent = () => {
    return weekOrders.reduce((sum, order) => sum + parseFloat(order.price.toString()), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <History className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Historia zamówień</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setHistoryWeekOffset(o => o - 1)} className="px-2 py-1 text-lg">←</button>
            <span>
              {format(weekStart, 'dd.MM.yyyy')} - {format(weekEnd, 'dd.MM.yyyy')}
            </span>
            <button onClick={() => setHistoryWeekOffset(o => o + 1)} className="px-2 py-1 text-lg">→</button>
          </div>
        </div>

        {weekOrders.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  Łączna kwota: {getTotalSpent().toFixed(2)} zł
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Danie</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cena</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {weekOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {order.order_date
                      ? format(
                          typeof order.order_date === 'string'
                            ? parseISO(order.order_date)
                            : order.order_date,
                          'dd.MM.yyyy'
                        )
                      : 'Brak daty'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.dish_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.price} zł</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}