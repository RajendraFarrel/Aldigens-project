<?php
// SEMENTARA — daftar user untuk login uji.
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

foreach (App\Models\User::limit(5)->get() as $u) {
    printf("%d | %s | %s\n", $u->id, $u->email ?? '-', $u->username ?? '-');
}

// Cek password 'password' untuk user pertama
$first = App\Models\User::first();
if ($first) {
    $ok = Illuminate\Support\Facades\Hash::check('password', $first->password);
    echo "first user password=='password': " . ($ok ? 'YA' : 'TIDAK') . "\n";
}
