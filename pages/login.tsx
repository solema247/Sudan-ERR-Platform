// pages/login.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Input from '../components/Input';
import Button from '../components/Button';
import OfflineForm from '../components/OfflineForm';
import LogoImage from '../public/avatar.JPG';

const Login = () => {
    const [errId, setErrId] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [showOfflineForm, setShowOfflineForm] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        const handleOfflineFormSubmitted = (event) => {
            setSuccessMessage(event.detail.message);
            setTimeout(() => setSuccessMessage(''), 3000); // Hide after 3 seconds
        };

        // Listen for the custom event
        window.addEventListener('offlineFormSubmitted', handleOfflineFormSubmitted);

        // Clean up the event listener when the component unmounts
        return () => window.removeEventListener('offlineFormSubmitted', handleOfflineFormSubmitted);
    }, []);

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
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
            {/* Logo and Title */}
            <div className="flex flex-col items-center mb-6">
                <Image
                    src={LogoImage}
                    alt="Sudan Emergency Response Logo"
                    width={100} 
                    height={100}
                    className="mb-2"
                />
                <h1 className="text-xl font-bold text-center">Sudan Emergency Response Rooms Bot</h1>
            </div>

            {/* Temporary Notification */}
            {successMessage && (
                <div className="fixed top-4 bg-green-100 text-green-700 p-2 rounded shadow-lg">
                    {successMessage}
                </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col items-center space-y-4 w-full max-w-xs">
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
                <Button text="Login" type="submit" />
            </form>

            {error && <p className="text-red-500 mt-2">{error}</p>}

            <button
                onClick={handleOfflineModeClick}
                className="mt-4 text-blue-500 underline"
            >
                Offline Mode: Upload Form
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
