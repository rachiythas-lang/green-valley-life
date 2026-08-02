import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import { createGame } from '../game/createGame';
import GameHUD from '../components/GameHUD';

export default function GamePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const user = useAuthStore((s) => s.user);
  const loginStreak = useAuthStore((s) => s.loginStreak);
  const morningBonus = useAuthStore((s) => s.morningBonus);
  const logout = useAuthStore((s) => s.logout);
  const [farm, setFarm] = useState<any>(null);
  const [world, setWorld] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [tool, setTool] = useState<'hoe' | 'seed' | 'water' | 'hand'>('hoe');
  const [seed, setSeed] = useState('tomato');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState('');
  const [banner, setBanner] = useState('');

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2200);
  };

  useEffect(() => {
    const msg = sessionStorage.getItem('gvl-morning-msg') || morningBonus?.message;
    if (msg) {
      setBanner(msg);
      sessionStorage.removeItem('gvl-morning-msg');
      setTimeout(() => setBanner(''), 5000);
    }
  }, []);

  const loadGame = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const meRes = await api.get('/api/auth/me');
      setInventory(meRes.data.user?.inventory || []);

      // world อาจ fail — ใช้ค่า default
      let worldData: any = {
        weather: 'sunny',
        timeOfDay: 'morning',
        npcs: [
          { id: 'mint', name: 'มิ้นท์', x: 620, y: 280, lines: ['สวัสดีจ้า!'] },
          { id: 'uncle_fish', name: 'ลุงปลา', x: 980, y: 460, lines: ['ลองตกปลาสิ'] },
        ],
      };
      try {
        const w = await api.get('/api/world/state');
        worldData = w.data;
      } catch {}

      try {
        await api.get('/api/animal');
      } catch {}

      const farmRes = await api.get('/api/farm');
      if (!farmRes.data?.farm) {
        throw new Error('ไม่พบข้อมูลฟาร์ม');
      }
      setFarm(farmRes.data.farm);
      setWorld(worldData);
    } catch (e: any) {
      console.error(e);
      const msg =
        e.response?.data?.error ||
        (e.code === 'ERR_NETWORK' || !e.response
          ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (backend ต้องรันที่พอร์ต 3001)'
          : e.message || 'โหลดเกมไม่สำเร็จ');
      setLoadError(msg);
      setFarm(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  const refresh = async () => {
    try {
      const me = await api.get('/api/auth/me');
      setInventory(me.data.user?.inventory || []);
      const f = await api.get('/api/farm');
      if (f.data?.farm) setFarm(f.data.farm);
    } catch {}
  };

  const handlePlotClick = useCallback(
    async (x: number, y: number) => {
      try {
        let res: any;
        if (tool === 'hoe') res = await api.post('/api/farm/till', { x, y });
        else if (tool === 'seed') res = await api.post('/api/farm/plant', { x, y, cropType: seed });
        else if (tool === 'water') res = await api.post('/api/farm/water', { x, y });
        else {
          res = await api.post('/api/farm/harvest', { x, y });
          if (res.data.harvested) {
            showToast(`เก็บ +${res.data.harvested.quantity}!`);
            await refresh();
            const scene = gameRef.current?.scene.getScene('FarmScene') as any;
            scene?.showFloat?.(80 + x * 48 + 24, 180 + y * 48, `+${res.data.harvested.quantity}`, '#C6FF00');
          }
        }
        if (res?.data?.plot) {
          setFarm((prev: any) =>
            prev
              ? {
                  ...prev,
                  plots: prev.plots.map((p: any) => (p.x === x && p.y === y ? res.data.plot : p)),
                }
              : prev
          );
          const scene = gameRef.current?.scene.getScene('FarmScene') as any;
          scene?.updatePlot?.(res.data.plot);
        }
      } catch (e: any) {
        showToast(e.response?.data?.error || 'ทำไม่ได้');
      }
    },
    [tool, seed]
  );

  const handleNpcClick = useCallback(async (id: string) => {
    if (id === 'mint') showToast('เปิดร้าน 🏪 ด้านซ้ายเพื่อซื้อของ');
    if (id === 'uncle_fish') showToast('คลิกบ่อน้ำเพื่อตกปลา 🎣');
  }, []);

  const handleAnimalClick = useCallback(async (id: string) => {
    try {
      const { data } = await api.post(`/api/animal/collect/${id}`);
      showToast(`เก็บ ${data.product} ได้!`);
      await refresh();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'ยังไม่พร้อมเก็บ');
    }
  }, []);

  const handlePondClick = useCallback(async () => {
    try {
      const { data } = await api.post('/api/fishing/cast');
      if (data.caught) showToast(`จับได้ ${data.result.nameTh}! 🐟`);
      else showToast(`ได้ ${data.result.nameTh}...`);
      await refresh();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'ตกปลาไม่ได้');
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !farm || !world || gameRef.current) return;
    const game = createGame(containerRef.current, {
      farm,
      user,
      world,
      onPlotClick: handlePlotClick,
      onNpcClick: handleNpcClick,
      onAnimalClick: handleAnimalClick,
      onPondClick: handlePondClick,
    });
    gameRef.current = game;
    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [farm?.id, !!world]);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.registry.set('onPlotClick', handlePlotClick);
      gameRef.current.registry.set('onNpcClick', handleNpcClick);
      gameRef.current.registry.set('onAnimalClick', handleAnimalClick);
      gameRef.current.registry.set('onPondClick', handlePondClick);
    }
  }, [handlePlotClick, handleNpcClick, handleAnimalClick, handlePondClick]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-pixel-grass">
        <div className="panel-cream px-8 py-6 text-center">
          <div className="text-4xl mb-2 animate-bounce">🏡</div>
          <p className="font-cute font-extrabold text-pixel-dark">กำลังโหลดหมู่บ้าน...</p>
        </div>
      </div>
    );
  }

  if (loadError || !farm) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-pixel-grass p-4">
        <div className="panel-cream px-6 py-6 text-center max-w-sm w-full">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="font-cute font-extrabold text-pixel-dark mb-2">เข้าเกมไม่สำเร็จ</p>
          <p className="font-cute text-xs text-pixel-woodDark mb-4 leading-relaxed">{loadError || 'ไม่พบฟาร์ม'}</p>
          <div className="flex flex-col gap-2">
            <button onClick={loadGame} className="btn-pixel-green w-full py-2.5 text-sm">
              ลองใหม่
            </button>
            <button
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="btn-pixel-cream w-full py-2.5 text-sm"
            >
              กลับหน้าล็อกอิน
            </button>
          </div>
          <p className="text-[10px] text-pixel-woodDark/70 mt-4 font-cute leading-relaxed">
            ตรวจว่า backend รัน: <code>cd backend && npm run dev</code>
            <br />
            และ DB พร้อม: <code>npx prisma db push</code>
          </p>
        </div>
      </div>
    );
  }

  const coins = inventory.find((i) => i.itemId === 'coin')?.quantity || 0;

  return (
    <div className="h-full w-full relative overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

      {banner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 panel-cream px-4 py-2 border-4 border-pixel-gold">
          <p className="font-cute font-extrabold text-sm text-pixel-dark">{banner}</p>
        </div>
      )}

      {toast && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 hud-bar px-4 py-1.5">
          <p className="font-cute font-extrabold text-sm text-pixel-woodDark">{toast}</p>
        </div>
      )}

      <GameHUD
        user={user}
        coins={coins}
        energy={user?.character?.energy ?? 100}
        level={user?.character?.level ?? 1}
        loginStreak={loginStreak}
        tool={tool}
        setTool={setTool}
        seed={seed}
        setSeed={setSeed}
        inventory={inventory}
        weather={world?.weather}
        timeOfDay={world?.timeOfDay}
        onRefresh={refresh}
        onToast={showToast}
      />
    </div>
  );
}
