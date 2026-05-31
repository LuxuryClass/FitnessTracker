import { useRef } from 'react';
import { Input } from '@/Components/UI/Input/Input';
import searchIcon from "/icons/Search.svg";
import styles from './Styles.module.scss';
import cn from 'classnames';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar = ({ value, onChange, placeholder = 'Поиск', className }: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.blur();
  };

  return (
    <div className={cn(styles.wrapper, className)}>
      <Input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={styles.input}
      />
      {value.trim() ? (
        <button className={styles.clearBtn} onClick={handleClear}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </button>
      ) : (
        <img src={searchIcon} alt="поиск" className={styles.icon} />
      )}
    </div>
  );
};