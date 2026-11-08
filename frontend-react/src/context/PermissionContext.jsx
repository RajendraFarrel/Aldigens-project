import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authMe } from '../services/api';
import { swalError } from '../utils/swal';

/**
 * Sumber kebenaran permission di frontend = payload backend (/login & /me).
 * Nilai yang tersimpan di localStorage hanya CACHE untuk render cepat;
 * backend tetap menolak request tanpa izin (403).
 */
const PermissionContext = createContext(null);

function readCachedUser() {
  try {
    return JSON.parse(localStorage.getItem('auth_user') || 'null');
  } catch {
    return null;
  }
}

export function PermissionProvider({ children }) {
  const [user, setUser] = useState(readCachedUser);

  const refresh = useCallback(async () => {
    try {
      const res = await authMe();
      const fresh = res.data || null;
      if (fresh) {
        localStorage.setItem('auth_user', JSON.stringify(fresh));
        setUser(fresh);
        window.dispatchEvent(new Event('auth:user-updated'));
      }
    } catch {
      // 401 sudah ditangani interceptor axios (logout otomatis).
    }
  }, []);

  // Sinkronkan ulang saat login/menu akses berubah agar hak akses benar
  // setelah refresh maupun setelah admin mengubah role.
  useEffect(() => {
    const syncCache = () => setUser(readCachedUser());
    window.addEventListener('auth:user-updated', syncCache);
    window.addEventListener('auth:logout', syncCache);
    if (localStorage.getItem('auth_token')) refresh();
    return () => {
      window.removeEventListener('auth:user-updated', syncCache);
      window.removeEventListener('auth:logout', syncCache);
    };
  }, [refresh]);

  // Tampilkan pesan "akses ditolak" yang rapi saat backend mengembalikan 403.
  useEffect(() => {
    const handleForbidden = (e) => {
      swalError('Akses Ditolak', e?.detail?.message || 'Anda tidak memiliki hak akses untuk tindakan ini.');
    };
    window.addEventListener('auth:forbidden', handleForbidden);
    return () => window.removeEventListener('auth:forbidden', handleForbidden);
  }, []);

  const permissions = useMemo(() => {
    const list = Array.isArray(user?.permissions) ? user.permissions : [];
    return new Set(list);
  }, [user]);

  const can = useCallback((permission) => {
    if (!permission) return true;
    if (user?.is_admin) return true;
    return permissions.has(permission);
  }, [permissions, user]);

  const canAny = useCallback((list) => {
    if (!Array.isArray(list) || list.length === 0) return true;
    if (user?.is_admin) return true;
    return list.some((p) => permissions.has(p));
  }, [permissions, user]);

  const value = useMemo(() => ({
    user,
    permissions,
    can,
    canAny,
    isAdmin: !!user?.is_admin,
    refresh,
  }), [user, permissions, can, canAny, refresh]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    // Render harus tetap jalan walau provider belum terpasang.
    return {
      user: readCachedUser(),
      permissions: new Set(),
      can: (p) => !p,
      canAny: () => false,
      isAdmin: false,
      refresh: () => { },
    };
  }
  return ctx;
}

export default PermissionContext;
