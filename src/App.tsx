import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { LoginPage } from './components/Auth/LoginPage';
import { ProfileSetup } from './components/Profile/ProfileSetup';
import { Navigation } from './components/Layout/Navigation';
import { VotingPage } from './components/Voting/VotingPage';
import { OrdersPage } from './components/Orders/OrdersPage';
import { TeamPage } from './components/Team/TeamPage';
import { ProfilePage } from './components/Profile/ProfilePage';

function App() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const [activeTab, setActiveTab] = useState('voting');

  console.log('App render:', {
    authLoading,
    profileLoading,
    user: !!user,
    profile: !!profile,
    profileError
  });

  // Show loading state
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie aplikacji...</p>
          {profileError && (
            <p className="text-red-600 mt-2 text-sm">Błąd profilu: {profileError}</p>
          )}
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <LoginPage />;
  }

  // Logged in but no profile setup
  if (!profile) {
    return <ProfileSetup />;
  }

  // Profile incomplete (missing required fields)
  if (!profile?.first_name || !profile?.last_name || !profile?.phone_number) {
    return <ProfileSetup />;
  }

  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'voting':
          return <VotingPage />;
        case 'orders':
          return <OrdersPage />;
        case 'team':
          return <TeamPage />;
        case 'profile':
          return <ProfilePage />;
        default:
          return <VotingPage />;
      }
    } catch (error) {
      console.error('Error rendering content:', error);
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Wystąpił błąd
            </h2>
            <p className="text-red-700">
              Nie udało się załadować tej sekcji. Spróbuj odświeżyć stronę.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Odśwież stronę
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="py-6">
        {renderContent()}
      </main>
    </div>
  );
}
export default App;
