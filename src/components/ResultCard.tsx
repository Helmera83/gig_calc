import React from 'react';
interface ResultCardProps {
  title: string;
  value: string;
  isPositive: boolean;
  large?: boolean;
  variant?: 'default' | 'neutral';
}

export const ResultCard: React.FC<ResultCardProps> = ({
  title,
  value,
  isPositive,
  large = false,
  variant = 'default',
}) => {
  // Use semantic M3 tokens: success for positive, error for negative
  let valueColorClass = 'result-card-value neutral';

  if (variant !== 'neutral') {
    valueColorClass = isPositive ? 'result-card-value positive' : 'result-card-value negative';
  }

  const containerClass = large ? 'result-card variant-large' : 'result-card variant-regular';

  return (
    <div className={containerClass}>
      <div className="result-card-content">
        <h3 className="result-card-title">{title}</h3>
        <div className="animate-spring-up">
          <p className={`${valueColorClass} ${large ? 'large' : 'regular'}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};