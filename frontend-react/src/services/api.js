import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Otomatis lampirkan token dari localStorage ke setiap request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// Tangani 401 (token expired/invalid) – redirect ke login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
    }
);

// -----------------------------------------------
// Auth
// -----------------------------------------------
export const authLogin = (email, password) =>
    api.post('/login', { email, password });

export const authLogout = () =>
    api.post('/logout');

export const authMe = () =>
    api.get('/me');

// -----------------------------------------------
// Inventory – Dashboard
// -----------------------------------------------
export const getDashboardStats = () =>
    api.get('/inventory/dashboard');

// -----------------------------------------------
// Inventory – Products
// -----------------------------------------------
export const getProducts = (search = '') =>
    api.get('/inventory/products', { params: search ? { search } : {} });

export const getProduct = (id) =>
    api.get(`/inventory/products/${id}`);

export const createProduct = (data) =>
    api.post('/inventory/products', data);

export const updateProduct = (id, data) =>
    api.put(`/inventory/products/${id}`, data);

export const deleteProduct = (id) =>
    api.delete(`/inventory/products/${id}`);

export const searchProductByCode = (code) =>
    api.get('/inventory/products/search', { params: { code } });

// -----------------------------------------------
// Inventory – Transactions
// -----------------------------------------------
export const getTransactions = (params = {}) =>
    api.get('/inventory/transactions', { params });

export const createTransaction = (data) =>
    api.post('/inventory/transactions', data);

export const createBatchTransaction = (data) =>
    api.post('/inventory/transactions/batch', data);

// -----------------------------------------------
// Inventory – Reports
// -----------------------------------------------
export const getWeeklyReport = (week = '') =>
    api.get('/inventory/reports/weekly', { params: week ? { week } : {} });

// -----------------------------------------------
// Users
// -----------------------------------------------
export const getUsers = () =>
    api.get('/users');

export const createUser = (data) =>
    api.post('/users', data);

export const updateUser = (id, data) =>
    api.put(`/users/${id}`, data);

export const deleteUser = (id) =>
    api.delete(`/users/${id}`);

export const updateUserMenuAccess = (id, menuAccess) =>
    api.put(`/users/${id}/menu-access`, { menu_access: menuAccess });

// -----------------------------------------------
// Delivery Order (DO) & Invoice
// -----------------------------------------------
export const getDeliveryOrders = () =>
    api.get('/delivery-orders');

export const getDeliveryOrder = (id) =>
    api.get(`/delivery-orders/${id}`);

export const createDeliveryOrder = (data) =>
    api.post('/delivery-orders', data);

export const getSalesOrders = () =>
    api.get('/sales-orders');

export const getSalesOrder = (id) =>
    api.get(`/sales-orders/${id}`);

export const getInvoices = () =>
    api.get('/invoices');

export const getInvoice = (id) =>
    api.get(`/invoices/${id}`);

export const createInvoice = (data) =>
    api.post('/invoices', data);

export const updateInvoiceStatus = (id, status) =>
    api.put(`/invoices/${id}/status`, { status });

// -----------------------------------------------
// Existing functions (Quotation & PO)
// -----------------------------------------------
export const convertQuotationToPO = async (quotationId, poData) => {
    try {
        const response = await api.post(`/quotations/${quotationId}/convert-to-po`, poData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Terjadi kesalahan jaringan');
    }
};

export const convertPOToSO = async (poId, soData) => {
    try {
        const response = await api.post(`/purchase-orders/${poId}/convert-to-so`, soData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Terjadi kesalahan jaringan');
    }
};

export default api;