//pages/index.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Calculator from '../components/Calculator';
import MainApp from '../components/MainApp';

const Home = () => {
  const { t } = useTranslation('home');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const handlePinEntry = (pin: string) => {
    console.log("Entered PIN:", pin);
    if (pin === '1234=') {
      setIsUnlocked(true);
    } else if (pin === '0000=') {
      setIsLocked(true);
    }
  };

  if (isLocked) {
    return <div>{t('appLocked')}</div>;
  }

  return isUnlocked ? <MainApp /> : <Calculator onPinEntry={handlePinEntry} />;
};

export default Home;




