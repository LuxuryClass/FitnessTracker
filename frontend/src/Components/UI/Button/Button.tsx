import { JSX, memo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  size = 'default',
  color,
  children,
  fullWidth,
  onClick,
  type = 'button',
  radius,
  className,
  disabled = false,
}: ButtonProps): JSX.Element {
  const navigate = useNavigate();
  const resolvedColor = color || (size === 'back' ? 'accent-2' : 'primary');

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (size === 'back') {
      navigate(-1);
    }
  };

  return (
    <button
      disabled={disabled}
      style={{ borderRadius: radius ? `${radius}px` : '' }}
      onClick={handleClick}
      type={type}
      className={cn(
        styles.button,
        styles[`button_${resolvedColor}`],
        size !== 'back' && styles[`button_${size}`],
        fullWidth && styles.button_fullWidth,
        size === 'back' && styles.button_back,
        className
      )}
    >
      {size === 'back' ? (
        <img src="/public/icons/ArrowBack.svg" alt="Назад" />
      ) : (
        children
      )}
    </button>
  );
}

export const Button = memo(ButtonComponent);