import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Eye, EyeOff, Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { loginThunk } from '../../features/auth/authSlice';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

const FEATURES = [
  'Real-time messaging & notifications',
  'Public & private channels',
  'Seamless team collaboration',
] as const;

function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loading = useAppSelector((s) => s.auth.loading);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const result = await dispatch(loginThunk(data));
    if (loginThunk.fulfilled.match(result)) {
      navigate('/');
    } else {
      toast.error(result.payload as string);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-950">

      {/* ── Left branding panel (lg+) ── */}
      <div className="hidden lg:flex w-[480px] xl:w-[540px] shrink-0 flex-col bg-zinc-900 border-r border-zinc-800 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[540px] h-[540px] rounded-full bg-indigo-600 opacity-[0.07] blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-violet-500 opacity-[0.05] blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <MessageSquare size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-100 tracking-tight">Nexus</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-[0.15em] mb-5">
              Team Communication
            </p>
            <h2 className="text-[2.75rem] font-bold text-zinc-100 leading-[1.15] tracking-tight">
              Where teams<br />
              come together<br />
              <span className="text-indigo-400">to create.</span>
            </h2>
            <p className="mt-6 text-zinc-400 text-sm leading-[1.8] max-w-[300px]">
              Real-time messaging, organized channels, and instant collaboration — all in one workspace.
            </p>

            <ul className="mt-10 space-y-4">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Check size={9} className="text-indigo-400" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-zinc-400">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-zinc-700">© 2025 Nexus. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-12 overflow-y-auto">
        <div className="w-full max-w-[420px]">

          {/* Logo — visible on all screen sizes above the card */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <MessageSquare size={17} className="text-white" />
            </div>
            <span className="text-lg font-bold text-zinc-100 tracking-tight">Nexus</span>
          </div>

          {/* Card */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
            {/* Top accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

            {/* Card header */}
            <div className="px-8 pt-8 pb-6 border-b border-zinc-800/60">
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Sign in</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Welcome back. Enter your credentials below.
              </p>
            </div>

            {/* Form */}
            <div className="px-8 py-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email')}
                  error={errors.email?.message}
                />

                <Input
                  label="Password"
                  labelRight={
                    <Link
                      to="/auth/forgot-password"
                      className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  }
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  error={errors.password?.message}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Sign in to workspace
                </Button>
              </form>
            </div>

            {/* Card footer */}
            <div className="px-8 py-5 border-t border-zinc-800/60 bg-zinc-950/40 text-center">
              <p className="text-sm text-zinc-500">
                New to Nexus?{' '}
                <Link
                  to="/auth/signup"
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
