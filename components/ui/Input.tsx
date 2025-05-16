import { FC } from 'react';

interface InputProps {
    type: string;
    placeholder: string; // Placeholder text is passed as a prop
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
}

const Input: FC<InputProps> = ({ type, placeholder, value, onChange, required }) => {
    return (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    );
};

export default Input;
