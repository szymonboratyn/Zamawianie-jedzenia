import React from 'react';
import { Database, AlertCircle, ExternalLink } from 'lucide-react';

export function SupabaseSetup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Konfiguracja bazy danych
        </h1>
        
        <p className="text-gray-600 mb-6">
          Aby aplikacja działała poprawnie, musisz skonfigurować połączenie z bazą danych Supabase.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Database className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-800 mb-1">
                Jak skonfigurować:
              </p>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Kliknij przycisk "Connect to Supabase" w prawym górnym rogu</li>
                <li>2. Postępuj zgodnie z instrukcjami</li>
                <li>3. Aplikacja automatycznie się uruchomi</li>
              </ol>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          <p className="flex items-center justify-center space-x-1">
            <ExternalLink className="w-4 h-4" />
            <span>Potrzebujesz pomocy? Sprawdź dokumentację Supabase</span>
          </p>
        </div>
      </div>
    </div>
  );
}