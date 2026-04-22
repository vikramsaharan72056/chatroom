import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Eye, EyeOff, ShieldCheck, Users, Zap } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { signupThunk } from '../../features/auth/authSlice';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { OtpVerifyModal } from './OtpVerifyModal';
import toast from 'react-hot-toast';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(60),
    email: z.string().email('Please enter a valid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must have uppercase, lowercase and a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

interface StrengthResult {
  score: number;
  label: string;
  barColor: string;
  textColor: string;
}

function getPasswordStrength(pwd: string): StrengthResult {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score, label: 'Weak',      barColor: 'bg-red-500',    textColor: 'text-red-400'    };
  if (score === 2) return { score, label: 'Fair',      barColor: 'bg-amber-500',  textColor: 'text-amber-400'  };
  if (score === 3) return { score, label: 'Good',      barColor: 'bg-yellow-400', textColor: 'text-yellow-400' };
  if (score === 4) return { score, label: 'Strong',    barColor: 'bg-emerald-500',textColor: 'text-emerald-400'};
  return             { score, label: 'Very strong', barColor: 'bg-emerald-400', textColor: 'text-emerald-300'};
}

const PERKS = [
  { icon: Zap,         text: 'Up and running in minutes'   },
  { icon: Users,       text: 'Invite your whole team free' },
  { icon: ShieldCheck, text: 'Secure by default'           },
] as const;

function SignupPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loading = useAppSelector((s) => s.auth.loading);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const passwordValue = watch('password') ?? '';
  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: FormData) => {
    const result = await dispatch(
      signupThunk({ name: data.name, email: data.email, password: data.password }),
    );
    if (signupThunk.fulfilled.match(result)) {
      setPendingEmail(data.email);
    } else {
      toast.error(result.payload as string);
    }
  };

  return (
    <>
      <div className="min-h-screen flex bg-zinc-950">

        {/* ── Left branding panel (lg+) ── */}
        <div className="hidden lg:flex w-[420px] xl:w-[480px] shrink-0 flex-col bg-zinc-900 border-r border-zinc-800/80 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-indigo-600 opacity-[0.08] blur-3xl" />
            <div className="absolute bottom-10 -left-16 w-64 h-64 rounded-full bg-violet-500 opacity-[0.05] blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <MessageSquare size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-zinc-100 tracking-tight">Nexus</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-[0.18em] mb-5">
                Get started free
              </p>
              <h2 className="text-[2.4rem] font-bold text-zinc-100 leading-[1.18] tracking-tight">
                Your team's<br />
                new home for<br />
                <span className="text-indigo-400">conversations.</span>
              </h2>
              <p className="mt-6 text-zinc-400 text-sm leading-[1.8] max-w-[270px]">
                Create your free workspace and start collaborating in minutes.
              </p>

              <ul className="mt-10 space-y-5">
                {PERKS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3.5">
                    <span className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-indigo-400" />
                    </span>
                    <span className="text-sm text-zinc-400">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-zinc-700">© 2025 Nexus. All rights reserved.</p>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 sm:px-10">
            <div className="w-full max-w-[400px]">

              {/* Mobile-only logo */}
              <div className="flex items-center gap-2.5 mb-10 lg:hidden">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <MessageSquare size={17} className="text-white" />
                </div>
                <span className="text-lg font-bold text-zinc-100 tracking-tight">Nexus</span>
              </div>

              {/*
                Mobile: card container
                Desktop: transparent, form sits natively on panel bg
              */}
              <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden lg:bg-transparent lg:border-0 lg:shadow-none lg:rounded-none lg:overflow-visible">

                {/* Gradient accent line — mobile only */}
                <div className="lg:hidden absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

                {/* Header */}
                <div className="px-8 pt-8 pb-6 border-b border-zinc-800/60 lg:px-0 lg:pt-0 lg:pb-0 lg:border-0 lg:mb-8">
                  <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Create account</h1>
                  <p className="mt-1 text-sm text-zinc-500">
                    Join Nexus and start collaborating with your team.
                  </p>
                </div>

                {/* Form */}
                <div className="px-8 py-6 lg:px-0 lg:py-0">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <Input
                      label="Full name"
                      placeholder="Jane Smith"
                      autoComplete="name"
                      {...register('name')}
                      error={errors.name?.message}
                    />

                    <Input
                      label="Email address"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...register('email')}
                      error={errors.email?.message}
                    />

                    {/* Password + strength meter */}
                    <div>
                      <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...register('password')}
                        error={errors.password?.message}
                        rightElement={
                          <button
                            type="button"
                            onClick={() => setShowPassword((p) => !p)}
                            tabIndex={-1}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        }
                      />
                      {passwordValue.length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          <div className="flex gap-1">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                  i < strength.score ? strength.barColor : 'bg-zinc-800'
                                }`}
                              />
                            ))}
                          </div>
                          <p className={`text-xs font-medium ${strength.textColor}`}>
                            {strength.label}
                          </p>
                        </div>
                      )}
                    </div>

                    <Input
                      label="Confirm password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...register('confirmPassword')}
                      error={errors.confirmPassword?.message}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowConfirm((p) => !p)}
                          tabIndex={-1}
                          aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      }
                    />

                    <div className="pt-1">
                      <Button type="submit" className="w-full" size="lg" loading={loading}>
                        Create account
                      </Button>
                    </div>
                  </form>

                  <p className="mt-5 text-center text-[11px] text-zinc-600 leading-relaxed">
                    By creating an account you agree to our{' '}
                    <span className="text-zinc-500 cursor-pointer hover:text-zinc-400 transition-colors">Terms of Service</span>
                    {' '}and{' '}
                    <span className="text-zinc-500 cursor-pointer hover:text-zinc-400 transition-colors">Privacy Policy</span>.
                  </p>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-zinc-800/60 bg-zinc-950/40 text-center lg:px-0 lg:py-0 lg:border-0 lg:bg-transparent lg:mt-6">
                  <p className="text-sm text-zinc-500">
                    Already have an account?{' '}
                    <Link
                      to="/auth/login"
                      className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {pendingEmail && (
        <OtpVerifyModal
          email={pendingEmail}
          purpose="verify"
          onSuccess={() => {
            toast.success('Email verified! Please sign in.');
            navigate('/auth/login');
          }}
          onClose={() => setPendingEmail(null)}
        />
      )}
    </>
  );
}

export default SignupPage;
