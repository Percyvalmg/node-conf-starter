import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { WorkRequestPage } from './pages/WorkRequestPage';
import { WorkRequestDetailPage } from './pages/WorkRequestDetailPage';
import { HistoryPage } from './pages/HistoryPage';

function ShortlistRedirect() {
  const { id } = useParams();
  return <Navigate to={`/work-requests/${id}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WorkRequestPage />} />
          <Route path="/work-requests/:id" element={<WorkRequestDetailPage />} />
          <Route path="/work-requests/:id/shortlist" element={<ShortlistRedirect />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
