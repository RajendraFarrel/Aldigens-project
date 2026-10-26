<?php
// SEMENTARA — uji endpoint produk seperti yang dipanggil frontend.
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Http\Request;

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$user = User::first();
$token = $user->createToken('qa-prod')->plainTextToken;

foreach (['/api/inventory/products', '/api/inventory/products?search='] as $uri) {
    // Boot ulang app per request agar middleware auth memakai token yang sama.
    $fresh = require __DIR__ . '/bootstrap/app.php';
    $fresh->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $k = $fresh->make(Illuminate\Contracts\Http\Kernel::class);
    $req = Illuminate\Http\Request::create($uri, 'GET');
    $req->headers->set('Accept', 'application/json');
    $req->headers->set('Authorization', 'Bearer ' . $token);
    $res = $k->handle($req);
    $body = json_decode($res->getContent(), true);
    printf("%-40s -> %d | rows=%s | msg=%s\n", $uri, $res->getStatusCode(), is_array($body['data'] ?? null) ? count($body['data']) : 'n/a', $body['message'] ?? '-');
}

$user->tokens()->where('name', 'qa-prod')->delete();
