# Supabase migrations

Dosyalar bu klasörde:

```
supabase/
├── setup.sql              ← Tek seferde: SQL Editor’a yapıştır
├── migrations/
│   ├── 001_schema.sql     ← Tablolar
│   └── 002_rls.sql        ← Row Level Security
└── README.md
```

## Kurulum

1. [Supabase Dashboard](https://supabase.com/dashboard) → projeniz → **SQL Editor**
2. `setup.sql` dosyasının tamamını kopyalayıp **Run**
3. **Database → Replication** → `inventory` için Realtime açık olsun
4. Terminal: `npm run seed`
