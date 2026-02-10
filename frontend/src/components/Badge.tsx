import React from 'react';
import './Badge.css';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'secondary';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'secondary',
  children,
  className = '',
  style,
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`} style={style}>
      {children}
    </span>
  );
};
