import React from 'react';
import { LayoutDashboard, FileText, Radar, Users, LogOut, ShoppingCart } from 'lucide-react';
import logoPerusahaan from '../assets/LOGO ALDIGENS.jpeg';

export default function Sidebar({ isOpen, activeTab, setActiveTab, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'quotation', label: 'Penawaran (Quotation)', icon: FileText },
    { id: 'purchase-order', label: 'Purchase Order (PO)', icon: FileText }, // <--- Menu Penawaran baru ditambahkan di sini
    { id: 'sales-order', label: 'Sales Order (SO)', icon: ShoppingCart }, 
    { id: 'users', label: 'Pengaturan Sistem', icon: Users },
  ];

  return (
    <aside 
      className={`bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-300 z-50 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="p-4 border-b border-slate-800 flex items-center space-x-3 overflow-hidden">
        <img 
          src={logoPerusahaan} 
          alt="Logo PT Aldigens" 
          className="h-10 w-10 object-cover rounded-md flex-shrink-0" 
        />
        <div className={`transition-opacity duration-300 ${isOpen ? 'opacity-100 flex-1' : 'opacity-0 hidden'}`}>
          <h1 className="text-white font-bold text-xs leading-snug truncate">
            PT. ALDIGENS PUTERA PERSADA
          </h1>
          <p className="text-[10px] text-slate-400 mt-0.5">PO & Repeat System</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={!isOpen ? item.label : ''}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0 mx-auto md:mx-0" />
              <span className={`truncate transition-opacity duration-300 ${isOpen ? 'opacity-100 inline' : 'hidden'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onLogout}
          title={!isOpen ? 'Keluar Aplikasi' : ''}
          className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition cursor-pointer"
        >
          <LogOut className="h-5 w-5 flex-shrink-0 mx-auto md:mx-0" />
          <span className={`truncate transition-opacity duration-300 ${isOpen ? 'opacity-100 inline' : 'hidden'}`}>
            Keluar Aplikasi
          </span>
        </button>
      </div>
    </aside>
  );
}