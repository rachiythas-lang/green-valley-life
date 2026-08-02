import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import api from '../services/api';
import GameUI from '../components/GameUI';
import Tutorial from '../components/Tutorial';
import { createGame } from '../game/createGame';
import { sfx, startBgm, stopBgm, setMuted, isMuted } from '../utils/sound';

export default function GamePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const user = useAuthStore((s) => s.user);
  const [farm, setFarm] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<'hoe' | 'seed' | 'water' | 'hand' | 'fertilizer'>('hand');
  const [selectedSeed, setSelectedSeed] = useState('tomato');
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [soundOn, setSoundOn] = useState(!isMuted());
  const farmPlotKey = farm?.plots?.length ?? 0;

  // โหลดฟาร์ม
  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/api/farm');
        setFarm(data.farm);
        const me = await api.get('/api/auth/me');
        setInventory(me.data.user.inventory || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        if (!localStorage.getItem('gvl-tutorial-done')) {
          setShowTutorial(true);
        } else {
          startBgm();
        }
      }
    }
    load();
    return () => stopBgm();
  }, []);

  // Auto-save ทุก 30 วินาที
  useEffect(() => {
    if (!farm) return;
    const id = setInterval(async () => {
      try {
        await api.post('/api/farm/save');
        setLastSaved(new Date());
      } catch {}
    }, 30_000);
    return () => clearInterval(id);
  }, [farm]);

  // Socket
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    socket.on('players:list', (list) => setOnlinePlayers(list));
    socket.on('player:joined', (p) => {
      setOnlinePlayers((prev) => [...prev.filter((x) => x.userId !== p.userId), p]);
    });
    socket.on('player:left', ({ userId }) => {
      setOnlinePlayers((prev) => prev.filter((x) => x.userId !== userId));
    });
    socket.on('player:moved', (data) => {
      setOnlinePlayers((prev) =>
        prev.map((p) => (p.userId === data.userId ? { ...p, x: data.x, y: data.y } : p))
      );
    });
    socket.on('chat:message', (msg) => {
      setChatMessages((prev) => [...prev.slice(-49), msg]);
    });
    socket.on('farm:plot-updated', ({ plot }) => {
      setFarm((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          plots: prev.plots.map((p: any) => (p.id === plot.id ? plot : p)),
        };
      });
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  // สร้าง Phaser Game
  useEffect(() => {
    if (!containerRef.current || !farm || gameRef.current) return;

    const game = createGame(containerRef.current, {
      farm,
      user,
      onPlotClick: handlePlotClick,
      onPlayerMove: (x, y) => {
        getSocket()?.emit('player:move', { x, y });
      },
    });
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, [farm?.id, farmPlotKey]);

  const handlePlotClick = useCallback(async (x: number, y: number) => {
    if (!farm) return;
    try {
      let res;
      if (selectedTool === 'hoe') {
        sfx.till();
        res = await api.post('/api/farm/till', { x, y });
      } else if (selectedTool === 'seed') {
        sfx.plant();
        res = await api.post('/api/farm/plant', { x, y, cropType: selectedSeed });
        if (res?.data?.plot) {
          const scene = gameRef.current?.scene.getScene('FarmScene') as any;
          scene?.showFloat?.(100 + x * 64 + 32, 200 + y * 64, '🌱', '#69F0AE');
        }
      } else if (selectedTool === 'water') {
        sfx.water();
        res = await api.post('/api/farm/water', { x, y });
      } else if (selectedTool === 'fertilizer') {
        sfx.plant();
        res = await api.post('/api/farm/fertilize', { x, y });
        if (res?.data?.plot) sfx.success();
      } else if (selectedTool === 'hand') {
        res = await api.post('/api/farm/harvest', { x, y });
        if (res.data.harvested) {
          sfx.harvest();
          const me = await api.get('/api/auth/me');
          setInventory(me.data.user.inventory || []);
          const scene = gameRef.current?.scene.getScene('FarmScene') as any;
          if (scene?.showFloat) {
            const wx = 100 + x * 64 + 32;
            const wy = 200 + y * 64;
            scene.showFloat(wx, wy, `+${res.data.harvested.quantity} 🥬`, '#C6FF00');
            scene.showFloat(wx, wy - 20, '+10 EXP', '#FFD54F');
          }
        } else {
          sfx.click();
        }
      }

      if (res?.data?.plot) {
        setFarm((prev: any) => ({
          ...prev,
          plots: prev.plots.map((p: any) =>
            p.x === x && p.y === y ? res.data.plot : p
          ),
        }));
        getSocket()?.emit('farm:plot-update', { plot: res.data.plot });

        // อัปเดต sprite ใน Phaser
        const scene = gameRef.current?.scene.getScene('FarmScene') as any;
        if (scene?.updatePlot) scene.updatePlot(res.data.plot);
      }
    } catch (e: any) {
      sfx.error();
      console.warn(e.response?.data?.error || e.message);
    }
  }, [farm, selectedTool, selectedSeed]);

  // อัปเดต callback ใน registry เมื่อ tool เปลี่ยน
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.registry.set('onPlotClick', handlePlotClick);
    }
  }, [handlePlotClick]);

  const sendChat = (content: string) => {
    getSocket()?.emit('chat:message', { content, roomId: 'global' });
  };

  const refreshData = async () => {
    try {
      const me = await api.get('/api/auth/me');
      setInventory(me.data.user.inventory || []);
      const { data } = await api.get('/api/farm');
      setFarm(data.farm);
    } catch {}
  };

  const manualSave = async () => {
    try {
      await api.post('/api/farm/save');
      setLastSaved(new Date());
      sfx.success();
    } catch {
      sfx.error();
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setMuted(!next);
    if (next) startBgm();
    else stopBgm();
    sfx.click();
  };

  const onTutorialFinish = () => {
    setShowTutorial(false);
    startBgm();
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-primary-100">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">🌱</div>
          <p className="font-bold text-primary-700">กำลังโหลดฟาร์ม...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <GameUI
        user={user}
        farm={farm}
        inventory={inventory}
        onlinePlayers={onlinePlayers}
        chatMessages={chatMessages}
        selectedTool={selectedTool}
        setSelectedTool={(t) => { sfx.click(); setSelectedTool(t); }}
        selectedSeed={selectedSeed}
        setSelectedSeed={(s) => { sfx.click(); setSelectedSeed(s); }}
        onSendChat={sendChat}
        onRefresh={refreshData}
        lastSaved={lastSaved}
        onManualSave={manualSave}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />
      {showTutorial && <Tutorial onFinish={onTutorialFinish} />}
    </div>
  );
}
