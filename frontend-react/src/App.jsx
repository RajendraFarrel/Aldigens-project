import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Quotation from './pages/Quotation';
import POList from './pages/POList';
import SalesOrder from './pages/SalesOrder'; // Mengimpor halaman Sales Order
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import { Menu } from 'lucide-react';
import axios from 'axios';

export default function App() {
  useEffect(() => {
    axios.get('http://192.168.2.207:8000/api/ping')
      .then(response => console.log(response.data))
      .catch(error => console.error(error));
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Utama';
      case 'quotation': return 'Manajemen Penawaran (Quotation)';
      case 'sales-order': return 'Manajemen Sales Order';
      case 'users': return 'Pengaturan Sistem';
      default: return 'Sistem Terintegrasi';
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={() => setIsAuthenticated(false)} 
      />

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-xs">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {getHeaderTitle()}
              </h1>
              <p className="text-xs text-slate-500">Sistem Terintegrasi PO & Radar Siklus Pemeliharaan Alat</p>
            </div>
          </div>
        </header>

        {/* Kondisi Render Halaman Berdasarkan Menu yang Dipilih */}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'management' && <ManagementPO />}
        {activeTab === 'quotation' && <Quotation />}
        {activeTab === 'purchase-order' && <POList />}
        {activeTab === 'sales-order' && <SalesOrder />}
        {activeTab === 'radar' && <RadarRepeatOrder />}
        {activeTab === 'users' && <UserManagement />}
      </main> 
    </div>
  );
}