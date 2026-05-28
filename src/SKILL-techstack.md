# SKILL: Immersion Coffee — Tech Stack

## Frontend
- React 19 + Vite 6 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Lucide React (ikonlar)
- React Router DOM v6 (routing)

## Backend
- Supabase (Auth + PostgreSQL + Realtime)
- Supabase JS client: `@supabase/supabase-js`

## Hosting
- Frontend: Vercel
- Backend: Supabase (managed)

## Env Değişkenleri
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Klasör Yapısı (Hedef)

```
src/
├── lib/
│   └── supabase.ts          # Supabase client
├── context/
│   └── AuthContext.tsx      # User session, role, locationId
├── routes/
│   ├── ProtectedRoute.tsx   # Role-based guard
│   └── router.tsx           # React Router config
├── pages/
│   ├── LoginPage.tsx        # /login
│   ├── admin/
│   │   ├── DashboardPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── TransfersPage.tsx
│   │   ├── EmployeesPage.tsx
│   │   └── ReportsPage.tsx
│   └── shift/
│       └── ShiftPage.tsx
├── components/
│   ├── BaristaShiftView.tsx      # mevcut (refactor edilecek)
│   ├── AdminStockTransfer.tsx    # mevcut (refactor edilecek)
│   ├── OwnerOverviewDashboard.tsx
│   └── UserManagementScreen.tsx
├── types.ts
└── data.ts                  # Seed için tutulur, sonra silinir
```

---

## Supabase Schema

```sql
-- Lokasyonlar
create table locations (
  id text primary key,
  name text not null,
  address text,
  is_warehouse boolean default false
);

-- Ürünler
create table items (
  id text primary key,
  name text not null,
  category text not null,
  unit text not null
);

-- Lokasyon bazlı stok
create table inventory (
  id uuid primary key default gen_random_uuid(),
  item_id text references items(id) on delete cascade,
  location_id text references locations(id) on delete cascade,
  quantity numeric not null default 0,
  min_stock numeric not null default 0,
  unique(item_id, location_id)
);

-- Çalışanlar
create table employees (
  id text primary key,           -- 'IMM-XXXX'
  auth_id uuid references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('Owner','Location Manager','Barista')),
  location_id text references locations(id),
  status text default 'Active' check (status in ('Active','On Leave','Inactive')),
  email text unique not null
);

-- Stok transferleri
create table stock_transfers (
  id uuid primary key default gen_random_uuid(),
  source_location_id text references locations(id),
  destination_location_id text references locations(id),
  status text default 'Pending Approval'
    check (status in ('Pending Approval','Approved & Completed','Declined')),
  notes text,
  created_by text references employees(id),
  approved_by text references employees(id),
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- Transfer kalemleri
create table transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid references stock_transfers(id) on delete cascade,
  item_id text references items(id),
  quantity numeric not null
);

-- Kullanım logları
create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  location_id text references locations(id),
  item_id text references items(id),
  quantity_used numeric not null,
  logged_by text references employees(id),
  timestamp timestamptz default now()
);
```

## RLS Kuralları (Row Level Security)

```sql
-- employees: herkes kendi satırını okur
-- Owner: tüm tablolara tam erişim
-- Manager: kendi location_id'si ile eşleşen satırlar
-- Barista: inventory (read) + usage_logs (insert) sadece kendi lokasyonu
```

---

## Auth Akışı

1. `/login` sayfasında Employee ID + 5 haneli şifre girilir
2. Supabase `signInWithPassword({ email, password })` çağrılır
   - email olarak `{employeeId}@immersion.internal` formatı kullanılır
3. Login sonrası `employees` tablosundan `role` ve `location_id` çekilir
4. AuthContext'e yazılır
5. Role'e göre yönlendirme:
   - Owner / Manager → `/admin/dashboard`
   - Barista → `/shift`

## Kullanıcı Oluşturma (Owner)

Owner, admin panelden yeni çalışan ekler:
1. Supabase Admin API ile auth user oluşturulur
2. `employees` tablosuna kayıt eklenir
3. Şifre owner'ın belirlediği 5 haneli kod
4. Employee ID otomatik üretilir: `IMM-${4 haneli random}`

---

## Realtime

Inventory tablosuna subscribe et:
```typescript
supabase
  .channel('inventory-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'inventory' },
    (payload) => { /* state güncelle */ }
  )
  .subscribe()
```

Barista'nın kullanım logu anında Owner dashboard'una yansır.

---

## Kurulum Komutları

```bash
npm install @supabase/supabase-js react-router-dom
npm install -D @types/react-router-dom
```
