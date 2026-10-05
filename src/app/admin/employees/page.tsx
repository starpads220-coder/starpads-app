"use client";

import { useState, FormEvent, useMemo, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { Employee, EmployeeRole, Department } from "@/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { showToast } from "@/components/ui/Toast";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { isEmployeeActive } from "@/lib/employees";

const defaultForm: Omit<Employee, "id" | "dailyWageRate"> = {
  name: "",
  role: "WORKER" as EmployeeRole,
  department: "PRODUCTION" as Department,
  startDate: new Date().toISOString().split("T")[0],
  isActive: true,
  payeApplicable: true,
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
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

  const { data: employees = [], isLoading } = useCollectionQuery<Employee>("employees", [
    orderBy("name"),
  ], { staleTime: 10 * 60 * 1000 });

  const supervisorDepartment = useMemo(() => {
    if (userRole?.role !== "PRODUCTION_SUPERVISOR") return null;
    return "PRODUCTION" as Department;
  }, [userRole]);

  const isSupervisor = userRole?.role === "PRODUCTION_SUPERVISOR";
  const isAdmin = userRole?.role === "ADMIN";
  const isFinancialManager = userRole?.role === "FINANCIAL_MANAGER";
  const isSalesManager = userRole?.role === "SALES_MANAGER";
  // Create & edit: admin, supervisor, financial manager.
  const canManageEmployees = isAdmin || isSupervisor || isFinancialManager;
  const canToggleActive = isAdmin || isSupervisor || isFinancialManager || isSalesManager;

  const visibleEmployees = useMemo(() => {
    if (isAdmin || isFinancialManager) return employees;
    if (isSupervisor && supervisorDepartment) {
      return employees.filter((e) => e.department === supervisorDepartment);
    }
    if (isSalesManager) return employees.filter((e) => e.department === "SALES");
    return [];
  }, [employees, isAdmin, isFinancialManager, isSupervisor, isSalesManager, supervisorDepartment]);

  const activeEmployees = useMemo(
    () => visibleEmployees.filter(isEmployeeActive),
    [visibleEmployees],
  );

  const deactivatedEmployees = useMemo(
    () => visibleEmployees.filter((e) => !isEmployeeActive(e)),
    [visibleEmployees],
  );

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
      isActive: emp.isActive ?? emp.active ?? true,
      payeApplicable: emp.payeApplicable ?? true,
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
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (emp: Employee, nextActive: boolean) => {
    if (!canToggleActive || !user || statusSavingId) return;
    setStatusSavingId(emp.id);
    try {
      await updateDoc(doc(db, "employees", emp.id), {
        isActive: nextActive,
        statusChangedAt: serverTimestamp(),
        statusChangedBy: user.uid,
      });
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleteTarget(null);
      showToast(`${emp.name} was ${nextActive ? "reactivated" : "deactivated"}.`, "success");
    } catch (error) {
      showToast(`Could not ${nextActive ? "reactivate" : "deactivate"} ${emp.name}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setStatusSavingId(null);
    }
  };

  const handleTogglePaye = async (emp: Employee) => {
    try {
      await updateDoc(doc(db, "employees", emp.id), { payeApplicable: emp.payeApplicable === false });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      showToast(`PAYE applicability updated for ${emp.name}.`, "success");
    } catch (error) {
      showToast(`Could not update PAYE applicability: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };

  return (
    <RouteGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Employee Register</h1>
          {canManageEmployees && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              {isSupervisor && supervisorDepartment
                ? `Add Employee (${supervisorDepartment.charAt(0) + supervisorDepartment.slice(1).toLowerCase()})`
                : "Add Employee"}
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
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={form.payeApplicable !== false}
                  onChange={(e) => setForm({ ...form, payeApplicable: e.target.checked })} />
                PAYE applicable
              </label>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PAYE</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeEmployees.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No employees found.</td></tr>
                ) : activeEmployees.map((emp, i) => (
                  <tr key={emp.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{emp.role.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {emp.department ? emp.department.charAt(0) + emp.department.slice(1).toLowerCase() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-performance-green/10 text-performance-green">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{emp.payeApplicable === false ? "Not applicable" : "Applicable"}{isFinancialManager && <button type="button" onClick={() => handleTogglePaye(emp)} className="ml-2 text-xs text-blue-700 hover:underline">Change</button>}</td>
                    <td className="px-4 py-3 text-right">
                      {canManageEmployees && (
                        <button onClick={() => handleEdit(emp)} className="text-sm text-stock-blue hover:underline mr-3">Edit</button>
                      )}
                      {canToggleActive && (
                        <button disabled={statusSavingId !== null} onClick={() => setDeleteTarget(emp.id)} className="text-sm text-performance-red hover:underline disabled:opacity-50">
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Deactivated Employees</h2>
              <span className="text-xs text-gray-500">{deactivatedEmployees.length} deactivated</span>
            </div>
            <div className="space-y-2">
              {deactivatedEmployees.length === 0 ? <p className="py-4 text-center text-sm text-gray-400">No deactivated employees.</p> : deactivatedEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{emp.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{emp.role.replace(/_/g, " ")}</span>
                    <div className="mt-1 text-xs text-gray-500">
                      {emp.department ? emp.department.replace(/_/g, " ") : "No department"} · Started {emp.startDate || "—"} · PAYE {emp.payeApplicable === false ? "not applicable" : "applicable"}
                    </div>
                  </div>
                  {canToggleActive && (
                    <button
                      disabled={statusSavingId !== null}
                      onClick={() => handleToggleActive(emp, true)}
                      className="text-sm text-stock-blue hover:underline disabled:opacity-50"
                    >
                      {statusSavingId === emp.id ? "Reactivating..." : "Reactivate"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        <ConfirmDialog
          open={deleteTarget !== null}
          title="Deactivate Employee"
          message="This employee will no longer appear in production entry forms and other active selections, but all their records will be preserved. You can reactivate them later."
          confirmLabel="Deactivate"
          onConfirm={async () => {
            const emp = employees.find((e) => e.id === deleteTarget);
            if (emp) await handleToggleActive(emp, false);
          }}
          onCancel={() => setDeleteTarget(null)}
          variant="warning"
        />
      </div>
    </RouteGuard>
  );
}
