// components/Button.tsx
import { FC } from 'react';

interface ButtonProps {
    text: string;
    onClick?: () => void;
    type?: "button" | "submit" | "reset"; // Add type prop
}

const Button: FC<ButtonProps> = ({ text, onClick, type = "button" }) => {
    return (
        <button
            type={type} // Use the type prop
            onClick={onClick}
            className="bg-primaryGreen text-white py-2 px-4 m-1 rounded-lg shadow-md hover:bg-green-700 transition-all inline-flex justify-center w-auto"
        >
            {text}
        </button>
    );
};

export default Button;
