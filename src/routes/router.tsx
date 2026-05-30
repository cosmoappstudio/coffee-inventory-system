import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import AdminLayout from '../pages/admin/AdminLayout';
import DashboardPage from '../pages/admin/DashboardPage';
import EmployeesPage from '../pages/admin/EmployeesPage';
import LocationsPage from '../pages/admin/LocationsPage';
import ProductSettingsPage from '../pages/admin/ProductSettingsPage';
import ProductsPage from '../pages/admin/ProductsPage';
import ReportsPage from '../pages/admin/ReportsPage';
import RequestsPage from '../pages/admin/RequestsPage';
import TransfersPage from '../pages/admin/TransfersPage';
import OpsIndexRedirect from '../pages/ops/OpsIndexRedirect';
import OpsLayout from '../pages/ops/OpsLayout';
import OpsRequestsPage from '../pages/ops/OpsRequestsPage';
import OpsTransfersPage from '../pages/ops/OpsTransfersPage';
import OpsUsagePage from '../pages/ops/OpsUsagePage';
import ProtectedRoute from './ProtectedRoute';
import AdminIndexRedirect from './AdminIndexRedirect';
import RootRedirect from './RootRedirect';
import AppProviders from './AppProviders';

const OPS_ROLES = ['Location Manager', 'Barista'] as const;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <AppProviders />,
    children: [
      {
        path: '/admin',
        element: (
          <ProtectedRoute allowedRoles={['Owner']}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <AdminIndexRedirect /> },
          {
            path: 'dashboard',
            element: (
              <ProtectedRoute ownerOnly>
                <DashboardPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'products',
            element: (
              <ProtectedRoute ownerOnly>
                <ProductsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'product-settings',
            element: (
              <ProtectedRoute ownerOnly>
                <ProductSettingsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'locations',
            element: (
              <ProtectedRoute ownerOnly>
                <LocationsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'employees',
            element: (
              <ProtectedRoute ownerOnly>
                <EmployeesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'transfers',
            element: (
              <ProtectedRoute ownerOnly>
                <TransfersPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'requests',
            element: (
              <ProtectedRoute ownerOnly>
                <RequestsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'reports',
            element: (
              <ProtectedRoute ownerOnly>
                <ReportsPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: '/ops',
        element: (
          <ProtectedRoute allowedRoles={[...OPS_ROLES]}>
            <OpsLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <OpsIndexRedirect /> },
          {
            path: 'usage',
            element: <OpsUsagePage />,
          },
          {
            path: 'transfers',
            element: <OpsTransfersPage />,
          },
          {
            path: 'requests',
            element: <OpsRequestsPage />,
          },
        ],
      },
      {
        path: '/shift',
        element: (
          <ProtectedRoute allowedRoles={[...OPS_ROLES]}>
            <Navigate to="/ops/usage" replace />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
