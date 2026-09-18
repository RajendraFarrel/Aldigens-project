import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ManagementPO from './pages/ManagementPO';
import RadarRepeatOrder from './pages/RadarRepeatOrder';
import Login from './pages/Login'; // Import Halaman Login Baru
import { Menu } from 'lucide-react';
import UserManagement from './pages/UserManagement';

export default function App() {
  // State baru untuk mengecek apakah user sudah login atau belum
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Utama';
      case 'management': return 'Manajemen PO & BAST';
      case 'radar': return 'Radar Repeat Order';
      case 'users': return 'Pengaturan Sistem';
      default: return 'Sistem Terintegrasi';
    }
  };

  // Jika belum login, render halaman Login saja (menutupi seluruh layar)
  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  // Jika sudah login, render layout aplikasi lengkap dengan sidebar
  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={() => setIsAuthenticated(false)} // Opsional: fungsi untuk logout nanti
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

        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'management' && <ManagementPO />}
        {activeTab === 'radar' && <RadarRepeatOrder />}
        {activeTab === 'users' && <UserManagement />}
      </main> 
    </div>
  );
}