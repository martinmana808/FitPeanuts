import React, { useState, useEffect } from 'react';
import { WeightInput } from './WeightInput';
import { StepsInput } from './StepsInput';
import { JournalInput } from './JournalInput';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { motion } from 'framer-motion';
import { Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

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
  user1Avatar?: string;
  user2Avatar?: string;
  customHabits: Array<{
    id: string;
    name: string;
    assignedTo: 'user1' | 'user2' | 'both';
    order?: number;
  }>;
}

interface TodayBoardProps {
  householdCode: string;
  identity: 'user1' | 'user2';
}

// Utility to get today's date in YYYY-MM-DD format (in user's timezone, adjusted for 4am reset)
function getTodayKey(): string {
  const now = new Date();
  // If it's before 4am, use yesterday's date
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1);
  }
  return now.toISOString().split('T')[0];
}

export function TodayBoard({ householdCode, identity }: TodayBoardProps) {
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingHabit, setEditingHabit] = useState<Config['customHabits'][0] | null>(null);
  const [editHabitName, setEditHabitName] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState<'user1' | 'user2' | 'both'>('both');
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitAssignedTo, setNewHabitAssignedTo] = useState<'user1' | 'user2' | 'both'>('both');
  const [localJournalValue, setLocalJournalValue] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // localStorage key for journal drafts
  const getJournalDraftKey = () => `journal_draft_${householdCode}_${getTodayKey()}`;

  const loadJournalDraft = () => {
    return localStorage.getItem(getJournalDraftKey()) || '';
  };

  const clearJournalDraft = () => {
    localStorage.removeItem(getJournalDraftKey());
  };

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
        let todayData = result.data;
        let config = result.config;

        // Initialize defaults for existing households that don't have them
        const needsDefaults = config.customHabits.length === 0 ||
                             todayData.weight.user1 === null ||
                             todayData.weight.user2 === null;

        if (needsDefaults) {
          // Add default habits if missing
          if (config.customHabits.length === 0) {
            const defaultHabits = [
              { name: 'Morning shower', assignedTo: 'both' },
              { name: 'Brush teeth', assignedTo: 'both' },
              { name: 'Walk 10k steps', assignedTo: 'both' },
              { name: 'Gym', assignedTo: 'both' },
              { name: 'Eat sharp', assignedTo: 'both' },
              { name: 'Brush teeth', assignedTo: 'both' }
            ];

            for (const habit of defaultHabits) {
              try {
                const response = await fetch(
                  `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/habits/add`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${publicAnonKey}`
                    },
                    body: JSON.stringify(habit)
                  }
                );
                const addResult = await response.json();
                if (addResult.success) {
                  config = addResult.config;
                }
              } catch (error) {
                console.error('Error adding default habit:', error);
              }
            }
          }

          // Ensure all habits have order field
          config.customHabits = config.customHabits.map((habit, index) => ({
            ...habit,
            order: habit.order ?? index
          }));

          // Set default weights if missing
          if (todayData.weight.user1 === null) {
            try {
              await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/weight`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                  },
                  body: JSON.stringify({ user: 'user1', weight: 88.1 })
                }
              );
              todayData.weight.user1 = 88.1;
            } catch (error) {
              console.error('Error setting default weight for user1:', error);
            }
          }

          if (todayData.weight.user2 === null) {
            try {
              await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/weight`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                  },
                  body: JSON.stringify({ user: 'user2', weight: 65.5 })
                }
              );
              todayData.weight.user2 = 65.5;
            } catch (error) {
              console.error('Error setting default weight for user2:', error);
            }
          }

          // Refetch data to get the updated state
          const refreshResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/today`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`
              }
            }
          );
          const refreshResult = await refreshResponse.json();
          if (refreshResult.success) {
            todayData = refreshResult.data;
            config = refreshResult.config;
          }
        }

        // Handle journal updates - only update if not submitted and no local changes
        const hasLocalDraft = loadJournalDraft();
        const shouldUpdateJournal = !todayData.journalSubmitted && !hasUnsavedChanges && !hasLocalDraft;

        if (shouldUpdateJournal) {
          setLocalJournalValue(todayData.journal || '');
        } else if (!hasUnsavedChanges && hasLocalDraft) {
          // Load draft if no unsaved changes
          setLocalJournalValue(hasLocalDraft);
        }

        // Load local avatars
        const user1AvatarKey = `avatar_${householdCode}_user1`;
        const user2AvatarKey = `avatar_${householdCode}_user2`;
        const localUser1Avatar = localStorage.getItem(user1AvatarKey);
        const localUser2Avatar = localStorage.getItem(user2AvatarKey);

        if (localUser1Avatar) {
          config.user1Avatar = localUser1Avatar;
        }
        if (localUser2Avatar) {
          config.user2Avatar = localUser2Avatar;
        }

        setTodayData(todayData);
        setConfig(config);
      }
    } catch (error) {
      console.error('Error fetching today data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load journal draft on mount
    const draft = loadJournalDraft();
    if (draft) {
      setLocalJournalValue(draft);
    }

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
        if (submitted) {
          clearJournalDraft();
          setHasUnsavedChanges(false);
        }
      }
    } catch (error) {
      console.error('Error updating journal:', error);
    }
  };

  const saveJournalDraft = (content: string) => {
    localStorage.setItem(getJournalDraftKey(), content);
    setHasUnsavedChanges(false);
  };

  const handleJournalChange = (value: string) => {
    setLocalJournalValue(value);
    setHasUnsavedChanges(true);
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

  const openEditHabit = (habit: Config['customHabits'][0]) => {
    setEditingHabit(habit);
    setEditHabitName(habit.name);
    setEditAssignedTo(habit.assignedTo);
  };

  const closeEditHabit = () => {
    setEditingHabit(null);
    setEditHabitName('');
    setEditAssignedTo('both');
  };

  const openAddHabit = () => {
    setAddingHabit(true);
    setNewHabitName('');
    setNewHabitAssignedTo('both');
  };

  const closeAddHabit = () => {
    setAddingHabit(false);
    setNewHabitName('');
    setNewHabitAssignedTo('both');
  };

  const addHabit = async () => {
    if (!newHabitName.trim()) return;

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/habits/add`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            name: newHabitName.trim(),
            assignedTo: newHabitAssignedTo
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        // Ensure the new habit has an order field
        const updatedConfig = {
          ...result.config,
          customHabits: result.config.customHabits.map((habit, index) => ({
            ...habit,
            order: habit.order ?? index
          }))
        };
        setConfig(updatedConfig);
        closeAddHabit();
      }
    } catch (error) {
      console.error('Error adding habit:', error);
    }
  };

  const updateHabit = async () => {
    if (!editingHabit || !editHabitName.trim() || !config) return;

    // Optimistically update the local state
    const updatedHabits = config.customHabits.map(habit =>
      habit.id === editingHabit.id
        ? { ...habit, name: editHabitName.trim(), assignedTo: editAssignedTo }
        : habit
    );
    setConfig({ ...config, customHabits: updatedHabits });
    closeEditHabit();

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/habits/${editingHabit.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            name: editHabitName.trim(),
            assignedTo: editAssignedTo
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        // Server confirmed the update, no need to do anything since we already updated locally
      } else {
        // Revert the optimistic update if server failed
        setConfig(config);
        alert('Failed to update habit. Please try again.');
      }
    } catch (error) {
      console.error('Error updating habit:', error);
      // Revert the optimistic update
      setConfig(config);
      alert('Failed to update habit. Please try again.');
    }
  };

  const deleteHabit = async () => {
    if (!editingHabit) return;

    if (!confirm('Are you sure you want to delete this habit? This action cannot be undone.')) {
      return;
    }

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/habits/${editingHabit.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        // Ensure habits have order field
        const updatedConfig = {
          ...result.config,
          customHabits: result.config.customHabits.map((habit, index) => ({
            ...habit,
            order: habit.order ?? index
          }))
        };
        setConfig(updatedConfig);
        closeEditHabit();
      }
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const moveHabitUp = async () => {
    if (!editingHabit || !config) return;

    const currentIndex = config.customHabits.findIndex(h => h.id === editingHabit.id);
    if (currentIndex <= 0) return;

    const newHabits = [...config.customHabits];
    [newHabits[currentIndex], newHabits[currentIndex - 1]] = [newHabits[currentIndex - 1], newHabits[currentIndex]];

    // Update orders
    newHabits.forEach((habit, index) => {
      habit.order = index;
    });

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/habits/reorder`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            habits: newHabits.map(h => ({ id: h.id, order: h.order }))
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        setConfig(result.config);
      }
    } catch (error) {
      console.error('Error reordering habits:', error);
    }
  };

  const moveHabitDown = async () => {
    if (!editingHabit || !config) return;

    const currentIndex = config.customHabits.findIndex(h => h.id === editingHabit.id);
    if (currentIndex >= config.customHabits.length - 1) return;

    const newHabits = [...config.customHabits];
    [newHabits[currentIndex], newHabits[currentIndex + 1]] = [newHabits[currentIndex + 1], newHabits[currentIndex]];

    // Update orders
    newHabits.forEach((habit, index) => {
      habit.order = index;
    });

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/habits/reorder`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            habits: newHabits.map(h => ({ id: h.id, order: h.order }))
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        setConfig(result.config);
      }
    } catch (error) {
      console.error('Error reordering habits:', error);
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
    <div className="max-w-4xl mx-auto p-4 pb-24 pt-8">
      {/* Elegant Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-baseline justify-between mb-2">
          <h1 className="text-3xl tracking-tight">🥜  FitPeanuts</h1>
          <div className="text-sm text-gray-400">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        
      </motion.div>

      {/* Progress Overview */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4 mb-4"
      >
        <div className="bg-gradient-to-br from-gray-50 to-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              {config.user1Avatar ? (
                <img src={config.user1Avatar} alt={user1Name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-gray-600">{user1Name.charAt(0)}</span>
              )}
            </div>
            <div className="text-sm text-gray-500">{user1Name}</div>
          </div>
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
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              {config.user2Avatar ? (
                <img src={config.user2Avatar} alt={user2Name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-gray-600">{user2Name.charAt(0)}</span>
              )}
            </div>
            <div className="text-sm text-gray-500">{user2Name}</div>
          </div>
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
        
        <div className="grid grid-cols-[2fr,1fr,1fr] gap-4 px-4 py-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b">
          <div className="text-xs uppercase tracking-wider text-gray-500 flex items-center justify-between">
            <span>Habit</span>
            
          </div>
          <div className="text-xs uppercase tracking-wider text-gray-500 text-center">{user1Name}</div>
          <div className="text-xs uppercase tracking-wider text-gray-500 text-center">{user2Name}</div>
        </div>

        {/* Weight Row */}
        <div className="grid grid-cols-[2fr,1fr,1fr] gap-4 px-4 py-4 border-b hover:bg-gray-50/50 transition-colors">
          <div className="flex items-center">
            
            <div>
              <div className="font-medium">Weigh yourself</div>
              <div className="text-xs text-gray-400 mt-0.5">After morning wee</div>
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


        

        {/* Custom Habits */}
        {config.customHabits.length > 0 && (
          <>
            {/* <div className="px-6 py-3 bg-gray-50 border-b">
              <div className="text-xs uppercase tracking-wider text-gray-400">Custom Habits</div>
            </div> */}
            {config.customHabits
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((habit, index) => {
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
                  className="grid grid-cols-[2fr,1fr,1fr] gap-4 px-4 py-4 border-b last:border-b-0 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditHabit(habit);
                      }}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors w-full text-left p-2 -m-2 rounded"
                    >
                      <div className="font-medium habit-name">{habit.name}</div>
                    </button>
                  </div>
                  <div className="flex items-center justify-center">
                    {showUser1 ? (
                      <motion.div whileTap={{ scale: 0.95 }} className="flex">
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
                      <motion.div whileTap={{ scale: 0.95 }} className="flex">
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

        {/* Journal Row - Full Width */}
        <div className="px-4 py-4 border-b ">
          <div className="flex items-center mb-4">
            
            <div>
              <div className="font-medium">Shared Daily Journal</div>
              <div className="text-xs text-gray-400 mt-0.5">Reflect together on your day</div>
            </div>
          </div>
          <JournalInput
            value={localJournalValue}
            submitted={todayData.journalSubmitted}
            onChange={handleJournalChange}
            onSave={() => saveJournalDraft(localJournalValue)}
            onSubmit={() => updateJournal(localJournalValue, true)}
          />
        </div>

      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid mt-4"
      >
        <Button
          variant=""
          size="lg"
          onClick={openAddHabit}
          // className="text-xs h-6 px-2 p-4 border shadow-sm"
        >
          + Add Habit
        </Button>
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
      <div className="p-4 text-center text-sm text-gray-400 font-mono">{householdCode}</div>

      {/* Edit Habit Modal */}
      <Dialog open={!!editingHabit} onOpenChange={closeEditHabit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editHabitName">Habit Name</Label>
              <Input
                id="editHabitName"
                value={editHabitName}
                onChange={(e) => setEditHabitName(e.target.value)}
                placeholder="Enter habit name"
              />
            </div>
            <div>
              <Label>Assigned To</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={editAssignedTo === 'user1' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditAssignedTo('user1')}
                >
                  {config?.user1Name}
                </Button>
                <Button
                  variant={editAssignedTo === 'user2' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditAssignedTo('user2')}
                >
                  {config?.user2Name}
                </Button>
                <Button
                  variant={editAssignedTo === 'both' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditAssignedTo('both')}
                >
                  Both
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={moveHabitUp} disabled={!config || config.customHabits.findIndex(h => h.id === editingHabit?.id) === 0}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={moveHabitDown} disabled={!config || config.customHabits.findIndex(h => h.id === editingHabit?.id) === config.customHabits.length - 1}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={deleteHabit} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" onClick={closeEditHabit}>
                Cancel
              </Button>
              <Button onClick={updateHabit} disabled={!editHabitName.trim()}>
                Save
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Habit Modal */}
      <Dialog open={addingHabit} onOpenChange={closeAddHabit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newHabitName">Habit Name</Label>
              <Input
                id="newHabitName"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="Enter habit name"
              />
            </div>
            <div>
              <Label>Assigned To</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={newHabitAssignedTo === 'user1' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewHabitAssignedTo('user1')}
                >
                  {config?.user1Name}
                </Button>
                <Button
                  variant={newHabitAssignedTo === 'user2' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewHabitAssignedTo('user2')}
                >
                  {config?.user2Name}
                </Button>
                <Button
                  variant={newHabitAssignedTo === 'both' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewHabitAssignedTo('both')}
                >
                  Both
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddHabit}>
              Cancel
            </Button>
            <Button onClick={addHabit} disabled={!newHabitName.trim()}>
              Add Habit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
