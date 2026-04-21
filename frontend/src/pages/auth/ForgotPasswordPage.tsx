import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeft, KeyRound, Mail } from 'lucide-react';
import api from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  otp: z.string().length(6),
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must have uppercase, lowercase and number'),
});

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm({ resolver: zodResolver(resetSchema) });

  const sendOtp = async ({ email: e }: { email: string }) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: e });
      setEmail(e);
      setStep('reset');
      toast.success('OTP sent to your email');
    } catch {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async ({ otp, newPassword }: { otp: string; newPassword: string }) => {
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset! Please sign in.');
      navigate('/auth/login');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Reset failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <MessageSquare size={17} className="text-white" />
        </div>
        <span className="text-lg font-bold text-zinc-100 tracking-tight">Nexus</span>
      </div>

      <div className="w-full max-w-sm">
        <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          {/* Icon + header */}
          <div className="px-8 pt-8 pb-6 border-b border-zinc-800/60">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                {step === 'email' ? (
                  <Mail size={18} className="text-indigo-400" />
                ) : (
                  <KeyRound size={18} className="text-indigo-400" />
                )}
              </div>
              <div>
                <h1 className="text-base font-semibold text-zinc-100 leading-tight">
                  {step === 'email' ? 'Reset password' : 'Enter reset code'}
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {step === 'email'
                    ? "We'll send a code to your email"
                    : `Code sent to ${email}`}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            {step === 'email' ? (
              <form onSubmit={emailForm.handleSubmit(sendOtp)} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...emailForm.register('email')}
                  error={emailForm.formState.errors.email?.message}
                />
                <Button type="submit" className="w-full mt-1" size="lg" loading={loading}>
                  Send reset code
                </Button>
              </form>
            ) : (
              <form onSubmit={resetForm.handleSubmit(resetPassword)} className="space-y-4">
                <Input
                  label="6-digit code"
                  placeholder="123456"
                  maxLength={6}
                  className="text-center tracking-widest text-base"
                  {...resetForm.register('otp')}
                  error={resetForm.formState.errors.otp?.message}
                />
                <Input
                  label="New password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...resetForm.register('newPassword')}
                  error={resetForm.formState.errors.newPassword?.message}
                />
                <Button type="submit" className="w-full mt-1" size="lg" loading={loading}>
                  Reset password
                </Button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 text-center">
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft size={13} />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
