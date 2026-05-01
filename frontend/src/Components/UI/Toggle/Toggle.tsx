import { memo } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const ToggleComponent = ({ checked, onChange, disabled = false, className }: ToggleProps) => {
  return (
    <button
      type="button"
      className={cn(styles.toggle, checked && styles.toggle_active, className)}
      onClick={() => onChange(!checked)}
      disabled={disabled}
    >
      <div className={cn(styles.thumb, checked && styles.thumb_active)} />
    </button>
  );
};

export const Toggle = memo(ToggleComponent);