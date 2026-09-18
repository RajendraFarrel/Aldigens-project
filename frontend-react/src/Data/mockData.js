// src/data/mockData.js

export const initialPoList = [{
        id: 1,
        poNumber: 'ALD-PO/2026/09/001',
        client: 'PT. Tambang Batubara Sejahtera',
        item: 'Fire Suppression System (Dump Truck)',
        installDate: '2025-09-20',
        status: 'Completed',
        radarStatus: 'Warning (Jatuh Tempo 5 Hari Lagi)'
    },
    {
        id: 2,
        poNumber: 'ALD-PO/2026/09/002',
        client: 'PT. Mandiri Heavy Equipment',
        item: 'Electrical Safety Device Pro',
        installDate: '2026-03-10',
        status: 'On Progress',
        radarStatus: 'Safe (Aman)'
    },
    {
        id: 3,
        poNumber: 'ALD-PO/2025/08/045',
        client: 'PT. Borneo Raya Mineral',
        item: 'LOTO Box & Calibration Kit',
        installDate: '2025-09-01',
        status: 'Completed',
        radarStatus: 'Expired (Jatuh Tempo Hari Ini!)'
    }
];

export const initialDocuments = [{
        id: 1,
        poNum: 'ALD-PO/2026/09/001',
        client: 'PT. Tambang Batubara Sejahtera',
        bastNumber: 'BAST/2025/IX/012',
        poDate: '2025-09-15',
        bastDate: '2025-09-20',
        fileStatus: 'Verified'
    },
    {
        id: 2,
        poNum: 'ALD-PO/2026/09/002',
        client: 'PT. Mandiri Heavy Equipment',
        bastNumber: 'Menunggu BAST',
        poDate: '2026-03-01',
        bastDate: '-',
        fileStatus: 'Pending'
    },
    {
        id: 3,
        poNum: 'ALD-PO/2025/08/045',
        client: 'PT. Borneo Raya Mineral',
        bastNumber: 'BAST/2025/VIII/088',
        poDate: '2025-08-25',
        bastDate: '2025-09-01',
        fileStatus: 'Verified'
    }
];