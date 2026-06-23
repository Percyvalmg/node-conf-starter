import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { WorkRequestPage } from './pages/WorkRequestPage';
import { ShortlistPage } from './pages/ShortlistPage';
import { HistoryPage } from './pages/HistoryPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WorkRequestPage />} />
          <Route path="/work-requests/:id/shortlist" element={<ShortlistPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
