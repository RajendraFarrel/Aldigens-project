<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Form Receive Item mengirimkan vendor (teks bebas) dan referensi PO.
 * Keduanya belum tersedia sebagai kolom, sehingga data tersebut sebelumnya
 * tidak pernah tersimpan walaupun request berhasil.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('receive_items', function (Blueprint $table) {
            if (!Schema::hasColumn('receive_items', 'vendor_name')) {
                $table->string('vendor_name')->nullable()->after('receive_date');
            }
            if (!Schema::hasColumn('receive_items', 'po_ref')) {
                $table->string('po_ref')->nullable()->after('vendor_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('receive_items', function (Blueprint $table) {
            if (Schema::hasColumn('receive_items', 'po_ref')) {
                $table->dropColumn('po_ref');
            }
            if (Schema::hasColumn('receive_items', 'vendor_name')) {
                $table->dropColumn('vendor_name');
            }
        });
    }
};
