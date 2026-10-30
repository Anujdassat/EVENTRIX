import React from 'react';

export type BadgeVariant =
  | 'AVAILABLE'
  | 'HELD'
  | 'BOOKED'
  | 'VIP'
  | 'Premium'
  | 'Standard'
  | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children }) => {
  const getClassName = () => {
    switch (variant) {
      case 'AVAILABLE':
        return 'badge badge-available';
      case 'HELD':
        return 'badge badge-held';
      case 'BOOKED':
        return 'badge badge-booked';
      case 'VIP':
        return 'badge badge-vip';
      case 'Premium':
        return 'badge badge-premium';
      case 'Standard':
        return 'badge badge-standard';
      default:
        return 'badge badge-standard';
    }
  };

  return <span className={getClassName()}>{children}</span>;
};
