import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'secondary', size = 'md', icon, className = '', disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-50 disabled:pointer-events-none select-none';

    const sizeStyles = {
      sm: 'h-8 px-2.5 text-xs',
      md: 'h-9 px-3.5 text-xs',
      lg: 'h-10 px-4 text-sm',
    }[size];

    const variantStyles = {
      primary:
        'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 shadow-sm shadow-indigo-950/50 border border-indigo-500/40',
      secondary:
        'bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-800 active:bg-slate-950 shadow-sm',
      outline:
        'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700',
      ghost:
        'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-850',
      danger:
        'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:bg-rose-500/30 border border-rose-500/30',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';