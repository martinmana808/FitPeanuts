import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Trash2, Edit2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

interface Config {
  user1Name: string;
  user2Name: string;
  user1Avatar?: string;
  user2Avatar?: string;
  customHabits: Array<{
    id: string;
    name: string;
    assignedTo: 'user1' | 'user2' | 'both';
  }>;
}

interface SettingsProps {
  householdCode: string;
  identity: 'user1' | 'user2';
}

export function Settings({ householdCode, identity }: SettingsProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editHabitName, setEditHabitName] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState<'user1' | 'user2' | 'both'>('both');

  const fetchConfig = async () => {
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
        setConfig(result.config);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [householdCode]);


  const startEditHabit = (habit: Config['customHabits'][0]) => {
    setEditingHabitId(habit.id);
    setEditHabitName(habit.name);
    setEditAssignedTo(habit.assignedTo);
  };

  const cancelEditHabit = () => {
    setEditingHabitId(null);
    setEditHabitName('');
    setEditAssignedTo('both');
  };

  const updateHabit = async () => {
    if (!editingHabitId || !editHabitName.trim() || !config) return;

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/habits/${editingHabitId}`,
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
        setConfig(result.config);
        cancelEditHabit();
      } else {
        alert('Failed to update habit. Please try again.');
      }
    } catch (error) {
      console.error('Error updating habit:', error);
      alert('Failed to update habit. Please try again.');
    }
  };

  const handleAvatarUpload = async (user: 'user1' | 'user2', file: File | undefined) => {
    if (!file || !config) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Convert file to base64 for storage
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;

      // Store locally in localStorage for immediate display
      const avatarKey = `avatar_${householdCode}_${user}`;
      localStorage.setItem(avatarKey, base64);

      // Update local state immediately
      const updatedConfig = {
        ...config,
        [user === 'user1' ? 'user1Avatar' : 'user2Avatar']: base64
      };
      setConfig(updatedConfig);

      // Try to upload to server (will fail until functions are deployed)
      try {
        const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/config`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              [user === 'user1' ? 'user1Avatar' : 'user2Avatar']: base64
            })
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Remove from localStorage since server now has it
            localStorage.removeItem(avatarKey);
            console.log('Avatar uploaded to server successfully');
          }
        } else {
          console.log('Server upload failed, keeping local copy');
        }
      } catch (error) {
        console.log('Server upload failed, keeping local copy:', error);
      }

      alert('Avatar uploaded successfully! (Stored locally until server sync)');
    };

    reader.onerror = () => {
      console.error('File reading error');
      alert('Error reading file. Please try again.');
    };

    reader.readAsDataURL(file);
  };

  const deleteHabit = async (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit? This action cannot be undone.')) {
      return;
    }

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/habits/${habitId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        let config = result.config;

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

        setConfig(config);
      }
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const moveHabitUp = async (habitId: string) => {
    if (!config) return;

    const currentIndex = config.customHabits.findIndex(h => h.id === habitId);
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

  const moveHabitDown = async (habitId: string) => {
    if (!config) return;

    const currentIndex = config.customHabits.findIndex(h => h.id === habitId);
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


  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 space-y-6">
      <div>
        <div className="text-sm text-gray-500 mb-1">Settings</div>
        <div className="text-gray-400 text-xs">Household: {householdCode}</div>
      </div>

      {/* Avatar Management */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Pictures</CardTitle>
          {/* <CardDescription>
            Upload profile pictures for you and your partner
          </CardDescription> */}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="aspect-square w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                {config.user1Avatar ? (
                  <img src={config.user1Avatar} alt={config.user1Name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-medium text-gray-600">{config.user1Name.charAt(0)}</span>
                )}
              </div>
              <div className="text-sm font-medium">{config.user1Name}</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleAvatarUpload('user1', e.target.files?.[0])}
                className="text-xs avatar-input"
                id="user1-avatar"
              />
              <label htmlFor="user1-avatar" className="text-xs text-blue-600 cursor-pointer hover:underline">
                Add/Change photo
              </label>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="aspect-square w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                {config.user2Avatar ? (
                  <img src={config.user2Avatar} alt={config.user2Name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-medium text-gray-600">{config.user2Name.charAt(0)}</span>
                )}
              </div>
              <div className="text-sm font-medium">{config.user2Name}</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleAvatarUpload('user2', e.target.files?.[0])}
                className="text-xs avatar-input"
                id="user2-avatar"
              />
              <label htmlFor="user2-avatar" className="text-xs text-blue-600 cursor-pointer hover:underline">
                Add/Change photo
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Habits */}
      {config.customHabits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Habits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="">
              {config.customHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="pt-4 mt-4 border-t rounded custom-habit-settings"
                >
                  {editingHabitId === habit.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`edit-name-${habit.id}`}>Habit Name</Label>
                        <Input
                          id={`edit-name-${habit.id}`}
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
                            {config.user1Name}
                          </Button>
                          <Button
                            variant={editAssignedTo === 'user2' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setEditAssignedTo('user2')}
                          >
                            {config.user2Name}
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
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={updateHabit}
                          disabled={!editHabitName.trim()}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditHabit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div>{habit.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {habit.assignedTo === 'both'
                            ? 'Both'
                            : habit.assignedTo === 'user1'
                            ? config.user1Name
                            : config.user2Name}
                        </div>
                      </div>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveHabitUp(habit.id)}
                          disabled={config.customHabits.findIndex(h => h.id === habit.id) === 0}
                        >
                          <ChevronUp className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveHabitDown(habit.id)}
                          disabled={config.customHabits.findIndex(h => h.id === habit.id) === config.customHabits.length - 1}
                        >
                          <ChevronDown className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditHabit(habit)}
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteHabit(habit.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Household Info */}
      <Card>
        <CardHeader>
          <CardTitle>Household Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="text-gray-500">Code:</span> <span className="font-mono">{householdCode}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Users:</span> {config.user1Name} & {config.user2Name}
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Your identity:</span> {identity === 'user1' ? config.user1Name : config.user2Name}
          </div>
        </CardContent>
      </Card>

      {/* Reset App */}
      <Card>
        <CardHeader>
          <CardTitle>Reset App</CardTitle>
          <CardDescription>
            Clear your device's connection to this household
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm('Are you sure? This will disconnect your device from the household. Your data will remain on the server.')) {
                localStorage.removeItem('discipline_identity');
                localStorage.removeItem('discipline_household');
                window.location.reload();
              }
            }}
          >
            Reset Device
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
