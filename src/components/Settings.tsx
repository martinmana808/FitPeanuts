import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Check, AlertCircle, Loader2, Edit2, X, Bell } from 'lucide-react';

interface Config {
  user1Name: string;
  user2Name: string;
  user1Avatar?: string;
  user2Avatar?: string;
  groqApiKey?: string;
  customHabits: Array<{
    id: string;
    name: string;
    assignedTo: 'user1' | 'user2' | 'both';
    order?: number;
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
  const [groqApiKey, setGroqApiKey] = useState('');
  const [verifyingKey, setVerifyingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotificationStatus('unsupported');
      return;
    }
    setNotificationStatus(Notification.permission);
  }, []);

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator)) return;

    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID Public Key
      const publicKey = 'BEaZDWo5FEqHAuf-XqtxVIrC9wabbdVqkhAtmyPOLUoFgjePYRE6Y5GP4UiCWmKzEHZPH_CzmyK4CMNZZIp6O9Y';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to backend
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/notifications/subscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            subscription,
            userId: identity
          })
        }
      );

      setNotificationStatus('granted');
      alert('Notifications enabled successfully!');
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

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
        
        if (config.groqApiKey) {
          setGroqApiKey(config.groqApiKey);
          setKeyStatus('valid'); // Assume valid if loaded from server, or we could re-verify
        }

        setConfig(config);
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

  const verifyApiKey = async (key: string) => {
    if (!key.trim()) return;
    
    setVerifyingKey(true);
    setKeyStatus('validating');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'user', content: 'ping' }
          ],
          max_tokens: 1
        })
      });

      if (response.ok) {
        setKeyStatus('valid');
        saveApiKey(key);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Verification failed:', errorData);
        setKeyStatus('invalid');
        alert(`Verification failed: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error verifying key:', error);
      setKeyStatus('invalid');
      alert(`Error verifying key: ${String(error)}`);
    } finally {
      setVerifyingKey(false);
    }
  };

  const saveApiKey = async (key: string) => {
    if (!config) return;

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
          body: JSON.stringify({ groqApiKey: key })
        }
      );
      
      const result = await response.json();
      if (result.success) {
        setConfig(result.config);
      }
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  };

  const handleApiKeyChange = (value: string) => {
    setGroqApiKey(value);
    setKeyStatus('idle');
  };

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
        
        if (config.groqApiKey) {
          setGroqApiKey(config.groqApiKey);
          setKeyStatus('valid');
        }

        setConfig(config);
      }
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const moveHabitUp = async (habitId: string) => {
    if (!config) return;

    // Use sorted habits for finding the correct index
    const sortedHabits = [...config.customHabits].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const currentIndex = sortedHabits.findIndex(h => h.id === habitId);
    if (currentIndex <= 0) return;

    console.log('Moving habit up:', habitId, 'from sorted index', currentIndex);

    const newHabits = [...sortedHabits];
    [newHabits[currentIndex], newHabits[currentIndex - 1]] = [newHabits[currentIndex - 1], newHabits[currentIndex]];

    // Update orders
    newHabits.forEach((habit, index) => {
      habit.order = index;
    });

    console.log('New habits order:', newHabits.map(h => ({ id: h.id, name: h.name, order: h.order })));

    // Update local state immediately for responsive UI
    const updatedConfig = {
      ...config,
      customHabits: newHabits
    };
    setConfig(updatedConfig);

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

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Reorder successful, new config:', result.config.customHabits);
          setConfig(result.config);
        } else {
          console.error('Reorder failed:', result);
          // Revert to server state if reorder failed
          fetchConfig();
        }
      } else if (response.status === 404) {
        console.log('Reorder endpoint not available yet - order saved locally');
        // Keep local changes since server doesn't support reordering yet
      } else {
        console.error('Reorder failed with status:', response.status);
        // Revert to server state
        fetchConfig();
      }
    } catch (error) {
      console.error('Error reordering habits:', error);
      // Keep local changes on network error - user can try again later
    }
  };

  const moveHabitDown = async (habitId: string) => {
    if (!config) return;

    // Use sorted habits for finding the correct index
    const sortedHabits = [...config.customHabits].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const currentIndex = sortedHabits.findIndex(h => h.id === habitId);
    if (currentIndex >= sortedHabits.length - 1) return;

    console.log('Moving habit down:', habitId, 'from sorted index', currentIndex);

    const newHabits = [...sortedHabits];
    [newHabits[currentIndex], newHabits[currentIndex + 1]] = [newHabits[currentIndex + 1], newHabits[currentIndex]];

    // Update orders
    newHabits.forEach((habit, index) => {
      habit.order = index;
    });

    console.log('New habits order:', newHabits.map(h => ({ id: h.id, name: h.name, order: h.order })));

    // Update local state immediately for responsive UI
    const updatedConfig = {
      ...config,
      customHabits: newHabits
    };
    setConfig(updatedConfig);

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

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Reorder successful, new config:', result.config.customHabits);
          setConfig(result.config);
        } else {
          console.error('Reorder failed:', result);
          // Revert to server state if reorder failed
          fetchConfig();
        }
      } else if (response.status === 404) {
        console.log('Reorder endpoint not available yet - order saved locally');
        // Keep local changes since server doesn't support reordering yet
      } else {
        console.error('Reorder failed with status:', response.status);
        // Revert to server state
        fetchConfig();
      }
    } catch (error) {
      console.error('Error reordering habits:', error);
      // Keep local changes on network error - user can try again later
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

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Get reminded about your daily habits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notificationStatus === 'unsupported' ? (
            <div className="text-sm text-gray-500">
              Notifications are not supported on this device. Try adding the app to your home screen.
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {notificationStatus === 'granted' 
                  ? 'Notifications are enabled' 
                  : 'Enable push notifications'}
              </div>
              <Button
                onClick={subscribeToNotifications}
                disabled={notificationStatus === 'granted' || subscribing}
                variant={notificationStatus === 'granted' ? 'outline' : 'default'}
              >
                {subscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : notificationStatus === 'granted' ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                {notificationStatus === 'granted' ? 'Enabled' : 'Enable'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
          <CardDescription>
            Configure AI features for journal assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groq-key">Groq API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="groq-key"
                  type="password"
                  value={groqApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="gsk_..."
                  className={keyStatus === 'valid' ? 'border-green-500 focus-visible:ring-green-500' : keyStatus === 'invalid' ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {keyStatus === 'valid' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
              <Button 
                onClick={() => verifyApiKey(groqApiKey)}
                disabled={verifyingKey || !groqApiKey.trim()}
                variant={keyStatus === 'valid' ? 'outline' : 'default'}
                className={keyStatus === 'valid' ? 'text-green-600 border-green-200 hover:bg-green-50' : ''}
              >
                {verifyingKey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : keyStatus === 'valid' ? (
                  'Verified'
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {keyStatus === 'invalid' && (
                <span className="text-red-500 flex items-center gap-1 mr-1">
                  <AlertCircle className="h-3 w-3" /> Invalid key.
                </span>
              )}
              Required for "Tidy with AI" feature. Key is stored securely in your household database.
            </p>
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
              {config.customHabits
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((habit) => (
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
                        {/* <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveHabitUp(habit.id)}
                          disabled={config.customHabits
                            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                            .findIndex(h => h.id === habit.id) === 0}
                        >
                          <ChevronUp className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveHabitDown(habit.id)}
                          disabled={config.customHabits
                            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                            .findIndex(h => h.id === habit.id) === config.customHabits.length - 1}
                        >
                          <ChevronDown className="h-4 w-4 text-gray-600" />
                        </Button> */}
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
