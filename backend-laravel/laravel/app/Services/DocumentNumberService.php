<?php
namespace App\Services;

use Illuminate\Support\Facades\DB;

class DocumentNumberService
{
    /** Atomically reserve the next number for a sequence key. */
    public function nextValue(string $type, string $key, int $minimumValue = 0): int
    {
        return DB::transaction(function () use ($type, $key, $minimumValue) {
            DB::table('document_number_sequences')->insertOrIgnore([
                'sequence_type' => $type,
                'sequence_key' => $key,
                'last_value' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $sequence = DB::table('document_number_sequences')
                ->where('sequence_type', $type)
                ->where('sequence_key', $key)
                ->lockForUpdate()
                ->first();

            $next = max((int) $sequence->last_value, $minimumValue) + 1;
            DB::table('document_number_sequences')
                ->where('id', $sequence->id)
                ->update(['last_value' => $next, 'updated_at' => now()]);

            return $next;
        });
    }

    /** DOs use the timestamp prefix directly, adding -1, -2, ... on collisions. */
    public function nextDeliveryOrderNumber(\DateTimeInterface $dateTime): string
    {
        $prefix = 'DO-' . $dateTime->format('dmy-Hi');
        $hasBaseNumber = DB::table('delivery_orders')->where('do_number', $prefix)->exists();
        $minimumSuffix = 0;
        if ($hasBaseNumber) {
            $minimumSuffix = (int) (DB::table('delivery_orders')
                ->where('do_number', 'like', $prefix . '-%')
                ->pluck('do_number')
                ->map(function ($number) use ($prefix) {
                    $suffix = substr($number, strlen($prefix) + 1);
                    return ctype_digit($suffix) ? (int) $suffix : 0;
                })->max() ?? 0);
            $minimumSuffix = max(1, $minimumSuffix);
        }
        do {
            $sequence = $this->nextValue('delivery_order', $prefix, $minimumSuffix);
            $candidate = $prefix . ($sequence === 1 ? '' : '-' . ($sequence - 1));
        } while (DB::table('delivery_orders')->where('do_number', $candidate)->exists());

        return $candidate;
    }

    /** New customers receive a monthly sequence starting at 0001. */
    public function nextCustomerCode(\DateTimeInterface $dateTime): string
    {
        $period = $dateTime->format('ym');
        $prefix = 'CUST-' . $period . '-';
        $existingCodes = DB::table('customers')
            ->where('customer_code', 'like', $prefix . '%')
            ->pluck('customer_code');
        $highestExisting = $existingCodes->map(function ($code) use ($prefix) {
            $suffix = substr($code, strlen($prefix));
            return ctype_digit($suffix) ? (int) $suffix : 0;
        })->max() ?? 0;

        $sequence = $this->nextValue('customer', $period, $highestExisting);

        return sprintf('CUST-%s-%04d', $period, $sequence);
    }
}
