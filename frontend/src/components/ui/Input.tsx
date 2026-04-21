import { useId, forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelRight?: ReactNode;
  error?: string;
  hint?: string;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelRight, error, hint, rightElement, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {(label || labelRight) && (
          <div className="flex items-center justify-between gap-2">
            {label && (
              <label htmlFor={inputId} className="text-xs font-medium text-zinc-400 select-none">
                {label}
              </label>
            )}
            {labelRight && <div>{labelRight}</div>}
          </div>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-zinc-900 border ${
              error
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/10'
                : 'border-zinc-800 focus:border-indigo-500/60 focus:ring-indigo-500/10'
            } rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:ring-2 ${
              rightElement ? 'pr-10' : ''
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
              {rightElement}
            </div>
          )}
        </div>
        {hint && !error && <p className="text-xs text-zinc-600 mt-0.5">{hint}</p>}
        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
