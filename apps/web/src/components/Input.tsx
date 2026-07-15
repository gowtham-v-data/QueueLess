import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
}

export default function Input({ label, error, className = '', ...rest }: InputProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-sm font-medium">{label}</label>}
      <input className="w-full border rounded p-2" {...rest} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
