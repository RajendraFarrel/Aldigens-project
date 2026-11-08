<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
try {
    $req = Illuminate\Http\Request::create('/api/accounting/reports/journal-umum', 'GET');
    $res = app(App\Http\Controllers\AccountingReportController::class)->journalUmum($req);
    echo "OK ".substr($res->getContent(), 0, 200);
} catch (Throwable $e) {
    echo get_class($e).": ".$e->getMessage()."\n".$e->getFile().":".$e->getLine();
}
