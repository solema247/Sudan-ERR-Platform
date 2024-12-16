import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import Image from 'next/image';

const MainApp = () => {
  const router = useRouter();
  const { t } = useTranslation('home');

  const handleLogin = () => {
    router.push('/login');
  };

  const handleOfflineMode = () => {
    router.push('/offline-mode');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Image src="/icons/icon-512x512.png" alt="App Icon" width={100} height={100} />
        </div>
        <h1 className="text-2xl font-bold text-black">{t('welcome')}</h1>
      </div>
      <div className="flex flex-col space-y-4 w-full max-w-sm">
        <Button text={t('login')} onClick={handleLogin} />
        <Button text={t('offlineMode')} onClick={handleOfflineMode} />
      </div>
    </div>
  );
};

export default MainApp; 