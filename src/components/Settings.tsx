import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Trash2 } from 'lucide-react';

interface Config {
  user1Name: string;
  user2Name: string;
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
  const [newHabitName, setNewHabitName] = useState('');
  const [assignedTo, setAssignedTo] = useState<'user1' | 'user2' | 'both'>('both');
  const [manualSteps, setManualSteps] = useState('');
  const [loading, setLoading] = useState(true);

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
            assignedTo
          })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setConfig(result.config);
        setNewHabitName('');
        setAssignedTo('both');
      }
    } catch (error) {
      console.error('Error adding habit:', error);
    }
  };

  const deleteHabit = async (habitId: string) => {
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
        setConfig(result.config);
      }
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const updateSteps = async () => {
    const steps = parseInt(manualSteps);
    if (isNaN(steps) || steps < 0) return;
    
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/steps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            user: identity,
            steps
          })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setManualSteps('');
        alert('Steps updated!');
      }
    } catch (error) {
      console.error('Error updating steps:', error);
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

      {/* Manual Steps Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Step Entry</CardTitle>
          <CardDescription>
            Update your step count manually (Apple Health integration not available in prototype)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="steps">Steps for {identity === 'user1' ? config.user1Name : config.user2Name}</Label>
            <Input
              id="steps"
              type="number"
              placeholder="10000"
              value={manualSteps}
              onChange={(e) => setManualSteps(e.target.value)}
              min="0"
            />
          </div>
          <Button onClick={updateSteps} disabled={!manualSteps}>
            Update Steps
          </Button>
        </CardContent>
      </Card>

      {/* Add Custom Habit */}
      <Card>
        <CardHeader>
          <CardTitle>Add Custom Habit</CardTitle>
          <CardDescription>
            Create a new habit for Martin, Elise, or both
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="habitName">Habit Name</Label>
            <Input
              id="habitName"
              placeholder="e.g., Read for 30 minutes"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
            />
          </div>
          <div>
            <Label>Assigned To</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={assignedTo === 'user1' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAssignedTo('user1')}
              >
                {config.user1Name}
              </Button>
              <Button
                variant={assignedTo === 'user2' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAssignedTo('user2')}
              >
                {config.user2Name}
              </Button>
              <Button
                variant={assignedTo === 'both' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAssignedTo('both')}
              >
                Both
              </Button>
            </div>
          </div>
          <Button onClick={addHabit} disabled={!newHabitName.trim()}>
            Add Habit
          </Button>
        </CardContent>
      </Card>

      {/* Existing Habits */}
      {config.customHabits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Habits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {config.customHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteHabit(habit.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
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