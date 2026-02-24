'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSettings } from '@/lib/settingsContext';

const fontFamilies = [
    { value: 'Segoe UI', label: 'Segoe UI' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Tahoma', label: 'Tahoma' },
    { value: 'Courier New', label: 'Courier New' },
];

const fontSizes = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];

const fontColors = [
    { value: '#1f2937', label: 'Dark Gray', hex: '#1f2937' },
    { value: '#000000', label: 'Black', hex: '#000000' },
    { value: '#374151', label: 'Gray', hex: '#374151' },
    { value: '#111827', label: 'Near Black', hex: '#111827' },
    { value: '#1e3a8a', label: 'Navy Blue', hex: '#1e3a8a' },
    { value: '#1e40af', label: 'Blue', hex: '#1e40af' },
    { value: '#065f46', label: 'Green', hex: '#065f46' },
    { value: '#7f1d1d', label: 'Red', hex: '#7f1d1d' },
];

const opacityLevels = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5];

const signatureSizes = [30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200];

// Table design presets
const tableDesignPresets = [
    {
        id: 'default',
        name: 'Default',
        description: 'Standard table design',
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
        },
    },
    {
        id: 'compact',
        name: 'Compact',
        description: 'Smaller fonts, more data visible',
        invoice: {
            fontFamily: 'Arial',
            fontSize: 9,
            fontColor: '#1f2937',
            topMargin: 15,
            bottomMargin: 15,
            measurementColor: '#059669',
            tableBorderColor: '#d1d5db',
            tableBorderThickness: 1,
            footerPosition: 10,
        },
    },
    {
        id: 'formal',
        name: 'Formal',
        description: 'Professional look with thicker borders',
        invoice: {
            fontFamily: 'Times New Roman',
            fontSize: 12,
            fontColor: '#000000',
            topMargin: 25,
            bottomMargin: 25,
            measurementColor: '#000000',
            tableBorderColor: '#000000',
            tableBorderThickness: 2,
            footerPosition: 20,
        },
    },
    {
        id: 'modern',
        name: 'Modern',
        description: 'Clean modern design',
        invoice: {
            fontFamily: 'Segoe UI',
            fontSize: 10,
            fontColor: '#111827',
            topMargin: 18,
            bottomMargin: 18,
            measurementColor: '#1e40af',
            tableBorderColor: '#4b5563',
            tableBorderThickness: 1,
            footerPosition: 12,
        },
    },
];

