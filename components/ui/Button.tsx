// components/Button.tsx
import { FC, ReactNode } from 'react';

interface ButtonProps {
    text: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => any;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    className?: string;
    icon?: ReactNode;
    variant?: 'primary' | 'danger';
}

const Button: FC<ButtonProps> = ({ 
    text, 
    onClick, 
    type = "button", 
    disabled = false, 
    className,
    icon,
    variant = 'primary'
}) => {
    const baseStyles = "py-2 px-4 m-1 rounded-lg shadow-md transition-all inline-flex justify-center items-center gap-2";
    const variantStyles = {
        primary: "bg-primaryGreen text-white hover:bg-green-700",
        danger: "bg-red-500 text-white hover:bg-red-700"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variantStyles[variant]} ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
            } ${className || ""}`}
        >
            {icon}
            {text}
        </button>
    );
}

export default Button;
