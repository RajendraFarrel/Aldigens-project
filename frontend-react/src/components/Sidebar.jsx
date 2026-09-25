import React, { useState } from 'react';
import { LogOut, ChevronDown, ChevronRight } from 'lucide-react'; // Tambahan ikon panah
import logoPerusahaan from '../assets/LOGO ALDIGENS.jpeg';
import { MENU_GROUPS } from '../config/menus';

export default function Sidebar({ isOpen, activeTab, setActiveTab, onLogout, allowedMenus }) {
  // State untuk melacak menu dropdown mana yang sedang terbuka
  const [openDropdowns, setOpenDropdowns] = useState({});

  const toggleDropdown = (key) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter grup, item, dan sub-item berdasarkan allowedMenus
  const menuGroups = MENU_GROUPS
    .map((group) => {
      const filteredItems = group.items
        .map((item) => {
          // Jika item punya sub-menu, filter juga sub-menunya
          if (item.subItems) {
            return {
              ...item,
              subItems: item.subItems.filter((sub) => !allowedMenus || allowedMenus.includes(sub.key)),
            };
          }
          return item;
        })
        .filter((item) => {
          // Tampilkan item jika dia punya sub-menu yang diizinkan ATAU jika item itu sendiri diizinkan
          const hasAllowedSubItems = item.subItems && item.subItems.length > 0;
          const isItemAllowed = !allowedMenus || allowedMenus.includes(item.key);
          return hasAllowedSubItems || isItemAllowed;
        });

      return { ...group, items: filteredItems };
    })
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
                const hasSubItems = item.subItems && item.subItems.length > 0;
                
                // Cek apakah item ini atau salah satu sub-itemnya sedang aktif
                const isActive = activeTab === item.key || (hasSubItems && item.subItems.some((sub) => sub.key === activeTab));
                const isDropdownOpen = openDropdowns[item.key];

                return (
                  <div key={item.key} className="flex flex-col">
                    <button
                      onClick={() => (hasSubItems ? toggleDropdown(item.key) : setActiveTab(item.key))}
                      title={!isOpen ? item.label : ''}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                        isActive && !hasSubItems
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className={`truncate transition-opacity duration-300 ${isOpen ? 'opacity-100 inline' : 'hidden'}`}>
                          {item.label}
                        </span>
                      </div>
                      
                      {/* Ikon panah untuk Dropdown */}
                      {hasSubItems && isOpen && (
                        isDropdownOpen ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )
                      )}
                    </button>

                    {/* Sub-menu Rendering */}
                    {hasSubItems && isDropdownOpen && isOpen && (
                      <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-700 space-y-1">
                        {item.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = activeTab === sub.key;
                          return (
                            <button
                              key={sub.key}
                              onClick={() => setActiveTab(sub.key)}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                                isSubActive
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <SubIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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