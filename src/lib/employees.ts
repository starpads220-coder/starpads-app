export interface EmployeeStatusFields {
  isActive?: boolean;
  active?: boolean;
}

/** Employees created before isActive was introduced are active by default. */
export function isEmployeeActive(employee: EmployeeStatusFields): boolean {
  return employee.isActive ?? employee.active ?? true;
}

export function activeEmployeeOptions<T extends EmployeeStatusFields>(employees: T[]): T[] {
  return employees.filter(isEmployeeActive);
}

