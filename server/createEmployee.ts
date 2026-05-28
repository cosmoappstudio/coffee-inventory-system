import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type CreateEmployeeBody = {
  id: string;
  name: string;
  role: 'Owner' | 'Location Manager' | 'Barista';
  locationId: string;
  password: string;
};

export type UpdateEmployeeBody = {
  name: string;
  role: 'Owner' | 'Location Manager' | 'Barista';
  locationId: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  password?: string;
};

export type CreateEmployeeResult =
  | { ok: true; employee: Record<string, unknown> }
  | { ok: false; status: number; error: string };

export type UpdateEmployeeResult =
  | { ok: true; employee: Record<string, unknown> }
  | { ok: false; status: number; error: string };

function employeeAuthEmail(employeeId: string): string {
  return `${employeeId.trim().toLowerCase()}@immersion.internal`;
}

async function requireOwner(userClient: SupabaseClient) {
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Oturum geçersiz.' };
  }

  const { data: caller, error: callerError } = await userClient
    .from('employees')
    .select('role')
    .eq('auth_id', user.id)
    .single();

  if (callerError || caller?.role !== 'Owner') {
    return {
      ok: false as const,
      status: 403,
      error: 'Sadece Owner çalışan bilgilerini yönetebilir.',
    };
  }

  return { ok: true as const };
}

export async function handleCreateEmployee(
  adminClient: SupabaseClient,
  userClient: SupabaseClient,
  body: CreateEmployeeBody
): Promise<CreateEmployeeResult> {
  const { id, name, role, locationId, password } = body;

  if (!id || !name || !role || !password) {
    return { ok: false, status: 400, error: 'Eksik alanlar.' };
  }

  if (!/^\d{5}$/.test(password)) {
    return { ok: false, status: 400, error: 'Şifre 5 haneli olmalıdır.' };
  }

  const owner = await requireOwner(userClient);
  if (owner.ok === false) return owner;

  const email = employeeAuthEmail(id);
  const dbLocationId = role === 'Owner' ? null : locationId;

  const { data: authUser, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return { ok: false, status: 400, error: authError.message };
  }

  const { data: employee, error: insertError } = await adminClient
    .from('employees')
    .insert({
      id,
      auth_id: authUser.user.id,
      name,
      role,
      location_id: dbLocationId,
      status: 'Active',
      email,
    })
    .select('*')
    .single();

  if (insertError) {
    await adminClient.auth.admin.deleteUser(authUser.user.id);
    return { ok: false, status: 400, error: insertError.message };
  }

  return {
    ok: true,
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      locationId: employee.location_id ?? 'all',
      status: employee.status,
      email: employee.email,
    },
  };
}

export async function handleUpdateEmployee(
  adminClient: SupabaseClient,
  userClient: SupabaseClient,
  employeeId: string,
  body: UpdateEmployeeBody
): Promise<UpdateEmployeeResult> {
  const { name, role, locationId, status, password } = body;

  if (!employeeId || !name || !role || !status) {
    return { ok: false, status: 400, error: 'Eksik alanlar.' };
  }

  if (password && !/^\d{5}$/.test(password)) {
    return { ok: false, status: 400, error: 'Şifre 5 haneli olmalıdır.' };
  }

  const owner = await requireOwner(userClient);
  if (owner.ok === false) return owner;

  const { data: existing, error: existingError } = await adminClient
    .from('employees')
    .select('id, auth_id')
    .eq('id', employeeId)
    .single();

  if (existingError || !existing) {
    return { ok: false, status: 404, error: 'Çalışan bulunamadı.' };
  }

  if (password && existing.auth_id) {
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(
      existing.auth_id,
      { password }
    );
    if (passwordError) {
      return { ok: false, status: 400, error: passwordError.message };
    }
  }

  const dbLocationId = role === 'Owner' ? null : locationId;
  const { data: employee, error: updateError } = await adminClient
    .from('employees')
    .update({
      name: name.trim(),
      role,
      location_id: dbLocationId,
      status,
    })
    .eq('id', employeeId)
    .select('*')
    .single();

  if (updateError) {
    return { ok: false, status: 400, error: updateError.message };
  }

  return {
    ok: true,
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      locationId: employee.location_id ?? 'all',
      status: employee.status,
      email: employee.email,
    },
  };
}

export function createSupabaseClients() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const adminClient =
    supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

  return { supabaseUrl, supabaseAnonKey, adminClient };
}

export function createUserClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  accessToken: string
) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
