import { useState } from 'react';
import { useRouter } from 'next/router';
import Input from '../components/Input';
import Button from '../components/Button';

const Login = () => {
    const [errId, setErrId] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ err_id: errId, pin: pin }),
        });

        const data = await response.json();

        if (data.success) {
            router.push('/menu');  // Redirect to the menu page
        } else {
            setError(data.message || 'Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            <form onSubmit={handleLogin} className="flex flex-col items-center space-y-4">
                <Input
                    type="text"
                    placeholder="Enter ERR ID"
                    value={errId}
                    onChange={(e) => setErrId(e.target.value)}
                />
                <Input
                    type="password"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                />
                <Button text="Login" color="bg-blue-500" />
            </form>
            {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
    );
};

export default Login;
