import React, { useState, useEffect } from 'react';
import { WeightInput } from './WeightInput';
import { StepsInput } from './StepsInput';
import { JournalInput } from './JournalInput';
import { Checkbox } from './ui/checkbox';
import { motion } from 'framer-motion';

interface TodayData {
  date: string;
  weight: { user1: number | null; user2: number | null };
  steps: { user1: number; user2: number };
  journal: string;
  journalSubmitted: boolean;
  habits: Record<string, { user1: boolean; user2: boolean }>;
}

interface Config {
  user1Name: string;
  user2Name: string;
  customHabits: Array<{
    id: string;
    name: string;
    assignedTo: 'user1' | 'user2' | 'both';
  }>;
}

interface TodayBoardProps {
  householdCode: string;
  identity: 'user1' | 'user2';
}

export function TodayBoard({ householdCode, identity }: TodayBoardProps) {
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTodayData = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/today`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setTodayData(result.data);
        setConfig(result.config);
      }
    } catch (error) {
      console.error('Error fetching today data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
    
    // Poll every 5 seconds for real-time updates
    const interval = setInterval(fetchTodayData, 5000);
    
    return () => clearInterval(interval);
  }, [householdCode]);

  const updateWeight = async (user: 'user1' | 'user2', weight: number) => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/weight`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ user, weight })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setTodayData(result.data);
      }
    } catch (error) {
      console.error('Error updating weight:', error);
    }
  };

  const updateJournal = async (journal: string, submitted: boolean) => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/journal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ journal, submitted })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setTodayData(result.data);
      }
    } catch (error) {
      console.error('Error updating journal:', error);
    }
  };

  const toggleHabit = async (habitId: string, user: 'user1' | 'user2') => {
    if (!todayData) return;
    
    const currentValue = todayData.habits[habitId]?.[user] || false;
    
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/habit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ habitId, user, completed: !currentValue })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setTodayData(result.data);
      }
    } catch (error) {
      console.error('Error toggling habit:', error);
    }
  };

  if (loading || !todayData || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-400"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  const user1Name = config.user1Name;
  const user2Name = config.user2Name;

  // Calculate completion stats
  const calculateProgress = () => {
    let user1Total = 0, user1Complete = 0;
    let user2Total = 0, user2Complete = 0;

    // Weight
    user1Total++; user2Total++;
    if (todayData.weight.user1 !== null) user1Complete++;
    if (todayData.weight.user2 !== null) user2Complete++;

    // Steps
    user1Total++; user2Total++;
    if (todayData.steps.user1 >= 10000) user1Complete++;
    if (todayData.steps.user2 >= 10000) user2Complete++;

    // Journal (counts for both)
    if (todayData.journalSubmitted) {
      user1Complete++; user2Complete++;
    }
    user1Total++; user2Total++;

    // Custom habits
    config.customHabits.forEach(habit => {
      if (habit.assignedTo === 'user1' || habit.assignedTo === 'both') {
        user1Total++;
        if (todayData.habits[habit.id]?.user1) user1Complete++;
      }
      if (habit.assignedTo === 'user2' || habit.assignedTo === 'both') {
        user2Total++;
        if (todayData.habits[habit.id]?.user2) user2Complete++;
      }
    });

    return {
      user1: { complete: user1Complete, total: user1Total },
      user2: { complete: user2Complete, total: user2Total }
    };
  };

  const progress = calculateProgress();

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      {/* Elegant Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-baseline justify-between mb-2">
          <h1 className="text-3xl tracking-tight">Today</h1>
          <div className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <div className="text-sm text-gray-400 font-mono">{householdCode}</div>
      </motion.div>

      {/* Progress Overview */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4 mb-8"
      >
        <div className="bg-gradient-to-br from-gray-50 to-white border rounded-xl p-5 shadow-sm">
          <div className="text-sm text-gray-500 mb-2">{user1Name}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl">{progress.user1.complete}</span>
            <span className="text-gray-400">/ {progress.user1.total}</span>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(progress.user1.complete / progress.user1.total) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-gray-900 to-gray-700"
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-white border rounded-xl p-5 shadow-sm">
          <div className="text-sm text-gray-500 mb-2">{user2Name}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl">{progress.user2.complete}</span>
            <span className="text-gray-400">/ {progress.user2.total}</span>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(progress.user2.complete / progress.user2.total) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="h-full bg-gradient-to-r from-gray-600 to-gray-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Main Discipline Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border shadow-sm overflow-hidden"
      >
        {/* Table Header */}
        <div className="grid grid-cols-[2fr,1fr,1fr] gap-6 px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b">
          <div className="text-xs uppercase tracking-wider text-gray-500">Habit</div>
          <div className="text-xs uppercase tracking-wider text-gray-500 text-center">{user1Name}</div>
          <div className="text-xs uppercase tracking-wider text-gray-500 text-center">{user2Name}</div>
        </div>

        {/* Weight Row */}
        <div className="grid grid-cols-[2fr,1fr,1fr] gap-6 px-6 py-5 border-b hover:bg-gray-50/50 transition-colors">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mr-4">
              <span className="text-lg">⚖️</span>
            </div>
            <div>
              <div className="font-medium">Weigh Yourself</div>
              <div className="text-xs text-gray-400 mt-0.5">Daily weight tracking</div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <WeightInput
              value={todayData.weight.user1}
              onChange={(weight) => updateWeight('user1', weight)}
              userName={user1Name}
            />
          </div>
          <div className="flex items-center justify-center">
            <WeightInput
              value={todayData.weight.user2}
              onChange={(weight) => updateWeight('user2', weight)}
              userName={user2Name}
            />
          </div>
        </div>

        {/* Steps Row */}
        <div className="grid grid-cols-[2fr,1fr,1fr] gap-6 px-6 py-5 border-b hover:bg-gray-50/50 transition-colors">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mr-4">
              <span className="text-lg">👟</span>
            </div>
            <div>
              <div className="font-medium">Walk 10,000 Steps</div>
              <div className="text-xs text-gray-400 mt-0.5">Daily movement goal</div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <StepsInput steps={todayData.steps.user1} userName={user1Name} />
          </div>
          <div className="flex items-center justify-center">
            <StepsInput steps={todayData.steps.user2} userName={user2Name} />
          </div>
        </div>

        {/* Journal Row - Full Width */}
        <div className="px-6 py-5 border-b bg-gradient-to-r from-amber-50/30 to-orange-50/30">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center mr-4">
              <span className="text-lg">📝</span>
            </div>
            <div>
              <div className="font-medium">Shared Daily Journal</div>
              <div className="text-xs text-gray-400 mt-0.5">Reflect together on your day</div>
            </div>
          </div>
          <JournalInput
            value={todayData.journal}
            submitted={todayData.journalSubmitted}
            onChange={(value) => updateJournal(value, todayData.journalSubmitted)}
            onSubmit={() => updateJournal(todayData.journal, true)}
          />
        </div>

        {/* Custom Habits */}
        {config.customHabits.length > 0 && (
          <>
            <div className="px-6 py-3 bg-gray-50 border-b">
              <div className="text-xs uppercase tracking-wider text-gray-400">Custom Habits</div>
            </div>
            {config.customHabits.map((habit, index) => {
              const showUser1 = habit.assignedTo === 'user1' || habit.assignedTo === 'both';
              const showUser2 = habit.assignedTo === 'user2' || habit.assignedTo === 'both';
              const user1Completed = todayData.habits[habit.id]?.user1 || false;
              const user2Completed = todayData.habits[habit.id]?.user2 || false;

              return (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="grid grid-cols-[2fr,1fr,1fr] gap-6 px-6 py-5 border-b last:border-b-0 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mr-4">
                      <span className="text-lg">✦</span>
                    </div>
                    <div className="font-medium">{habit.name}</div>
                  </div>
                  <div className="flex items-center justify-center">
                    {showUser1 ? (
                      <motion.div whileTap={{ scale: 0.95 }}>
                        <Checkbox
                          checked={user1Completed}
                          onCheckedChange={() => toggleHabit(habit.id, 'user1')}
                          className="w-6 h-6"
                        />
                      </motion.div>
                    ) : (
                      <div className="text-gray-300">—</div>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    {showUser2 ? (
                      <motion.div whileTap={{ scale: 0.95 }}>
                        <Checkbox
                          checked={user2Completed}
                          onCheckedChange={() => toggleHabit(habit.id, 'user2')}
                          className="w-6 h-6"
                        />
                      </motion.div>
                    ) : (
                      <div className="text-gray-300">—</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </motion.div>

      {/* Info note about steps */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-blue-50/50 backdrop-blur-sm border border-blue-100 rounded-xl text-sm text-blue-900"
      >
        <strong>Note:</strong> Apple Health integration is not available in this prototype. 
        Update your steps manually via Settings.
      </motion.div>
    </div>
  );
}