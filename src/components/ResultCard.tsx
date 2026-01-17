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
  let valueColorClass = 'neutral';

  if (variant !== 'neutral') {
    valueColorClass = isPositive ? 'positive' : 'negative';
  }

  const containerVariant = large ? 'variant-high' : 'variant-default';
  const sizeVariant = large ? 'variant-large' : 'variant-regular';
  const valueSizeClass = large ? 'large' : 'regular';

  return (
    <div className={`result-card ${containerVariant} ${sizeVariant}`}>
      <div className="result-card-content">
        <h3 className="result-card-title">{title}</h3>
        <div className="animate-spring-up">
          <p className={`result-card-value ${valueSizeClass} ${valueColorClass}`}>
            {value}
          </p>
        </div>
      </div>

      <p className="result-card-description">
        {description}
      </p>
    </div>
  );
};

