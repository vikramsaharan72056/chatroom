import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail } from 'lucide-react';
import api from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const schema = z.object({ otp: z.string().length(6, 'OTP must be 6 digits') });
type FormData = z.infer<typeof schema>;

interface Props {
  email: string;
  purpose: 'verify' | 'reset';
  onSuccess: () => void;
  onClose: () => void;
}

export const OtpVerifyModal: React.FC<Props> = ({ email, purpose, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ otp }: FormData) => {
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { email, otp });
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Invalid OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email, type: purpose });
      toast.success('OTP resent');
    } catch {
      toast.error('Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <Modal open title="Verify your email" onClose={onClose}>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
          <Mail size={22} className="text-indigo-400" />
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-[260px]">
          Enter the 6-digit code sent to{' '}
          <span className="text-zinc-200 font-medium">{email}</span>
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Verification code"
          placeholder="1 2 3 4 5 6"
          maxLength={6}
          className="text-center tracking-[0.5em] text-lg font-medium"
          {...register('otp')}
          error={errors.otp?.message}
        />
        <Button type="submit" className="w-full h-11 font-semibold" loading={loading}>
          Verify email
        </Button>
      </form>
      <div className="mt-5 pt-4 border-t border-zinc-800/60 text-center">
        <button
          onClick={resend}
          disabled={resending}
          className="text-xs text-zinc-500 hover:text-indigo-400 disabled:opacity-40 transition-colors"
        >
          {resending ? 'Sending…' : "Didn't receive a code? Resend"}
        </button>
      </div>
    </Modal>
  );
};
