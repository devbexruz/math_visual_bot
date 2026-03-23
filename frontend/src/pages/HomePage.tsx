import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listWorkspaces, deleteWorkspaceAPI, generateAI, type Workspace, type User } from '../utils/api';
import './IconStyles.css';
import { Footer } from '../components/Footer';

const TELEGRAM_BOT_URL = 'https://t.me/MathVisualBot';

interface HomePageProps {
  user: User | null;
}

const HomePage: React.FC<HomePageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [worlds, setWorlds] = useState<Workspace[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // API dan olamlarni yuklash
  useEffect(() => {
    if (!user) return;
    listWorkspaces()
      .then(ws => setWorlds(ws))
      .catch(() => { /* xato */ });
  }, [user]);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError('');
    try {
      const res = await generateAI(prompt.trim());
      setWorlds(prev => [res.workspace, ...prev]);
      setPrompt('');
      navigate(`/world/${res.workspace.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteWorld = async (id: number) => {
    try {
      await deleteWorkspaceAPI(id);
      setWorlds(prev => prev.filter(w => w.id !== id));
    } catch { /* xato */ }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: 'white', fontFamily: 'sans-serif' }}>

      {/* ===== NAVBAR ===== */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid #1a1a1a',
        position: 'sticky', top: 0, background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(12px)', zIndex: 50
      }}>
        {/* Chap tomon: Logo + Nomi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="./icon.svg" className="shifted-colors" alt="icon" style={{
            width: '40px',
            height: '40px'
          }} />
          <span style={{
            fontSize: '1.15em', fontWeight: 700, letterSpacing: '-0.3px',
            background: 'linear-gradient(90deg, #00ddff, #aa44ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Math Visual AI
          </span>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <div style={{ padding: '50px 20px 20px', textAlign: 'center' }}>
        <h1 style={{ padding: '2dvh', fontSize: 'clamp(1.5em, 4vw, 2.5em)', margin: 0, background: 'linear-gradient(90deg, #00ddff, #aa44ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Matematik olamlarni vizualizatsiya qiling
        </h1>
        <p style={{ color: '#888', marginTop: '10px', fontSize: 'clamp(0.85em, 2vw, 1em)', maxWidth: '600px', margin: '10px auto 0' }}>
          Telegram botga matn yoki ovozli xabar yuboring — AI shakllarni yaratadi, inline tugma orqali darhol ko'ring
        </p>
      </div>

      {user ? (
        <>
          {/* ===== OLAMLAR RO'YXATI ===== */}
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        <h2 style={{ color: '#aaa', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '15px' }}>
          Mening olamlarim ({worlds.length})
        </h2>

        {worlds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🌌</div>
            <p style={{ fontSize: '1.1em' }}>Hali olam yaratilmagan</p>
            <p style={{ fontSize: '0.9em' }}>Pastdagi maydonga yozing — AI olam yaratadi</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '15px' }}>
            {worlds.map(w => (
              <div
                key={w.id}
                style={{
                  background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '20px',
                  cursor: 'pointer', transition: '0.2s', position: 'relative'
                }}
                onClick={() => navigate(`/world/${w.id}`)}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#00ddff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#333'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7em', fontWeight: 'bold',
                      background: w.workspace_type === '2D' ? 'rgba(170,68,255,0.15)' : 'rgba(0,221,255,0.15)',
                      color: w.workspace_type === '2D' ? '#aa44ff' : '#00ddff',
                      marginBottom: '8px'
                    }}>
                      {w.workspace_type}
                    </span>
                    <h3 style={{ margin: '5px 0', fontSize: '1.1em' }}>{w.name}</h3>
                    {w.description && (
                      <p style={{ margin: '4px 0 0', color: '#777', fontSize: '0.82em', lineHeight: 1.4 }}>
                        {w.description.length > 80 ? w.description.slice(0, 80) + '…' : w.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteWorld(w.id); }}
                    style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1.2em', padding: '4px' }}
                    title="O'chirish"
                  >
                    ✕
                  </button>
                </div>
                <div style={{ color: '#666', fontSize: '0.8em', marginTop: '8px' }}>
                  {w.shapes_count} ta shakl · {new Date(w.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

          {/* ===== AI CHAT INPUT (pastda, sticky) ===== */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(5,5,5,0.98) 60%, rgba(5,5,5,0))',
            padding: '32px 20px 20px', zIndex: 50,
            pointerEvents: 'none',
          }}>
            <div style={{
              maxWidth: '700px', margin: '0 auto',
              background: 'rgba(17,17,17,0.95)', backdropFilter: 'blur(16px)',
              border: '1px solid #2a2a2a', borderRadius: '20px',
              padding: '18px 20px',
              boxShadow: '0 -4px 40px rgba(0,221,255,0.08), 0 0 80px rgba(170,68,255,0.05), 0 8px 32px rgba(0,0,0,0.6)',
              pointerEvents: 'auto',
            }}>
              <p style={{ margin: '0 0 12px', color: '#777', fontSize: '0.82em', textAlign: 'center', letterSpacing: '0.3px' }}>
                ✨ Nimani vizual ko'rishni istaysiz?
              </p>
              {error && (
                <p style={{ margin: '0 0 10px', color: '#ff4444', fontSize: '0.82em', textAlign: 'center' }}>{error}</p>
              )}
              <div style={{ display: 'flex', gap: isMobile ? '8px' : '10px', alignItems: 'flex-end' }}>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder="Masalan: Giperboloid va ellipsoidni chiz..."
                  rows={isMobile ? 2 : 2}
                  disabled={generating}
                  style={{
                    flex: 1, padding: isMobile ? '12px 14px' : '14px 18px', background: '#0a0a0a', color: 'white',
                    border: '1px solid #333', borderRadius: isMobile ? '12px' : '14px', fontSize: isMobile ? '1em' : '0.95em',
                    resize: 'none', fontFamily: 'sans-serif', outline: 'none',
                    minHeight: isMobile ? '52px' : '56px', maxHeight: '140px', lineHeight: 1.5,
                    opacity: generating ? 0.5 : 1,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#00ddff44'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,221,255,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                  style={{
                    padding: isMobile ? '0' : '14px 28px',
                    width: isMobile ? '48px' : 'auto',
                    height: isMobile ? '48px' : 'auto',
                    borderRadius: isMobile ? '50%' : '14px', border: 'none',
                    fontWeight: 'bold', fontSize: isMobile ? '1.3em' : '0.95em',
                    cursor: prompt.trim() && !generating ? 'pointer' : 'not-allowed',
                    background: prompt.trim() && !generating ? 'linear-gradient(135deg, #00ddff, #0088ff)' : '#1a1a1a',
                    color: prompt.trim() && !generating ? '#000' : '#555',
                    transition: '0.2s', whiteSpace: 'nowrap',
                    boxShadow: prompt.trim() && !generating ? '0 4px 20px rgba(0,221,255,0.25)' : 'none',
                    minHeight: isMobile ? '48px' : '56px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {generating
                    ? (isMobile ? '⏳' : '⏳ Yaratilmoqda...')
                    : (isMobile ? '➤' : '✨ Yaratish')}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ===== LANDING: BEPUL BOSHLASH CTA ===== */}
          <div style={{ textAlign: 'center', padding: '30px 20px 50px' }}>
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', padding: '16px 40px', fontSize: '1.15em', fontWeight: 'bold',
                background: 'linear-gradient(135deg, #00ddff, #0088ff)', color: '#000',
                border: 'none', borderRadius: '12px', textDecoration: 'none',
                boxShadow: '0 4px 25px rgba(0,221,255,0.3)', transition: '0.2s'
              }}
            >
              Bepul boshlash →
            </a>
            <p style={{ color: '#555', fontSize: '0.85em', marginTop: '12px' }}>Telegram botga matn yoki ovozli xabar yuboring — AI shakllarni yaratadi</p>
          </div>

          {/* ===== SECTION 1: Nima bu? ===== */}
          <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.6em', margin: '0 0 14px', color: '#fff' }}>
                  Yozing yoki gapiring — <span style={{ color: '#00ddff' }}>shaklni ko'ring</span>
                </h2>
                <p style={{ color: '#999', lineHeight: 1.7, fontSize: '0.95em' }}>
                  Math Visual AI — Telegram bot orqali ishlaydi. Botga matematik shakl haqida matn yozing
                  yoki ovozli xabar yuboring — AI sizning so'rovingizni tushunib, kerakli shakllarni yaratadi.
                  Inline tugmani bosing — vizualizatsiya darhol brauzerda ochiladi.
                  Barcha olamlaringiz serverda saqlanadi — istalgan qurilmadan kirishingiz mumkin.
                </p>
              </div>
              <div style={{
                background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '16px',
                padding: '40px', textAlign: 'center', minHeight: '200px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ fontSize: '4em', lineHeight: 1 }}>
                  <span style={{ color: '#00ddff' }}>∑</span>
                  <span style={{ color: '#aa44ff', marginLeft: '8px' }}>∫</span>
                  <span style={{ color: '#ffbb00', marginLeft: '8px' }}>π</span>
                </div>
              </div>
            </div>
          </section>

          {/* ===== SECTION 2: Imkoniyatlar ===== */}
          <section style={{ background: '#0a0a0a', padding: '70px 20px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <h2 style={{ textAlign: 'center', fontSize: '1.5em', marginBottom: '40px' }}>
                <span style={{ background: 'linear-gradient(90deg, #00ddff, #aa44ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Asosiy imkoniyatlar
                </span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                {[
                  { icon: '💬', title: 'Matn bilan chat', desc: 'Telegram botga so\'rovingizni yozing — AI matematik shakllarni bir zumda yaratadi' },
                  { icon: '🎙️', title: 'Ovozli xabar', desc: 'Matn yozishning hojati yo\'q — ovozli xabar yuboring, AI gapingizni tushunadi va shakllarni yaratadi' },
                  { icon: '🔘', title: 'Inline tugma', desc: 'Chatda "Ko\'rish" tugmasini bosing — vizualizatsiya brauzerda darhol ochiladi' },
                  { icon: '🌐', title: '3D va 2D', desc: 'Giperboloid, ellipsoid, paraboloid, konus, ellips, parabola — 14+ shakl' },
                  { icon: '⚡', title: 'Real vaqt', desc: 'Parametrlarni o\'zgartiring — shakl darhol yangilanadi, hech narsa kutmaysiz' },
                  { icon: '🎨', title: 'Rang va stil', desc: 'Har bir shaklga rang bering, nomlab, o\'zingizning olamingizni yarating' },
                  { icon: '☁️', title: 'Bulutda saqlash', desc: 'Barcha olamlaringiz serverda saqlanadi — istalgan qurilmadan kiring' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px',
                    padding: '24px', transition: '0.2s'
                  }}>
                    <div style={{ fontSize: '2em', marginBottom: '12px' }}>{item.icon}</div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.05em', color: '#eee' }}>{item.title}</h3>
                    <p style={{ margin: 0, color: '#777', fontSize: '0.88em', lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== SECTION 3: Qanday ishlaydi? ===== */}
          <section style={{ maxWidth: '800px', margin: '0 auto', padding: '70px 20px' }}>
            <h2 style={{ textAlign: 'center', fontSize: '1.5em', marginBottom: '40px' }}>
              <span style={{ background: 'linear-gradient(90deg, #00ddff, #aa44ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Qanday ishlaydi?
              </span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                { step: '01', title: 'Telegram botni oching', desc: '@MathVisualBot ga /start bosing — bepul ro\'yxatdan o\'ting' },
                { step: '02', title: 'AI bilan chatlashing', desc: '"Giperboloid chiz" deb yozing yoki ovozli xabar yuboring — AI tushunadi' },
                { step: '03', title: '"Ko\'rish" tugmasini bosing', desc: 'Bot javobidagi inline tugma orqali vizualizatsiya brauzerda ochiladi' },
                { step: '04', title: 'Parametrlarni sozlang', desc: 'Brauzerda a, b, c koeffitsiyentlarni o\'zgartiring — shakl jonlanadi' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{
                    minWidth: '48px', height: '48px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(0,221,255,0.15), rgba(170,68,255,0.15))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1em', fontWeight: 700, color: '#00ddff'
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05em', color: '#eee' }}>{item.title}</h3>
                    <p style={{ margin: 0, color: '#777', fontSize: '0.9em', lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== SECTION 4: Qo'llab-quvvatlanadigan shakllar ===== */}
          <section style={{ background: '#0a0a0a', padding: '70px 20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <h2 style={{ textAlign: 'center', fontSize: '1.5em', marginBottom: '40px' }}>
                <span style={{ background: 'linear-gradient(90deg, #00ddff, #aa44ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Qo'llab-quvvatlanadigan shakllar
                </span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {[
                  { name: 'Ikki pallali giperboloid', eq: '-x²/A² - y²/B² + z²/C² = 1', color: '#00ddff' },
                  { name: 'Bir pallali giperboloid', eq: 'x²/a² + y²/b² - z²/c² = 1', color: '#ff6600' },
                  { name: 'Ellipsoid', eq: 'x²/a² + y²/b² + z²/c² = 1', color: '#ffbb00' },
                  { name: 'Elliptik paraboloid', eq: 'z = x²/a² + y²/b²', color: '#44ffaa' },
                  { name: 'Giperbolik paraboloid', eq: 'z = x²/a² - y²/b²', color: '#ff44aa' },
                  { name: 'Konus', eq: 'x²/a² + y²/b² - z²/c² = 0', color: '#ffff00' },
                  { name: 'Ellips (2D)', eq: 'x²/a² + y²/b² = 1', color: '#ffbb00' },
                  { name: 'Parabola (2D)', eq: 'y = ax² + bx + c', color: '#44ff88' },
                  { name: 'Giperbola (2D)', eq: 'y = k/(x+b) + c', color: '#ff44aa' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px',
                    padding: '16px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.92em', fontWeight: 600, color: '#ddd', marginBottom: '6px' }}>{item.name}</div>
                    <code style={{ fontSize: '0.78em', color: item.color }}>{item.eq}</code>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== CTA FINAL ===== */}
          <section style={{ textAlign: 'center', padding: '70px 20px' }}>
            <h2 style={{ fontSize: '1.5em', marginBottom: '14px' }}>Hoziroq boshlaymizmi?</h2>
            <p style={{ color: '#777', marginBottom: '24px', fontSize: '0.95em' }}>Telegram botga matn yozing yoki ovozli xabar yuboring — matematik shakllarni vizualizatsiya qiling</p>
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', padding: '16px 40px', fontSize: '1.1em', fontWeight: 'bold',
                background: 'linear-gradient(135deg, #00ddff, #0088ff)', color: '#000',
                border: 'none', borderRadius: '12px', textDecoration: 'none',
                boxShadow: '0 4px 25px rgba(0,221,255,0.3)'
              }}
            >
              Bepul foydalanish →
            </a>
          </section>

        </>
      )}
      {/* ===== FOOTER ===== */}
      <Footer />
      {/* AI input uchun pastda bo'sh joy */}
      <div style={{ height: '160px' }} />
    </div>
  );
};

export default HomePage;