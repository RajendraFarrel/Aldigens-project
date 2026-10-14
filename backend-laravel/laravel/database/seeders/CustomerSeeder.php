<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            ['customer_code' => 'CUST-001', 'customer_name' => 'PT. UNITED TRACTORS Tbk', 'phone' => '021-4605959', 'email' => 'contact@unitedtractors.com', 'address' => 'Jl. Raya Bekasi Km 22 Cakung, Jakarta Timur', 'status' => 'AKTIF'],
            ['customer_code' => 'CUST-002', 'customer_name' => 'PT KOBEXINDO TRACTORS', 'phone' => '021-65310555', 'email' => 'info@kobexindo.com', 'address' => 'Complex Office Park JIEXPO Kemayoran, Jakarta', 'status' => 'AKTIF'],
            ['customer_code' => 'CUST-003', 'customer_name' => 'PT CBC INDONESIA', 'phone' => '021-88392011', 'email' => 'sales@cbc-indonesia.com', 'address' => 'Kawasan Industri MM2100 Bekasi', 'status' => 'AKTIF'],
            ['customer_code' => 'CUST-004', 'customer_name' => 'PT BINA PERTIWI', 'phone' => '021-4605977', 'email' => 'binapertiwi@unitedtractors.com', 'address' => 'Jl. Raya Bekasi Km 22 Cakung, Jakarta Timur', 'status' => 'AKTIF'],
            ['customer_code' => 'CUST-005', 'customer_name' => 'PT HCMI (HYUNDAI)', 'phone' => '021-8937100', 'email' => 'support@hyundai-motor.co.id', 'address' => 'Deltasurya Cikarang Pusat, Bekasi', 'status' => 'AKTIF'],
            ['customer_code' => 'CUST-006', 'customer_name' => 'PT SANY PERKASA', 'phone' => '021-29083888', 'email' => 'info@sanyperkasa.com', 'address' => 'Cakung, Jakarta Timur', 'status' => 'AKTIF'],
        ];

        foreach ($customers as $c) {    
            Customer::updateOrCreate(['customer_code' => $c['customer_code']], $c);
        }
    }
}