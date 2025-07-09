import { FC } from 'react';

export interface InputProps {
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    dir?: string;
}

const Input: React.FC<InputProps> = ({ type, placeholder, value, onChange, required = false, dir }) => {
    return (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            dir={dir}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    );
};

export default Input;
