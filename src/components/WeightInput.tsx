import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'framer-motion';

interface WeightInputProps {
  value: number | null;
  onChange: (weight: number) => void;
  userName: string;
}

export function WeightInput({ value, onChange, userName }: WeightInputProps) {
  const currentWeight = value || 70.0;

  const increment = () => {
    onChange(Math.round((currentWeight + 0.1) * 10) / 10);
  };

  const decrement = () => {
    onChange(Math.round((currentWeight - 0.1) * 10) / 10);
  };

  const isCompleted = value !== null;

  return (
    <div className="">
      <motion.div 
        animate={{ 
          opacity: isCompleted ? 1 : 0.4,
          scale: isCompleted ? 1 : 0.98
        }}
        transition={{ duration: 0.2 }}
        className="min-w-[70px] text-center font-medium w-100"
      >
        <div className="text-2xl">{currentWeight.toFixed(1)}</div>
        {/* <div className="text-xs text-gray-400">kg</div> */} 
      </motion.div>
      <div className="flex items-center gap-1 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={decrement}
          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={increment}
          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
