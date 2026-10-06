<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * API master personel lapangan (employees). Step 3A.
 *
 * Terpisah dari `users` (akun login). Tidak membuat akun login otomatis.
 */
class EmployeeController extends Controller
{
    private function rules($ignoreId = null): array
    {
        return [
            'employee_code' => [
                'nullable',
                'string',
                'max:50',
                // Unik; saat create boleh dikosongkan karena backend yang membuat.
                Rule::unique('employees', 'employee_code')->ignore($ignoreId),
            ],
            'employee_name' => ['required', 'string', 'max:255'],
            'position'      => ['nullable', 'string', 'max:255'],
            'department'    => ['nullable', 'string', 'max:255'],
            'phone'         => ['nullable', 'string', 'max:30'],
            'status'        => ['nullable', Rule::in(Employee::STATUSES)],
            'notes'         => ['nullable', 'string'],
        ];
    }

    /** GET /api/employees */
    public function index(Request $request)
    {
        $employees = Employee::query()
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->search, function ($q) use ($request) {
                $s = $request->search;
                $q->where(function ($sub) use ($s) {
                    $sub->where('employee_code', 'like', "%$s%")
                        ->orWhere('employee_name', 'like', "%$s%")
                        ->orWhere('position', 'like', "%$s%")
                        ->orWhere('department', 'like', "%$s%");
                });
            })
            ->orderBy('employee_name')
            ->get();

        return response()->json(['status' => 'success', 'data' => $employees]);
    }

    /** GET /api/employees/{id} */
    public function show($id)
    {
        $employee = Employee::with('spkAssignments.spk')->findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $employee]);
    }

    /** POST /api/employees */
    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $employee = Employee::create(array_merge($data, [
            // Kode dibuat backend bila frontend tidak mengirimnya.
            'employee_code' => $data['employee_code'] ?? Employee::generateCode(),
            'status'        => $data['status'] ?? Employee::STATUS_ACTIVE,
        ]));

        return response()->json([
            'status'  => 'success',
            'message' => 'Karyawan berhasil disimpan.',
            'data'    => $employee,
        ], 201);
    }

    /** PUT /api/employees/{id} */
    public function update(Request $request, $id)
    {
        $employee = Employee::findOrFail($id);
        $data = $request->validate($this->rules($employee->id));

        $employee->update($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Karyawan berhasil diperbarui.',
            'data'    => $employee->fresh(),
        ]);
    }
}
