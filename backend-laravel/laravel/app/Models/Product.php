<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_code',
        'barcode',
        'part_number',
        'name',
        'category',
        'unit',
        'stock',
    ];

    protected $casts = [
        'stock' => 'integer',
    ];

    public function inventoryTransactions()
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    /**
     * Find a product by barcode or product_code (normalized comparison).
     */
    public static function findByCode(string $value): ?self
    {
        $normalized = strtoupper(preg_replace('/[\s\-]+/', '', $value));

        return static::where('barcode', $value)
            ->orWhere('product_code', $value)
            ->orWhereRaw('UPPER(barcode) = ?', [$normalized])
            ->orWhereRaw('UPPER(product_code) = ?', [$normalized])
            ->orWhereRaw("UPPER(REPLACE(REPLACE(barcode, '-', ''), ' ', '')) = ?", [$normalized])
            ->orWhereRaw("UPPER(REPLACE(REPLACE(product_code, '-', ''), ' ', '')) = ?", [$normalized])
            ->first();
    }

    /**
     * Generate next internal code (INT-0001, INT-0002, etc.)
     */
    public static function generateInternalCode(): string
    {
        $highest = 0;

        static::where('product_code', 'like', 'INT-%')->each(function ($product) use (&$highest) {
            if (preg_match('/^INT-(\d+)$/', $product->product_code, $matches)) {
                $highest = max($highest, (int) $matches[1]);
            }
        });

        while (true) {
            $highest++;
            $candidate = sprintf('INT-%04d', $highest);
            $exists = static::where('product_code', $candidate)->orWhere('barcode', $candidate)->exists();
            if (!$exists) {
                return $candidate;
            }
        }
    }
}
