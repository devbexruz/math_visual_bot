import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Workspace3D from '../components/Workspace3D';
import type { ShapeData, HyperboloidParams } from '../components/Workspace3D';
import Workspace2D from '../components/Workspace2D';
import type { Shape2DData } from '../components/Workspace2D';
import { getWorkspace, listShapes, createShapeAPI, deleteShapeAPI, type User, type Workspace } from '../utils/api';


// Mishka bilan bosib tortish (drag) va touch orqali qiymat o'zgartirish
const ScrollNumberInput: React.FC<{
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  style?: React.CSSProperties;
}> = ({ value, step = 0.1, min, max, onChange, style }) => {
  const dragStartX = useRef<number | null>(null);
  const dragStartValue = useRef<number>(value);
  const isDragging = useRef(false);
  const sensitivity = 50;

  const clamp = useCallback((v: number) => {
    let clamped = parseFloat(v.toFixed(4));
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    return clamped;
  }, [min, max]);

  // Mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    dragStartX.current = e.clientX;
    dragStartValue.current = value;
    isDragging.current = false;

    const handleMouseMove = (ev: MouseEvent) => {
      if (dragStartX.current === null) return;
      const dx = ev.clientX - dragStartX.current;
      if (!isDragging.current && Math.abs(dx) > 3) isDragging.current = true;
      if (isDragging.current) {
        const steps = Math.round(dx / sensitivity);
        onChange(clamp(dragStartValue.current + steps * step));
      }
    };

    const handleMouseUp = () => {
      dragStartX.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [value, step, sensitivity, onChange, clamp]);

  // Touch drag
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLInputElement>) => {
    dragStartX.current = e.touches[0].clientX;
    dragStartValue.current = value;
  }, [value]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLInputElement>) => {
    if (dragStartX.current === null) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - dragStartX.current;
    const steps = Math.round(dx / sensitivity);
    onChange(clamp(dragStartValue.current + steps * step));
  }, [step, sensitivity, clamp, onChange]);

  const handleTouchEnd = useCallback(() => {
    dragStartX.current = null;
  }, []);

  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={e => onChange(parseFloat(e.target.value))}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ width: '100%', padding: '6px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px', touchAction: 'none', cursor: 'ew-resize', ...style }}
    />
  );
};

