import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'http';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import {
  createSupabaseClients,
  createUserClient,
  handleCreateEmployee,
  handleUpdateEmployee,
  type CreateEmployeeBody,
  type UpdateEmployeeBody,
} from './server/createEmployee';
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductPayload,
  type ProductUpdatePayload,
} from './server/productCatalog';
import {
  createLocation,
  deleteLocation,
  updateLocation,
  type LocationPayload,
} from './server/locationCatalog';
import {
  updateTransferWorkflowStatus,
  type TransferStatusPayload,
} from './server/transferWorkflow';

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}') as T);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function localApiPlugin(): Plugin {
  return {
    name: 'immersion-local-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      Object.assign(process.env, env);

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const { supabaseUrl, supabaseAnonKey, adminClient } =
          createSupabaseClients();

        if (!adminClient || !supabaseUrl || !supabaseAnonKey) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'SUPABASE_SERVICE_ROLE_KEY eksik (.env.local).',
            })
          );
          return;
        }

        const authHeader = req.headers.authorization ?? '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        if (!token) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Oturum gerekli.' }));
          return;
        }

        const userClient = createUserClient(supabaseUrl, supabaseAnonKey, token);

        try {
          if (req.url === '/api/employees' && req.method === 'POST') {
            const body = await readJsonBody<CreateEmployeeBody>(req);
            const result = await handleCreateEmployee(
              adminClient,
              userClient,
              body
            );
            if (result.ok === false) {
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: result.error }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ employee: result.employee }));
            return;
          }

          const employeeMatch = req.url.match(/^\/api\/employees\/(.+)$/);
          if (employeeMatch && req.method === 'PUT') {
            const result = await handleUpdateEmployee(
              adminClient,
              userClient,
              decodeURIComponent(employeeMatch[1]),
              await readJsonBody<UpdateEmployeeBody>(req)
            );
            if (result.ok === false) {
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: result.error }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ employee: result.employee }));
            return;
          }

          if (req.url === '/api/items' && req.method === 'POST') {
            const result = await createProduct(
              adminClient,
              userClient,
              await readJsonBody<ProductPayload>(req)
            );
            if (result.ok === false) {
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: result.error }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          const itemMatch = req.url.match(/^\/api\/items\/(.+)$/);
          if (itemMatch && req.method === 'PUT') {
            const result = await updateProduct(
              adminClient,
              userClient,
              {
                ...(await readJsonBody<ProductUpdatePayload>(req)),
                id: decodeURIComponent(itemMatch[1]),
              }
            );
            if (result.ok === false) {
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: result.error }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          if (itemMatch && req.method === 'DELETE') {
            const result = await deleteProduct(
              adminClient,
              userClient,
              decodeURIComponent(itemMatch[1])
            );
            if (result.ok === false) {
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: result.error }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          if (req.url === '/api/locations' && req.method === 'POST') {
            const result = await createLocation(
              adminClient,
              userClient,
              await readJsonBody<LocationPayload>(req)
            );
            if (result.ok === false) {
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: result.error }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          const locationMatch = req.url.match(/^\/api\/locations\/(.+)$/);
          if (locationMatch && req.method === 'PUT') {
            const result = await updateLocation(
              adminClient,
              userClient,
              {
                ...(await readJsonBody<LocationPayload>(req)),
                id: decodeURIComponent(locationMatch[1]),
              }
            );
            if (result.ok === false) {
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: result.error }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          if (locationMatch && req.method === 'DELETE') {
            const result = await deleteLocation(
              adminClient,
              userClient,
              decodeURIComponent(locationMatch[1])
            );
            if (result.ok === false) {
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: result.error }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          const transferStatusMatch = req.url.match(
            /^\/api\/transfers\/(.+)\/status$/
          );
          if (transferStatusMatch && req.method === 'PUT') {
            const result = await updateTransferWorkflowStatus(
              adminClient,
              userClient,
              decodeURIComponent(transferStatusMatch[1]),
              await readJsonBody<TransferStatusPayload>(req)
            );
            if (result.ok === false) {
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: result.error }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          return next();
        } catch (err) {
          console.error('[local-api]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Sunucu hatası.' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      port: 5173,
      strictPort: false,
    },
  };
});
