import type { SupabaseClient } from '@supabase/supabase-js';

export type LocationPayload = {
  id: string;
  name: string;
  address: string;
  isWarehouse: boolean;
};

export type LocationResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

async function requireOwner(userClient: SupabaseClient): Promise<LocationResult> {
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, error: 'Oturum geçersiz.' };
  }

  const { data: caller, error } = await userClient
    .from('employees')
    .select('role')
    .eq('auth_id', user.id)
    .single();

  if (error || caller?.role !== 'Owner') {
    return { ok: false, status: 403, error: 'Sadece Owner lokasyon yönetebilir.' };
  }

  return { ok: true };
}

export async function createLocation(
  adminClient: SupabaseClient,
  userClient: SupabaseClient,
  payload: LocationPayload
): Promise<LocationResult> {
  const owner = await requireOwner(userClient);
  if (!owner.ok) return owner;

  const id = payload.id.trim().toLowerCase();
  if (!id || !payload.name.trim()) {
    return { ok: false, status: 400, error: 'Lokasyon ID ve isim zorunlu.' };
  }

  const { error: locationError } = await adminClient.from('locations').insert({
    id,
    name: payload.name.trim(),
    address: payload.address.trim(),
    is_warehouse: payload.isWarehouse,
  });

  if (locationError) {
    return { ok: false, status: 400, error: locationError.message };
  }

  const { data: items, error: itemsError } = await adminClient
    .from('items')
    .select('id');

  if (itemsError) {
    await adminClient.from('locations').delete().eq('id', id);
    return { ok: false, status: 400, error: itemsError.message };
  }

  const rows = (items ?? []).map((item) => ({
    item_id: item.id,
    location_id: id,
    quantity: 0,
    min_stock: 0,
  }));

  if (rows.length > 0) {
    const { error: inventoryError } = await adminClient
      .from('inventory')
      .insert(rows);

    if (inventoryError) {
      await adminClient.from('locations').delete().eq('id', id);
      return { ok: false, status: 400, error: inventoryError.message };
    }
  }

  return { ok: true };
}

export async function updateLocation(
  adminClient: SupabaseClient,
  userClient: SupabaseClient,
  payload: LocationPayload
): Promise<LocationResult> {
  const owner = await requireOwner(userClient);
  if (!owner.ok) return owner;

  const { error } = await adminClient
    .from('locations')
    .update({
      name: payload.name.trim(),
      address: payload.address.trim(),
      is_warehouse: payload.isWarehouse,
    })
    .eq('id', payload.id);

  if (error) {
    return { ok: false, status: 400, error: error.message };
  }

  return { ok: true };
}

export async function deleteLocation(
  adminClient: SupabaseClient,
  userClient: SupabaseClient,
  locationId: string
): Promise<LocationResult> {
  const owner = await requireOwner(userClient);
  if (!owner.ok) return owner;

  if (locationId === 'warehouse') {
    return { ok: false, status: 400, error: 'Merkez depo silinemez.' };
  }

  const { error } = await adminClient
    .from('locations')
    .delete()
    .eq('id', locationId);

  if (error) {
    return {
      ok: false,
      status: 400,
      error:
        'Lokasyon çalışan, transfer veya kullanım kayıtlarında kullanıldığı için silinemedi.',
    };
  }

  return { ok: true };
}
