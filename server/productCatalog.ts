import type { SupabaseClient } from '@supabase/supabase-js';
import type { ItemCategory } from '../src/types';

export type ProductPayload = {
  id: string;
  name: string;
  category: ItemCategory;
  unit: string;
  minStock: number;
  inventory?: Record<string, { quantity: number; minStock: number }>;
};

export type ProductUpdatePayload = Partial<Omit<ProductPayload, 'id'>> & {
  id: string;
};

export type ProductResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

async function requireOwner(userClient: SupabaseClient): Promise<ProductResult> {
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
    return { ok: false, status: 403, error: 'Sadece Owner ürün yönetebilir.' };
  }

  return { ok: true };
}

export async function createProduct(
  adminClient: SupabaseClient,
  userClient: SupabaseClient,
  payload: ProductPayload
): Promise<ProductResult> {
  const owner = await requireOwner(userClient);
  if (!owner.ok) return owner;

  const id = payload.id.trim();
  if (!id || !payload.name.trim() || !payload.unit.trim()) {
    return { ok: false, status: 400, error: 'Ürün ID, isim ve birim zorunlu.' };
  }

  const { error: itemError } = await adminClient.from('items').insert({
    id,
    name: payload.name.trim(),
    category: payload.category,
    unit: payload.unit.trim(),
  });

  if (itemError) {
    return { ok: false, status: 400, error: itemError.message };
  }

  const { data: locations, error: locationsError } = await adminClient
    .from('locations')
    .select('id');

  if (locationsError) {
    await adminClient.from('items').delete().eq('id', id);
    return { ok: false, status: 400, error: locationsError.message };
  }

  const rows = (locations ?? []).map((location) => {
    const plan = payload.inventory?.[location.id];
    return {
      item_id: id,
      location_id: location.id,
      quantity: plan?.quantity ?? 0,
      min_stock: plan?.minStock ?? payload.minStock,
    };
  });

  const { error: inventoryError } = await adminClient
    .from('inventory')
    .insert(rows);

  if (inventoryError) {
    await adminClient.from('items').delete().eq('id', id);
    return { ok: false, status: 400, error: inventoryError.message };
  }

  return { ok: true };
}

export async function updateProduct(
  adminClient: SupabaseClient,
  userClient: SupabaseClient,
  payload: ProductUpdatePayload
): Promise<ProductResult> {
  const owner = await requireOwner(userClient);
  if (!owner.ok) return owner;

  const updates: Record<string, string> = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.category !== undefined) updates.category = payload.category;
  if (payload.unit !== undefined) updates.unit = payload.unit.trim();

  if (Object.keys(updates).length > 0) {
    const { error } = await adminClient
      .from('items')
      .update(updates)
      .eq('id', payload.id);
    if (error) return { ok: false, status: 400, error: error.message };
  }

  if (payload.minStock !== undefined) {
    const { error } = await adminClient
      .from('inventory')
      .update({ min_stock: payload.minStock })
      .eq('item_id', payload.id);
    if (error) return { ok: false, status: 400, error: error.message };
  }

  if (payload.inventory) {
    for (const [locationId, inventory] of Object.entries(payload.inventory)) {
      const { error } = await adminClient
        .from('inventory')
        .update({
          quantity: inventory.quantity,
          min_stock: inventory.minStock,
        })
        .eq('item_id', payload.id)
        .eq('location_id', locationId);

      if (error) return { ok: false, status: 400, error: error.message };
    }
  }

  return { ok: true };
}

export async function deleteProduct(
  adminClient: SupabaseClient,
  userClient: SupabaseClient,
  itemId: string
): Promise<ProductResult> {
  const owner = await requireOwner(userClient);
  if (!owner.ok) return owner;

  const { error } = await adminClient.from('items').delete().eq('id', itemId);
  if (error) {
    return {
      ok: false,
      status: 400,
      error:
        'Ürün geçmiş transferlerde kullanıldığı için silinemedi. Önce geçmiş kayıtları kontrol edin.',
    };
  }

  return { ok: true };
}
