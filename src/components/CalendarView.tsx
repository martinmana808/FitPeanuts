import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMonthData = async () => {
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/calendar/${year}/${month}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        const dataMap: Record<string, DayData> = {};
        result.days.forEach((day: DayData) => {
          dataMap[day.date] = day;
        });
        setMonthData(dataMap);
        setConfig(result.config);
      }
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
    setEditDialogOpen(true);
  };

  const updateDayData = async (updates: Partial<DayData>) => {
    if (!selectedDay) return;
    
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/${householdCode}/day/${selectedDay.date}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(updates)
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setMonthData((prev) => ({
          ...prev,
          [selectedDay.date]: result.data
        }));
        setSelectedDay(result.data);
      }
    } catch (error) {
      console.error('Error updating day data:', error);
    }
  };

  const getWeightGraphData = () => {
    return Object.values(monthData).map(day => ({
      date: day.date,
      user1Weight: day.weight.user1,
      user2Weight: day.weight.user2
    }));
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
      <div className="grid grid-cols-7 gap-2">
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
                isToday ? 'ring-2 ring-black' : ''
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
              <DialogTitle>{selectedDay.date}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Weight */}
              <div>
                <Label>Weight - {config?.user1Name}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={selectedDay.weight.user1 || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : null;
                    updateDayData({ weight: { ...selectedDay.weight, user1: value } });
                  }}
                />
              </div>
              <div>
                <Label>Weight - {config?.user2Name}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={selectedDay.weight.user2 || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : null;
                    updateDayData({ weight: { ...selectedDay.weight, user2: value } });
                  }}
                />
              </div>

              {/* Journal */}
              <div>
                <Label>Journal</Label>
                <Textarea
                  value={selectedDay.journal}
                  onChange={(e) => {
                    updateDayData({ journal: e.target.value });
                  }}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}