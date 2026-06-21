"use client";

import { useState, FormEvent, useMemo, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Employee, EmployeeRole, Department } from "@/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCollectionQuery } from "@/hooks/use-firestore-query";

const defaultForm: Omit<Employee, "id" | "dailyWageRate"> = {
  name: "",
  role: "WORKER" as EmployeeRole,
  department: "PRODUCTION" as Department,
  startDate: new Date().toISOString().split("T")[0],
  isActive: true,
};

const roleOptions: EmployeeRole[] = [
  "ADMIN",
  "PRODUCTION_SUPERVISOR",
  "WORKER",
  "STORE_MANAGER",
  "SALES_STAFF",
  "FINANCE",
];

const departmentOptions: Department[] = ["PRODUCTION", "STORAGE", "SALES"];

export default function AdminEmployeesPage() {
  const { userRole } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: employees = [], isLoading } = useCollectionQuery<Employee>("employees", [
    orderBy("name"),
  ], { staleTime: 10 * 60 * 1000 });

  const supervisorDepartment = useMemo(() => {
    if (userRole?.role !== "PRODUCTION_SUPERVISOR" || !userRole.employeeId) return null;
    const sup = employees.find((e) => e.id === userRole.employeeId);
    return sup?.department ?? null;
  }, [userRole, employees]);

  const isSupervisor = userRole?.role === "PRODUCTION_SUPERVISOR";
  const isAdmin = userRole?.role === "ADMIN";

  const visibleEmployees = useMemo(() => {
    if (isAdmin) return employees;
    if (isSupervisor && supervisorDepartment) {
      return employees.filter((e) => e.department === supervisorDepartment);
    }
    return [];
  }, [employees, isAdmin, isSupervisor, supervisorDepartment]);

  const availableDepartments = useMemo(() => {
    if (isSupervisor && supervisorDepartment) {
      return [supervisorDepartment];
    }
    return departmentOptions;
  }, [isSupervisor, supervisorDepartment]);

  const initializedFormRef = useRef(false);
  useEffect(() => {
    if (isSupervisor && supervisorDepartment && showForm && !editingId && !initializedFormRef.current) {
      initializedFormRef.current = true;
      setForm((prev) => ({ ...prev, department: supervisorDepartment }));
    }
    if (!showForm) initializedFormRef.current = false;
  }, [isSupervisor, supervisorDepartment, showForm, editingId]);

  const resetForm = () => {
    setForm(isSupervisor && supervisorDepartment
      ? { ...defaultForm, department: supervisorDepartment }
      : defaultForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (emp: Employee) => {
    setForm({
      name: emp.name,
      role: emp.role,
      department: emp.department,
      startDate: emp.startDate,
      isActive: emp.isActive,
    });
    setEditingId(emp.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "employees", editingId), form as unknown as Record<string, unknown>);
      } else {
        await addDoc(collection(db, "employees"), {
          ...form,
          createdAt: Timestamp.now(),
        });
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    await updateDoc(doc(db, "employees", emp.id), {
      isActive: !emp.isActive,
    });
    setDeleteTarget(null);
  };

  return (
    <RouteGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Employee Register</h1>
          {isAdmin && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Add Employee
            </button>
          )}
          {isSupervisor && supervisorDepartment && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Add Employee ({supervisorDepartment.charAt(0) + supervisorDepartment.slice(1).toLowerCase()})
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stock-blue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stock-blue">
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                {isSupervisor ? (
                  <input type="text" value={supervisorDepartment ? supervisorDepartment.charAt(0) + supervisorDepartment.slice(1).toLowerCase() : ""}
                    disabled className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-500" />
                ) : (
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as Department })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stock-blue">
                    {availableDepartments.map((d) => (
                      <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stock-blue" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Update" : "Add Employee"}
              </button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleEmployees.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No employees found.</td></tr>
                ) : visibleEmployees.map((emp, i) => (
                  <tr key={emp.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{emp.role.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {emp.department.charAt(0) + emp.department.slice(1).toLowerCase()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${emp.isActive ? "bg-performance-green/10 text-performance-green" : "bg-gray-100 text-gray-500"}`}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(emp)} className="text-sm text-stock-blue hover:underline mr-3">Edit</button>
                      <button onClick={() => setDeleteTarget(emp.id)} className="text-sm text-performance-red hover:underline">
                        {emp.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ConfirmDialog
          open={deleteTarget !== null}
          title={employees.find((e) => e.id === deleteTarget)?.isActive ? "Deactivate Employee" : "Reactivate Employee"}
          message={
            employees.find((e) => e.id === deleteTarget)?.isActive
              ? "This employee will no longer appear in production entry forms and other active selections, but all their records will be preserved. You can reactivate them later."
              : "This employee will reappear in production entry forms and become active again."
          }
          confirmLabel={employees.find((e) => e.id === deleteTarget)?.isActive ? "Deactivate" : "Reactivate"}
          onConfirm={async () => {
            const emp = employees.find((e) => e.id === deleteTarget);
            if (emp) await handleToggleActive(emp);
          }}
          onCancel={() => setDeleteTarget(null)}
          variant="warning"
        />
      </div>
    </RouteGuard>
  );
}
