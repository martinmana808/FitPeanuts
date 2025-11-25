import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Check, Copy, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface SetupFlowProps {
  onComplete: (identity: 'user1' | 'user2', householdCode: string) => void;
}

export function SetupFlow({ onComplete }: SetupFlowProps) {
  const [step, setStep] = useState<'identity' | 'action' | 'create' | 'join' | 'showCode'>('identity');
  const [identity, setIdentity] = useState<'user1' | 'user2' | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleIdentitySelect = (id: 'user1' | 'user2') => {
    setIdentity(id);
    setStep('action');
  };

  const handleCreateHousehold = async () => {
    if (!identity) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            user1Name: 'Martin',
            user2Name: 'Elise'
          })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setCreatedCode(data.code);
        setStep('showCode');
      } else {
        setError(data.error || 'Failed to create household');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleJoinHousehold = async () => {
    if (!identity || !joinCode.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f0bd5752/household/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            code: joinCode.trim().toUpperCase()
          })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        onComplete(identity, joinCode.trim().toUpperCase());
      } else {
        setError(data.error || 'Failed to join household');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <CardTitle className="text-2xl mb-2">Shared Discipline</CardTitle>
              <CardDescription className="text-base">
                {step === 'identity' && 'Who are you?'}
                {step === 'action' && 'Create or join a household'}
                {step === 'showCode' && '🎉 Household created!'}
                {step === 'join' && 'Enter household code'}
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent>
            {step === 'identity' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                <Button
                  variant="outline"
                  className="w-full h-16 text-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                  onClick={() => handleIdentitySelect('user1')}
                >
                  Martin
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-16 text-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                  onClick={() => handleIdentitySelect('user2')}
                >
                  Elise
                </Button>
              </motion.div>
            )}

            {step === 'action' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <Button
                  variant="outline"
                  className="w-full h-16 justify-between text-lg hover:bg-gray-50 hover:border-gray-400 transition-all group"
                  onClick={handleCreateHousehold}
                  disabled={loading}
                >
                  <span>{loading ? 'Creating...' : 'Create New Household'}</span>
                  {!loading && <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-16 justify-between text-lg hover:bg-gray-50 hover:border-gray-400 transition-all group"
                  onClick={() => setStep('join')}
                >
                  <span>Join Existing Household</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => {
                    setStep('identity');
                    setIdentity(null);
                  }}
                >
                  Back
                </Button>
              </motion.div>
            )}

            {step === 'showCode' && identity && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl text-center">
                  <div className="text-sm text-green-800 mb-3">Share this code with your partner:</div>
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="text-4xl font-mono tracking-wider mb-4 font-bold text-green-900"
                  >
                    {createdCode}
                  </motion.div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyCode}
                    className="gap-2 border-green-300 hover:bg-green-100"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy Code
                      </>
                    )}
                  </Button>
                </div>
                <Button
                  className="w-full h-12 bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600"
                  onClick={() => onComplete(identity, createdCode)}
                >
                  Continue to App
                </Button>
              </motion.div>
            )}

            {step === 'join' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <Input
                  placeholder="Enter household code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="uppercase text-center text-xl h-14 tracking-wider font-mono"
                />
                <Button
                  className="w-full h-12 bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600"
                  onClick={handleJoinHousehold}
                  disabled={loading || !joinCode.trim()}
                >
                  {loading ? 'Joining...' : 'Join Household'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('action')}
                >
                  Back
                </Button>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
              >
                {error}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}