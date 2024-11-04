import { FC } from 'react';

interface ButtonProps {
    text: string;
    onClick?: () => void;
}

const Button: FC<ButtonProps> = ({ text, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="bg-green-500 bg-opacity-80 text-white py-2 px-4 m-1 rounded-lg shadow-md hover:bg-green-600 hover:bg-opacity-90 transition-all inline-flex justify-center w-auto"
        >
            {text}
        </button>
    );
};

export default Button;
