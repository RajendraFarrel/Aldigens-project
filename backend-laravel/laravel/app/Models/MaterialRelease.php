<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialRelease extends Model
{
    protected $guarded = []; // Izinkan mass assignment

    public function details()
    {
        return $this->hasMany(MaterialReleaseDetail::class);
    }
}
