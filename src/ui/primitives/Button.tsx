import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}) => {
  const baseStyles = "rounded font-medium transition-all disabled:opacity-50";
  
  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-700 hover:bg-gray-600 text-gray-100",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "hover:bg-gray-700 text-gray-300",
  };
  
  const sizeStyles = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} 
        ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
