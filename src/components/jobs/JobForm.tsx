'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LineItemsTable from './LineItemsTable';
import InventoryModal from './InventoryModal';
import SizeNoterModal from './SizeNoterModal';
import ExpenseModal from './ExpenseModal';
import { JobItem, Customer, Inventory, Job, Measurement, JobExpense } from '@/lib/types';
import { calculateLineItem, formatCurrency, numberToWords, generateRefNumber } from '@/lib/utils';

type JobFormData = {
    refNumber: string;
    jobDetail: string;
    date: string;
    customerId: string;
    workLocation: string;
    status: 'QUOTATION' | 'CHALLAN' | 'BILL';
    notes: string;
    termsConditions: string;
    discountPercent: number;
    quotationDate: string;
    challanDate: string;
    billDate: string;
    billNumber: string;
    bblBillNumber: string;
    challanNumber: string;
};

interface AutocompleteItem {
    label: string;
    type: 'jobDetail' | 'workLocation';
}

export default function JobForm() {
    const router = useRouter();
    const params = useParams();
    const isEdit = !!params.id;
    const jobId = params.id ? parseInt(params.id as string) : null;

    // Refs for autocomplete
    const jobDetailInputRef = useRef<HTMLInputElement>(null);
    const workLocationInputRef = useRef<HTMLInputElement>(null);

    // Autocomplete states
    const [showJobDetailSuggestions, setShowJobDetailSuggestions] = useState(false);
    const [showWorkLocationSuggestions, setShowWorkLocationSuggestions] = useState(false);
    const [jobDetailSuggestions, setJobDetailSuggestions] = useState<string[]>([]);
    const [workLocationSuggestions, setWorkLocationSuggestions] = useState<string[]>([]);
    const [previousJobs, setPreviousJobs] = useState<Job[]>([]);

    const [formData, setFormData] = useState<JobFormData>({
        refNumber: '',
        jobDetail: '',
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        workLocation: '',
        status: 'QUOTATION',
        notes: '',
        termsConditions: '',
        discountPercent: 0,
        quotationDate: new Date().toISOString().split('T')[0],
        challanDate: '',
        billDate: '',
        billNumber: '',
        bblBillNumber: '',
        challanNumber: '',
    });

    const [items, setItems] = useState<JobItem[]>([
        {
            id: 1,
            serialNumber: 1,
            workDescription: '',
            quantity: 0,
            unit: 'nos',
            unitPrice: 0,
            buyPrice: 0,
            discountPercent: 0,
            discountAmount: 0,
            subtotal: 0,
            vatRate: 0,
            vatAmount: 0,
            total: 0,
        },
    ]);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [inventory, setInventory] = useState<Inventory[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);

    // Modals
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [showSizeNoterModal, setShowSizeNoterModal] = useState(false);
    const [inventorySearch, setInventorySearch] = useState('');

    // Size Noter measurements
    const [measurements, setMeasurements] = useState<Measurement[]>([]);

    // Line items search
    const [lineItemsSearch, setLineItemsSearch] = useState('');
    const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);
    const [filteredInventory, setFilteredInventory] = useState<Inventory[]>([]);
    const inventoryDropdownRef = useRef<HTMLDivElement>(null);

    // Duplicate Challan Date Modal
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateJobs, setDuplicateJobs] = useState<Job[]>([]);

    // Size Noter for individual line item editing
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [editingMeasurements, setEditingMeasurements] = useState<Measurement[]>([]);

    // Expenses
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenses, setExpenses] = useState<JobExpense[]>([]);
    const [totalExpenses, setTotalExpenses] = useState(0);

    // Fetch customers, inventory and previous jobs for autocomplete
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [customersRes, inventoryRes, jobsRes] = await Promise.all([
                    fetch('/api/customers?limit=1000'),
                    fetch('/api/inventory?limit=1000'),
                    fetch('/api/jobs?limit=1000'),
                ]);

                const customersData = await customersRes.json();
                const inventoryData = await inventoryRes.json();
                const jobsData = await jobsRes.json();

                if (customersData.success) {
                    setCustomers(customersData.data);
                    // Auto-select first customer if available and no customer selected
                    if (customersData.data.length > 0 && !formData.customerId) {
                        setFormData(prev => ({ ...prev, customerId: customersData.data[0].id.toString() }));
                    }
                }
                if (inventoryData.success) {
                    setInventory(inventoryData.data);
                }
                if (jobsData.success) {
                    setPreviousJobs(jobsData.data);
                    // Extract unique job details and work locations
                    const jobDetailsArr = jobsData.data
                        .filter((j: Job) => j.jobDetail)
                        .map((j: Job) => j.jobDetail as string);
                    const workLocationsArr = jobsData.data
                        .filter((j: Job) => j.workLocation)
                        .map((j: Job) => j.workLocation as string);
                    // Get unique values using filter
                    const uniqueJobDetails = jobDetailsArr.filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
                    const uniqueWorkLocations = workLocationsArr.filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
                    setJobDetailSuggestions(uniqueJobDetails);
                    setWorkLocationSuggestions(uniqueWorkLocations);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    // Fetch job if editing
    useEffect(() => {
        if (isEdit && jobId) {
            const fetchJob = async () => {
                try {
                    const response = await fetch(`/api/jobs?id=${jobId}`);
                    const result = await response.json();

                    if (result.success && result.data) {
                        const job = result.data;
                        setFormData({
                            refNumber: job.refNumber || '',
                            jobDetail: job.jobDetail || '',
                            date: job.date ? new Date(job.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            customerId: job.customerId?.toString() || '',
                            workLocation: job.workLocation || '',
                            status: job.status || 'QUOTATION',
                            notes: job.notes || '',
                            termsConditions: job.termsConditions || '',
                            discountPercent: job.discountPercent || 0,
                            quotationDate: job.quotationDate ? new Date(job.quotationDate).toISOString().split('T')[0] : '',
                            challanDate: job.challanDate ? new Date(job.challanDate).toISOString().split('T')[0] : '',
                            billDate: job.billDate ? new Date(job.billDate).toISOString().split('T')[0] : '',
                            billNumber: job.billNumber || '',
                            bblBillNumber: job.bblBillNumber || '',
                            challanNumber: job.challanNumber || '',
                        });

                        if (job.items && job.items.length > 0) {
                            setItems(job.items.map((item: JobItem, index: number) => {
                                return {
                                    ...item,
                                    serialNumber: index + 1,
                                    // measurements are already loaded from API with include
                                };
                            }));
                        }

                        // Load expenses
                        if (job.expenses && job.expenses.length > 0) {
                            setExpenses(job.expenses);
                            setTotalExpenses(job.totalExpenses || 0);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching job:', error);
                } finally {
                    setFetching(false);
                }
            };

            fetchJob();
        }
    }, [isEdit, jobId]);

    // Filter suggestions based on input
    const filterSuggestions = (input: string, suggestions: string[]) => {
        if (!input) return suggestions.slice(0, 5);
        return suggestions
            .filter(s => s.toLowerCase().includes(input.toLowerCase()))
            .slice(0, 5);
    };

    // Handle job detail change with autocomplete
    const handleJobDetailChange = (value: string) => {
        setFormData(prev => ({ ...prev, jobDetail: value }));
        setShowJobDetailSuggestions(true);
    };

    // Handle work location change with autocomplete
    const handleWorkLocationChange = (value: string) => {
        setFormData(prev => ({ ...prev, workLocation: value }));
        setShowWorkLocationSuggestions(true);
    };

    // Select suggestion
    const selectJobDetail = (value: string) => {
        setFormData(prev => ({ ...prev, jobDetail: value }));
        setShowJobDetailSuggestions(false);
    };

    const selectWorkLocation = (value: string) => {
        setFormData(prev => ({ ...prev, workLocation: value }));
        setShowWorkLocationSuggestions(false);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (jobDetailInputRef.current && !jobDetailInputRef.current.contains(event.target as Node)) {
                setShowJobDetailSuggestions(false);
            }
            if (workLocationInputRef.current && !workLocationInputRef.current.contains(event.target as Node)) {
                setShowWorkLocationSuggestions(false);
            }
            if (inventoryDropdownRef.current && !inventoryDropdownRef.current.contains(event.target as Node)) {
                setShowInventoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter inventory based on search term
    useEffect(() => {
        if (lineItemsSearch.trim()) {
            const search = lineItemsSearch.toLowerCase();
            const filtered = inventory.filter(item =>
                item.name.toLowerCase().includes(search) ||
                (item.details && item.details.toLowerCase().includes(search)) ||
                item.sku.toLowerCase().includes(search)
            ).slice(0, 10); // Limit to 10 results
            setFilteredInventory(filtered);
            setShowInventoryDropdown(filtered.length > 0);
        } else {
            setFilteredInventory([]);
            setShowInventoryDropdown(false);
        }
    }, [lineItemsSearch, inventory]);

    // Calculate totals (without VAT for now)
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalVat = 0; // VAT disabled for now
    const discountAmount = subtotal * (formData.discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    const totalAmount = afterDiscount; // No VAT for now
    const amountInWords = numberToWords(totalAmount);
    const expectedProfit = totalAmount - totalExpenses;

    // Handle form field changes
    const handleFormChange = (field: keyof JobFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Check for duplicate challan date when challanDate changes
        if (field === 'challanDate' && value) {
            checkDuplicateChallanDate(value as string);
        }
    };

    // Check for jobs with the same challan date
    const checkDuplicateChallanDate = (challanDate: string) => {
        const jobsWithSameDate = previousJobs.filter(job => {
            if (!job.challanDate) return false;
            const jobChallanDate = new Date(job.challanDate).toISOString().split('T')[0];
            return jobChallanDate === challanDate;
        });
        
        if (jobsWithSameDate.length > 0) {
            setDuplicateJobs(jobsWithSameDate);
            setShowDuplicateModal(true);
        }
    };

    // Handle item changes
    const handleItemChange = (index: number, field: keyof JobItem, value: string | number | boolean) => {
        const newItems = [...items];
        const item = { ...newItems[index] };

        if (field === 'autoCalculateSqft') {
            (item as Record<string, unknown>)[field] = value === true || value === 1;
        } else if (field === 'quantity' || field === 'unitPrice' || field === 'discountPercent' || field === 'vatRate') {
            (item as Record<string, unknown>)[field] = Number(value);
        } else {
            (item as Record<string, unknown>)[field] = value;
        }

        // Auto-fill from inventory if SKU is selected
        if (field === 'workDescription' && !item.unitPrice && item.quantity === 0) {
            const invItem = inventory.find(inv =>
                inv.name.toLowerCase().includes((value as string).toLowerCase())
            );
            if (invItem) {
                item.unit = invItem.unit;
                item.unitPrice = invItem.discountedPrice && invItem.discountedPrice > 0 ? invItem.discountedPrice : invItem.standardPrice;
                item.buyPrice = invItem.buyPrice;
                item.vatRate = invItem.vatRate;
                item.discountPercent = 0;
                item.discountedPrice = invItem.discountedPrice;
                item.details = invItem.details || '';  // Include details from inventory
            }
        }

        // Recalculate totals
        const calculated = calculateLineItem(item);
        newItems[index] = calculated;

        setItems(newItems);
    };

    // Add new line item
    const addItem = () => {
        const newItem: JobItem = {
            id: Date.now(),
            serialNumber: items.length + 1,
            workDescription: '',
            quantity: 0,
            unit: 'nos',
            unitPrice: 0,
            buyPrice: 0,
            discountPercent: 0,
            discountAmount: 0,
            subtotal: 0,
            vatRate: 0,
            vatAmount: 0,
            total: 0,
        };
        setItems([...items, newItem]);
    };

    // Remove line item
    const removeItem = (index: number) => {
        if (items.length === 1) return;
        const newItems = items.filter((_, i) => i !== index);
        newItems.forEach((item, i) => {
            item.serialNumber = i + 1;
        });
        setItems(newItems);
    };

    // Add inventory item to line items
    const addInventoryItem = (invItem: Inventory, closeModal: boolean = true) => {
        const existingIndex = items.findIndex(item => item.sku === invItem.sku);
        if (existingIndex >= 0) {
            const newItems = [...items];
            const item = { ...newItems[existingIndex] };
            item.quantity += 1;
            const calculated = calculateLineItem(item);
            newItems[existingIndex] = calculated;
            setItems(newItems);
        } else {
            // Use discounted price if available, otherwise standard price
            const effectivePrice = invItem.discountedPrice && invItem.discountedPrice > 0
                ? invItem.discountedPrice
                : invItem.standardPrice;

            const newItem: JobItem = {
                id: Date.now(),
                serialNumber: items.length + 1,
                workDescription: invItem.name,
                details: invItem.details || '',  // Include details from inventory
                quantity: 1,
                unit: invItem.unit,
                inventoryId: invItem.id,
                sku: invItem.sku,
                skuName: invItem.name,
                unitPrice: effectivePrice,  // Use discounted price
                buyPrice: invItem.buyPrice,
                discountedPrice: invItem.discountedPrice,  // Store discounted price
                discountPercent: 0,
                discountAmount: 0,
                subtotal: 0,
                vatRate: invItem.vatRate,
                vatAmount: 0,
                total: 0,
                autoCalculateSqft: false,  // Default: don't auto-calculate
            };
            const calculated = calculateLineItem(newItem);
            setItems([...items, calculated]);
        }
        if (closeModal) {
            setShowInventoryModal(false);
            setInventorySearch('');
        }
    };

    // Open Size Noter for a specific line item
    const handleOpenSizeNoter = (index: number) => {
        const item = items[index];

        // First, try to load from measurements array (from database)
        if (item.measurements && item.measurements.length > 0) {
            const measurementsWithSqft = item.measurements.map((m: Measurement) => {
                const totalWidth = m.widthFeet + (m.widthInches / 12);
                const totalHeight = m.heightFeet + (m.heightInches / 12);
                return {
                    ...m,
                    calculatedSqft: m.calculatedSqft || Number((totalWidth * totalHeight * m.quantity).toFixed(2))
                };
            });
            setEditingMeasurements(measurementsWithSqft);
            setEditingItemIndex(index);
            setShowSizeNoterModal(true);
            return;
        }

        // Fallback to measurementsJson (legacy)
        if (item.measurementsJson) {
            try {
                const parsed = JSON.parse(item.measurementsJson);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Ensure each measurement has correct calculatedSqft
                    const measurementsWithSqft = parsed.map((m: Measurement) => {
                        const totalWidth = m.widthFeet + (m.widthInches / 12);
                        const totalHeight = m.heightFeet + (m.heightInches / 12);
                        return {
                            ...m,
                            calculatedSqft: Number((totalWidth * totalHeight * m.quantity).toFixed(2))
                        };
                    });
                    setEditingMeasurements(measurementsWithSqft);
                    setEditingItemIndex(index);
                    setShowSizeNoterModal(true);
                    return;
                }
            } catch (e) {
                console.error('Error parsing measurementsJson:', e);
            }
        }

        // Fallback to legacy single measurement fields - use 1 as default quantity (pieces)
        if (item.widthFeet || item.widthInches || item.heightFeet || item.heightInches) {
            const totalWidth = (item.widthFeet || 0) + ((item.widthInches || 0) / 12);
            const totalHeight = (item.heightFeet || 0) + ((item.heightInches || 0) / 12);
            // Calculate pieces from total sqft if available
            const totalSqft = item.calculatedSqft || (totalWidth * totalHeight);
            const pieces = totalSqft > 0 && totalWidth > 0 && totalHeight > 0
                ? Math.round(totalSqft / (totalWidth * totalHeight))
                : 1;
            setEditingMeasurements([{
                widthFeet: item.widthFeet || 0,
                widthInches: item.widthInches || 0,
                heightFeet: item.heightFeet || 0,
                heightInches: item.heightInches || 0,
                quantity: pieces,
                description: item.workDescription || '',
                calculatedSqft: item.calculatedSqft || Number((totalWidth * totalHeight * pieces).toFixed(2)),
                sortOrder: 0,
            }]);
        } else {
            setEditingMeasurements([{ widthFeet: 0, widthInches: 0, heightFeet: 0, heightInches: 0, quantity: 1, description: '', calculatedSqft: 0, sortOrder: 0 }]);
        }
        setEditingItemIndex(index);
        setShowSizeNoterModal(true);
    };

    // Save size from editing modal
    const handleSaveEditingSize = () => {
        if (editingItemIndex !== null && editingMeasurements.length > 0) {
            // Calculate total sqft from all measurements
            let totalSqft = 0;
            let description = '';

            const processedMeasurements = editingMeasurements.map((measurement, idx) => {
                const totalWidth = measurement.widthFeet + (measurement.widthInches / 12);
                const totalHeight = measurement.heightFeet + (measurement.heightInches / 12);
                const calculatedSqft = Number((totalWidth * totalHeight * measurement.quantity).toFixed(2));
                totalSqft += calculatedSqft;
                if (measurement.description) {
                    description = measurement.description;
                }
                return {
                    ...measurement,
                    calculatedSqft,
                    sortOrder: idx,
                };
            });

            const newItems = [...items];
            const item = { ...newItems[editingItemIndex] };

            // Store first measurement's dimensions (for display)
            item.widthFeet = editingMeasurements[0].widthFeet;
            item.widthInches = editingMeasurements[0].widthInches;
            item.heightFeet = editingMeasurements[0].heightFeet;
            item.heightInches = editingMeasurements[0].heightInches;
            item.calculatedSqft = totalSqft;
            item.quantity = totalSqft;  // Total sqft as quantity
            item.workDescription = description || item.workDescription;
            item.unit = 'sft';

            // Store measurements array for database
            item.measurements = processedMeasurements;
            // Also store as JSON for backward compatibility
            item.measurementsJson = JSON.stringify(processedMeasurements);

            const calculated = calculateLineItem(item);
            newItems[editingItemIndex] = calculated;
            setItems(newItems);
        }
        setShowSizeNoterModal(false);
        setEditingItemIndex(null);
        setEditingMeasurements([]);
    };

    // Override addMeasurementToLineItems for editing
    const handleAddMeasurementToLineItems = () => {
        if (editingItemIndex !== null) {
            handleSaveEditingSize();
        } else {
            addMeasurementToLineItems();
        }
    };

    // Add a new measurement row
    const addMeasurement = () => {
        setMeasurements([...measurements, { widthFeet: 0, widthInches: 0, heightFeet: 0, heightInches: 0, quantity: 1, description: '', calculatedSqft: 0, sortOrder: measurements.length }]);
    };

    // Update measurement
    const updateMeasurement = (index: number, field: keyof Measurement, value: string | number) => {
        const newMeasurements = [...measurements];
        newMeasurements[index] = { ...newMeasurements[index], [field]: field === 'description' ? value : Number(value) };
        setMeasurements(newMeasurements);
    };

    // Remove measurement
    const removeMeasurement = (index: number) => {
        setMeasurements(measurements.filter((_, i) => i !== index));
    };

    // Add measurements to line items - create single item with total sqft
    const addMeasurementToLineItems = () => {
        if (editingItemIndex !== null) {
            // When editing existing item, save the measurements
            handleSaveEditingSize();
            return;
        }

        // Calculate total sqft from all measurements
        const newItems = [...items];
        let totalSqft = 0;
        let description = '';

        const processedMeasurements = measurements.map((measurement, idx) => {
            const totalWidth = measurement.widthFeet + (measurement.widthInches / 12);
            const totalHeight = measurement.heightFeet + (measurement.heightInches / 12);
            const calculatedSqft = Number((totalWidth * totalHeight * measurement.quantity).toFixed(2));
            totalSqft += calculatedSqft;
            if (measurement.description) {
                description = measurement.description;
            }
            return {
                ...measurement,
                calculatedSqft,
                sortOrder: idx,
            };
        });

        const newItem: JobItem = {
            id: Date.now() + Math.random(),
            serialNumber: newItems.length + 1,
            workDescription: description || 'Measurement Item',
            quantity: totalSqft,  // Total sqft as quantity
            unit: 'sft',
            unitPrice: 0,
            buyPrice: 0,
            discountPercent: 0,
            discountAmount: 0,
            subtotal: 0,
            vatRate: 0,
            vatAmount: 0,
            total: 0,
            widthFeet: measurements[0]?.widthFeet || 0,
            widthInches: measurements[0]?.widthInches || 0,
            heightFeet: measurements[0]?.heightFeet || 0,
            heightInches: measurements[0]?.heightInches || 0,
            calculatedSqft: totalSqft,
            measurements: processedMeasurements,
            measurementsJson: JSON.stringify(processedMeasurements),
        };

        const calculated = calculateLineItem(newItem);
        newItems.push(calculated);

        setItems(newItems);
        setShowSizeNoterModal(false);
        setMeasurements([]);
    };

    // Expense handlers
    const handleAddExpense = async (expense: Omit<JobExpense, 'id' | 'jobId' | 'createdAt' | 'updatedAt'>) => {
        if (!jobId) return;
        try {
            const response = await fetch('/api/jobs/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, ...expense }),
            });
            const result = await response.json();
            if (result.success) {
                const newExpenses = [...expenses, result.data];
                setExpenses(newExpenses);
                setTotalExpenses(newExpenses.reduce((sum, e) => sum + e.amount, 0));
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            throw error;
        }
    };

    const handleUpdateExpense = async (id: number, expense: Partial<JobExpense>) => {
        try {
            const response = await fetch('/api/jobs/expenses', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...expense }),
            });
            const result = await response.json();
            if (result.success) {
                const newExpenses = expenses.map(e => e.id === id ? { ...e, ...expense } : e);
                setExpenses(newExpenses);
                setTotalExpenses(newExpenses.reduce((sum, e) => sum + e.amount, 0));
            }
        } catch (error) {
            console.error('Error updating expense:', error);
            throw error;
        }
    };

    const handleDeleteExpense = async (id: number) => {
        try {
            const response = await fetch(`/api/jobs/expenses?id=${id}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            if (result.success) {
                const newExpenses = expenses.filter(e => e.id !== id);
                setExpenses(newExpenses);
                setTotalExpenses(newExpenses.reduce((sum, e) => sum + e.amount, 0));
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            throw error;
        }
    };

    // Handle form submission
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!formData.jobDetail || !formData.customerId || items.length === 0) {
            alert('Please fill in all required fields and add at least one item.');
            return;
        }

        setLoading(true);

        try {
            const customer = customers.find(c => c.id === Number(formData.customerId));

            const jobData = {
                refNumber: formData.refNumber || generateRefNumber(),
                customerId: Number(formData.customerId),
                customerName: customer?.name,
                jobDetail: formData.jobDetail,
                workLocation: formData.workLocation,
                subject: formData.jobDetail
                    ? `${formData.jobDetail} at ${formData.workLocation || customer?.name || 'N/A'}`
                    : formData.jobDetail,
                date: formData.date,
                status: formData.status,
                notes: formData.notes,
                termsConditions: formData.termsConditions,
                discountPercent: formData.discountPercent,
                quotationDate: formData.quotationDate,
                challanDate: formData.challanDate,
                billDate: formData.billDate,
                billNumber: formData.billNumber,
                bblBillNumber: formData.bblBillNumber,
                challanNumber: formData.challanNumber,
                items: items.map(item => ({
                    ...item,
                    id: undefined,
                    inventoryId: item.inventoryId ?? null,
                    sku: item.sku ?? null,
                    skuName: item.skuName ?? null,
                    details: item.details ?? null,
                    widthFeet: item.widthFeet ?? null,
                    widthInches: item.widthInches ?? null,
                    heightFeet: item.heightFeet ?? null,
                    heightInches: item.heightInches ?? null,
                    calculatedSqft: item.calculatedSqft ?? null,
                    autoCalculateSqft: item.autoCalculateSqft ?? false,
                    measurementsJson: item.measurementsJson ?? null,
                    measurements: item.measurements ?? [],
                })),
            };

            let response;
            if (isEdit && jobId) {
                response = await fetch('/api/jobs', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: jobId, ...jobData }),
                });
            } else {
                response = await fetch('/api/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jobData),
                });
            }

            const result = await response.json();

            if (result.success) {
                alert(`Job ${isEdit ? 'updated' : 'created'} successfully!`);
                // Redirect to Job Details page
                const savedJobId = result.data?.id || jobId;
                router.push(`/jobs/${savedJobId}`);
            } else {
                alert('Failed to save job: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving job:', error);
            alert('Failed to save job. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <DashboardLayout title="Loading...">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading job data...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={isEdit ? 'Edit Job' : 'Create New Job'}>
            <div className="p-2 sm:p-3 lg:p-4">
                {/* Page Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {isEdit ? 'Edit Job' : 'Create New Job'}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Create a new quotation, bill, or challan with line items.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/jobs')}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Jobs
                    </button>
                </div>

                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    {/* General Information - Row 1 */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            General Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Customer *
                                </label>
                                <select
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.customerId}
                                    onChange={(e) => handleFormChange('customerId', e.target.value)}
                                >
                                    <option value="">Select Customer</option>
                                    {customers.map(customer => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ref: (Reference Number)
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g., JOB-2024-0001"
                                    value={formData.refNumber}
                                    onChange={(e) => handleFormChange('refNumber', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.date}
                                    onChange={(e) => handleFormChange('date', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Job Detail - Row 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="relative" ref={jobDetailInputRef}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Job Detail *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g., Glass door lock supply and fitting work"
                                    value={formData.jobDetail}
                                    onChange={(e) => handleJobDetailChange(e.target.value)}
                                    onFocus={() => setShowJobDetailSuggestions(true)}
                                />
                                {/* Autocomplete suggestions for Job Detail */}
                                {showJobDetailSuggestions && jobDetailSuggestions.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {filterSuggestions(formData.jobDetail, jobDetailSuggestions).map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                onClick={() => selectJobDetail(suggestion)}
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Work Location - Now after Job Detail */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Work Location
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g., Mirpur-10 ATM booth"
                                    value={formData.workLocation}
                                    onChange={(e) => handleWorkLocationChange(e.target.value)}
                                    onFocus={() => setShowWorkLocationSuggestions(true)}
                                />
                                {/* Autocomplete suggestions for Work Location */}
                                {showWorkLocationSuggestions && workLocationSuggestions.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {filterSuggestions(formData.workLocation, workLocationSuggestions).map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                onClick={() => selectWorkLocation(suggestion)}
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Subject Preview */}
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>Subject Preview:</strong> Bill/Quotation/Challan for <span className="font-semibold">{formData.jobDetail || '[Job Detail]'}</span> at <span className="font-semibold">{customers.find(c => c.id === Number(formData.customerId))?.name || '[Customer]'}</span>{formData.workLocation ? <span className="font-semibold"> #{formData.workLocation}</span> : ''}
                            </p>
                        </div>
                    </div>

                    {/* Workflow Dates */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Workflow Dates & References
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Quotation Date
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.quotationDate}
                                    onChange={(e) => handleFormChange('quotationDate', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Challan Date
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.challanDate}
                                    onChange={(e) => handleFormChange('challanDate', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Bill Date
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.billDate}
                                    onChange={(e) => handleFormChange('billDate', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Document References - Removed per user request */}
                    </div>

                    {/* Line Items */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
                            <div className="flex gap-2">
                                <div className="relative" ref={inventoryDropdownRef}>
                                    <input
                                        type="text"
                                        className="w-64 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        placeholder="Search inventory..."
                                        value={lineItemsSearch}
                                        onChange={(e) => setLineItemsSearch(e.target.value)}
                                        onFocus={() => lineItemsSearch && filteredInventory.length > 0 && setShowInventoryDropdown(true)}
                                    />
                                    {/* Inventory Search Dropdown */}
                                    {showInventoryDropdown && filteredInventory.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                            {filteredInventory.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                                                    onClick={() => {
                                                        addInventoryItem(item, true);
                                                        setLineItemsSearch('');
                                                        setShowInventoryDropdown(false);
                                                    }}
                                                >
                                                    <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        SKU: {item.sku} | Price: {formatCurrency(item.discountedPrice > 0 ? item.discountedPrice : item.standardPrice)}/{item.unit}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowInventoryModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add from Inventory
                                </button>
                            </div>
                        </div>

                        <LineItemsTable
                            items={items}
                            inventory={inventory}
                            searchTerm={lineItemsSearch}
                            onSearchChange={setLineItemsSearch}
                            onItemChange={handleItemChange}
                            onAddItem={addItem}
                            onRemoveItem={removeItem}
                            onAddInventoryItem={addInventoryItem}
                            onOpenSizeNoter={handleOpenSizeNoter}
                        />

                        <div className="mt-4 flex justify-start">
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Line Item
                            </button>
                        </div>
                    </div>

                    {/* Totals & Notes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Notes */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notes & Terms</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        placeholder="Additional notes for this job..."
                                        value={formData.notes}
                                        onChange={(e) => handleFormChange('notes', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Terms & Conditions
                                    </label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        placeholder="Payment terms, delivery terms, etc."
                                        value={formData.termsConditions}
                                        onChange={(e) => handleFormChange('termsConditions', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Summary</h2>
                                {isEdit && jobId && (
                                    <button
                                        type="button"
                                        onClick={() => setShowExpenseModal(true)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Expenses
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                                    <div className="flex justify-between">
                                        <span className="text-lg font-semibold text-gray-900 dark:text-white">Grand Total</span>
                                        <span className="text-lg font-bold text-blue-600">{formatCurrency(totalAmount)}</span>
                                    </div>
                                </div>

                                {isEdit && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Total Expenses</span>
                                            <span className="font-medium text-orange-600">{formatCurrency(totalExpenses)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                                            <span className="text-gray-600 dark:text-gray-400">Expected Profit</span>
                                            <span className={`font-bold ${expectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(expectedProfit)}
                                            </span>
                                        </div>
                                    </>
                                )}

                                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total in Words:</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white italic">{amountInWords}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => router.push('/jobs')}
                            className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (isEdit ? 'Update Job' : 'Save Job')}
                        </button>
                    </div>
                </form>

                {/* Inventory Modal */}
                <InventoryModal
                    isOpen={showInventoryModal}
                    inventory={inventory}
                    searchTerm={inventorySearch}
                    onSearchChange={setInventorySearch}
                    onAddItem={addInventoryItem}
                    onClose={() => { setShowInventoryModal(false); setInventorySearch(''); }}
                />

                {/* Size Noter Modal */}
                <SizeNoterModal
                    isOpen={showSizeNoterModal}
                    measurements={editingItemIndex !== null ? editingMeasurements : measurements}
                    onAddMeasurement={editingItemIndex !== null ? () => {
                        // When editing, add to editingMeasurements
                        setEditingMeasurements([...editingMeasurements, { widthFeet: 0, widthInches: 0, heightFeet: 0, heightInches: 0, quantity: 1, description: '', calculatedSqft: 0 }]);
                    } : addMeasurement}
                    onUpdateMeasurement={editingItemIndex !== null ? (idx: number, field: keyof Measurement, value: string | number) => {
                        const newMeasurements = [...editingMeasurements];
                        newMeasurements[idx] = { ...newMeasurements[idx], [field]: field === 'description' ? value : Number(value) };
                        setEditingMeasurements(newMeasurements);
                    } : updateMeasurement}
                    onRemoveMeasurement={editingItemIndex !== null ? (idx: number) => {
                        setEditingMeasurements(editingMeasurements.filter((_, i) => i !== idx));
                    } : removeMeasurement}
                    onAddToLineItems={handleAddMeasurementToLineItems}
                    onSave={editingItemIndex !== null ? handleSaveEditingSize : undefined}
                    onClose={() => { setShowSizeNoterModal(false); setEditingItemIndex(null); setEditingMeasurements([]); setMeasurements([]); }}
                />

                {/* Expense Modal */}
                <ExpenseModal
                    isOpen={showExpenseModal}
                    jobId={jobId}
                    expenses={expenses}
                    onAddExpense={handleAddExpense}
                    onUpdateExpense={handleUpdateExpense}
                    onDeleteExpense={handleDeleteExpense}
                    onClose={() => setShowExpenseModal(false)}
                />

                {/* Duplicate Challan Date Modal */}
                {showDuplicateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Same Challan Date Found
                                </h3>
                                <button
                                    onClick={() => setShowDuplicateModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                The following jobs already have the same Challan Date. Do you want to continue?
                            </p>
                            <div className="max-h-48 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Job Ref</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Location</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Customer</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                        {duplicateJobs.map((job) => (
                                            <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{job.refNumber || `#${job.id}`}</td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{job.workLocation || 'N/A'}</td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{job.customer?.name || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDuplicateModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
