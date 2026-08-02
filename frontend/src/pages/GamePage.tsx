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
  const [farm, setFarm] = useState<any>(null);
  const [world, setWorld] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [tool, setTool] = useState<'hoe' | 'seed' | 'water' | 'hand'>('hoe');
  const [seed, setSeed] = useState('tomato');
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    (async () => {
      try {
        const [farmRes, worldRes, meRes] = await Promise.all([
          api.get('/api/farm'),
          api.get('/api/world/state'),
          api.get('/api/auth/me'),
        ]);
        // ensure animals exist
        try { await api.get('/api/animal'); } catch {}
        const farm2 = await api.get('/api/farm');
        setFarm(farm2.data.farm);
        setWorld(worldRes.data);
        setInventory(meRes.data.user.inventory || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = async () => {
    try {
      const me = await api.get('/api/auth/me');
      setInventory(me.data.user.inventory || []);
      const f = await api.get('/api/farm');
      setFarm(f.data.farm);
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
          setFarm((prev: any) => ({
            ...prev,
            plots: prev.plots.map((p: any) => (p.x === x && p.y === y ? res.data.plot : p)),
          }));
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
    if (id === 'mint') showToast('คลิกร้าน 🏪 ด้านซ้ายเพื่อซื้อของ');
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
  }, [farm?.id, world]);

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
