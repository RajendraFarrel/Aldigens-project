<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambahkan kolom referensi Delivery Order (DO) supplier dan nomor SPK
     * supplier pada tabel penerimaan barang.
     *
     * Catatan: berkas ini sebelumnya keliru berisi definisi model ReceiveItem
     * (bukan migrasi), sehingga `php artisan migrate` gagal karena tidak
     * mengembalikan instance Migration.
     */
    public function up(): void
    {
        if (!Schema::hasTable('receive_items')) {
            return;
        }

        Schema::table('receive_items', function (Blueprint $table) {
            if (!Schema::hasColumn('receive_items', 'delivery_order')) {
                $table->string('delivery_order')->nullable()->after('status');
            }
            if (!Schema::hasColumn('receive_items', 'spk_supplier')) {
                $table->string('spk_supplier')->nullable()->after('delivery_order');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('receive_items')) {
            return;
        }

        Schema::table('receive_items', function (Blueprint $table) {
            if (Schema::hasColumn('receive_items', 'spk_supplier')) {
                $table->dropColumn('spk_supplier');
            }
            if (Schema::hasColumn('receive_items', 'delivery_order')) {
                $table->dropColumn('delivery_order');
            }
        });
    }
};