export default function SettingsPage() {
    const { darkMode, toggleDarkMode, settings, updateSettings, isLoading } = useSettings();
    const [activeTab, setActiveTab] = useState('invoice');
    const [saveMessage, setSaveMessage] = useState('');
    const [mounted, setMounted] = useState(false);

    // Apply a table design preset
    const applyTableDesignPreset = (presetId: string) => {
        const preset = tableDesignPresets.find(p => p.id === presetId);
        if (preset) {
            updateSettings({ invoice: { ...settings.invoice, ...preset.invoice } });
            handleSave();
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSave = () => {
        setSaveMessage('Settings saved!');
        setTimeout(() => setSaveMessage(''), 2000);
    };

    const tabs = [
        { id: 'invoice', label: 'Invoice Settings', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { id: 'pad', label: 'Pad & Signature', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { id: 'company', label: 'Company Info', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        { id: 'dateFormat', label: 'Date Format', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { id: 'appearance', label: 'Appearance', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
    ];

    if (isLoading) {
        return (
            <DashboardLayout title="Settings">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500 dark:text-gray-400">Loading settings...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Settings">
            <div className="p-4 sm:p-6 lg:p-8">
                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your preferences and configurations.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Tabs */}
                    <div className="lg:w-64 flex-shrink-0">
                        <nav className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                                    </svg>
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        {activeTab === 'invoice' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Invoice Print Settings</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure the print layout for your invoices and documents.</p>
                                </div>

                                {/* Font Family */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Font Family
                                        </label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={settings.invoice.fontFamily}
                                            onChange={(e) => {
                                                updateSettings({ invoice: { ...settings.invoice, fontFamily: e.target.value } });
                                                handleSave();
                                            }}
                                        >
                                            {fontFamilies.map(font => (
                                                <option key={font.value} value={font.value}>{font.label}</option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Selected: {settings.invoice.fontFamily}
                                        </p>
                                    </div>

                                    {/* Font Size */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Font Size (pt)
                                        </label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={settings.invoice.fontSize}
                                            onChange={(e) => {
                                                updateSettings({ invoice: { ...settings.invoice, fontSize: parseInt(e.target.value) } });
                                                handleSave();
                                            }}
                                        >
                                            {fontSizes.map(size => (
                                                <option key={size} value={size}>{size}pt</option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Current: {settings.invoice.fontSize}pt
                                        </p>
                                    </div>

                                    {/* Font Color */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Font Color
                                        </label>
                                        <div className="flex gap-2 flex-wrap">
                                            {fontColors.map(color => (
                                                <button
                                                    key={color.value}
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.fontColor === color.value ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: color.hex }}
                                                    title={color.label}
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, fontColor: color.value } });
                                                        handleSave();
                                                    }}
                                                />
                                            ))}
                                            <input
                                                type="color"
                                                className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 cursor-pointer"
                                                value={settings.invoice.fontColor}
                                                onChange={(e) => {
                                                    updateSettings({ invoice: { ...settings.invoice, fontColor: e.target.value } });
                                                    handleSave();
                                                }}
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Selected: {settings.invoice.fontColor}
                                        </p>
                                    </div>
                                </div>

                                {/* Margins */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Page Margins (mm)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Top Margin
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={50}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={settings.invoice.topMargin}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    updateSettings({ invoice: { ...settings.invoice, topMargin: val } });
                                                    handleSave();
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Bottom Margin
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={50}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={settings.invoice.bottomMargin}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    updateSettings({ invoice: { ...settings.invoice, bottomMargin: val } });
                                                    handleSave();
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Table & Measurement Settings */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Table & Measurement Styles</h3>
                                    
                                    {/* Table Design Presets */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            Table Design Presets
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {tableDesignPresets.map((preset) => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => applyTableDesignPreset(preset.id)}
                                                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                                                        settings.invoice.fontFamily === preset.invoice.fontFamily && 
                                                        settings.invoice.fontSize === preset.invoice.fontSize
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                                    }`}
                                                >
                                                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                        {preset.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {preset.description}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Measurement Text Color */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Measurement Text Color
                                            </label>
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.measurementColor === '#059669' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#059669' }}
                                                    title="Green"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, measurementColor: '#059669' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.measurementColor === '#1f2937' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#1f2937' }}
                                                    title="Dark Gray"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, measurementColor: '#1f2937' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.measurementColor === '#000000' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#000000' }}
                                                    title="Black"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, measurementColor: '#000000' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.measurementColor === '#1e40af' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#1e40af' }}
                                                    title="Blue"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, measurementColor: '#1e40af' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.measurementColor === '#7f1d1d' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#7f1d1d' }}
                                                    title="Red"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, measurementColor: '#7f1d1d' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.measurementColor === '#065f46' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#065f46' }}
                                                    title="Dark Green"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, measurementColor: '#065f46' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <input
                                                    type="color"
                                                    className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 cursor-pointer"
                                                    value={settings.invoice.measurementColor}
                                                    onChange={(e) => {
                                                        updateSettings({ invoice: { ...settings.invoice, measurementColor: e.target.value } });
                                                        handleSave();
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Selected: {settings.invoice.measurementColor}
                                            </p>
                                        </div>

                                        {/* Table Border Color */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Table Border Color
                                            </label>
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.tableBorderColor === '#d1d5db' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#d1d5db' }}
                                                    title="Light Gray"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, tableBorderColor: '#d1d5db' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.tableBorderColor === '#9ca3af' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#9ca3af' }}
                                                    title="Gray"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, tableBorderColor: '#9ca3af' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.tableBorderColor === '#4b5563' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#4b5563' }}
                                                    title="Dark Gray"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, tableBorderColor: '#4b5563' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.tableBorderColor === '#000000' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#000000' }}
                                                    title="Black"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, tableBorderColor: '#000000' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.tableBorderColor === '#3b82f6' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#3b82f6' }}
                                                    title="Blue"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, tableBorderColor: '#3b82f6' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <input
                                                    type="color"
                                                    className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 cursor-pointer"
                                                    value={settings.invoice.tableBorderColor}
                                                    onChange={(e) => {
                                                        updateSettings({ invoice: { ...settings.invoice, tableBorderColor: e.target.value } });
                                                        handleSave();
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Selected: {settings.invoice.tableBorderColor}
                                            </p>
                                        </div>

                                        {/* Table Border Thickness */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Table Border Thickness: {settings.invoice.tableBorderThickness}px
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="3"
                                                step="1"
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                                value={settings.invoice.tableBorderThickness}
                                                onChange={(e) => {
                                                    updateSettings({ invoice: { ...settings.invoice, tableBorderThickness: parseInt(e.target.value) } });
                                                    handleSave();
                                                }}
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>No Border</span>
                                                <span>1px</span>
                                                <span>2px</span>
                                                <span>3px</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Box Settings */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Customer Info Box Style</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Customer Box Border Color */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Customer Box Border Color
                                            </label>
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.customerBoxBorderColor === '#d1d5db' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#d1d5db' }}
                                                    title="Light Gray"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, customerBoxBorderColor: '#d1d5db' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.customerBoxBorderColor === '#ffffffff' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#ffffffff' }}
                                                    title="Gray"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, customerBoxBorderColor: '#ffffffff' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.customerBoxBorderColor === '#4b5563' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#4b5563' }}
                                                    title="Dark Gray"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, customerBoxBorderColor: '#4b5563' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.customerBoxBorderColor === '#000000' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#000000' }}
                                                    title="Black"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, customerBoxBorderColor: '#000000' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.customerBoxBorderColor === '#3b82f6' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#3b82f6' }}
                                                    title="Blue"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, customerBoxBorderColor: '#3b82f6' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <button
                                                    className={`w-8 h-8 rounded-lg border-2 ${settings.invoice.customerBoxBorderColor === '#ef4444' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                    style={{ backgroundColor: '#ef4444' }}
                                                    title="Red"
                                                    onClick={() => {
                                                        updateSettings({ invoice: { ...settings.invoice, customerBoxBorderColor: '#ef4444' } });
                                                        handleSave();
                                                    }}
                                                />
                                                <input
                                                    type="color"
                                                    className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 cursor-pointer"
                                                    value={settings.invoice.customerBoxBorderColor}
                                                    onChange={(e) => {
                                                        updateSettings({ invoice: { ...settings.invoice, customerBoxBorderColor: e.target.value } });
                                                        handleSave();
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Selected: {settings.invoice.customerBoxBorderColor}
                                            </p>
                                        </div>

                                        {/* Customer Box Border Thickness */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Customer Box Border Thickness: {settings.invoice.customerBoxBorderThickness}px
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="3"
                                                step="1"
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                                value={settings.invoice.customerBoxBorderThickness}
                                                onChange={(e) => {
                                                    updateSettings({ invoice: { ...settings.invoice, customerBoxBorderThickness: parseInt(e.target.value) } });
                                                    handleSave();
                                                }}
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>No Border</span>
                                                <span>1px</span>
                                                <span>2px</span>
                                                <span>3px</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Position */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Footer Position</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Doc No Position from Bottom: {settings.invoice.footerPosition}mm
                                            </label>
                                            <input
                                                type="range"
                                                min="5"
                                                max="40"
                                                step="1"
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                                value={settings.invoice.footerPosition}
                                                onChange={(e) => {
                                                    updateSettings({ invoice: { ...settings.invoice, footerPosition: parseInt(e.target.value) } });
                                                    handleSave();
                                                }}
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>5mm</span>
                                                <span>22mm</span>
                                                <span>40mm</span>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Controls the distance of "Doc No:" from the bottom of the page
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Preview</h3>
                                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                                        <div
                                            className="bg-white p-4"
                                            style={{
                                                fontFamily: settings.invoice.fontFamily,
                                                fontSize: `${settings.invoice.fontSize}px`,
                                                color: settings.invoice.fontColor,
                                                paddingTop: `${settings.invoice.topMargin}mm`,
                                                paddingBottom: `${settings.invoice.bottomMargin}mm`,
                                                minHeight: '200px',
                                            }}
                                        >
                                            <p className="font-bold">Sample Invoice Text</p>
                                            <p className="text-sm">This is how your invoice text will appear.</p>
                                            <p className="text-sm">Amount: ৳ 10,000.00</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    {saveMessage && (
                                        <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                                            {saveMessage}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'pad' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pad & Signature Settings</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure background pad and signature for your documents.</p>
                                </div>

                                {/* Pad Settings */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Pad (Background Image)
                                    </h3>
                                    
                                    {/* Enable Pad Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Enable Pad</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Show background pad image on documents</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.pad.enabled}
                                                onChange={(e) => {
                                                    updateSettings({ pad: { ...settings.pad, enabled: e.target.checked } });
                                                    handleSave();
                                                }}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {settings.pad.enabled && (
                                        <>
                                            {/* Pad Opacity */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Pad Opacity
                                                </label>
                                                <select
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                    value={settings.pad.opacity}
                                                    onChange={(e) => {
                                                        updateSettings({ pad: { ...settings.pad, opacity: parseFloat(e.target.value) } });
                                                        handleSave();
                                                    }}
                                                >
                                                    {opacityLevels.map(level => (
                                                        <option key={level} value={level}>{(level * 100).toFixed(0)}%</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Pad Image Upload */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Upload Pad Image
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex-1 cursor-pointer">
                                                        <div className="flex items-center justify-center w-full px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors">
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                Click to upload
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                                                className="hidden"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (!file) return;
                                                                    
                                                                    const formData = new FormData();
                                                                    formData.append('file', file);
                                                                    formData.append('type', 'pad');
                                                                    
                                                                    try {
                                                                        const response = await fetch('/api/upload', {
                                                                            method: 'POST',
                                                                            body: formData,
                                                                        });
                                                                        const result = await response.json();
                                                                        
                                                                        if (result.success) {
                                                                            updateSettings({ pad: { ...settings.pad, imageUrl: result.url } });
                                                                            handleSave();
                                                                        } else {
                                                                            alert(result.error || 'Upload failed');
                                                                        }
                                                                    } catch (error) {
                                                                        console.error('Upload error:', error);
                                                                        alert('Failed to upload image');
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </label>
                                                    {settings.pad.imageUrl && (
                                                        <button
                                                            onClick={() => {
                                                                updateSettings({ pad: { ...settings.pad, imageUrl: '/images/AMK_PAD_A4.png' } });
                                                                handleSave();
                                                            }}
                                                            className="px-3 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Pad Image URL */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Pad Image URL
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                    value={settings.pad.imageUrl}
                                                    onChange={(e) => {
                                                        updateSettings({ pad: { ...settings.pad, imageUrl: e.target.value } });
                                                        handleSave();
                                                    }}
                                                    placeholder="/images/AMK_PAD_A4.png"
                                                />
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    Path to your pad image in the public folder
                                                </p>
                                            </div>

                                            {/* Pad Preview */}
                                            <div className="mt-4">
                                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</h4>
                                                <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden h-48 bg-white">
                                                    <img 
                                                        src={settings.pad.imageUrl} 
                                                        alt="Pad Preview" 
                                                        className="w-full h-full object-contain"
                                                        style={{ opacity: settings.pad.opacity }}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Signature Settings */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Signature
                                    </h3>
                                    
                                    {/* Enable Signature Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Enable Signature</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Show signature image on documents</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.signature.enabled}
                                                onChange={(e) => {
                                                    updateSettings({ signature: { ...settings.signature, enabled: e.target.checked } });
                                                    handleSave();
                                                }}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {settings.signature.enabled && (
                                        <>
                                            {/* Signature Size Slider - Single slider for both width and height */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Signature Size: {settings.signature.size}px
                                                </label>
                                                <input
                                                    type="range"
                                                    min="30"
                                                    max="200"
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                                    value={settings.signature.size}
                                                    onChange={(e) => {
                                                        updateSettings({ signature: { ...settings.signature, size: parseInt(e.target.value) } });
                                                        handleSave();
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span>Small</span>
                                                    <span>Large</span>
                                                </div>
                                            </div>

                                            {/* Signature Image Upload */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Upload Signature Image
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex-1 cursor-pointer">
                                                        <div className="flex items-center justify-center w-full px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors">
                                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                Click to upload
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                                                className="hidden"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (!file) return;
                                                                    
                                                                    const formData = new FormData();
                                                                    formData.append('file', file);
                                                                    formData.append('type', 'signature');
                                                                    
                                                                    try {
                                                                        const response = await fetch('/api/upload', {
                                                                            method: 'POST',
                                                                            body: formData,
                                                                        });
                                                                        const result = await response.json();
                                                                        
                                                                        if (result.success) {
                                                                            updateSettings({ signature: { ...settings.signature, imageUrl: result.url } });
                                                                            handleSave();
                                                                        } else {
                                                                            alert(result.error || 'Upload failed');
                                                                        }
                                                                    } catch (error) {
                                                                        console.error('Upload error:', error);
                                                                        alert('Failed to upload image');
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </label>
                                                    {settings.signature.imageUrl && settings.signature.imageUrl !== '/images/Sig_Seal.png' && (
                                                        <button
                                                            onClick={() => {
                                                                updateSettings({ signature: { ...settings.signature, imageUrl: '/images/Sig_Seal.png' } });
                                                                handleSave();
                                                            }}
                                                            className="px-3 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Signature Image URL */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Signature Image URL
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                    value={settings.signature.imageUrl}
                                                    onChange={(e) => {
                                                        updateSettings({ signature: { ...settings.signature, imageUrl: e.target.value } });
                                                        handleSave();
                                                    }}
                                                    placeholder="/images/Sig_Seal.png"
                                                />
                                            </div>

                                            {/* Signature Preview */}
                                            <div className="mt-4">
                                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</h4>
                                                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white flex items-center justify-center min-h-24">
                                                    <img 
                                                        src={settings.signature.imageUrl} 
                                                        alt="Signature Preview" 
                                                        className="object-contain"
                                                        style={{ 
                                                            width: `${settings.signature.size}px`,
                                                            height: `${settings.signature.size * 0.5}px`,
                                                            maxWidth: '200px',
                                                            maxHeight: '100px'
                                                        }}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    {saveMessage && (
                                        <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                                            {saveMessage}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'company' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Company Information</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Update your company details for documents.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={settings.company.name}
                                            onChange={(e) => {
                                                updateSettings({ company: { ...settings.company, name: e.target.value } });
                                                handleSave();
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tagline</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={settings.company.tagline}
                                            onChange={(e) => {
                                                updateSettings({ company: { ...settings.company, tagline: e.target.value } });
                                                handleSave();
                                            }}
                                            placeholder="General Order & Supplier"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                        <input
                                            type="email"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={settings.company.email}
                                            onChange={(e) => {
                                                updateSettings({ company: { ...settings.company, email: e.target.value } });
                                                handleSave();
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={settings.company.phone}
                                            onChange={(e) => {
                                                updateSettings({ company: { ...settings.company, phone: e.target.value } });
                                                handleSave();
                                            }}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                                        <textarea
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            rows={2}
                                            value={settings.company.address}
                                            onChange={(e) => {
                                                updateSettings({ company: { ...settings.company, address: e.target.value } });
                                                handleSave();
                                            }}
                                            placeholder="Company address for documents"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    {saveMessage && (
                                        <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                                            {saveMessage}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'dateFormat' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Date Format Settings</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure how dates are displayed in documents and exports.</p>
                                </div>

                                {/* Date Format Selection */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Date Format
                                    </h3>

                                    {/* Format Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Select Date Format
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    updateSettings({ dateFormat: { ...settings.dateFormat, format: 'BD' } });
                                                    handleSave();
                                                }}
                                                className={`p-4 rounded-lg border-2 text-left transition-all ${
                                                    settings.dateFormat.format === 'BD'
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                                }`}
                                            >
                                                <div className="font-medium text-gray-900 dark:text-white">BD Format (DD/MM/YYYY)</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Example: {new Date().toLocaleDateString('en-GB')}</div>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    updateSettings({ dateFormat: { ...settings.dateFormat, format: 'US' } });
                                                    handleSave();
                                                }}
                                                className={`p-4 rounded-lg border-2 text-left transition-all ${
                                                    settings.dateFormat.format === 'US'
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                                }`}
                                            >
                                                <div className="font-medium text-gray-900 dark:text-white">US Format (MM/DD/YYYY)</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Example: {new Date().toLocaleDateString('en-US')}</div>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Date Prefix Settings */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                        </svg>
                                        Date Prefix
                                    </h3>

                                    {/* Show Prefix Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Show Date Prefix</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Display "Date:" prefix before dates in documents</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.dateFormat.showPrefix}
                                                onChange={(e) => {
                                                    updateSettings({ dateFormat: { ...settings.dateFormat, showPrefix: e.target.checked } });
                                                    handleSave();
                                                }}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {/* Prefix Text */}
                                    {settings.dateFormat.showPrefix && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Prefix Text
                                            </label>
                                            <select
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                                value={settings.dateFormat.prefixText}
                                                onChange={(e) => {
                                                    updateSettings({ dateFormat: { ...settings.dateFormat, prefixText: e.target.value } });
                                                    handleSave();
                                                }}
                                            >
                                                <option value="Date: ">Date: </option>
                                                <option value="Date">Date</option>
                                                <option value=" ">None (Space only)</option>
                                            </select>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Preview: {settings.dateFormat.prefixText}{new Date().toLocaleDateString(settings.dateFormat.format === 'US' ? 'en-US' : 'en-GB')}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Preview */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Preview</h3>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">With Prefix:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {settings.dateFormat.showPrefix ? settings.dateFormat.prefixText : ''}{new Date().toLocaleDateString(settings.dateFormat.format === 'US' ? 'en-US' : 'en-GB')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Without Prefix:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {new Date().toLocaleDateString(settings.dateFormat.format === 'US' ? 'en-US' : 'en-GB')}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                        This format will be applied to all dates in PDF exports, Excel exports, and print previews.
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    {saveMessage && (
                                        <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                                            {saveMessage}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Appearance</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Customize the look and feel of your application.</p>
                                </div>

                                {/* Dark Mode Toggle */}
                                {mounted && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Switch between light and dark theme for the UI</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={darkMode}
                                                    onChange={toggleDarkMode}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Theme Preview */}
                                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Preview</h3>
                                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
                                        <div className="space-y-2">
                                            <div className={`h-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ width: '60%' }}></div>
                                            <div className={`h-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ width: '80%' }}></div>
                                            <div className={`h-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ width: '40%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
