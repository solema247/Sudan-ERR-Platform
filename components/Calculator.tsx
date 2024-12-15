import React, { useState } from 'react';

interface CalculatorProps {
  onPinEntry: (pin: string) => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onPinEntry }) => {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string>('');

  const handleClick = (value: string) => {
    setInput((prev) => prev + value);
  };

  const handleClear = () => {
    setInput('');
    setResult('');
  };

  const handleCalculate = () => {
    onPinEntry(input + '=');
    try {
      // eslint-disable-next-line no-eval
      const evalResult = eval(input);
      setResult(evalResult.toString());
    } catch (error) {
      setResult('Error');
    }
  };

  return (
    <div className="calculator h-screen flex flex-col justify-center items-center bg-black">
      <div className="display mb-4 p-2 bg-black text-white text-4xl text-right w-full max-w-md">
        <div className="input text-lg">{input}</div>
        <div className="result">{result}</div>
      </div>
      <div className="buttons grid grid-cols-4 gap-2 w-full max-w-md">
        {['7', '8', '9', '/'].map((value) => (
          <button key={value} onClick={() => handleClick(value)} className="p-4 bg-gray-700 text-white rounded-full hover:bg-gray-600">
            {value}
          </button>
        ))}
        {['4', '5', '6', '*'].map((value) => (
          <button key={value} onClick={() => handleClick(value)} className="p-4 bg-gray-700 text-white rounded-full hover:bg-gray-600">
            {value}
          </button>
        ))}
        {['1', '2', '3', '-'].map((value) => (
          <button key={value} onClick={() => handleClick(value)} className="p-4 bg-gray-700 text-white rounded-full hover:bg-gray-600">
            {value}
          </button>
        ))}
        {['0', '.', '=', '+'].map((value) => (
          <button
            key={value}
            onClick={value === '=' ? handleCalculate : () => handleClick(value)}
            className={`p-4 ${value === '=' ? 'bg-orange-500' : 'bg-gray-700'} text-white rounded-full hover:bg-gray-600`}
          >
            {value}
          </button>
        ))}
        <button className="clear col-span-4 p-4 bg-gray-500 text-white rounded-full" onClick={handleClear}>
          AC
        </button>
      </div>
    </div>
  );
};

export default Calculator; 