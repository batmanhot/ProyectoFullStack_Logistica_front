import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import InventoryPage from './modules/inventory/InventoryPage';
import InboundPage from './modules/inventory/InboundPage';
import { Toaster } from 'react-hot-toast';
import OutboundPage from './modules/inventory/OutboundPage';
import TransferPage from './modules/inventory/TransferPage';
import ReportsPage from './modules/reports/ReportsPage';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { InventoryProvider } from './context/InventoryContext';
import LoginPage from './modules/auth/LoginPage';
import CatalogPage from './modules/catalog/CatalogPage';
import CategoriesPage from './modules/catalog/CategoriesPage';
import PartnersPage from './modules/partners/PartnersPage';
import BatchPage from './modules/batches/BatchPage';
import TransportersPage from './modules/partners/TransportersPage';
import LocationsPage from './modules/locations/LocationsPage';
import WarehouseMapPage from './modules/locations/WarehouseMapPage';
import DashboardPage from './modules/dashboard/DashboardPage';
import { LocationsProvider } from './context/LocationsContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { PartnersProvider } from './context/PartnersContext';
import { TransportersProvider } from './context/TransportersContext';
import { BatchesProvider } from './context/BatchesContext';

// ---------------------------------------------------------------------------
// ProtectedRoute — Restringe acceso según permiso del rol.
// Uso: <ProtectedRoute module="catalogo"> <CatalogPage /> </ProtectedRoute>
// Al migrar al backend, este componente sigue igual — solo cambia hasPermission()
// para validar contra el token JWT en lugar de los permisos en memoria.
// ---------------------------------------------------------------------------
const ProtectedRoute = ({ module, children }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(module)) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-semibold text-gray-500">Acceso restringido</p>
        <p className="text-sm text-gray-400 mt-2">Tu rol no tiene permiso para ver este módulo.</p>
      </div>
    );
  }
  return children;
};

const AppContent = () => {
  const { user } = useAuth();

  if (!user) return <LoginPage />;

  return (
    <InventoryProvider>
      <LocationsProvider>
        <CategoriesProvider>
          <PartnersProvider>
            <TransportersProvider>
              <BatchesProvider>
                <Layout>
                  <Routes>
                    {/* Rutas accesibles para todos los roles autenticados */}
                    <Route path="/"               element={<DashboardPage />} />
                    <Route path="/inventario"     element={<InventoryPage />} />
                    <Route path="/reportes"       element={<ReportsPage />} />

                    {/* Operaciones de movimiento */}
                    <Route path="/entradas"       element={<ProtectedRoute module="entradas"><InboundPage /></ProtectedRoute>} />
                    <Route path="/salidas"        element={<ProtectedRoute module="salidas"><OutboundPage /></ProtectedRoute>} />
                    <Route path="/transferencias" element={<ProtectedRoute module="transferencias"><TransferPage /></ProtectedRoute>} />

                    {/* Maestros — solo supervisor y admin */}
                    <Route path="/catalogo"       element={<ProtectedRoute module="catalogo"><CatalogPage /></ProtectedRoute>} />
                    <Route path="/categorias"     element={<ProtectedRoute module="catalogo"><CategoriesPage /></ProtectedRoute>} />
                    <Route path="/lotes"          element={<ProtectedRoute module="lotes"><BatchPage /></ProtectedRoute>} />
                    <Route path="/transportistas" element={<ProtectedRoute module="catalogo"><TransportersPage /></ProtectedRoute>} />
                    <Route path="/ubicaciones"    element={<ProtectedRoute module="catalogo"><LocationsPage /></ProtectedRoute>} />
                    <Route path="/mapa-almacen"   element={<ProtectedRoute module="catalogo"><WarehouseMapPage /></ProtectedRoute>} />
                    <Route path="/directorio"     element={<ProtectedRoute module="catalogo"><PartnersPage /></ProtectedRoute>} />
                    <Route path="/clientes"       element={<ProtectedRoute module="catalogo"><PartnersPage initialTab="Cliente" /></ProtectedRoute>} />
                    <Route path="/proveedores"    element={<ProtectedRoute module="catalogo"><PartnersPage initialTab="Proveedor" /></ProtectedRoute>} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </BatchesProvider>
            </TransportersProvider>
          </PartnersProvider>
        </CategoriesProvider>
      </LocationsProvider>
    </InventoryProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
