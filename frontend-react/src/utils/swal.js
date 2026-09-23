import Swal from 'sweetalert2';

/**
 * SweetAlert2 yang otomatis menyesuaikan tema terang/gelap aplikasi.
 * Tema dibaca dari localStorage ('app_theme') atau class .dark pada <html>.
 */

const isDarkMode = () => {
  try {
    const saved = localStorage.getItem('app_theme');
    if (saved) return saved === 'dark';
  } catch {
    /* ignore */
  }
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
};

const lightTheme = {
  background: '#ffffff',
  color: '#0f172a', // slate-900
  confirmColor: '#ffffff',
  cancelColor: '#475569', // slate-600
};

const darkTheme = {
  background: '#0f172a', // slate-900
  color: '#e2e8f0', // slate-200
  confirmColor: '#ffffff',
  cancelColor: '#cbd5e1', // slate-300
};

/**
 * Menghasilkan opsi dasar SweetAlert2 sesuai tema aktif.
 */
export function swalOptions({ confirmButtonColor = '#4f46e5', cancelButtonColor, ...rest } = {}) {
  const dark = isDarkMode();
  const t = dark ? darkTheme : lightTheme;

  return {
    background: t.background,
    color: t.color,
    confirmButtonColor,
    cancelButtonColor: cancelButtonColor || (dark ? '#334155' : '#e2e8f0'),
    buttonsStyling: true,
    customClass: {
      popup: 'aldigens-swal-popup',
      title: 'aldigens-swal-title',
      htmlContainer: 'aldigens-swal-html',
      confirmButton: 'aldigens-swal-confirm',
      cancelButton: 'aldigens-swal-cancel',
    },
    ...rest,
  };
}

/** Konfirmasi (Yes/No) bertema. Mengembalikan Promise<boolean>. */
export async function swalConfirm({
  title = 'Apakah Anda yakin?',
  text = '',
  confirmText = 'Ya, lanjutkan',
  cancelText = 'Batal',
  icon = 'warning',
  confirmButtonColor = '#4f46e5',
  danger = false,
} = {}) {
  const result = await Swal.fire(
    swalOptions({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: danger ? '#dc2626' : confirmButtonColor,
      reverseButtons: true,
      focusCancel: true,
    })
  );
  return result.isConfirmed;
}

/** Alert sukses bertema. */
export function swalSuccess(title, text = '') {
  return Swal.fire(
    swalOptions({
      title,
      text,
      icon: 'success',
      confirmButtonColor: '#059669',
      timer: 2200,
      timerProgressBar: true,
    })
  );
}

/** Alert error bertema. */
export function swalError(title, text = '') {
  return Swal.fire(
    swalOptions({
      title,
      text,
      icon: 'error',
      confirmButtonColor: '#dc2626',
    })
  );
}

/** Alert info bertema. */
export function swalInfo(title, text = '') {
  return Swal.fire(swalOptions({ title, text, icon: 'info', confirmButtonColor: '#2563eb' }));
}

/** Toast (pojok kanan atas) bertema. */
export function swalToast(title, icon = 'success') {
  const dark = isDarkMode();
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
    background: dark ? '#0f172a' : '#ffffff',
    color: dark ? '#e2e8f0' : '#0f172a',
  });
}

export default Swal;