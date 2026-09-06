import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.2 rounded',
    md: 'text-[11px] px-2 py-0.5 rounded-md',
  }[size];

  const variantStyles = {
    neutral: 'bg-slate-800/80 text-slate-300 border border-slate-700/60',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    warning: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
    info: 'bg-sky-500/10 text-sky-400 border border-sky-500/30',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium leading-none tracking-tight ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};