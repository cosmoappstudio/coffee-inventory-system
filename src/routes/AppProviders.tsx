import { Outlet } from 'react-router-dom';
import { InventoryProvider } from '../context/InventoryContext';

/** Wraps authenticated routes with inventory data. */
export default function AppProviders() {
  return (
    <InventoryProvider>
      <Outlet />
    </InventoryProvider>
  );
}
