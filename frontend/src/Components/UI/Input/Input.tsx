import { JSX, memo, useEffect, useRef, useState } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

type InputProps = (
  | {
      type: 'number';
      onChange: (value: number | null) => void;
      value: number | null;
    }
  | {
      type: 'text' | 'search' | 'date' | 'password';
      value: string | null;
      onChange: (value: string) => void;
    }
) & {
  placeholder?: string;
  className?: string;
  inputStyles?: string;
  label?: string;
  pseudoContent?: string;
  name?: string;
  disabled?: boolean;
  error?: string;
  isRequired?: boolean;
  icon?: string;
  autoComplete?: string;
  readOnly?: boolean;
  errorTrigger?: number;
};

function InputComponent({
  type,
  value,
  placeholder,
  onChange,
  className,
  inputStyles,
  label,
  pseudoContent,
  disabled,
  isRequired,
  name,
  error,
  icon,
  autoComplete,
  readOnly,
  errorTrigger = 0,
}: InputProps): JSX.Element {
  const [displayPassword, setDisplayPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [hasStarted, setHasStarted] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  useEffect(() => {
    const current = value !== null ? String(value) : '';
    setHasStarted(current.length > 0);
  }, [value]);

  // Триггер анимации при изменении ошибки
  useEffect(() => {
    if (error) {
      setShouldShake(true);
      
      // Сбрасываем класс анимации после завершения, чтобы можно было переиграть
      const timer = setTimeout(() => {
        setShouldShake(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [error, errorTrigger]);

  const changeValue = (value: string) => {
    const started = value.length > 0;
    setHasStarted(started);
    if (type === 'number') {
      onChange(value === '' ? null : Number(value));
    } else {
      onChange(value);
    }
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      inputRef.current?.blur();
      e.stopPropagation();
    };

    const input = inputRef.current;
    if (input && type === 'number') {
      input.addEventListener('wheel', handleWheel);
      return () => {
        input.removeEventListener('wheel', handleWheel);
      };
    }
  }, [type]);


const openEye = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 6C7.5 6 3.5 8.5 2 12C3.5 15.5 7.5 18 12 18C16.5 18 20.5 15.5 22 12C20.5 8.5 16.5 6 12 6Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5"/>
  </svg>
);

const closeEye = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 6C7.5 6 3.5 8.5 2 12C3.5 15.5 7.5 18 12 18C16.5 18 20.5 15.5 22 12C20.5 8.5 16.5 6 12 6Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5"/>
    <line x1="3" y1="3" x2="21" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

  return (
    <div>
      {label && (
        <div className={styles.input__labelBlock}>
          <p className={styles.input__label}>{label}</p>
          {isRequired && <span className={styles.input__required}>*</span>}
        </div>
      )}
      <div
        ref={containerRef}
        style={pseudoContent ? ({ '--pseudoContent': `"${pseudoContent}"` } as React.CSSProperties) : {}}
        className={cn(
          styles.input,
          className,
          error && styles.input_error,
          shouldShake && styles.input_shake,
          type === 'number' && styles.input_number
        )}
      >
        {/* Иконка слева (картинка) */}
        {icon && <img src={icon} className={styles.input__icon} alt="" />}
                
        <input
          disabled={disabled}
          ref={inputRef}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          readOnly={readOnly}
          onFocus={(e) => { e.currentTarget.removeAttribute('readOnly'); }}
          data-started={hasStarted}
          className={cn(
            styles.input__input,
            inputStyles,
            icon && styles.input__input_with_icon // ← доп. класс для отступа
          )}
          type={type === 'password' ? (displayPassword ? 'text' : 'password') : type}
          value={value !== null ? value : ''}
          onChange={e => changeValue(e.target.value)}
        />
        
{type === 'password' && (
  <span
    onClick={() => setDisplayPassword(!displayPassword)}
    className={cn(styles.input__eye, styles.icon)}
    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
  >
    {displayPassword ? openEye : closeEye}
  </span>
)}
      </div>
      {error && <p className={styles.input__error}>{error}</p>}
    </div>
  );
}

export const Input = memo(InputComponent);