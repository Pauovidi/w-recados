import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { DemoStoreProvider } from '@/lib/DemoStore';

import Home from './pages/Home';
import OrderForm from './pages/OrderForm';
import OrderConfirmation from './pages/OrderConfirmation';
import PaymentDemo from './pages/PaymentDemo';
import AdminDashboard from './pages/admin/AdminDashboard';
import OrderDetail from './pages/admin/OrderDetail';
import DeliveryPersonList from './pages/admin/DeliveryPersonList';
import Conversations from './pages/admin/Conversations';
import DeliveryDashboard from './pages/DeliveryDashboard';
import CourierDemoAccess from './pages/CourierDemoAccess';
import AdminLayout from './components/admin/AdminLayout';
import DemoNavigator from './components/DemoNavigator';
import BusinessList from './pages/admin/BusinessList';
import PackageList from './pages/admin/PackageList';

const RoutedApp = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pedido" element={<OrderForm />} />
        <Route path="/pedido/confirmacion" element={<OrderConfirmation />} />
        <Route path="/pago/:token" element={<PaymentDemo />} />
        <Route path="/repartidor" element={<DeliveryDashboard />} />
        <Route path="/repartidor/acceso" element={<CourierDemoAccess />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="pedido/:id" element={<OrderDetail />} />
          <Route path="repartidores" element={<DeliveryPersonList />} />
          <Route path="negocios" element={<BusinessList />} />
          <Route path="paquetes" element={<PackageList />} />
          <Route path="conversaciones" element={<Conversations />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <DemoNavigator />
      <Toaster />
      <SonnerToaster richColors position="top-center" />
    </>
  );
};

function App() {
  return (
    <DemoStoreProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoutedApp />
      </Router>
    </DemoStoreProvider>
  );
}

export default App;
