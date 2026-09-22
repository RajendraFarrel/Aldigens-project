import axios from 'axios';

const api = axios.create({
    baseURL: 'http://192.168.2.207:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Fungsi konversi Quotation ke Purchase Order (PO) - Cukup tulis sekali
export const convertQuotationToPO = async(quotationId, poData) => {
    try {
        const response = await api.post(`/quotations/${quotationId}/convert-to-po`, poData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error("Terjadi kesalahan jaringan");
    }
};

// Fungsi konversi Purchase Order (PO) ke Sales Order (SO)
export const convertPOToSO = async(poId, soData) => {
    try {
        const response = await api.post(`/purchase-orders/${poId}/convert-to-so`, soData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error("Terjadi kesalahan jaringan");
    }
};

export default api;