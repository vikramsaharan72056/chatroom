import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/20 border border-indigo-500/30',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-600',
  ghost: 'bg-transparent hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-100',
  danger: 'bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/25 hover:border-red-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-lg gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className = '',
  ...props
}) => (
  <button
    disabled={disabled || loading}
    className={`${variants[variant]} ${sizes[size]} font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer ${className}`}
    {...props}
  >
    {loading && (
      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
    )}
    {children}
  </button>
);
