import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode; // Actions slot
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  badge,
  actions,
  children,
  className = '',
}) => {
  const actionContent = actions || children;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 ${className}`}>
      <div className="space-y-1">
        {badge && <div className="mb-1.5">{badge}</div>}
        <h1 className="text-[28px] sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-[1.12]">
          {title}
        </h1>
        {subtitle && (
          <div className="text-base sm:text-lg font-semibold text-slate-600 tracking-tight">
            {subtitle}
          </div>
        )}
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actionContent && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-1 sm:pt-0">
          {actionContent}
        </div>
      )}
    </div>
  );
};

export interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  icon,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div>
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-500">{icon}</span>}
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
            {title}
          </h2>
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 leading-normal">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
};