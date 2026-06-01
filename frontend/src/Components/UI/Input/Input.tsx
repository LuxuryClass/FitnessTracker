import { JSX, memo, useEffect, useRef, useState } from 'react';
import styles from './Styles.module.scss';
import { Icon } from '../Icon';
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
        
        {type === 'search' && <Icon className={styles.input__search} glyph="eye" size={20} glyphColor="blue" />}
        
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
          <Icon
            pointer
            onClick={() => setDisplayPassword(!displayPassword)}
            className={styles.input__eye}
            glyph={displayPassword ? 'eye' : 'eye'}
            size={24}
            glyphColor="white"
          />
        )}
      </div>
      {error && <p className={styles.input__error}>{error}</p>}
    </div>
  );
}

export const Input = memo(InputComponent);