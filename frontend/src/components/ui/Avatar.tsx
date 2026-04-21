import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}

const sizes = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
};

const gradients = [
  'from-violet-600 to-indigo-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-500',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-purple-600',
];

function getGradient(name: string) {
  return gradients[name.charCodeAt(0) % gradients.length];
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', online }) => {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="relative inline-flex shrink-0">
      {src ? (
        <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ring-1 ring-white/10`} />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${getGradient(name)} flex items-center justify-center font-semibold text-white ring-1 ring-white/10`}>
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-zinc-950 ${
            size === 'lg' ? 'w-3 h-3' : 'w-2 h-2'
          } ${online ? 'bg-emerald-400' : 'bg-zinc-600'}`}
        />
      )}
    </div>
  );
};

export default Avatar;
