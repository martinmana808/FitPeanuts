import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { WeightGraph } from './WeightGraph';

interface DayData {
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
  user2Avatar?: string;
  groqApiKey?: string;
  customHabits: Array<{
    id: string;
    name: string;
    assignedTo: 'user1' | 'user2' | 'both';
  }>;
}

interface CalendarViewProps {
  householdCode: string;
  identity: 'user1' | 'user2';
}

export function CalendarView({ householdCode, identity }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState<Record<string, DayData>>({});
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [draftDay, setDraftDay] = useState<DayData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTidying, setIsTidying] = useState(false);

  const tidyJournal = async () => {
    const apiKey = config?.groqApiKey;
    if (!apiKey || !draftDay?.journal.trim()) return;

    setIsTidying(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that tidies up journal entries. Fix grammar, spelling, and punctuation. Make the tone calm and reflective. Keep the meaning exactly the same. Do not add any conversational filler. Just return the tidied text.'
            },
            {
              role: 'user',
              content: draftDay.journal
            }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        setDraftDay({
          ...draftDay,
          journal: data.choices[0].message.content,
          journalSubmitted: true
        });
      }
    } catch (error) {
      console.error('Error tidying journal:', error);
      alert('Failed to tidy journal. Please check your API key.');
    } finally {
      setIsTidying(false);
    }
  };

  const fetchMonthData = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      // Calculate the 3 months to fetch (current, -1, -2)
      const monthsToFetch = [0, 1, 2].map(offset => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - offset, 1);
        return {
          year: d.getFullYear(),
          month: String(d.getMonth() + 1).padStart(2, '0')
        };
      });

      const responses = await Promise.all(monthsToFetch.map(({ year, month }) => 
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/calendar/${year}/${month}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        ).then(res => res.json())
      ));
      
      const dataMap: Record<string, DayData> = {};
      let lastConfig = null;

      responses.forEach(result => {
        if (result.success) {
          result.days.forEach((day: DayData) => {
            dataMap[day.date] = day;
          });
          if (result.config) lastConfig = result.config;
        }
      });

      setMonthData(dataMap);
      if (lastConfig) setConfig(lastConfig);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthData();
  }, [householdCode, currentDate]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const getCompletionColor = (dateString: string): string => {
    const dayData = monthData[dateString];
    if (!dayData) return 'bg-white';
    
    let completed = 0;
    let total = 0;
    
    // Weight (2 points)
    if (dayData.weight.user1 !== null) completed++;
    if (dayData.weight.user2 !== null) completed++;
    total += 2;
    
    // Steps (2 points)
    if (dayData.steps.user1 >= 10000) completed++;
    if (dayData.steps.user2 >= 10000) completed++;
    total += 2;
    
    // Journal (1 point for both)
    if (dayData.journalSubmitted) completed++;
    total += 1;
    
    // Custom habits
    if (config) {
      config.customHabits.forEach((habit) => {
        if (habit.assignedTo === 'both') {
          if (dayData.habits[habit.id]?.user1) completed++;
          if (dayData.habits[habit.id]?.user2) completed++;
          total += 2;
        } else {
          const user = habit.assignedTo;
          if (dayData.habits[habit.id]?.[user]) completed++;
          total += 1;
        }
      });
    }
    
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    if (percentage === 100) return 'bg-green-100 border-green-300';
    if (percentage >= 75) return 'bg-green-50 border-green-200';
    if (percentage >= 50) return 'bg-yellow-50 border-yellow-200';
    if (percentage > 0) return 'bg-red-50 border-red-200';
    return 'bg-white';
  };

  const handleDayClick = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    
    const dayData = monthData[dateString] || {
      date: dateString,
      weight: { user1: null, user2: null },
      steps: { user1: 0, user2: 0 },
      journal: '',
      journalSubmitted: false,
      habits: {}
    };
    
    setSelectedDay(dayData);
    setDraftDay(JSON.parse(JSON.stringify(dayData))); // Deep copy for draft
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!draftDay) return;
    
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/day/${draftDay.date}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(draftDay)
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setMonthData((prev) => ({
          ...prev,
          [draftDay.date]: result.data
        }));
        setSelectedDay(result.data);
        setEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating day data:', error);
    }
  };

  const getWeightGraphData = () => {
    // Get the last day of the currently viewed month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Calculate 90 days ago
    const ninetyDaysAgo = new Date(lastDayOfMonth);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return Object.values(monthData)
      .filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= ninetyDaysAgo && dayDate <= lastDayOfMonth;
      })
      .map(day => ({
        date: day.date,
        user1Weight: day.weight.user1,
        user2Weight: day.weight.user2
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const days = getDaysInMonth();

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 space-y-6">
      {/* Weight Graph */}
      {config && Object.keys(monthData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weight Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightGraph 
              data={getWeightGraphData()} 
              user1Name={config.user1Name}
              user2Name={config.user2Name}
            />
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm text-gray-500 pb-2">
            {day}
          </div>
        ))}
        
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />;
          }
          
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const dayStr = String(day).padStart(2, '0');
          const dateString = `${year}-${month}-${dayStr}`;
          const colorClass = getCompletionColor(dateString);
          
          // Check if this is today
          const today = new Date();
          const isToday = 
            year === today.getFullYear() &&
            currentDate.getMonth() === today.getMonth() &&
            day === today.getDate();
          
          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`aspect-square border rounded flex items-center justify-center hover:border-gray-400 transition-colors ${colorClass} ${
                isToday ? 'ring-2 ring-black z-50' : ''
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex gap-4 text-xs text-gray-600 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
          <span>100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-200 rounded" />
          <span>75-99%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded" />
          <span>50-74%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded" />
          <span>1-49%</span>
        </div>
      </div>

      {/* Edit Dialog */}
      {selectedDay && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{draftDay?.date}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Weight */}
              <div>
                <Label>Weight - {config?.user1Name}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={draftDay?.weight.user1 || ''}
                  onChange={(e) => {
                    if (!draftDay) return;
                    const value = e.target.value ? parseFloat(e.target.value) : null;
                    setDraftDay({
                      ...draftDay,
                      weight: { ...draftDay.weight, user1: value }
                    });
                  }}
                />
              </div>
              <div>
                <Label>Weight - {config?.user2Name}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={draftDay?.weight.user2 || ''}
                  onChange={(e) => {
                    if (!draftDay) return;
                    const value = e.target.value ? parseFloat(e.target.value) : null;
                    setDraftDay({
                      ...draftDay,
                      weight: { ...draftDay.weight, user2: value }
                    });
                  }}
                />
              </div>

              {/* Journal */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Journal</Label>
                  {config?.groqApiKey && (
                    <Button
                      onClick={tidyJournal}
                      variant="ghost"
                      size="sm"
                      disabled={!draftDay?.journal.trim() || isTidying}
                      className="h-6 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <Sparkles className={`h-3 w-3 ${isTidying ? 'animate-spin' : ''}`} />
                      {isTidying ? 'Tidying...' : 'Tidy with AI'}
                    </Button>
                  )}
                </div>
                <Textarea
                  value={draftDay?.journal || ''}
                  onChange={(e) => {
                    if (!draftDay) return;
                    setDraftDay({
                      ...draftDay,
                      journal: e.target.value,
                      journalSubmitted: !!e.target.value.trim()
                    });
                  }}
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
