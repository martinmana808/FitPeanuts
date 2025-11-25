import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';

interface StepsInputProps {
  steps: number;
  userName: string;
}

export function StepsInput({ steps, userName }: StepsInputProps) {
  const isCompleted = steps >= 10000;
  const percentage = Math.min(100, (steps / 10000) * 100);

  return (
    <div className="flex items-center gap-2 w-full max-w-[120px]">
      <motion.div
        animate={{ scale: isCompleted ? 1 : 0.9 }}
        transition={{ duration: 0.2 }}
        className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${
          isCompleted 
            ? 'bg-green-500 border-green-500' 
            : 'bg-white border-gray-300'
        }`}
      >
        {isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Check className="h-4 w-4 text-white" />
          </motion.div>
        )}
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-1 truncate">
          {steps.toLocaleString()}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full transition-colors ${
              isCompleted 
                ? 'bg-gradient-to-r from-green-500 to-green-400' 
                : 'bg-gradient-to-r from-gray-400 to-gray-300'
            }`}
          />
        </div>
      </div>
    </div>
  );
}