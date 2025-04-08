import { useState, useEffect } from 'react';
import crypto from 'crypto';
import { useTranslation } from 'react-i18next';
import Calculator from '../components/calculator/Calculator';
import MainApp from './MainApp';

/**
 * Index.tsx
 * 
 * Home component shows calculator.
 */

const Home = () => {
  const { t } = useTranslation('home');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Check if we're coming from login/offline screens
  useEffect(() => {
    const fromInternalPage = sessionStorage.getItem('fromInternalPage') === 'true';
    if (fromInternalPage) {
      setIsUnlocked(true);
      sessionStorage.removeItem('fromInternalPage');
    } else {
      const unlocked = sessionStorage.getItem('isUnlocked') === 'true';
      setIsUnlocked(unlocked);
    }
  }, []);

  const handleLogout = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('isUnlocked');
  };

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
        throw new Error('Missing system hash needed for PIN')
      }
      return hash === calculatorPinHash;
    }
    catch(e) {
      console.log(e)
    }
  }

  if (isLocked) {
    return <div>{t('appLocked')}</div>;
  }

  return isUnlocked ? <MainApp onLogout={handleLogout} /> : <Calculator onPinEntry={handlePinEntry} />;
};

export default Home;