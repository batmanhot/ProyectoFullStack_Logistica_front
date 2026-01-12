import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import InventoryPage from './modules/inventory/InventoryPage';
import InboundPage from './modules/inventory/InboundPage';
import { Toaster } from 'react-hot-toast'; // Importante
import OutboundPage from './modules/inventory/OutboundPage'
import ReportsPage from './modules/reports/ReportsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './modules/auth/LoginPage';
import CatalogPage from './modules/catalog/CatalogPage';

// Componentes temporales para rutas no creadas aún
const Placeholder = ({ title }) => <div className="p-8 text-gray-400 italic">Módulo de {title} en desarrollo...</div>;

const AppContent = () => {
  const { user } = useAuth();

  // Si no está logueado, mostrar solo el Login
  if (!user) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<InventoryPage />} />
        <Route path="/catalogo" element={<CatalogPage />} /> {/* Nueva ruta operativa */}
        <Route path="/entradas" element={<InboundPage />} />
        <Route path="/salidas" element={<OutboundPage />} />
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
