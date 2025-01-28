import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div className={`p-4 bg-gray-100 rounded-lg shadow-md ${className}`}>
      {children}
    </div>
  );
};

export default Card;
