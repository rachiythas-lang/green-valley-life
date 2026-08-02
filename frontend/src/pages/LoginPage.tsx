import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

type Mode = 'login' | 'register' | 'guest';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { login, register, loginGuest, loading } = useAuthStore();
  const navigate = useNavigate();

  const goGame = (data?: any) => {
    if (data?.morningBonus) {
      sessionStorage.setItem('gvl-morning-msg', data.morningBonus.message);
    }
    if (data?.user?.role === 'admin') {
      navigate('/admin');
      return;
    }
    navigate('/game');
  };

  const submit = async () => {
    setError('');
    setInfo('');
    try {
      if (mode === 'login') {
        const data = await login(email, password);
        if (data?.isMorning) setInfo('สวัสดีตอนเช้า! บันทึกการเข้าใช้งานแล้ว ☀️');
        goGame(data);
      } else if (mode === 'register') {
        await register(email, password, displayName);
        goGame();
      } else {
        await loginGuest(displayName || undefined);
        goGame();
      }
    } catch (e: any) {
      const msg =
        e.response?.data?.error ||
        (e.code === 'ERR_NETWORK' || !e.response
          ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจว่า backend รันที่ :3001'
          : 'เกิดข้อผิดพลาด');
      setError(msg);
    }
  };

  return (
    <div
      className="min-h-full w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #81D4FA 0%, #81D4FA 35%, #8BC34A 35%, #8BC34A 100%)',
        imageRendering: 'pixelated',
      }}
    >
      {/* เมฆพิกเซล */}
      <div className="absolute top-8 left-10 w-20 h-10 bg-white/80 rounded-sm" style={{ boxShadow: '16px 4px 0 white, 32px 0 0 white' }} />
      <div className="absolute top-16 right-16 w-16 h-8 bg-white/70 rounded-sm" />

      {/* ต้นไม้ซ้ายขวา */}
      <div className="absolute bottom-32 left-6 text-6xl opacity-90">🌳</div>
      <div className="absolute bottom-28 right-8 text-5xl opacity-90">🌸</div>
      <div className="absolute bottom-40 left-24 text-4xl">🌻</div>

      <div className="panel-cream p-6 w-[92%] max-w-sm z-10 relative">
        <div className="text-center mb-5">
          <div className="text-5xl mb-2">🏡</div>
          <h1 className="text-pixel-title text-[13px] leading-relaxed text-pixel-dark">
            GREEN VALLEY
          </h1>
          <p className="font-cute font-bold text-pixel-woodDark text-sm mt-2">
            สร้างหมู่บ้านของคุณ!
          </p>
        </div>

        {/* แท็บ */}
        <div className="flex gap-1 mb-4">
          {([
            ['login', 'เข้าสู่ระบบ'],
            ['register', 'สมัคร'],
            ['guest', 'Guest'],
          ] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 text-xs font-cute font-bold border-2 border-pixel-woodDark ${
                mode === m ? 'bg-pixel-green text-white' : 'bg-white text-pixel-woodDark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {(mode === 'register' || mode === 'guest') && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="ชื่อในเกม"
              maxLength={16}
              className="w-full px-3 py-2.5 border-2 border-pixel-woodDark font-cute font-bold text-sm outline-none focus:bg-yellow-50"
            />
          )}
          {(mode === 'login' || mode === 'register') && (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="อีเมล"
                className="w-full px-3 py-2.5 border-2 border-pixel-woodDark font-cute font-bold text-sm outline-none focus:bg-yellow-50"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
                className="w-full px-3 py-2.5 border-2 border-pixel-woodDark font-cute font-bold text-sm outline-none focus:bg-yellow-50"
              />
            </>
          )}

          {error && (
            <p className="text-red-600 text-xs font-cute font-bold text-center bg-red-50 border-2 border-red-300 py-1">
              {error}
            </p>
          )}
          {info && (
            <p className="text-pixel-dark text-xs font-cute font-bold text-center bg-yellow-100 border-2 border-pixel-gold py-1">
              {info}
            </p>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="btn-pixel-green w-full py-3 text-sm disabled:opacity-60"
          >
            {loading ? '...' : mode === 'login' ? 'เข้าเล่น 🌱' : mode === 'register' ? 'สมัคร & เล่น' : 'เล่นเลย (Guest)'}
          </button>
        </div>

        <p className="text-[10px] text-center text-pixel-woodDark/70 font-cute mt-4 leading-relaxed">
          เข้าใช้ตอนเช้า (05:00–12:00) ได้โบนัส + บันทึกลงชีต
        </p>
      </div>

      {/* ป้ายไม้ล่าง */}
      <div className="panel-wood mt-4 px-6 py-2 z-10">
        <p className="font-cute font-extrabold text-white text-sm tracking-wide">
          ⭐ Pixel Cozy Farm ⭐
        </p>
      </div>
    </div>
  );
}
