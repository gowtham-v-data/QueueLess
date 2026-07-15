import React from 'react';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
}

export default function Card({ title, children, className = '', ...rest }: CardProps) {
  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm ${className}`} {...rest}>
      {title && <div className="mb-2 text-lg font-medium">{title}</div>}
      <div>{children}</div>
    </div>
  );
}
