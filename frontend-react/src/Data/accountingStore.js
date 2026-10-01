/**
 * Store ringan (in-memory) untuk berpindah data antarmenu modul Akuntansi.
 * Pada tahap ini belum ada backend, jadi cukup menyimpan pilihan terakhir
 * (mis. journal voucher yang akan dicetak) antar-halaman.
 */
let selectedVoucherId = null;
let requestedVoucherId = null;

export function setSelectedVoucherId(id) {
  selectedVoucherId = id;
}

export function getSelectedVoucherId() {
  return selectedVoucherId;
}

/* Pemicu navigasi ke halaman detail voucher tertentu. */
export function requestVoucherDetail(id) {
  requestedVoucherId = id;
}

export function consumeVoucherDetailRequest() {
  const id = requestedVoucherId;
  requestedVoucherId = null;
  return id;
}
