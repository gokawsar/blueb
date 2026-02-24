import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/lib/settingsContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Billing ERP - Professional Billing & Invoicing",
    description: "SAAS-ready billing ERP system for managing bills, quotations, challans, and topsheets",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var savedDarkMode = localStorage.getItem('darkMode');
                                    if (savedDarkMode === 'true') {
                                        document.documentElement.classList.add('dark');
                                    } else if (savedDarkMode === null) {
                                        // Check system preference only if no localStorage value
                                        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                                            document.documentElement.classList.add('dark');
                                        }
                                    }
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body className={inter.className}>
                <SettingsProvider>
                    {children}
                </SettingsProvider>
            </body>
        </html>
    );
}
