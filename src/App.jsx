import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import InventoryPage from './modules/inventory/InventoryPage';
import InboundPage from './modules/inventory/InboundPage';
import { Toaster } from 'react-hot-toast'; // Importante
import OutboundPage from './modules/inventory/OutboundPage'
import TransferPage from './modules/inventory/TransferPage';
import ReportsPage from './modules/reports/ReportsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './modules/auth/LoginPage';
import CatalogPage from './modules/catalog/CatalogPage';
import CategoriesPage from './modules/catalog/CategoriesPage';
import PartnersPage from './modules/partners/PartnersPage';
import BatchPage from './modules/batches/BatchPage';
import TransportersPage from './modules/partners/TransportersPage';

import DashboardPage from './modules/dashboard/DashboardPage';

// Componentes temporales para rutas no creadas aún
const Placeholder = ({ title }) => <div className="p-8 text-gray-400 italic">Módulo de {title} en desarrollo...</div>;

const AppContent = () => {
  const { user } = useAuth();

  // Si no está logueado, mostrar solo el Login
  if (!user) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventario" element={<InventoryPage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/lotes" element={<BatchPage />} />
        <Route path="/transportistas" element={<TransportersPage />} />
        <Route path="/directorio" element={<PartnersPage />} />
        <Route path="/entradas" element={<InboundPage />} />
        <Route path="/salidas" element={<OutboundPage />} />
        <Route path="/transferencias" element={<TransferPage />} />
        <Route path="/reportes" element={<ReportsPage />} />
      </Routes>
    </Layout>
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
