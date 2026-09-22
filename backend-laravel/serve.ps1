# =====================================================================
#  Aldigens Backend - Startup Script
#  Menjalankan Laravel backend dengan aman di Windows.
#
#  Skrip ini menangani dua masalah umum di Windows:
#   1. Flag "ReadOnly" pada folder Laravel (bootstrap/cache, storage/*)
#      membuat PHP's is_writable() mengembalikan false, sehingga Laravel
#      gagal boot dengan error:
#        "The ...\bootstrap\cache directory must be present and writable."
#      Flag ini muncul saat project di-extract dari ZIP/TAR atau disalin
#      dari Linux/OneDrive. Skrip ini membersihkannya otomatis.
#   2. PHP tidak ada di PATH, jadi kita pakai path PHP Laragon secara
#      eksplisit.
#
#  Pemakaian:
#     powershell -ExecutionPolicy Bypass -File .\serve.ps1
#     powershell -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8001
# =====================================================================

param(
    [string]$PhpPath = "C:\xampp1\php\php.exe",
    [string]$Host_   = "127.0.0.1",
    [int]$Port       = 8000
)

$ErrorActionPreference = "Stop"
$appRoot = Join-Path $PSScriptRoot "laravel"

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    $msg" -ForegroundColor Yellow }

# ---------- 1. Pastikan PHP tersedia -------------------------------
if (-not (Test-Path $PhpPath)) {
    Write-Warn "PHP tidak ditemukan di: $PhpPath"
    Write-Warn "Cari php.exe di sistem..."
    $candidates = @("C:\xampp1\php\php.exe", "C:\xampp\php\php.exe", "C:\laragon\bin\php\*\php.exe") |
                  Resolve-Path -ErrorAction SilentlyContinue |
                  Select-Object -First 1 -ExpandProperty Path
    if (-not $candidates) {
        $cmdPhp = Get-Command php -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
        if ($cmdPhp) { $candidates = $cmdPhp }
    }
    if (-not $candidates) {
        Write-Host "ERROR: php.exe tidak ditemukan. Pastikan XAMPP atau PHP terinstall." -ForegroundColor Red
        exit 1
    }
    $PhpPath = $candidates
}
Write-Step "PHP: $PhpPath"

# ---------- 2. Bersihkan flag ReadOnly pada folder yang perlu ditulis
$writableDirs = @(
    "$appRoot\bootstrap",
    "$appRoot\bootstrap\cache",
    "$appRoot\storage",
    "$appRoot\storage\app",
    "$appRoot\storage\framework",
    "$appRoot\storage\framework\cache",
    "$appRoot\storage\framework\sessions",
    "$appRoot\storage\framework\views",
    "$appRoot\storage\logs"
)

Write-Step "Memperbaiki permission folder Laravel..."
foreach ($d in $writableDirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        Write-Ok "dibuat: $d"
        continue
    }
    $item = Get-Item $d -Force
    if ($item.Attributes -band [System.IO.FileAttributes]::ReadOnly) {
        $item.Attributes = $item.Attributes -band (-bnot [System.IO.FileAttributes]::ReadOnly)
        Write-Ok "ReadOnly dibersihkan: $d"
    }
}

# ---------- 3. Buat file cache yang dibutuhkan kalau belum ada -----
foreach ($f in @("$appRoot\bootstrap\cache\packages.php", "$appRoot\bootstrap\cache\services.php")) {
    if (-not (Test-Path $f)) {
        Set-Content -Path $f -Value "<?php return array();" -Encoding ASCII
        Write-Ok "cache file dibuat: $f"
    }
}

# ---------- 4. Bersihkan config cache lama kalau ada -----------------
if (Test-Path "$appRoot\bootstrap\cache\config.php") {
    Remove-Item "$appRoot\bootstrap\cache\config.php" -Force
    Write-Ok "config cache lama dihapus"
}

# ---------- 5. Jalankan server -------------------------------------
Write-Step "Menjalankan server di http://${Host_}:$Port"
Write-Host ""
& $PhpPath "$appRoot\artisan" serve --host=$Host_ --port=$Port