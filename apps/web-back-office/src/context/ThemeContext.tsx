import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

import { API_URL } from '../lib/apiConfig';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    // Unique key per user ID to prevent cross-user theme bleed on shared computers/browsers
    const storageKey = user?.id ? `demega_theme_${user.id}` : 'demega_theme_guest';

    const [theme, setThemeState] = useState<Theme>(() => {
        // Initial state from user-isolated localStorage
        const saved = localStorage.getItem(storageKey) as Theme;
        if (saved === 'dark' || saved === 'light') return saved;
        return 'light';
    });

    // Sync theme when user logs in or switches account
    useEffect(() => {
        if (user?.themePreference) {
            const pref = user.themePreference as Theme;
            setThemeState(pref);
            localStorage.setItem(storageKey, pref);
        } else {
            const saved = localStorage.getItem(storageKey) as Theme;
            if (saved === 'dark' || saved === 'light') {
                setThemeState(saved);
            }
        }
    }, [user, storageKey]);

    // Apply dark class to document root element
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(storageKey, newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');

        // Persist to user backend profile if authenticated
        const token = localStorage.getItem('token');
        if (token && user?.id) {
            axios.patch(`${API_URL}/auth/theme`, { themePreference: newTheme }, {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {
                // Non-blocking sync error catch
            });
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
