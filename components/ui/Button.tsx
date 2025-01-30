// components/Button.tsx
import { FC } from 'react';

interface ButtonProps {
    text: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => any;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    className?: string;
}

const Button: FC<ButtonProps> = ({ text, onClick, type = "button", disabled = false, className }) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`bg-primaryGreen text-white py-2 px-4 m-1 rounded-lg shadow-md hover:bg-green-700 transition-all inline-flex justify-center w-auto ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
            } ${className || ""}`}
        >
            {text}
        </button>
    );
}

export default Button;
