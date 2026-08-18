import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
    content: React.ReactNode | string | number;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    delay?: number;
    disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    className = '',
    delay = 100,
    disabled = false,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showTooltip = () => {
        if (disabled || !content) return;
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    if (disabled || !content) {
        return <>{children}</>;
    }

    // Position mapping
    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    // Arrow position mapping
    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-slate-800 border-x-transparent border-b-transparent border-t-4 border-x-4 border-b-0',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-slate-800 border-x-transparent border-t-transparent border-b-4 border-x-4 border-t-0',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-slate-800 border-y-transparent border-r-transparent border-l-4 border-y-4 border-r-0',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-slate-800 border-y-transparent border-l-transparent border-r-4 border-y-4 border-l-0',
    };

    const titleAttr = typeof content === 'string' || typeof content === 'number' ? String(content) : undefined;

    return (
        <div
            className={`relative inline-flex items-center group/tooltip ${className}`}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
            title={titleAttr}
        >
            {children}

            {isVisible && (
                <div
                    role="tooltip"
                    className={`absolute z-50 pointer-events-none whitespace-nowrap bg-gray-900/95 dark:bg-slate-800/95 text-white border border-gray-700/60 dark:border-slate-700 shadow-2xl rounded-xl px-3 py-1.5 text-xs font-semibold tracking-wide backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${positionClasses[position]}`}
                >
                    {content}
                    <div className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
                </div>
            )}
        </div>
    );
};

export default Tooltip;
