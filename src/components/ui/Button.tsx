import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'secondary', size = 'md', icon, className = '', disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

    const sizeStyles = {
      sm: 'h-8 px-2.5 text-xs',
      md: 'h-9 px-3.5 text-xs sm:text-sm',
      lg: 'h-10 px-4 text-sm',
    }[size];

    const variantStyles = {
      primary:
        'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm border border-blue-600',
      secondary:
        'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 active:bg-slate-100 shadow-sm',
      outline:
        'bg-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-300',
      ghost:
        'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      danger:
        'bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200 border border-red-200',
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