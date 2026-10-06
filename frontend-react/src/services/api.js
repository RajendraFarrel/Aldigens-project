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

export const importProducts = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/inventory/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const downloadProductTemplate = () =>
    api.get('/inventory/products/import-template', { responseType: 'blob' });

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
// Inventory – Warehouse
// -----------------------------------------------
export const getWarehouses = () => api.get('/inventory/warehouses');
export const createWarehouse = (data) => api.post('/inventory/warehouses', data);
export const updateWarehouse = (id, data) => api.put(`/inventory/warehouses/${id}`, data);
export const deleteWarehouse = (id) => api.delete(`/inventory/warehouses/${id}`);
export const getWarehouseLocations = (id) => api.get(`/inventory/warehouses/${id}/locations`);
export const getWarehouseItems = (id, params = {}) => api.get(`/inventory/warehouses/${id}/items`, { params });
export const createWarehouseLocation = (id, data) => api.post(`/inventory/warehouses/${id}/locations`, data);
export const getInventoryStocks = (params = {}) => api.get('/inventory/stocks', { params });
export const receiveInventory = (data) => api.post('/inventory/receive', data);
export const issueInventory = (data) => api.post('/inventory/issue', data);
export const transferInventory = (data) => api.post('/inventory/transfer', data);
export const getInventoryMutations = (params = {}) => api.get('/inventory/mutations', { params });
export const updateInventoryMutation = (groupKey, data) => api.put(`/inventory/mutations/${groupKey}`, data);
export const deleteInventoryMutation = (groupKey) => api.delete(`/inventory/mutations/${groupKey}`);
export const getStockOpnames = (params = {}) => api.get('/inventory/stock-opnames', { params });
export const createStockOpname = (data) => api.post('/inventory/stock-opnames', data);
export const completeStockOpname = (id) => api.post(`/inventory/stock-opnames/${id}/complete`);

// Master Data
export const getCustomers = (params = {}) => api.get('/customers', { params });
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
export const getCustomerPartNumbers = (params = {}) => api.get('/customer-part-numbers', { params });
export const createCustomerPartNumber = (data) => api.post('/customer-part-numbers', data);
export const updateCustomerPartNumber = (id, data) => api.put(`/customer-part-numbers/${id}`, data);
export const deleteCustomerPartNumber = (id) => api.delete(`/customer-part-numbers/${id}`);
export const importCustomerPartNumbers = (file) => { const formData = new FormData(); formData.append('file', file); return api.post('/customer-part-numbers/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); };
export const downloadCustomerPartNumbersTemplate = () => api.get('/customer-part-numbers/import-template', { responseType: 'blob' });
export const exportCustomerPartNumbers = () => api.get('/customer-part-numbers/export', { responseType: 'blob' });
export const getSuppliers = (params = {}) => api.get('/suppliers', { params });
export const createSupplier = (data) => api.post('/suppliers', data);
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data);
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`);

// -----------------------------------------------
// Procurement & Production
// -----------------------------------------------
export const getPurchaseRequests = () => api.get('/purchase-requests');
export const createPurchaseRequest = (data) => api.post('/purchase-requests', data);
export const updatePurchaseRequest = (id, data) => api.put(`/purchase-requests/${id}`, data);
export const deletePurchaseRequest = (id) => api.delete(`/purchase-requests/${id}`);
export const updatePurchaseRequestStatus = (id, status) => api.patch(`/purchase-requests/${id}/status`, { status });
export const getBoms = () => api.get('/boms');
export const createBom = (data) => api.post('/boms', data);
export const updateBom = (id, data) => api.put(`/boms/${id}`, data);
export const deleteBom = (id) => api.delete(`/boms/${id}`);
export const getProductions = () => api.get('/productions');
export const createProduction = (data) => api.post('/productions', data);

// -----------------------------------------------
// Inventory – Reports
// -----------------------------------------------
export const getWeeklyReport = (week = '') =>
  api.get('/inventory/reports/weekly', { params: week ? { week } : {} });

export const downloadExport = (type) => api.get(`/exports/${type}`, { responseType: 'blob' });

// -----------------------------------------------
// Users & Roles
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

export const getRoles = () =>
    api.get('/roles');

export const createRole = (data) =>
    api.post('/roles', data);

export const updateRole = (id, data) =>
    api.put(`/roles/${id}`, data);

export const deleteRole = (id) =>
    api.delete(`/roles/${id}`);

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
// Operasional – SPK (Surat Perintah Kerja)
// -----------------------------------------------
// Nomor SPK selalu dibuat backend; frontend tidak pernah mengirim spk_number.
export const getSpks = (params = {}) =>
    api.get('/spks', { params });

export const getSpk = (id) =>
    api.get(`/spks/${id}`);

export const createSpk = (data) =>
    api.post('/spks', data);

export const updateSpk = (id, data) =>
    api.put(`/spks/${id}`, data);

export const deleteSpk = (id) =>
    api.delete(`/spks/${id}`);

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