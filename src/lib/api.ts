import { Job, Customer, Inventory, JobItem } from './types';

const API_BASE = '/api';

// Generic fetch wrapper
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
}

// Customer API
export const customerAPI = {
    getAll: (params?: { search?: string; page?: number; limit?: number }) => {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.set('search', params.search);
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        return fetchAPI<{ data: Customer[]; total: number }>(`/customers?${searchParams}`);
    },

    create: (data: Partial<Customer>) =>
        fetchAPI<{ data: Customer }>('/customers', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: number, data: Partial<Customer>) =>
        fetchAPI<{ data: Customer }>('/customers', {
            method: 'PUT',
            body: JSON.stringify({ id, ...data }),
        }),

    delete: (id: number) =>
        fetchAPI('/customers', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
        }),
};

// Inventory API
export const inventoryAPI = {
    getAll: (params?: { search?: string; type?: string; page?: number; limit?: number }) => {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.set('search', params.search);
        if (params?.type) searchParams.set('type', params.type);
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        return fetchAPI<{ data: Inventory[]; total: number }>(`/inventory?${searchParams}`);
    },

    create: (data: Partial<Inventory>) =>
        fetchAPI<{ data: Inventory }>('/inventory', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: number, data: Partial<Inventory>) =>
        fetchAPI<{ data: Inventory }>('/inventory', {
            method: 'PUT',
            body: JSON.stringify({ id, ...data }),
        }),

    delete: (id: number) =>
        fetchAPI('/inventory', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
        }),

    importCSV: (csvText: string) =>
        fetchAPI<{ data: { count: number } }>('/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: csvText,
        }),
};

// Jobs API
export const jobsAPI = {
    getAll: (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.set('search', params.search);
        if (params?.status) searchParams.set('status', params.status);
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        return fetchAPI<{ data: Job[]; total: number }>(`/jobs?${searchParams}`);
    },

    getById: (id: number) =>
        fetchAPI<{ data: Job }>(`/jobs/${id}`),

    create: (data: Partial<Job> & { items: JobItem[] }) =>
        fetchAPI<{ data: Job }>('/jobs', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: number, data: Partial<Job> & { items: JobItem[] }) =>
        fetchAPI<{ data: Job }>('/jobs', {
            method: 'PUT',
            body: JSON.stringify({ id, ...data }),
        }),

    delete: (id: number) =>
        fetchAPI('/jobs', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
        }),
};
