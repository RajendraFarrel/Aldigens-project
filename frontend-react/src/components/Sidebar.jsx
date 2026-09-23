import React from 'react';
import { LogOut } from 'lucide-react';
import logoPerusahaan from '../assets/LOGO ALDIGENS.jpeg';
import { MENU_GROUPS } from '../config/menus';

export default function Sidebar({ isOpen, activeTab, setActiveTab, onLogout, allowedMenus }) {
  // Filter grup & item berdasarkan menu yang diizinkan untuk user ini.
  const menuGroups = MENU_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !allowedMenus || allowedMenus.includes(item.key)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-300 z-50 dark:bg-slate-950 dark:border-slate-800 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Logo */}
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
          <p className="text-[10px] text-slate-400 mt-0.5">Sistem Terintegrasi</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {menuGroups.map(({ group, items }) => (
          <div key={group}>
            {isOpen && (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                {group}
              </p>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    title={!isOpen ? item.label : ''}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className={`truncate transition-opacity duration-300 ${isOpen ? 'opacity-100 inline' : 'hidden'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onLogout}
          title={!isOpen ? 'Keluar Aplikasi' : ''}
          className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition cursor-pointer"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className={`truncate transition-opacity duration-300 ${isOpen ? 'opacity-100 inline' : 'hidden'}`}>
            Keluar Aplikasi
          </span>
        </button>
      </div>
    </aside>
  );
}