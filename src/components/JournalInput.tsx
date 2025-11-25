import React, { useState } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Check, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface JournalInputProps {
  value: string;
  submitted: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function JournalInput({ value, submitted, onChange, onSubmit }: JournalInputProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (submitted && !isEditing) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 text-green-600">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-4 w-4" />
          </div>
          <span className="text-sm">Journal completed</span>
        </div>
        <div className="p-4 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
          {value || 'No entry'}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="gap-2"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit Entry
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="How did today go? What are you grateful for? What could be better tomorrow?"
        className="min-h-[120px] resize-none bg-white/80 backdrop-blur-sm border-gray-200 focus:border-amber-300 focus:ring-amber-200 transition-all"
      />
      <Button
        onClick={() => {
          onSubmit();
          setIsEditing(false);
        }}
        size="sm"
        disabled={!value.trim()}
        className="bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 gap-2"
      >
        <Check className="h-4 w-4" />
        {submitted ? 'Update Journal' : 'Submit Journal'}
      </Button>
    </motion.div>
  );
}