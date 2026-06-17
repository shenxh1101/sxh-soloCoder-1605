import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import BoardingList from '@/pages/BoardingList';
import BoardingNew from '@/pages/BoardingNew';
import BoardingDetail from '@/pages/BoardingDetail';
import GroomingList from '@/pages/GroomingList';
import GroomingNew from '@/pages/GroomingNew';
import CareCenter from '@/pages/CareCenter';
import CheckoutList from '@/pages/CheckoutList';
import CheckoutDetail from '@/pages/CheckoutDetail';
import Statistics from '@/pages/Statistics';
import Receipt from '@/pages/Receipt';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/boarding" element={<BoardingList />} />
        <Route path="/boarding/new" element={<BoardingNew />} />
        <Route path="/boarding/:id" element={<BoardingDetail />} />
        <Route path="/grooming" element={<GroomingList />} />
        <Route path="/grooming/new" element={<GroomingNew />} />
        <Route path="/care" element={<CareCenter />} />
        <Route path="/checkout" element={<CheckoutList />} />
        <Route path="/checkout/:id" element={<CheckoutDetail />} />
        <Route path="/receipt/:boardingId" element={<Receipt />} />
        <Route path="/statistics" element={<Statistics />} />
      </Route>
    </Routes>
  );
}
