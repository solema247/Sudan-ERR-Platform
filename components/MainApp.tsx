import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import Image from 'next/image';

const MainApp = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation('home');

  const handleLogin = () => {
    router.push('/login');
  };

  const handleOfflineMode = () => {
    router.push('/offline-mode');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Image src="/icons/icon-512x512.png" alt="App Icon" width={100} height={100} />
        </div>
        <h1 className="text-2xl font-bold text-black">{t('welcomeMessage')}</h1>
      </div>
      <div className="flex flex-col space-y-4 w-full max-w-sm">
        <Button text={t('login')} onClick={handleLogin} />
        <Button text={t('offlineMode')} onClick={handleOfflineMode} />
        <div className="flex justify-center space-x-4 mt-4">
          <button onClick={() => changeLanguage('en')} className="mx-2 text-blue-500 underline">
            English
          </button>
          <button onClick={() => changeLanguage('ar')} className="mx-2 text-blue-500 underline">
            العربية
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainApp; 