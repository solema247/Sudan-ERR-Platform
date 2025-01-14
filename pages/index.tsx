import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Calculator from '../components/calculator/Calculator';
import MainApp from '../components/main/MainApp';

const Home = () => {
  const { t } = useTranslation('home');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Load unlock state on mount
  useEffect(() => {
    const unlocked = localStorage.getItem('isUnlocked') === 'true';
    setIsUnlocked(unlocked);
  }, []);

  const handlePinEntry = (pin: string) => {
    console.log("Entered PIN:", pin);
    if (pin === '1234=') {
      setIsUnlocked(true);
      localStorage.setItem('isUnlocked', 'true');
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




