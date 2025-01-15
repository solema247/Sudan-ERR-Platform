import { useState } from 'react';
import crypto from 'crypto';
import { useTranslation } from 'react-i18next';
import Calculator from '../components/calculator/Calculator';
import MainApp from '../components/main/MainApp';

const Home = () => {
  const { t } = useTranslation('home');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const handlePinEntry = (pin: string) => {
    doesEntryMatchHash(pin) ? setIsUnlocked(true) : setIsLocked(true);
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

  return isUnlocked ? <MainApp /> : <Calculator onPinEntry={handlePinEntry} />;
};

export default Home;




