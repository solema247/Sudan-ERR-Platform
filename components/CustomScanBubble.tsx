import React, { ReactNode } from "react";

interface CustomScanBubbleProps {
  children: ReactNode;
  className?: string;
}

const CustomScanBubble: React.FC<CustomScanBubbleProps> = ({ children, className }) => {
  return (
    <div
      className={`w-full max-w-md mx-auto px-4 py-3 my-2 bg-white rounded-lg ${
        className || ""
      }`}
    >
      {children}
    </div>
  );
};

export default CustomScanBubble;
