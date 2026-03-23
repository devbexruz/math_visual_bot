import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css'
import { captureTokenFromURL, getMe, getToken, type User } from './utils/api';

// Pages import 
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';

/** Bot dan kelgan ?workspace= parametrini /world/:id ga redirect qiladi */
function WorkspaceRedirector({ workspace }: { workspace: string | null }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (workspace) {
      navigate(`/world/${workspace}`, { replace: true });
    }
  }, [workspace, navigate]);
  return null;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const workspaceRef = useRef<string | null>(null);

  useEffect(() => {
    // URL dan token va workspace ni olish
    const { workspace } = captureTokenFromURL();
    workspaceRef.current = workspace;

    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then(u => setUser(u))
      .catch(() => { /* token noto'g'ri — landing ko'rsatamiz */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#00ddff', fontSize: '1.2em' }}>Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <Router>
      <WorkspaceRedirector workspace={workspaceRef.current} />
      <Routes>
        <Route path="/" element={<HomePage user={user} />} />
        <Route path="/world/:worldId" element={<ResultPage user={user} />} />
      </Routes>
    </Router>
  )
}

export default App
