import React, { useState } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Check, Edit2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface JournalInputProps {
  value: string;
  submitted: boolean;
  onChange: (value: string) => void;
  onSave?: () => void;
  onSubmit: () => void;
  apiKey?: string;
}

export function JournalInput({ value, submitted, onChange, onSave, onSubmit, apiKey }: JournalInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isTidying, setIsTidying] = useState(false);

  const tidyJournal = async () => {
    if (!apiKey || !value.trim()) return;

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
              content: value
            }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        onChange(data.choices[0].message.content);
      }
    } catch (error) {
      console.error('Error tidying journal:', error);
      alert('Failed to tidy journal. Please check your API key.');
    } finally {
      setIsTidying(false);
    }
  };

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
      <div className="flex gap-2">
        {apiKey && !submitted && (
          <Button
            onClick={tidyJournal}
            variant="outline"
            size="sm"
            disabled={!value.trim() || isTidying}
            className="gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isTidying ? 'animate-spin' : ''}`} />
            {isTidying ? 'Tidying...' : 'Tidy'}
          </Button>
        )}
        {onSave && (
          <Button
            onClick={() => onSave()}
            variant="outline"
            size="sm"
            disabled={!value.trim()}
            className="gap-2"
          >
            Save Draft
          </Button>
        )}
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
      </div>
    </motion.div>
  );
}
