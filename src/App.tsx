import React, { useState, useEffect } from 'react';
import { SetupFlow } from './components/SetupFlow';
import { TodayBoard } from './components/TodayBoard';
import { CalendarView } from './components/CalendarView';
import { Settings } from './components/Settings';
import { Calendar, Home, SettingsIcon } from 'lucide-react';

type View = 'today' | 'calendar' | 'settings';

export default function App() {
  const [identity, setIdentity] = useState<'user1' | 'user2' | null>(null);
  const [householdCode, setHouseholdCode] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('today');

  // Load from localStorage on mount
  useEffect(() => {
    const storedIdentity = localStorage.getItem('discipline_identity') as 'user1' | 'user2' | null;
    const storedCode = localStorage.getItem('discipline_household');
    
    if (storedIdentity && storedCode) {
      setIdentity(storedIdentity);
      setHouseholdCode(storedCode);
    }
  }, []);

  const handleSetupComplete = (id: 'user1' | 'user2', code: string) => {
    setIdentity(id);
    setHouseholdCode(code);
    
    // Persist to localStorage
    localStorage.setItem('discipline_identity', id);
    localStorage.setItem('discipline_household', code);
  };

  // Show setup if not configured
  if (!identity || !householdCode) {
    return <SetupFlow onComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Content */}
      <div className="pb-16">
        {currentView === 'today' && (
          <TodayBoard householdCode={householdCode} identity={identity} />
        )}
        {currentView === 'calendar' && (
          <CalendarView householdCode={householdCode} identity={identity} />
        )}
        {currentView === 'settings' && (
          <Settings householdCode={householdCode} identity={identity} />
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t shadow-lg">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setCurrentView('today')}
            className={`flex-1 flex flex-col items-center justify-center py-3 transition-all ${
              currentView === 'today' 
                ? 'text-black' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Home className={`h-5 w-5 transition-transform ${
              currentView === 'today' ? 'scale-110' : ''
            }`} />
            <span className="text-xs mt-1">Today</span>
          </button>
          <button
            onClick={() => setCurrentView('calendar')}
            className={`flex-1 flex flex-col items-center justify-center py-3 transition-all ${
              currentView === 'calendar' 
                ? 'text-black' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Calendar className={`h-5 w-5 transition-transform ${
              currentView === 'calendar' ? 'scale-110' : ''
            }`} />
            <span className="text-xs mt-1">Calendar</span>
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`flex-1 flex flex-col items-center justify-center py-3 transition-all ${
              currentView === 'settings' 
                ? 'text-black' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <SettingsIcon className={`h-5 w-5 transition-transform ${
              currentView === 'settings' ? 'scale-110' : ''
            }`} />
            <span className="text-xs mt-1">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}