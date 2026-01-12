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
  variant = 'default' 
}) => {
  
  let valueColorClass = 'text-on-surface';
  let borderColorClass = 'border-outline-variant/20';
  
  if (variant !== 'neutral') {
      valueColorClass = isPositive ? 'text-green-300' : 'text-error';
      borderColorClass = isPositive ? 'border-green-300/10' : 'border-error/10';
  }

  return (
    <div className={`
        bg-surface-container-high 
        rounded-[32px] 
        p-6
        flex flex-col justify-between 
        h-full 
        border ${borderColorClass}
        transition-all hover:bg-surface-container-highest-80 duration-300
        ${large ? 'min-h-[160px] shadow-lg' : 'min-h-[130px]'}
    `}>
      <div className="flex flex-col">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/60">{title}</h3>
        <p className={`${large ? 'text-5xl' : 'text-3xl'} font-medium mt-2 ${valueColorClass} tracking-tight`}>
            {value}
        </p>
      </div>
      <p className="text-[11px] font-medium text-outline-variant mt-3 bg-on-surface-5 w-fit px-2 py-0.5 rounded-full">{description}</p>
    </div>
  );
};
