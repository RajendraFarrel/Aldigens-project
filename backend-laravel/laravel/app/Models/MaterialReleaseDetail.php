<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialReleaseDetail extends Model
{
    protected $guarded = [];

    public function materialRelease()
    {
        return $this->belongsTo(MaterialRelease::class);
    }
}