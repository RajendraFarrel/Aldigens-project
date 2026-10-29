<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo "vouchers=".App\Models\JournalVoucher::count()."\n";
echo "lines=".App\Models\JournalLine::count()."\n";
echo "posted=".App\Models\JournalVoucher::where('status','POSTED')->count()."\n";
echo "accounts=".App\Models\Account::count()."\n";
foreach (['industry_entries','industry_accounts','template_lines','import_logs'] as $t) {
  try { echo $t."=".Illuminate\Support\Facades\DB::table($t)->count()."\n"; } catch (Throwable $e) { echo $t."=n/a\n"; }
}
