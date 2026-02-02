import React, { ReactNode } from 'react';

// --- Card ---
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <div className={`bg-white rounded-xl shadow-md border border-stone-200 p-6 ${className} card`} {...props}>
    {children}
  </div>
);

// --- Button ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseStyle = "font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#D45D79] text-white hover:bg-[#C04865] focus:ring-[#D45D79] shadow-sm", // Warmer Rose
    secondary: "bg-stone-200 text-stone-800 hover:bg-stone-300 focus:ring-stone-500",
    danger: "bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-500 border border-red-200",
    ghost: "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
  );
};

// --- Input Helper ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  suffix?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, suffix, className = '', ...props }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-sm font-bold text-stone-700 flex items-center justify-between">
      {label}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
    <div className="relative flex items-center">
      <input
        className={`w-full px-3 py-2.5 rounded-lg border text-sm text-stone-900 transition-shadow focus:outline-none focus:ring-2 bg-white ${
          error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
            : 'border-stone-300 focus:border-[#D45D79] focus:ring-rose-100 shadow-sm'
        } ${suffix ? 'pr-12' : ''} placeholder:text-stone-400`}
        {...props}
      />
      {suffix && (
        <span className="absolute right-3 text-xs font-semibold text-stone-500 pointer-events-none bg-stone-100 px-1.5 py-0.5 rounded">
          {suffix}
        </span>
      )}
    </div>
    {helperText && <p className="text-xs text-stone-500 italic">{helperText}</p>}
  </div>
);

// --- Select Helper ---
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-sm font-bold text-stone-700">{label}</label>
    <select
      className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-[#D45D79] shadow-sm"
      {...props}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// --- Tooltip / Info Badge ---
export const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex items-center ml-1 align-middle">
    <span className="cursor-help text-stone-400 hover:text-[#D45D79]">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    </span>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-stone-800 text-white text-xs rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-52 text-center z-50">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
    </div>
  </div>
);