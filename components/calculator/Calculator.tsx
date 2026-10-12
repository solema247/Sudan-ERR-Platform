import React, { useMemo, useState } from 'react';
import { Delete } from 'lucide-react';

interface CalculatorProps {
  onPinEntry: (pin: string) => void;
}

type Op = '+' | '-' | '*' | '/';

const OPS: Record<string, Op> = {
  '+': '+',
  '−': '-',
  '-': '-',
  '×': '*',
  '*': '*',
  '÷': '/',
  '/': '/',
};

function formatDisplay(value: string): string {
  if (!value || value === 'Error') return value || '0';
  const neg = value.startsWith('-');
  const raw = neg ? value.slice(1) : value;
  const [intPart, decPart] = raw.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const joined =
    decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  return neg ? `-${joined}` : joined;
}

function displayFontClass(display: string): string {
  const len = display.replace(/,/g, '').length;
  if (len > 12) return 'text-[2.35rem]';
  if (len > 9) return 'text-[3rem]';
  if (len > 7) return 'text-[3.5rem]';
  return 'text-[4.5rem] sm:text-[5rem]';
}

const Calculator: React.FC<CalculatorProps> = ({ onPinEntry }) => {
  const [display, setDisplay] = useState('0');
  const [stored, setStored] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);
  /** Digits typed since last clear — used for PIN gate (numbers then =) */
  const [pinBuffer, setPinBuffer] = useState('');

  const shown = useMemo(() => formatDisplay(display), [display]);

  const inputDigit = (digit: string) => {
    setPinBuffer((prev) => (prev + digit).slice(0, 32));
    setDisplay((prev) => {
      if (fresh || prev === '0' || prev === 'Error') {
        setFresh(false);
        return digit;
      }
      if (prev.replace('-', '').replace('.', '').length >= 12) return prev;
      return prev + digit;
    });
  };

  const inputDot = () => {
    setDisplay((prev) => {
      if (fresh || prev === 'Error') {
        setFresh(false);
        return '0.';
      }
      if (prev.includes('.')) return prev;
      return `${prev}.`;
    });
  };

  const clearAll = () => {
    setDisplay('0');
    setStored(null);
    setPendingOp(null);
    setFresh(true);
    setPinBuffer('');
  };

  const backspace = () => {
    setPinBuffer((prev) => prev.slice(0, -1));
    if (fresh && display !== 'Error') return;
    setDisplay((prev) => {
      if (prev === 'Error') {
        setFresh(true);
        return '0';
      }
      const next = prev.length <= 1 || (prev.length === 2 && prev.startsWith('-'))
        ? '0'
        : prev.slice(0, -1);
      if (next === '0' || next === '-') {
        setFresh(true);
        return '0';
      }
      return next;
    });
  };

  const percent = () => {
    setDisplay((prev) => {
      const n = parseFloat(prev);
      if (!Number.isFinite(n)) return 'Error';
      return String(n / 100);
    });
    setFresh(true);
  };

  const applyOp = (a: number, b: number, op: Op): number => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return b === 0 ? NaN : a / b;
      default:
        return b;
    }
  };

  const chooseOp = (label: string) => {
    const op = OPS[label];
    if (!op) return;
    setPinBuffer('');
    const current = parseFloat(display);
    if (!Number.isFinite(current)) {
      setDisplay('Error');
      setFresh(true);
      return;
    }
    if (stored !== null && pendingOp && !fresh) {
      const next = applyOp(stored, current, pendingOp);
      if (!Number.isFinite(next)) {
        setDisplay('Error');
        setStored(null);
        setPendingOp(null);
        setFresh(true);
        return;
      }
      setStored(next);
      setDisplay(String(next));
    } else {
      setStored(current);
    }
    setPendingOp(op);
    setFresh(true);
  };

  const equals = () => {
    if (pinBuffer && !/[+\-*/]/.test(pinBuffer)) {
      onPinEntry(`${pinBuffer}=`);
    }

    const current = parseFloat(display);
    if (stored === null || !pendingOp || !Number.isFinite(current)) {
      setFresh(true);
      return;
    }
    const next = applyOp(stored, current, pendingOp);
    if (!Number.isFinite(next)) {
      setDisplay('Error');
    } else {
      const rounded = Math.round(next * 1e10) / 1e10;
      setDisplay(String(rounded));
    }
    setStored(null);
    setPendingOp(null);
    setFresh(true);
    setPinBuffer('');
  };

  // Android / Material calculator: rounded rects, teal accents
  const key =
    'select-none touch-manipulation rounded-[1.35rem] font-medium leading-none ' +
    'active:brightness-110 transition-[filter,background-color,color] duration-75 ' +
    'flex items-center justify-center ' +
    'h-[min(20vw,5.25rem)] w-[min(20vw,5.25rem)] text-[min(7vw,1.65rem)]';
  const numBtn = `${key} bg-[#303134] text-[#e8eaed]`;
  const fnBtn = `${key} bg-[#5f6368] text-[#e8eaed]`;
  const opBtn = (active: boolean) =>
    `${key} ${
      active
        ? 'bg-[#a8dadc] text-[#003d40]'
        : 'bg-[#004d40] text-[#80cbc4]'
    }`;
  const eqBtn = `${key} bg-[#80cbc4] text-[#003d40] font-semibold`;

  const opActive = (label: string) =>
    Boolean(pendingOp && OPS[label] === pendingOp && fresh);

  return (
    <div
      dir="ltr"
      className="fixed inset-0 z-[100] flex flex-col bg-[#202124] text-[#e8eaed]"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-end px-[min(6vw,1.5rem)] pb-5">
        <div
          className={`w-full text-right font-light tabular-nums tracking-tight leading-none text-[#e8eaed] ${displayFontClass(
            shown
          )}`}
          aria-live="polite"
        >
          {shown}
        </div>
      </div>

      <div
        className="mx-auto grid w-full max-w-[28rem] grid-cols-4 place-items-center px-3 pb-3"
        style={{ gap: 'min(2.8vw, 0.7rem)' }}
      >
        <button type="button" className={fnBtn} onClick={clearAll}>
          AC
        </button>
        <button
          type="button"
          className={fnBtn}
          onClick={backspace}
          aria-label="Delete"
        >
          <Delete className="h-[1.15em] w-[1.15em]" strokeWidth={2.25} />
        </button>
        <button type="button" className={fnBtn} onClick={percent}>
          %
        </button>
        <button
          type="button"
          className={opBtn(opActive('÷'))}
          onClick={() => chooseOp('÷')}
        >
          ÷
        </button>

        {(['7', '8', '9'] as const).map((d) => (
          <button key={d} type="button" className={numBtn} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className={opBtn(opActive('×'))}
          onClick={() => chooseOp('×')}
        >
          ×
        </button>

        {(['4', '5', '6'] as const).map((d) => (
          <button key={d} type="button" className={numBtn} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className={opBtn(opActive('−'))}
          onClick={() => chooseOp('−')}
        >
          −
        </button>

        {(['1', '2', '3'] as const).map((d) => (
          <button key={d} type="button" className={numBtn} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className={opBtn(opActive('+'))}
          onClick={() => chooseOp('+')}
        >
          +
        </button>

        <button type="button" className={numBtn} onClick={() => inputDigit('0')}>
          0
        </button>
        <button type="button" className={numBtn} onClick={inputDot}>
          .
        </button>
        <button
          type="button"
          className={`${eqBtn} col-span-2 !w-full max-w-none`}
          style={{
            width: '100%',
            height: 'min(20vw, 5.25rem)',
          }}
          onClick={equals}
        >
          =
        </button>
      </div>
    </div>
  );
};

export default Calculator;
