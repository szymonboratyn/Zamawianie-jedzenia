import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  Vote, 
  ShoppingCart, 
  Users, 
  History, 
  User, 
  LogOut,
  UtensilsCrossed
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { signOut } = useAuth();

  const tabs = [
    { id: 'voting', label: 'Głosowanie', icon: Vote },
    { id: 'orders', label: 'Zamówienia', icon: ShoppingCart },
    { id: 'team', label: 'Zespół', icon: Users },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <UtensilsCrossed className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Zamawianie Jedzenia</h1>
          </div>
          
          <nav className="hidden md:flex space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-6 py-2 rounded-xl flex items-center space-x-2 transition-all duration-200 font-semibold shadow-sm
                    ${activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 border border-gray-200'}
                  `}
                  style={{ minWidth: 120 }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            onClick={signOut}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Wyloguj</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 min-w-0 px-3 py-3 flex flex-col items-center space-y-1 transition-all duration-200 font-semibold
                  ${activeTab === tab.id
                    ? 'text-blue-600 bg-blue-100 scale-105 shadow'
                    : 'text-gray-600 bg-white hover:bg-blue-50 hover:text-blue-700 hover:scale-105 border border-gray-100'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}