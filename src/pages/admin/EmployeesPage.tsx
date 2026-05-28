import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import UserManagementScreen from '../../components/UserManagementScreen';
import PageSkeleton from '../../components/ui/PageSkeleton';

export default function EmployeesPage() {
  const { employee } = useAuth();
  const {
    loading,
    employees,
    locations,
    addEmployee,
    updateEmployee,
    removeEmployee,
    setEmployeeStatus,
  } = useInventory();

  if (loading || !employee) return <PageSkeleton />;

  return (
    <div className="p-4 sm:p-6">
      <UserManagementScreen
        employees={employees}
        locations={locations}
        onAddEmployee={addEmployee}
        onUpdateEmployee={updateEmployee}
        onRemoveEmployee={removeEmployee}
        onUpdateStatus={setEmployeeStatus}
      />
    </div>
  );
}
