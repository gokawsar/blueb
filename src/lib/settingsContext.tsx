'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
    darkMode: boolean;
    toggleDarkMode: () => void;
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    isLoading: boolean;
}

interface AppSettings {
    invoice: {
        fontFamily: string;
        fontSize: number;
        fontColor: string;
        topMargin: number;
        bottomMargin: number;
        measurementColor: string;
        tableBorderColor: string;
        tableBorderThickness: number;
        footerPosition: number;
        customerBoxBorderColor: string;
        customerBoxBorderThickness: number;
    };
    company: {
        name: string;
        email: string;
        phone: string;
        address: string;
        tagline: string;
    };
    pad: {
        enabled: boolean;
        opacity: number;
        imageUrl: string;
    };
    signature: {
        enabled: boolean;
        size: number;
        imageUrl: string;
    };
    dateFormat: {
        format: 'US' | 'BD';
        showPrefix: boolean;
        prefixText: string;
    };
}

const defaultSettings: AppSettings = {
    invoice: {
        fontFamily: 'Segoe UI',
        fontSize: 11,
        fontColor: '#1f2937',
        topMargin: 20,
        bottomMargin: 20,
        measurementColor: '#059669',
        tableBorderColor: '#d1d5db',
        tableBorderThickness: 1,
        footerPosition: 15,
        customerBoxBorderColor: '#d1d5db',
        customerBoxBorderThickness: 1,
    },
    company: {
        name: 'AMK Enterprise',
        email: 'info@amkenterprise.com',
        phone: '+880 2 222 111 333',
        address: '',
        tagline: 'General Order & Supplier',
    },
    pad: {
        enabled: false,
        opacity: 0.15,
        imageUrl: '/images/AMK_PAD_A4.png',
    },
    signature: {
        enabled: false,
        size: 60,
        imageUrl: '/images/Sig_Seal.png',
    },
    dateFormat: {
        format: 'BD',
        showPrefix: true,
        prefixText: 'Date: ',
    },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper to merge localStorage with database settings
const mergeSettings = (local: AppSettings, database: Partial<AppSettings>): AppSettings => {
    return {
        invoice: {
            ...local.invoice,
            ...(database.invoice || {}),
        },
        company: {
            ...local.company,
            ...(database.company || {}),
        },
        pad: {
            ...local.pad,
            ...(database.pad || {}),
        },
        signature: {
            ...local.signature,
            ...(database.signature || {}),
        },
        dateFormat: {
            ...local.dateFormat,
            ...(database.dateFormat || {}),
        },
    };
};

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [darkMode, setDarkMode] = useState(false);
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load settings from localStorage and database on mount
    useEffect(() => {
        const loadSettings = async () => {
            setMounted(true);

            // First try to load dark mode from database
            let dbDarkMode: boolean | null = null;
            try {
                const darkModeResponse = await fetch('/api/settings?key=darkMode');
                const darkModeResult = await darkModeResponse.json();
                if (darkModeResult.success && darkModeResult.data !== null) {
                    // API returns parsed JSON, so data is boolean
                    dbDarkMode = darkModeResult.data === true;
                }
            } catch (error) {
                console.error('Failed to load dark mode from database:', error);
            }

            // Load dark mode - prioritize: database > localStorage > system preference
            const savedDarkMode = localStorage.getItem('darkMode');
            
            if (dbDarkMode !== null) {
                // Use database value
                setDarkMode(dbDarkMode);
                if (dbDarkMode) {
                    document.documentElement.classList.add('dark');
                }
                localStorage.setItem('darkMode', dbDarkMode.toString());
            } else if (savedDarkMode === 'true') {
                setDarkMode(true);
                document.documentElement.classList.add('dark');
            } else if (savedDarkMode === 'false') {
                setDarkMode(false);
                document.documentElement.classList.remove('dark');
            } else {
                // Check system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                    setDarkMode(true);
                    document.documentElement.classList.add('dark');
                }
            }

            // Load settings from localStorage first (for quick load)
            const savedSettings = localStorage.getItem('appSettings');
            let localSettings = defaultSettings;
            if (savedSettings) {
                try {
                    localSettings = mergeSettings(defaultSettings, JSON.parse(savedSettings));
                    setSettings(localSettings);
                } catch (e) {
                    console.error('Failed to parse settings', e);
                }
            }

            // Then try to fetch from database and merge
            try {
                const response = await fetch('/api/settings?key=appSettings');
                const result = await response.json();
                if (result.success && result.data) {
                    const dbSettings = result.data as Partial<AppSettings>;
                    const merged = mergeSettings(localSettings, dbSettings);
                    setSettings(merged);
                    // Update localStorage with merged
                    localStorage.setItem('appSettings', JSON.stringify(merged));
                }
            } catch (error) {
                console.error('Failed to load settings from database:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    const toggleDarkMode = async () => {
        if (!mounted) return;

        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);

        if (newDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        }

        // Sync dark mode to database for persistence
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    key: 'darkMode', 
                    value: newDarkMode,
                    description: 'Dark mode preference'
                }),
            });
        } catch (error) {
            console.error('Failed to sync dark mode to database:', error);
        }
    };

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        const updated = {
            ...settings,
            invoice: { ...settings.invoice, ...(newSettings.invoice || {}) },
            company: { ...settings.company, ...(newSettings.company || {}) },
            pad: { ...settings.pad, ...(newSettings.pad || {}) },
            signature: { ...settings.signature, ...(newSettings.signature || {}) },
            dateFormat: { ...settings.dateFormat, ...(newSettings.dateFormat || {}) },
        };
        
        setSettings(updated);
        
        // Save to localStorage immediately for quick access
        localStorage.setItem('appSettings', JSON.stringify(updated));

        // Sync to database in background
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    key: 'appSettings', 
                    value: updated,
                    description: 'Application settings including invoice, company, pad, and signature configurations'
                }),
            });
        } catch (error) {
            console.error('Failed to sync settings to database:', error);
        }
    };

    return (
        <SettingsContext.Provider value={{ darkMode, toggleDarkMode, settings, updateSettings, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
