import type { SupabaseClient } from '@supabase/supabase-js';
import type { TransferStatus } from '../src/types';

export type TransferStatusPayload = {
  status: Extract<
    TransferStatus,
    'Approved - Awaiting Fulfillment' | 'Approved & Completed' | 'Declined'
  >;
};

export type TransferWorkflowResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

type EmployeeRow = {
  id: string;
  role: 'Owner' | 'Location Manager' | 'Barista';
  location_id: string | null;
  employee_locations?: { location_id: string }[];
};

type TransferRow = {
  id: string;
  source_location_id: string;
  destination_location_id: string;
  status: TransferStatus;
  transfer_items: { item_id: string; quantity: number }[];
};

async function currentEmployee(
  userClient: SupabaseClient
): Promise<EmployeeRow | null> {
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await userClient
    .from('employees')
    .select('id, role, location_id, employee_locations(location_id)')
    .eq('auth_id', user.id)
    .single();

  if (error || !data) return null;
  return data as EmployeeRow;
}

function employeeHasLocation(employee: EmployeeRow, locationId: string): boolean {
  return (
    employee.location_id === locationId ||
    (employee.employee_locations ?? []).some(
      (assignment) => assignment.location_id === locationId
    )
  );
}

async function fetchTransfer(
  adminClient: SupabaseClient,
  transferId: string
): Promise<TransferRow | null> {
  const { data, error } = await adminClient
    .from('stock_transfers')
    .select('id, source_location_id, destination_location_id, status, transfer_items(item_id, quantity)')
    .eq('id', transferId)
    .single();

  if (error || !data) return null;
  return data as TransferRow;
}

async function completeInventoryMovement(
  adminClient: SupabaseClient,
  transfer: TransferRow
): Promise<void> {
  for (const line of transfer.transfer_items) {
    const { data: destinationRow, error: destinationError } = await adminClient
      .from('inventory')
      .select('quantity')
      .eq('item_id', line.item_id)
      .eq('location_id', transfer.destination_location_id)
      .single();
    if (destinationError) throw destinationError;

    const quantity = Number(line.quantity);
    const destinationQuantity = Number(destinationRow.quantity) + quantity;

    if (transfer.source_location_id !== 'supplier') {
      const { data: sourceRow, error: sourceError } = await adminClient
        .from('inventory')
        .select('quantity')
        .eq('item_id', line.item_id)
        .eq('location_id', transfer.source_location_id)
        .single();
      if (sourceError) throw sourceError;

      const sourceQuantity = Math.max(0, Number(sourceRow.quantity) - quantity);
      const { error: sourceUpdateError } = await adminClient
        .from('inventory')
        .update({ quantity: sourceQuantity })
        .eq('item_id', line.item_id)
        .eq('location_id', transfer.source_location_id);
      if (sourceUpdateError) throw sourceUpdateError;
    }

    const { error: destinationUpdateError } = await adminClient
      .from('inventory')
      .update({ quantity: destinationQuantity })
      .eq('item_id', line.item_id)
      .eq('location_id', transfer.destination_location_id);
    if (destinationUpdateError) throw destinationUpdateError;
  }
}

export async function updateTransferWorkflowStatus(
  adminClient: SupabaseClient,
  userClient: SupabaseClient,
  transferId: string,
  payload: TransferStatusPayload
): Promise<TransferWorkflowResult> {
  const employee = await currentEmployee(userClient);
  if (!employee) {
    return { ok: false, status: 401, error: 'Oturum geçersiz.' };
  }

  const transfer = await fetchTransfer(adminClient, transferId);
  if (!transfer) {
    return { ok: false, status: 404, error: 'Transfer bulunamadı.' };
  }

  if (
    payload.status === 'Approved - Awaiting Fulfillment' ||
    payload.status === 'Declined'
  ) {
    if (employee.role !== 'Owner') {
      return { ok: false, status: 403, error: 'Bu işlem için Owner onayı gerekir.' };
    }

    if (transfer.status !== 'Pending Approval') {
      return {
        ok: false,
        status: 400,
        error: 'Sadece yönetici onayı bekleyen talepler güncellenebilir.',
      };
    }
  }

  if (payload.status === 'Approved & Completed') {
    if (transfer.status !== 'Approved - Awaiting Fulfillment') {
      return {
        ok: false,
        status: 400,
        error: 'Transfer önce yönetici tarafından onaylanmalıdır.',
      };
    }

    if (!employeeHasLocation(employee, transfer.destination_location_id)) {
      return {
        ok: false,
        status: 403,
        error: 'Transferi sadece hedef şube teslim alabilir.',
      };
    }

    await completeInventoryMovement(adminClient, transfer);
  }

  const { error } = await adminClient
    .from('stock_transfers')
    .update({
      status: payload.status,
      approved_by: employee.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', transferId);

  if (error) {
    return { ok: false, status: 400, error: error.message };
  }

  return { ok: true };
}
