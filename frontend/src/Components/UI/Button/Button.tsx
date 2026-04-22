import { JSX, memo } from 'react';
import styles from './Styles.module.scss';
import cn from 'classnames';

interface ButtonProps {
  size?: 'm' | 'l' | 's' | 'back' | 'default';
  fullWidth?: boolean;
  color?: 'primary' | 'accent' | 'accent-2';
  children?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  radius?: number;
  className?: string;
  disabled?: boolean;
}

function ButtonComponent({
  size='default',
  color='primary',
  children,
  fullWidth,
  onClick,
  type = 'button',
  radius,
  className,
  disabled = false,
}: ButtonProps): JSX.Element {
  return (
    <button
      disabled={disabled}
      style={{ borderRadius: radius  ? `${radius}px` : '' }}
      onClick={onClick}
      type={type}
      className={cn(styles.button, styles[`button_${color}`], styles[`button_${size}`], fullWidth && styles.button_fullWidth, className)}
    >
      {children}
    </button>
  );
}

export const Button = memo(ButtonComponent);
