import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Users, Phone, Mail } from 'lucide-react';

export function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const q = query(collection(db, 'user_profiles'), orderBy('first_name'));
      const snapshot = await getDocs(q);
      setTeamMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center space-x-3 mb-6">
          <Users className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Zespół</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teamMembers.map((member) => (
            <div key={member.id} className="bg-gray-50 rounded-lg p-4 flex flex-col space-y-2">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-semibold text-gray-900">{member.first_name} {member.last_name}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-700">
                <Phone className="w-4 h-4" />
                <span>{member.phone_number || 'Brak telefonu'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}