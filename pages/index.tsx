//pages/index.tsx
import { useState } from 'react';
import Calculator from '../components/Calculator';
import MainApp from '../components/MainApp'; // Fix: Update the import path to the correct module

const Home = () => {
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
    return <div>App is locked. Please contact support.</div>;
  }

  return isUnlocked ? <MainApp /> : <Calculator onPinEntry={handlePinEntry} />;
};

export default Home;




