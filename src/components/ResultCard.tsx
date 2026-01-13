import React from 'react';
interface ResultCardProps {
  title: string;
  value: string;
  isPositive: boolean;
  description: string;
  large?: boolean;
  variant?: 'default' | 'neutral';
}

export const ResultCard: React.FC<ResultCardProps> = ({
  title,
  value,
  isPositive,
  description,
  large = false,
  variant = 'default',
}) => {
  // Use semantic M3 tokens: success for positive, error for negative
  let valueColorClass = 'text-on-surface';
  let borderClass = 'border-outline-variant-10';

  if (variant !== 'neutral') {
    valueColorClass = isPositive ? 'text-success' : 'text-error';
    borderClass = isPositive ? 'border-outline-variant-10' : 'border-outline-variant-10';
  }

  const containerClass = large ? 'bg-surface-container-high' : 'bg-surface-container';

  return (
    <div className={`
      ${containerClass}
      rounded-[32px] p-6
      flex flex-col justify-between
      h-full border ${borderClass}
      transition-all hover:bg-surface-container-highest-80 duration-300
      ${large ? 'min-h-[160px] shadow-lg' : 'min-h-[130px]'}
    `}>
      <div className="flex flex-col">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-60">{title}</h3>
        <div className="animate-spring-up">
          <p className={`${large ? 'text-5xl' : 'text-3xl'} font-medium mt-2 ${valueColorClass} tracking-tight`}>
            {value}
          </p>
        </div>
      </div>

      <p className="text-[10px] font-bold text-on-surface-50 mt-3 bg-on-surface-5 px-3 py-1 rounded-full w-fit uppercase">
        {description}
      </p>
    </div>
  );
};