const Result: React.FC<{ user: User | null }> = ({ user }) => {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const workspaceId = worldId ? Number(worldId) : NaN;

  // --- 1. ASOSIY HOLATLAR (STATES) ---
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [shapes2D, setShapes2D] = useState<Shape2DData[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // API dan workspace va shapes yuklash
  useEffect(() => {
    if (isNaN(workspaceId) || !user) {
      navigate('/');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [ws, apiShapes] = await Promise.all([
          getWorkspace(workspaceId),
          listShapes(workspaceId),
        ]);
        if (cancelled) return;
        setWorkspace(ws);
        // API shapes ni frontend formatga o'tkazish
        const s3d: ShapeData[] = [];
        const s2d: Shape2DData[] = [];
        for (const s of apiShapes) {
          if (s.type === '3D') {
            s3d.push({ id: String(s.id), type: s.name, params: s.data } as unknown as ShapeData);
          } else {
            s2d.push({ id: String(s.id), type: s.name, params: s.data } as unknown as Shape2DData);
          }
        }
        setShapes(s3d);
        setShapes2D(s2d);
      } catch {
        if (!cancelled) navigate('/');
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceId, user, navigate]);

  // --- RESPONSIVE HOLATLAR ---
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowLeftPanel(false);
        setShowRightPanel(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 2. AI CHAT HOLATLARI ---
  // const [chatInput, setChatInput] = useState('');
  // const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([
  //   { role: 'ai', text: "Salom! Men MathVisualBot man. Menga 'Qizil giperboloid qo'sh' deb yozishingiz mumkin." }
  // ]);


  // --- 3. SHAKLLARNI BOSHQARISH FUNKSIYALARI ---
  const addShape3D = async (type: string, params: Record<string, unknown>) => {
    const tempId = Math.random().toString(36).substring(7);
    const newShape: ShapeData = { id: tempId, type, params } as unknown as ShapeData;
    setShapes(prev => [...prev, newShape]);
    setSelectedShapeId(tempId);
    if (!isNaN(workspaceId)) {
      try {
        const saved = await createShapeAPI(workspaceId, type, '3D', params);
        const dbId = String(saved.id);
        setShapes(prev => prev.map(s => s.id === tempId ? { ...s, id: dbId } : s));
        setSelectedShapeId(dbId);
      } catch { /* shape added locally even if save fails */ }
    }
  };

  const addShape2D = async (type: string, params: Record<string, unknown>) => {
    const tempId = Math.random().toString(36).substring(7);
    const newShape: Shape2DData = { id: tempId, type, params } as unknown as Shape2DData;
    setShapes2D(prev => [...prev, newShape]);
    setSelectedShapeId(tempId);
    if (!isNaN(workspaceId)) {
      try {
        const saved = await createShapeAPI(workspaceId, type, '2D', params);
        const dbId = String(saved.id);
        setShapes2D(prev => prev.map(s => s.id === tempId ? { ...s, id: dbId } : s));
        setSelectedShapeId(dbId);
      } catch { /* shape added locally even if save fails */ }
    }
  };

  const addHyperboloid = () => addShape3D('hyperboloid', { a: 2, b: 2, c: 3, color: '#00ddff' });
  const addEllips = () => addShape3D('ellips', { a: 3, b: 2, c: 1.5, color: '#ffbb00' });
  const addDot = () => addShape3D('dot', { x: 0, y: 0, z: 0, color: '#ff4444', title: 'Nuqta' });
  const addCube = () => addShape3D('cube', { x: 0, y: 0, z: 0, scaleX: 2, scaleY: 2, scaleZ: 2, color: '#00ff00' });
  const addPlane = () => addShape3D('plane', { a: 0, b: 0, c: 1, d: 0, size: 10, color: '#aa44ff' });
  const addHyperboloid1 = () => addShape3D('hyperboloid1', { a: 2, b: 2, c: 3, color: '#ff6600' });
  const addHyperbolicParaboloid = () => addShape3D('hyperbolicParaboloid', { a: 2, b: 2, size: 6, color: '#ff44aa' });
  const addEllipticParaboloid = () => addShape3D('ellipticParaboloid', { a: 2, b: 2, size: 6, color: '#44ffaa' });
  const addCone = () => addShape3D('cone', { a: 2, b: 2, c: 3, color: '#ffff00' });

  // --- 2D SHAKLLAR ---
  const addDot2D = () => addShape2D('dot2d', { x: 0, y: 0, color: '#ff4444', title: 'A' });
  const addLine2D = () => addShape2D('line2d', { k: 1, b: 0, color: '#00ddff', title: '' });
  const addEllips2D = () => addShape2D('ellips2d', { a: 3, b: 2, cx: 0, cy: 0, color: '#ffbb00', title: '' });
  const addParabola2D = () => addShape2D('parabola2d', { a: 1, b: 0, c: 0, color: '#44ff88', title: '' });
  const addHyperbola2D = () => addShape2D('hyperbola2d', { k: 1, b: 0, c: 0, color: '#ff44aa', title: '' });

  const removeShape = (id: string) => {
    setShapes(shapes.filter(s => s.id !== id));
    setShapes2D(shapes2D.filter(s => s.id !== id));
    if (selectedShapeId === id) setSelectedShapeId(null);
    const numId = Number(id);
    if (!isNaN(workspaceId) && !isNaN(numId)) {
      deleteShapeAPI(workspaceId, numId).catch(() => {});
    }
  };

  const updateShapeParam = (id: string, paramName: keyof HyperboloidParams, value: string | number) => {
    setShapes(shapes.map(shape => {
      if (shape.id === id && shape.type === 'hyperboloid') {
        return { ...shape, params: { ...shape.params, [paramName]: value } };
      }
      return shape;
    }));
  };

  // --- 4. AI CHAT FUNKSIYASI ---
  // const handleChatSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!chatInput.trim()) return;

  //   // Foydalanuvchi xabarini qo'shish
  //   setChatHistory(prev => [...prev, { role: 'user', text: chatInput }]);
    
  //   // Hozircha AI o'rniga "Muxlaj" javob (Keyin backendga ulaymiz)
  //   setTimeout(() => {
  //     setChatHistory(prev => [...prev, { role: 'ai', text: "Buyrug'ingiz qabul qilindi! AI ulash jarayoni tez orada..." }]);
  //   }, 1000);

  //   setChatInput('');
  // };

  // --- UI RENDER ---
  // Tanlangan shaklni topish
  const selectedShape = shapes.find(s => s.id === selectedShapeId);
  const selectedShape2D = shapes2D.find(s => s.id === selectedShapeId);
  const is2DMode = workspace?.workspace_type === '2D';

  if (loadingData) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#00ddff', fontSize: '1.2em' }}>Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div style={{ boxSizing: 'border-box', width: '100%', height: '100vh', display: 'flex', backgroundColor: '#050505', color: 'white', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>
      
      {/* Mobile overlay backdrop */}
      {isMobile && (showLeftPanel || showRightPanel) && (
        <div 
          onClick={() => { setShowLeftPanel(false); setShowRightPanel(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. CHAP PANEL: ASBOBLAR VA AI CHAT */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        width: isMobile ? '280px' : '300px',
        background: '#111',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        ...(isMobile ? {
          position: 'fixed',
          top: 0,
          left: showLeftPanel ? 0 : '-290px',
          bottom: 0,
          zIndex: 100,
          transition: 'left 0.3s ease',
          boxShadow: showLeftPanel ? '4px 0 20px rgba(0,0,0,0.5)' : 'none'
        } : {})
      }}>
        
        {/* Mobile: Yopish tugmasi */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 10px 0' }}>
            <button onClick={() => setShowLeftPanel(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.4em', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Asboblar (Tools) */}
        <div style={{ padding: isMobile ? '10px 15px 15px' : '20px', borderBottom: '1px solid #333', overflowY: 'auto' }}>
          <h2 style={{ color: '#00ddff', marginTop: 0, fontSize: isMobile ? '1.1em' : undefined }}>Asboblar</h2>
          
          {is2DMode ? (
            <>
              <button onClick={() => { addDot2D(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Nuqta qo'shish
              </button>
              <button onClick={() => { addLine2D(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + To'g'ri chiziq qo'shish
              </button>
              <button onClick={() => { addEllips2D(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Ellips qo'shish
              </button>
              <button onClick={() => { addParabola2D(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Parabola qo'shish
              </button>
              <button onClick={() => { addHyperbola2D(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Giperbola qo'shish
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { addHyperboloid(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Giperboloid qo'shish
              </button>
              <button onClick={() => { addEllips(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Ellips qo'shish
              </button>
              <button onClick={() => { addDot(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Nuqta qo'shish
              </button>
              <button onClick={() => { addCube(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Kub qo'shish
              </button>
              <button onClick={() => { addPlane(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Tekislik qo'shish
              </button>
              <button onClick={() => { addHyperboloid1(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Bir pallali giperboloid
              </button>
              <button onClick={() => { addHyperbolicParaboloid(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Giperbolik paraboloid
              </button>
              <button onClick={() => { addEllipticParaboloid(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Elliptik paraboloid
              </button>
              <button onClick={() => { addCone(); if (isMobile) setShowLeftPanel(false); }} style={{ width: '100%', padding: isMobile ? '8px' : '10px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', marginBottom: '8px', transition: '0.2s', fontSize: isMobile ? '0.85em' : undefined }}>
                + Konus qo'shish
              </button>
            </>
          )}
        </div>

        {/* AI Chat (Pastki qismda) */}
        {/* <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isMobile ? '10px' : '15px', overflow: 'hidden' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#bbb' }}>✨ AI Yordamchi</h3>
          
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#00ddff' : '#222',
                color: msg.role === 'user' ? '#000' : '#fff',
                padding: '8px 12px', borderRadius: '8px', maxWidth: '85%', fontSize: '0.9em'
              }}>
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '5px' }}>
            <input 
              value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder="Shakl yasashni so'rang..." 
              style={{ flex: 1, padding: '10px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '5px' }}
            />
            <button type="submit" style={{ padding: '10px', background: '#00ddff', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              ➤
            </button>
          </form>
        </div> */}
      </div>


      {/* ------------------------------------------------------------- */}
      {/* 2. O'RTA PANEL: WORKSPACE (ISHCHI HUDUD) */}
      {/* ------------------------------------------------------------- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0 }}>
        
        {/* Tepadagi Boshqaruv (Olamni tanlash) */}
        <div style={{ padding: isMobile ? '8px 10px' : '10px 20px', background: '#111', display: 'flex', alignItems: 'center', borderBottom: '1px solid #333', gap: '8px', flexWrap: 'nowrap' }}>
          
          {/* Orqaga qaytish */}
          <button onClick={() => navigate('/')} style={{ flexShrink: 0, padding: '6px 10px', background: '#222', color: '#aaa', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', fontSize: '1em' }}>
            ←
          </button>

          {/* Mobile: Chap panel tugmasi */}
          {isMobile && (
            <button onClick={() => { setShowLeftPanel(true); setShowRightPanel(false); }} style={{ flexShrink: 0, padding: '6px 10px', background: '#222', color: '#00ddff', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1em' }}>
              ☰
            </button>
          )}

          {/* Olam nomi — sig'ganda to'liq, sig'maganda ellipsis */}
          {workspace && (
            <span style={{ color: '#00ddff', fontWeight: 'bold', fontSize: isMobile ? '0.85em' : '0.95em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
              {workspace.name}
            </span>
          )}

          {/* Mobile: O'ng panel tugmasi — o'ngga taqalgan */}
          {isMobile && (
            <button onClick={() => { setShowRightPanel(true); setShowLeftPanel(false); }} style={{ flexShrink: 0, marginLeft: 'auto', padding: '6px 10px', background: '#222', color: '#00ddff', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1em' }}>
              ⚙
            </button>
          )}
        </div>

        {/* 3D/2D Render qilinadigan joy */}
        <div style={{ flex: 1, display: 'flex' }}>
          {!is2DMode && <Workspace3D shapes={shapes} />}
          {is2DMode && <Workspace2D shapes={shapes2D} onShapeClick={setSelectedShapeId} selectedShapeId={selectedShapeId} />}
        </div>
      </div>


      {/* ------------------------------------------------------------- */}
      {/* 3. O'NG PANEL: XUSUSIYATLAR (PROPERTIES) */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        width: isMobile ? '280px' : '300px',
        background: '#111',
        borderLeft: '1px solid #333',
        padding: isMobile ? '15px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        ...(isMobile ? {
          position: 'fixed',
          top: 0,
          right: showRightPanel ? 0 : '-290px',
          bottom: 0,
          zIndex: 100,
          transition: 'right 0.3s ease',
          boxShadow: showRightPanel ? '-4px 0 20px rgba(0,0,0,0.5)' : 'none'
        } : {})
      }}>
        {/* Mobile: Yopish tugmasi */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5px' }}>
            <button onClick={() => setShowRightPanel(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.4em', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        <h2 style={{ color: '#00ddff', marginTop: 0, fontSize: isMobile ? '1.1em' : undefined }}>Xususiyatlar</h2>
        
        {/* Obyektlar ro'yxati - 2D yoki 3D ga qarab */}
        {is2DMode ? (
          shapes2D.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9em' }}>Sahnada shakl yo'q. Chapdan qo'shing.</p>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              <strong style={{ color: '#aaa', fontSize: '0.8em', textTransform: 'uppercase' }}>2D Obyektlar:</strong>
              {shapes2D.map((s, i) => (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedShapeId(s.id)}
                  style={{ 
                    padding: '8px', marginTop: '5px', cursor: 'pointer', borderRadius: '4px', display: 'flex', justifyContent: 'space-between',
                    background: selectedShapeId === s.id ? '#222' : 'transparent',
                    border: selectedShapeId === s.id ? '1px solid #00ddff' : '1px solid #333'
                  }}
                >
                  <span>{i + 1}. {
                    s.type === 'dot2d' ? `Nuqta${s.params.title ? ` (${s.params.title})` : ''}` :
                    s.type === 'line2d' ? `Chiziq${s.params.title ? ` (${s.params.title})` : ''}` :
                    s.type === 'ellips2d' ? `Ellips${s.params.title ? ` (${s.params.title})` : ''}` :
                    s.type === 'parabola2d' ? `Parabola${s.params.title ? ` (${s.params.title})` : ''}` :
                    s.type === 'hyperbola2d' ? `Giperbola${s.params.title ? ` (${s.params.title})` : ''}` : 'Shakl'
                  }</span>
                  <button onClick={(e) => { e.stopPropagation(); removeShape(s.id); }} style={{ background:'none', border:'none', color:'#ff4444', cursor:'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          )
        ) : (
          shapes.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9em' }}>Sahnada shakl yo'q. Chapdan qo'shing.</p>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              <strong style={{ color: '#aaa', fontSize: '0.8em', textTransform: 'uppercase' }}>Obyektlar Ro'yxati:</strong>
              {shapes.map((s, i) => (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedShapeId(s.id)}
                  style={{ 
                    padding: '8px', marginTop: '5px', cursor: 'pointer', borderRadius: '4px', display: 'flex', justifyContent: 'space-between',
                    background: selectedShapeId === s.id ? '#222' : 'transparent',
                    border: selectedShapeId === s.id ? '1px solid #00ddff' : '1px solid #333'
                  }}
                >
                    <span>{i + 1}. {s.type === 'dot' && s.params.title ? `${s.type} (${s.params.title})` : s.type}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeShape(s.id); }} style={{ background:'none', border:'none', color:'#ff4444', cursor:'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tanlangan shaklning parametrlarini tahrirlash */}
        {selectedShape && selectedShape.type === 'hyperboloid' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Giperboloid Sozlamalari</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>A (X o'qi) = {selectedShape.params.a}</label>
              <ScrollNumberInput value={selectedShape.params.a} step={0.1} min={0.1} max={20} onChange={v => updateShapeParam(selectedShape.id, 'a', v)} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>B (Y o'qi) = {selectedShape.params.b}</label>
              <ScrollNumberInput value={selectedShape.params.b} step={0.1} min={0.1} max={20} onChange={v => updateShapeParam(selectedShape.id, 'b', v)} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>C (Z o'qi) = {selectedShape.params.c}</label>
              <ScrollNumberInput value={selectedShape.params.c} step={0.1} min={0.1} max={20} onChange={v => updateShapeParam(selectedShape.id, 'c', v)} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape.params.color} onChange={(e) => updateShapeParam(selectedShape.id, 'color', e.target.value)} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: '#00ddff' }}>-x²/{selectedShape.params.a}² - y²/{selectedShape.params.b}² + z²/{selectedShape.params.c}² = 1</span>
            </div>
          </div>
        )}

        {selectedShape && selectedShape.type === 'ellips' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Ellipsoid Sozlamalari</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>a (X radius) = {selectedShape.params.a}</label>
              <ScrollNumberInput value={selectedShape.params.a} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'ellips' ? { ...shape, params: { ...shape.params, a: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>b (Y radius) = {selectedShape.params.b}</label>
              <ScrollNumberInput value={selectedShape.params.b} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'ellips' ? { ...shape, params: { ...shape.params, b: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>c (Z radius) = {selectedShape.params.c}</label>
              <ScrollNumberInput value={selectedShape.params.c} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'ellips' ? { ...shape, params: { ...shape.params, c: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape.params.color} onChange={(e) => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'ellips' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: '#ffbb00' }}>x²/{selectedShape.params.a}² + y²/{selectedShape.params.b}² + z²/{selectedShape.params.c}² = 1</span>
            </div>
          </div>
        )}

        {selectedShape && selectedShape.type === 'cube' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Kub Sozlamalari</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>X koordinata</label>
              <ScrollNumberInput value={selectedShape.params.x} step={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cube' ? { ...shape, params: { ...shape.params, x: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Y koordinata</label>
              <ScrollNumberInput value={selectedShape.params.y} step={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cube' ? { ...shape, params: { ...shape.params, y: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Z koordinata</label>
              <ScrollNumberInput value={selectedShape.params.z} step={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cube' ? { ...shape, params: { ...shape.params, z: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>X o'lcham (scaleX)</label>
              <ScrollNumberInput value={selectedShape.params.scaleX} step={0.1} min={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cube' ? { ...shape, params: { ...shape.params, scaleX: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Y o'lcham (scaleY)</label>
              <ScrollNumberInput value={selectedShape.params.scaleY} step={0.1} min={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cube' ? { ...shape, params: { ...shape.params, scaleY: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Z o'lcham (scaleZ)</label>
              <ScrollNumberInput value={selectedShape.params.scaleZ} step={0.1} min={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cube' ? { ...shape, params: { ...shape.params, scaleZ: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape.params.color} onChange={e => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cube' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <button onClick={() => removeShape(selectedShape.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>Kubni o'chirish</button>
          </div>
        )}

        {selectedShape && selectedShape.type === 'dot' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Nuqta Sozlamalari</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Matn (title)</label>
              <input type="text" value={selectedShape.params.title || ''} onChange={e => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'dot' ? { ...shape, params: { ...shape.params, title: e.target.value } } : shape))} style={{ width: '100%', padding: '6px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>X koordinata</label>
              <ScrollNumberInput value={selectedShape.params.x} step={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'dot' ? { ...shape, params: { ...shape.params, x: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Y koordinata</label>
              <ScrollNumberInput value={selectedShape.params.y} step={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'dot' ? { ...shape, params: { ...shape.params, y: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Z koordinata</label>
              <ScrollNumberInput value={selectedShape.params.z} step={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'dot' ? { ...shape, params: { ...shape.params, z: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape.params.color} onChange={e => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'dot' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <button onClick={() => removeShape(selectedShape.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>Nuqtani o'chirish</button>
          </div>
        )}

        {selectedShape && selectedShape.type === 'plane' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Tekislik Sozlamalari</h3>
            <p style={{ fontSize: '0.8em', color: '#888', margin: '0 0 10px' }}>Ax + By + Cz + D = 0</p>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>A = {selectedShape.params.a}</label>
              <ScrollNumberInput value={selectedShape.params.a} step={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'plane' ? { ...shape, params: { ...shape.params, a: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>B = {selectedShape.params.b}</label>
              <ScrollNumberInput value={selectedShape.params.b} step={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'plane' ? { ...shape, params: { ...shape.params, b: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>C = {selectedShape.params.c}</label>
              <ScrollNumberInput value={selectedShape.params.c} step={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'plane' ? { ...shape, params: { ...shape.params, c: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>D = {selectedShape.params.d}</label>
              <ScrollNumberInput value={selectedShape.params.d} step={0.1} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'plane' ? { ...shape, params: { ...shape.params, d: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>O'lcham (size) = {selectedShape.params.size}</label>
              <ScrollNumberInput value={selectedShape.params.size} step={1} min={1} max={100} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'plane' ? { ...shape, params: { ...shape.params, size: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape.params.color} onChange={e => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'plane' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: '#aa44ff' }}>{selectedShape.params.a}x + {selectedShape.params.b}y + {selectedShape.params.c}z + {selectedShape.params.d} = 0</span>
            </div>
            <button onClick={() => removeShape(selectedShape.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>Tekislikni o'chirish</button>
          </div>
        )}

        {selectedShape && selectedShape.type === 'hyperboloid1' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Bir pallali giperboloid</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>a (X o'qi) = {selectedShape.params.a}</label>
              <ScrollNumberInput value={selectedShape.params.a} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'hyperboloid1' ? { ...shape, params: { ...shape.params, a: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>b (Y o'qi) = {selectedShape.params.b}</label>
              <ScrollNumberInput value={selectedShape.params.b} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'hyperboloid1' ? { ...shape, params: { ...shape.params, b: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>c (Z o'qi) = {selectedShape.params.c}</label>
              <ScrollNumberInput value={selectedShape.params.c} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'hyperboloid1' ? { ...shape, params: { ...shape.params, c: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape.params.color} onChange={e => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'hyperboloid1' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: '#ff6600' }}>x²/{selectedShape.params.a}² + y²/{selectedShape.params.b}² - z²/{selectedShape.params.c}² = 1</span>
            </div>
            <button onClick={() => removeShape(selectedShape.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>O'chirish</button>
          </div>
        )}

        {selectedShape && selectedShape.type === 'hyperbolicParaboloid' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Giperbolik paraboloid</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>a = {selectedShape.params.a}</label>
              <ScrollNumberInput value={selectedShape.params.a} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'hyperbolicParaboloid' ? { ...shape, params: { ...shape.params, a: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>b = {selectedShape.params.b}</label>
              <ScrollNumberInput value={selectedShape.params.b} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'hyperbolicParaboloid' ? { ...shape, params: { ...shape.params, b: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>O'lcham (size) = {selectedShape.params.size}</label>
              <ScrollNumberInput value={selectedShape.params.size} step={0.5} min={1} max={30} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'hyperbolicParaboloid' ? { ...shape, params: { ...shape.params, size: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape.params.color} onChange={e => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'hyperbolicParaboloid' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: '#ff44aa' }}>z = x²/{selectedShape.params.a}² - y²/{selectedShape.params.b}²</span>
            </div>
            <button onClick={() => removeShape(selectedShape.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>O'chirish</button>
          </div>
        )}

        {selectedShape && selectedShape.type === 'ellipticParaboloid' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Elliptik paraboloid</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>a = {selectedShape.params.a}</label>
              <ScrollNumberInput value={selectedShape.params.a} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'ellipticParaboloid' ? { ...shape, params: { ...shape.params, a: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>b = {selectedShape.params.b}</label>
              <ScrollNumberInput value={selectedShape.params.b} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'ellipticParaboloid' ? { ...shape, params: { ...shape.params, b: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>O'lcham (size) = {selectedShape.params.size}</label>
              <ScrollNumberInput value={selectedShape.params.size} step={0.5} min={1} max={30} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'ellipticParaboloid' ? { ...shape, params: { ...shape.params, size: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape.params.color} onChange={e => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'ellipticParaboloid' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: '#44ffaa' }}>z = x²/{selectedShape.params.a}² + y²/{selectedShape.params.b}²</span>
            </div>
            <button onClick={() => removeShape(selectedShape.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>O'chirish</button>
          </div>
        )}

        {selectedShape && selectedShape.type === 'cone' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Konus Sozlamalari</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>a (X o'qi) = {selectedShape.params.a}</label>
              <ScrollNumberInput value={selectedShape.params.a} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cone' ? { ...shape, params: { ...shape.params, a: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>b (Y o'qi) = {selectedShape.params.b}</label>
              <ScrollNumberInput value={selectedShape.params.b} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cone' ? { ...shape, params: { ...shape.params, b: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>c (Z o'qi) = {selectedShape.params.c}</label>
              <ScrollNumberInput value={selectedShape.params.c} step={0.1} min={0.1} max={20} onChange={v => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cone' ? { ...shape, params: { ...shape.params, c: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape.params.color} onChange={e => setShapes(shapes.map(shape => shape.id === selectedShape.id && shape.type === 'cone' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: '#ffff00' }}>x²/{selectedShape.params.a}² + y²/{selectedShape.params.b}² - z²/{selectedShape.params.c}² = 0</span>
            </div>
            <button onClick={() => removeShape(selectedShape.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>O'chirish</button>
          </div>
        )}

        {/* --- 2D SHAKLLAR PROPERTY PANELLARI --- */}
        {selectedShape2D && selectedShape2D.type === 'dot2d' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>2D Nuqta Sozlamalari</h3>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Matn (title)</label>
              <input type="text" value={selectedShape2D.params.title || ''} onChange={e => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'dot2d' ? { ...shape, params: { ...shape.params, title: e.target.value } } : shape))} style={{ width: '100%', padding: '6px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>X = {selectedShape2D.params.x}</label>
              <ScrollNumberInput value={selectedShape2D.params.x} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'dot2d' ? { ...shape, params: { ...shape.params, x: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Y = {selectedShape2D.params.y}</label>
              <ScrollNumberInput value={selectedShape2D.params.y} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'dot2d' ? { ...shape, params: { ...shape.params, y: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape2D.params.color} onChange={e => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'dot2d' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: selectedShape2D.params.color }}>({selectedShape2D.params.x}, {selectedShape2D.params.y})</span>
            </div>
            <button onClick={() => removeShape(selectedShape2D.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>O'chirish</button>
          </div>
        )}

        {selectedShape2D && selectedShape2D.type === 'line2d' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>To'g'ri chiziq Sozlamalari</h3>
            <p style={{ fontSize: '0.8em', color: '#888', margin: '0 0 10px' }}>y = kx + b</p>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Matn (title)</label>
              <input type="text" value={selectedShape2D.params.title || ''} onChange={e => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'line2d' ? { ...shape, params: { ...shape.params, title: e.target.value } } : shape))} style={{ width: '100%', padding: '6px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>k (burchak koeffitsiyenti) = {selectedShape2D.params.k}</label>
              <ScrollNumberInput value={selectedShape2D.params.k} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'line2d' ? { ...shape, params: { ...shape.params, k: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>b (erkin had) = {selectedShape2D.params.b}</label>
              <ScrollNumberInput value={selectedShape2D.params.b} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'line2d' ? { ...shape, params: { ...shape.params, b: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape2D.params.color} onChange={e => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'line2d' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: selectedShape2D.params.color }}>y = {selectedShape2D.params.k}x {selectedShape2D.params.b >= 0 ? '+' : ''} {selectedShape2D.params.b}</span>
            </div>
            <div style={{ marginTop: '5px', padding: '8px', background: '#111', borderRadius: '4px', fontSize: '0.8em', color: '#888', textAlign: 'center' }}>
              Burchak: {(Math.atan(selectedShape2D.params.k) * 180 / Math.PI).toFixed(1)}°
            </div>
            <button onClick={() => removeShape(selectedShape2D.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>O'chirish</button>
          </div>
        )}

        {/* --- ELLIPS 2D --- */}
        {selectedShape2D && selectedShape2D.type === 'ellips2d' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Ellips Sozlamalari</h3>
            <p style={{ fontSize: '0.8em', color: '#888', margin: '0 0 10px' }}>x²/a² + y²/b² = 1 {selectedShape2D.params.a === selectedShape2D.params.b ? '(Aylana!)' : ''}</p>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Matn (title)</label>
              <input type="text" value={selectedShape2D.params.title || ''} onChange={e => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'ellips2d' ? { ...shape, params: { ...shape.params, title: e.target.value } } : shape))} style={{ width: '100%', padding: '6px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>a (X yarim o'q) = {selectedShape2D.params.a}</label>
              <ScrollNumberInput value={selectedShape2D.params.a} step={0.1} min={0.1} max={50} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'ellips2d' ? { ...shape, params: { ...shape.params, a: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>b (Y yarim o'q) = {selectedShape2D.params.b}</label>
              <ScrollNumberInput value={selectedShape2D.params.b} step={0.1} min={0.1} max={50} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'ellips2d' ? { ...shape, params: { ...shape.params, b: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Markaz X = {selectedShape2D.params.cx}</label>
              <ScrollNumberInput value={selectedShape2D.params.cx} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'ellips2d' ? { ...shape, params: { ...shape.params, cx: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Markaz Y = {selectedShape2D.params.cy}</label>
              <ScrollNumberInput value={selectedShape2D.params.cy} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'ellips2d' ? { ...shape, params: { ...shape.params, cy: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape2D.params.color} onChange={e => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'ellips2d' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: selectedShape2D.params.color }}>x²/{selectedShape2D.params.a}² + y²/{selectedShape2D.params.b}² = 1</span>
            </div>
            <button onClick={() => removeShape(selectedShape2D.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>O'chirish</button>
          </div>
        )}

        {/* --- PARABOLA 2D --- */}
        {selectedShape2D && selectedShape2D.type === 'parabola2d' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Parabola Sozlamalari</h3>
            <p style={{ fontSize: '0.8em', color: '#888', margin: '0 0 10px' }}>y = ax² + bx + c</p>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Matn (title)</label>
              <input type="text" value={selectedShape2D.params.title || ''} onChange={e => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'parabola2d' ? { ...shape, params: { ...shape.params, title: e.target.value } } : shape))} style={{ width: '100%', padding: '6px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>a = {selectedShape2D.params.a}</label>
              <ScrollNumberInput value={selectedShape2D.params.a} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'parabola2d' ? { ...shape, params: { ...shape.params, a: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>b = {selectedShape2D.params.b}</label>
              <ScrollNumberInput value={selectedShape2D.params.b} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'parabola2d' ? { ...shape, params: { ...shape.params, b: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>c = {selectedShape2D.params.c}</label>
              <ScrollNumberInput value={selectedShape2D.params.c} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'parabola2d' ? { ...shape, params: { ...shape.params, c: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape2D.params.color} onChange={e => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'parabola2d' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: selectedShape2D.params.color }}>y = {selectedShape2D.params.a}x² {selectedShape2D.params.b >= 0 ? '+' : ''} {selectedShape2D.params.b}x {selectedShape2D.params.c >= 0 ? '+' : ''} {selectedShape2D.params.c}</span>
            </div>
            {selectedShape2D.params.a !== 0 && (
              <div style={{ marginTop: '5px', padding: '8px', background: '#111', borderRadius: '4px', fontSize: '0.8em', color: '#888', textAlign: 'center' }}>
                Uchlik: x = {(-selectedShape2D.params.b / (2 * selectedShape2D.params.a)).toFixed(2)}
              </div>
            )}
            <button onClick={() => removeShape(selectedShape2D.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>O'chirish</button>
          </div>
        )}

        {/* --- GIPERBOLA 2D --- */}
        {selectedShape2D && selectedShape2D.type === 'hyperbola2d' && (
          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>Giperbola Sozlamalari</h3>
            <p style={{ fontSize: '0.8em', color: '#888', margin: '0 0 10px' }}>y = k/(x+b) + c</p>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Matn (title)</label>
              <input type="text" value={selectedShape2D.params.title || ''} onChange={e => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'hyperbola2d' ? { ...shape, params: { ...shape.params, title: e.target.value } } : shape))} style={{ width: '100%', padding: '6px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>k (koeffitsiyent) = {selectedShape2D.params.k}</label>
              <ScrollNumberInput value={selectedShape2D.params.k} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'hyperbola2d' ? { ...shape, params: { ...shape.params, k: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>b (gorizontal siljish) = {selectedShape2D.params.b}</label>
              <ScrollNumberInput value={selectedShape2D.params.b} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'hyperbola2d' ? { ...shape, params: { ...shape.params, b: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>c (vertikal siljish) = {selectedShape2D.params.c}</label>
              <ScrollNumberInput value={selectedShape2D.params.c} step={0.1} onChange={v => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'hyperbola2d' ? { ...shape, params: { ...shape.params, c: v } } : shape))} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.8em', color: '#aaa', marginBottom: '5px' }}>Rang</label>
              <input type="color" value={selectedShape2D.params.color} onChange={e => setShapes2D(shapes2D.map(shape => shape.id === selectedShape2D.id && shape.type === 'hyperbola2d' ? { ...shape, params: { ...shape.params, color: e.target.value } } : shape))} style={{ width: '100%', height: '30px', border: 'none', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#000', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}>
              <span style={{ color: selectedShape2D.params.color }}>y = {selectedShape2D.params.k}/(x{selectedShape2D.params.b >= 0 ? '+' : ''}{selectedShape2D.params.b}) {selectedShape2D.params.c >= 0 ? '+' : ''} {selectedShape2D.params.c}</span>
            </div>
            <div style={{ marginTop: '5px', padding: '8px', background: '#111', borderRadius: '4px', fontSize: '0.8em', color: '#888', textAlign: 'center' }}>
              Asimptotalar: x = {-selectedShape2D.params.b}, y = {selectedShape2D.params.c}
            </div>
            <button onClick={() => removeShape(selectedShape2D.id)} style={{ width: '100%', padding: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>O'chirish</button>
          </div>
        )}

      </div>

    </div>
  );
};

export default Result;