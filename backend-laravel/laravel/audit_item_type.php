 <?php
// AUDIT SEMENTARA — sebaran item_type produk.
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

foreach (DB::table('products')->select('item_type', DB::raw('count(*) as jml'))->groupBy('item_type')->get() as $r) {
    printf("%-25s : %d\n", var_export($r->item_type, true), $r->jml);
}
echo "TOTAL: " . DB::table('products')->count() . "\n";
