import { useState, useEffect } from 'react';
import crypto from 'crypto';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Calculator from '../components/calculator/Calculator';

/**
 * PIN gate → login. Landing menu (MainApp) is merged into /login.
 */

const Home = () => {
  const { t } = useTranslation('home');
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const fromInternalPage = sessionStorage.getItem('fromInternalPage') === 'true';
    if (fromInternalPage) {
      sessionStorage.removeItem('fromInternalPage');
      sessionStorage.setItem('isUnlocked', 'true');
      setIsUnlocked(true);
      setChecking(false);
      return;
    }
    const unlocked = sessionStorage.getItem('isUnlocked') === 'true';
    setIsUnlocked(unlocked);
    setChecking(false);
  }, []);

  useEffect(() => {
    if (!checking && isUnlocked) {
      router.replace('/login');
    }
  }, [checking, isUnlocked, router]);

  const handlePinEntry = (pin: string) => {
    if (doesEntryMatchHash(pin)) {
      setIsUnlocked(true);
      sessionStorage.setItem('isUnlocked', 'true');
    } else {
      setIsLocked(true);
    }
  };

  const doesEntryMatchHash = (pin: string) => {
    try {
      const hash = crypto.createHash('sha256').update(pin, 'utf8').digest('hex');
      const calculatorPinHash = process.env.NEXT_PUBLIC_CALCULATOR_PIN;

      if (!calculatorPinHash) {
        throw new Error('Missing system hash needed for PIN');
      }
      return hash === calculatorPinHash;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  if (isLocked) {
    return <div>{t('appLocked')}</div>;
  }

  if (checking || isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center app-page-bg">
        <p className="text-sm text-[#a8b6cc]">Loading…</p>
      </div>
    );
  }

  return <Calculator onPinEntry={handlePinEntry} />;
};

export default Home;
