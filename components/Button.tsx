
import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = "px-6 py-3 rounded-full font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-center";
  const variants = {
    primary: "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200",
    secondary: "bg-white text-orange-500 border-2 border-orange-500 hover:bg-orange-50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
