// pages/login.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import Input from '../components/Input';
import Button from '../components/Button';
import OfflineForm from '../components/OfflineForm';

const Login = () => {
    const [errId, setErrId] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [showOfflineForm, setShowOfflineForm] = useState(false);
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

    const handleOfflineModeClick = () => {
        setShowOfflineForm(true);
    };

    const closeOfflineForm = () => {
        setShowOfflineForm(false);
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

            <button
                onClick={handleOfflineModeClick}
                className="mt-4 text-blue-500 underline"
            >
                Offline Mode: Free Form
            </button>

            {showOfflineForm && (
                <div className="modal-container fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg shadow-md w-11/12 max-w-2xl max-h-screen overflow-y-auto">
                        <button
                            onClick={closeOfflineForm}
                            className="text-red-500 float-right mb-2"
                        >
                            Close
                        </button>
                        <OfflineForm onClose={closeOfflineForm} onSubmitSuccess={() => console.log('Submit success')} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
