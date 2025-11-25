import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WeightData {
  date: string;
  user1Weight: number | null;
  user2Weight: number | null;
}

interface WeightGraphProps {
  data: WeightData[];
  user1Name: string;
  user2Name: string;
}

export function WeightGraph({ data, user1Name, user2Name }: WeightGraphProps) {
  // Filter out entries with no weight data and sort by date
  const chartData = data
    .filter(d => d.user1Weight !== null || d.user2Weight !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      [user1Name]: d.user1Weight,
      [user2Name]: d.user2Weight
    }));

  if (chartData.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No weight data recorded yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          domain={['dataMin - 2', 'dataMax + 2']}
          label={{ value: 'kg', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey={user1Name} 
          stroke="#000000" 
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
        <Line 
          type="monotone" 
          dataKey={user2Name} 
          stroke="#6b7280" 
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
