import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'elevated';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', className = '', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-slate-900/90 border border-slate-800/90 rounded-xl',
      subtle: 'bg-slate-950/60 border border-slate-850 rounded-lg',
      elevated: 'bg-slate-900 border border-slate-750 rounded-xl shadow-lg shadow-black/20',
    }[variant];

    return (
      <div ref={ref} className={`${variantStyles} overflow-hidden ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 sm:p-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-sm sm:text-base font-semibold text-slate-100 tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs text-slate-400 mt-0.5 leading-normal ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 sm:p-5 ${className}`} {...props}>
    {children}
  </div>
);