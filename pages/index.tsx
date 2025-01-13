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
    console.log("Entered PIN:", pin);
    doesEntryMatchHash(pin) ? setIsUnlocked(true) : setIsLocked(true);
  };

  const doesEntryMatchHash(pin: string) => {
    return pin === process.env.NEXT_PUBLIC_CALCULATOR_PIN;
  }

  if (isLocked) {
    return <div>{t('appLocked')}</div>;
  }

  return isUnlocked ? <MainApp /> : <Calculator onPinEntry={handlePinEntry} />;
};

export default Home;




