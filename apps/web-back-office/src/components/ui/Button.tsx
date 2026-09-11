import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: React.ReactNode;
    spinnerSize?: number;
    spinnerClassName?: string;
    variant?: 'primary' | 'danger' | 'warning' | 'secondary' | 'outline' | 'custom';
}

/**
 * Reusable Atomic Button Component
 * Enforces idempotent click locking, pointer-event disabling, and animated spinner rendering.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            className = '',
            disabled = false,
            isLoading = false,
            loadingText,
            spinnerSize = 16,
            spinnerClassName = '',
            onClick,
            type = 'button',
            ...rest
        },
        ref
    ) => {
        const isActionBlocked = disabled || isLoading;

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (isActionBlocked) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            onClick?.(e);
        };

        const stateClasses = isLoading
            ? 'pointer-events-none opacity-60 cursor-not-allowed'
            : disabled
            ? 'opacity-50 cursor-not-allowed pointer-events-none'
            : 'active:scale-95';

        return (
            <button
                ref={ref}
                type={type}
                disabled={isActionBlocked}
                aria-busy={isLoading}
                onClick={handleClick}
                className={`${stateClasses} ${className}`}
                {...rest}
            >
                {isLoading ? (
                    <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 size={spinnerSize} className={`animate-spin flex-shrink-0 ${spinnerClassName}`} />
                        {loadingText !== undefined ? <span>{loadingText}</span> : children}
                    </span>
                ) : (
                    children
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
