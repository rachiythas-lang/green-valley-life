import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [players, setPlayers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [announce, setAnnounce] = useState('');
  const [msg, setMsg] = useState('');
  const [giveUser, setGiveUser] = useState('');
  const [giveItem, setGiveItem] = useState('coin');
  const [giveQty, setGiveQty] = useState(100);

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/players'),
      ]);
      setStats(s.data);
      setPlayers(p.data.players || []);
    } catch (e: any) {
      setMsg(e.response?.data?.error || 'โหลดแอดมินไม่สำเร็จ');
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    load();
  }, [token]);

  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-full flex items-center justify-center bg-pixel-grass p-4">
        <div className="panel-cream p-6 text-center">
          <p className="font-cute font-extrabold text-pixel-dark">ไม่มีสิทธิ์แอดมิน</p>
          <button className="btn-pixel-green mt-3 px-4 py-2" onClick={() => navigate('/game')}>
            กลับเกม
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#2E7D32] p-4 overflow-auto">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="panel-cream p-4 flex justify-between items-center">
          <div>
            <h1 className="font-cute font-extrabold text-lg text-pixel-dark">🛠️ Admin Dashboard</h1>
            <p className="text-xs font-cute text-pixel-woodDark">{user?.email || user?.displayName}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-pixel-cream text-xs px-3 py-2" onClick={load}>รีเฟรช</button>
            <button className="btn-pixel-green text-xs px-3 py-2" onClick={() => navigate('/game')}>เข้าเกม</button>
          </div>
        </div>

        {msg && <div className="panel-cream p-2 text-xs font-cute text-red-700">{msg}</div>}

        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="panel-cream p-3 text-center">
              <p className="text-2xl font-extrabold font-cute">{stats.players}</p>
              <p className="text-[10px] font-cute">ผู้เล่น</p>
            </div>
            <div className="panel-cream p-3 text-center">
              <p className="text-2xl font-extrabold font-cute">{stats.plots}</p>
              <p className="text-[10px] font-cute">แปลงปลูก</p>
            </div>
            <div className="panel-cream p-3 text-center">
              <p className="text-2xl font-extrabold font-cute">{stats.animals}</p>
              <p className="text-[10px] font-cute">สัตว์</p>
            </div>
          </div>
        )}

        <div className="panel-cream p-4 space-y-2">
          <h2 className="font-cute font-extrabold text-sm">📢 ประกาศ</h2>
          <div className="flex gap-2">
            <input
              value={announce}
              onChange={(e) => setAnnounce(e.target.value)}
              className="flex-1 border-2 border-pixel-woodDark px-2 py-1.5 text-sm font-cute"
              placeholder="ข้อความประกาศ..."
            />
            <button
              className="btn-pixel-green text-xs px-3"
              onClick={async () => {
                try {
                  await api.post('/api/admin/announce', { message: announce });
                  setAnnounce('');
                  setMsg('ประกาศแล้ว');
                  load();
                } catch (e: any) {
                  setMsg(e.response?.data?.error || 'ล้มเหลว');
                }
              }}
            >
              ส่ง
            </button>
          </div>
          <ul className="text-[11px] font-cute space-y-1 max-h-24 overflow-y-auto">
            {(stats?.announcements || []).map((a: any) => (
              <li key={a.id} className="border-b border-pixel-woodDark/20 pb-1">
                {a.message} <span className="opacity-50">({a.at?.slice(0, 16)})</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel-cream p-4 space-y-2">
          <h2 className="font-cute font-extrabold text-sm">🎁 ให้ของ</h2>
          <div className="flex flex-wrap gap-2 items-center text-xs font-cute">
            <select
              value={giveUser}
              onChange={(e) => setGiveUser(e.target.value)}
              className="border-2 border-pixel-woodDark px-2 py-1"
            >
              <option value="">เลือกผู้เล่น</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
            <select value={giveItem} onChange={(e) => setGiveItem(e.target.value)} className="border-2 border-pixel-woodDark px-2 py-1">
              <option value="coin">เหรียญ</option>
              <option value="seed_tomato">เมล็ดมะเขือ</option>
              <option value="seed_carrot">เมล็ดแครอท</option>
              <option value="decor_bench">ม้านั่ง</option>
            </select>
            <input
              type="number"
              value={giveQty}
              onChange={(e) => setGiveQty(Number(e.target.value))}
              className="w-20 border-2 border-pixel-woodDark px-2 py-1"
            />
            <button
              className="btn-pixel-green px-3 py-1"
              onClick={async () => {
                if (!giveUser) return setMsg('เลือกผู้เล่น');
                try {
                  await api.post('/api/admin/give', { userId: giveUser, itemId: giveItem, quantity: giveQty });
                  setMsg('ให้ของแล้ว');
                  load();
                } catch (e: any) {
                  setMsg(e.response?.data?.error || 'ล้มเหลว');
                }
              }}
            >
              ให้
            </button>
          </div>
        </div>

        <div className="panel-cream p-4">
          <h2 className="font-cute font-extrabold text-sm mb-2">👥 ผู้เล่น</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {players.map((p) => (
              <div key={p.id} className="bg-white border-2 border-pixel-woodDark p-2 flex justify-between items-center gap-2">
                <div className="text-xs font-cute min-w-0">
                  <p className="font-extrabold truncate">
                    {p.displayName} {p.role === 'admin' && '⭐'}
                    {p.isBanned && <span className="text-red-600"> [แบน]</span>}
                  </p>
                  <p className="opacity-70 truncate">{p.email || '-'} · Lv.{p.level} · 💰{p.coins}</p>
                </div>
                {p.role !== 'admin' && (
                  <button
                    className={`text-[10px] px-2 py-1 border-2 border-pixel-woodDark font-cute font-bold ${
                      p.isBanned ? 'bg-pixel-green text-white' : 'bg-red-400 text-white'
                    }`}
                    onClick={async () => {
                      try {
                        await api.post('/api/admin/ban', { userId: p.id, ban: !p.isBanned });
                        load();
                      } catch (e: any) {
                        setMsg(e.response?.data?.error || 'ล้มเหลว');
                      }
                    }}
                  >
                    {p.isBanned ? 'ปลดแบน' : 'แบน'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
