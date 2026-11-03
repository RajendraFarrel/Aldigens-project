import { ShieldAlert } from 'lucide-react';
import { usePermissions } from '../context/PermissionContext';

/**
 * Guard halaman berdasarkan permission backend.
 * Jika user tidak memiliki izin, halaman TIDAK dirender dan menampilkan
 * pesan akses ditolak (bukan error aplikasi).
 */
export default function PermissionGuard({ permission, anyOf, children }) {
  const { can, canAny } = usePermissions();

  const allowed = permission ? can(permission) : (anyOf ? canAny(anyOf) : true);

  if (allowed) return children;

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <div className="bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-500/40 rounded-2xl p-6 flex gap-4">
        <div className="bg-rose-100 dark:bg-rose-500/20 p-2.5 rounded-xl h-fit">
          <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-300" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Akses Ditolak</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Akun Anda tidak memiliki hak akses untuk modul ini. Hubungi Administrator
            jika Anda membutuhkan akses.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 font-mono">
            {permission || (anyOf ? anyOf.join(' | ') : '-')}
          </p>
        </div>
      </div>
    </div>
  );
}
