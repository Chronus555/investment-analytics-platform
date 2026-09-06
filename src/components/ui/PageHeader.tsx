import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode; // Actions slot
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  subtitle,
  badge,
  actions,
  children,
  className = '',
}) => {
  const textDescription = description || subtitle;
  const actionContent = actions || children;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 ${className}`}>
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {title}
          </h1>
          {badge}
        </div>
        {textDescription && (
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            {textDescription}
          </p>
        )}
      </div>

      {actionContent && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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
          {icon && <span className="text-slate-400">{icon}</span>}
          <h2 className="text-base sm:text-lg font-semibold text-slate-100 tracking-tight">
            {title}
          </h2>
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-slate-400 leading-normal">
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