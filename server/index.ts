import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  createSupabaseClients,
  createUserClient,
  handleCreateEmployee,
  handleUpdateEmployee,
  type CreateEmployeeBody,
  type UpdateEmployeeBody,
} from './createEmployee';
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductPayload,
  type ProductUpdatePayload,
} from './productCatalog';
import {
  createLocation,
  deleteLocation,
  updateLocation,
  type LocationPayload,
} from './locationCatalog';
import {
  updateTransferWorkflowStatus,
  type TransferStatusPayload,
} from './transferWorkflow';

dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const port = Number(process.env.API_PORT ?? 3001);

const { supabaseUrl, supabaseAnonKey, adminClient } = createSupabaseClients();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase URL or anon key for API server.');
}

app.use(cors());
app.use(express.json());

app.post('/api/employees', async (req, res) => {
  try {
    if (!adminClient || !supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({
        error:
          'SUPABASE_SERVICE_ROLE_KEY eksik. npm run dev ile API sunucusunu başlatın.',
      });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Oturum gerekli.' });
    }

    const userClient = createUserClient(supabaseUrl, supabaseAnonKey, token);
    const result = await handleCreateEmployee(
      adminClient,
      userClient,
      req.body as CreateEmployeeBody
    );

    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ employee: result.employee });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    if (!adminClient || !supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({
        error:
          'SUPABASE_SERVICE_ROLE_KEY eksik. npm run dev ile API sunucusunu başlatın.',
      });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Oturum gerekli.' });
    }

    const result = await handleUpdateEmployee(
      adminClient,
      createUserClient(supabaseUrl, supabaseAnonKey, token),
      req.params.id,
      req.body as UpdateEmployeeBody
    );

    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ employee: result.employee });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    if (!adminClient || !supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: 'Ürün API yapılandırması eksik.' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const result = await createProduct(
      adminClient,
      createUserClient(supabaseUrl, supabaseAnonKey, token),
      req.body as ProductPayload
    );

    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.put('/api/items/:id', async (req, res) => {
  try {
    if (!adminClient || !supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: 'Ürün API yapılandırması eksik.' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const result = await updateProduct(
      adminClient,
      createUserClient(supabaseUrl, supabaseAnonKey, token),
      { ...(req.body as ProductUpdatePayload), id: req.params.id }
    );

    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    if (!adminClient || !supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: 'Ürün API yapılandırması eksik.' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const result = await deleteProduct(
      adminClient,
      createUserClient(supabaseUrl, supabaseAnonKey, token),
      req.params.id
    );

    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.post('/api/locations', async (req, res) => {
  try {
    if (!adminClient || !supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: 'Lokasyon API yapılandırması eksik.' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const result = await createLocation(
      adminClient,
      createUserClient(supabaseUrl, supabaseAnonKey, token),
      req.body as LocationPayload
    );

    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.put('/api/locations/:id', async (req, res) => {
  try {
    if (!adminClient || !supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: 'Lokasyon API yapılandırması eksik.' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const result = await updateLocation(
      adminClient,
      createUserClient(supabaseUrl, supabaseAnonKey, token),
      { ...(req.body as LocationPayload), id: req.params.id }
    );

    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.delete('/api/locations/:id', async (req, res) => {
  try {
    if (!adminClient || !supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: 'Lokasyon API yapılandırması eksik.' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const result = await deleteLocation(
      adminClient,
      createUserClient(supabaseUrl, supabaseAnonKey, token),
      req.params.id
    );

    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.put('/api/transfers/:id/status', async (req, res) => {
  try {
    if (!adminClient || !supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: 'Transfer API yapılandırması eksik.' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Oturum gerekli.' });

    const result = await updateTransferWorkflowStatus(
      adminClient,
      createUserClient(supabaseUrl, supabaseAnonKey, token),
      req.params.id,
      req.body as TransferStatusPayload
    );

    if (result.ok === false) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, admin: Boolean(adminClient) });
});

app.listen(port, () => {
  console.log(`Immersion API listening on http://localhost:${port}`);
});
