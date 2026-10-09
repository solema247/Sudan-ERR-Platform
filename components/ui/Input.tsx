import { FC } from 'react';

export interface InputProps {
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    dir?: string;
    className?: string;
}

const Input: React.FC<InputProps> = ({ type, placeholder, value, onChange, required = false, dir, className }) => {
    return (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            dir={dir}
            className={className || 'app-input'}
        />
    );
};

export default Input;
