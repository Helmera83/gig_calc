import React from 'react';

interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: string;
  className?: string;
  ariaLabel?: string;
}
export const MaterialIcon: React.FC<MaterialIconProps> = ({ icon, className = '', ariaLabel, ...rest }) => {
  const baseClass = `material-icons ${className}`;
  return (
    <span
      className={baseClass}
      {...(ariaLabel ? { role: 'img', 'aria-label': ariaLabel } : { 'aria-hidden': 'true' })}
      {...rest}
    >
      {icon}
    </span>
  );
};
