# SKILL: Immersion Coffee — Proje Bağlamı

## Proje Adı
Immersion Coffee Inventory Management System

## Müşteri
Immersion Coffee — San Diego, CA (5 aktif lokasyon)

## Ne Yapıyor?
Multi-lokasyon stok yönetim sistemi.
- Admin stok gönderir, çalışan oluşturur, raporları görür
- Barista tablet/mobilde shift'te kullanım loglar
- Owner tek panelden tüm 5 lokasyonu izler

---

## Lokasyonlar
| ID | İsim | Adres |
|---|---|---|
| warehouse | Central Warehouse | 1220 Imperial Ave |
| dt | Downtown (Gaslamp) | 501 J St |
| np | North Park | 3000 Upas St |
| ob | Ocean Beach | 4900 Newport Ave |
| lj | La Jolla Cove | 1100 Prospect St |
| li | Little Italy | 1600 Kettner Blvd |

---

## Roller
| Rol | Erişim |
|---|---|
| Owner | Tam erişim. Tüm lokasyonlar, kullanıcı yönetimi, raporlar |
| Location Manager | Kendi lokasyonu. Transfer onayı, stok görüntüleme |
| Barista | Sadece shift view. Kullanım loglama |

## Giriş Sistemi
- Employee ID: `IMM-XXXX` formatı (4 haneli)
- Şifre: 5 haneli, owner tarafından admin panelden set edilir
- Login sonrası role'e göre yönlendirme:
  - Owner / Manager → `/admin/dashboard`
  - Barista → `/shift`

---

## İki Ayrı Panel

### 1. Admin Panel (`/admin/*`)
Owner + Location Manager kullanır. Desktop öncelikli.
- `/admin/dashboard` — 5 lokasyon genel bakış (Owner only)
- `/admin/inventory` — Stok tablosu, lokasyon bazlı
- `/admin/transfers` — Transfer oluştur / onayla
- `/admin/employees` — Kullanıcı yönetimi (Owner only)
- `/admin/reports` — Kullanım raporları (Owner only)

### 2. Shift Panel (`/shift`)
Barista kullanır. Tablet/mobil öncelikli.
- Tek sayfa
- Büyük dokunmatik butonlar (min 44px)
- Kendi lokasyonunun stoğu
- Kullanım loglama + undo

---

## Mevcut Frontend (Google AI Studio çıktısı)
Dosyalar hazır, localStorage ile çalışıyor:
- `src/App.tsx` — Ana uygulama, tüm state burada
- `src/types.ts` — TypeScript interface'leri
- `src/data.ts` — Seed data (INITIAL_*)
- `src/components/BaristaShiftView.tsx`
- `src/components/AdminStockTransfer.tsx`
- `src/components/OwnerOverviewDashboard.tsx`
- `src/components/UserManagementScreen.tsx`

Görev: localStorage → Supabase migration + routing + auth eklemek

---

## Design System
```css
font-sans: "Plus Jakarta Sans"
font-mono: "JetBrains Mono"

espresso-950: #1c0f0a   (en koyu)
espresso-900: #2b1a13
brand-amber:  #d99136   (CTA rengi)
brand-terracotta: #bd5338
brand-cream:  #faf7f2   (arka plan)
brand-charcoal: #1e1b1a
```
Stil: warm, premium, utilitarian. Gradients yok, glassmorphism yok.
