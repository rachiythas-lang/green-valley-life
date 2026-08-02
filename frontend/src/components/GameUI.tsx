import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

interface Props {
  user: any;
  farm: any;
  inventory: any[];
  onlinePlayers: any[];
  chatMessages: any[];
  selectedTool: string;
  setSelectedTool: (t: any) => void;
  selectedSeed: string;
  setSelectedSeed: (s: string) => void;
  onSendChat: (msg: string) => void;
  onRefresh?: () => void;
  lastSaved?: Date | null;
  onManualSave?: () => void;
  soundOn?: boolean;
  onToggleSound?: () => void;
}

const TOOLS = [
  { id: 'hand', icon: '✋', label: 'เก็บ' },
  { id: 'hoe', icon: '🪓', label: 'ไถ' },
  { id: 'seed', icon: '🌱', label: 'ปลูก' },
  { id: 'water', icon: '💧', label: 'รดน้ำ' },
  { id: 'fertilizer', icon: '🌿', label: 'ปุ๋ย' },
];

const SEEDS = [
  { id: 'tomato', name: 'มะเขือเทศ', icon: '🍅' },
  { id: 'carrot', name: 'แครอท', icon: '🥕' },
  { id: 'wheat', name: 'ข้าวสาลี', icon: '🌾' },
  { id: 'potato', name: 'มันฝรั่ง', icon: '🥔' },
  { id: 'corn', name: 'ข้าวโพด', icon: '🌽' },
  { id: 'strawberry', name: 'สตรอว์เบอร์รี', icon: '🍓' },
];

const ANIMAL_EMOJI: Record<string, string> = {
  chicken: '🐔', cow: '🐄', pig: '🐷', sheep: '🐑', duck: '🦆', rabbit: '🐰',
};

type Panel = 'none' | 'inventory' | 'shop' | 'animals' | 'quests' | 'house' | 'ranking' | 'profile' | 'friends' | 'fishing' | 'farmmgmt' | 'mining' | 'craft';

export default function GameUI({
  user, farm, inventory, onlinePlayers, chatMessages,
  selectedTool, setSelectedTool, selectedSeed, setSelectedSeed,
  onSendChat, onRefresh, lastSaved, onManualSave, soundOn = true, onToggleSound,
}: Props) {
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [panel, setPanel] = useState<Panel>('none');
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [animalCatalog, setAnimalCatalog] = useState<any>({});
  const [quests, setQuests] = useState<any[]>([]);
  const [userQuests, setUserQuests] = useState<any[]>([]);
  const [house, setHouse] = useState<any>(null);
  const [furnitureCatalog, setFurnitureCatalog] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [rankType, setRankType] = useState<'level' | 'money' | 'farm'>('level');
  const [profile, setProfile] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [fishSpots, setFishSpots] = useState<any[]>([]);
  const [lastCatch, setLastCatch] = useState<any>(null);
  const [fishing, setFishing] = useState(false);
  const [mineZones, setMineZones] = useState<any[]>([]);
  const [lastMine, setLastMine] = useState<any>(null);
  const [mining, setMining] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [questPreview, setQuestPreview] = useState<any[]>([]);
  const [toast, setToast] = useState('');

  const coin = inventory.find((i) => i.itemId === 'coin')?.quantity || 0;
  const energy = user?.character?.energy ?? 100;

  useEffect(() => {
    api.get('/api/quest/daily').then((r) => {
      setQuestPreview((r.data.userQuests || []).filter((q: any) => q.status !== 'claimed').slice(0, 2));
    }).catch(() => {});
  }, [inventory]); // refresh when inventory changes roughly after actions

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const togglePanel = (p: Panel) => setPanel((prev) => (prev === p ? 'none' : p));

  // Load data when panel opens
  useEffect(() => {
    if (panel === 'shop') {
      api.get('/api/shop').then((r) => setShopItems(r.data.items)).catch(console.error);
    }
    if (panel === 'animals') {
      api.get('/api/animal').then((r) => {
        setAnimals(r.data.animals || []);
        setAnimalCatalog(r.data.catalog || {});
      }).catch(console.error);
    }
    if (panel === 'quests') {
      api.get('/api/quest/daily').then((r) => {
        setQuests(r.data.quests || []);
        setUserQuests(r.data.userQuests || []);
      }).catch(console.error);
    }
    if (panel === 'house') {
      api.get('/api/house').then((r) => {
        setHouse(r.data.house);
        setFurnitureCatalog(r.data.catalog || []);
      }).catch(console.error);
    }
    if (panel === 'ranking') {
      api.get(`/api/ranking/${rankType}`).then((r) => setRanking(r.data.ranking || [])).catch(console.error);
    }
    if (panel === 'profile') {
      api.get('/api/ranking/profile').then((r) => setProfile(r.data.profile)).catch(console.error);
    }
    if (panel === 'friends') {
      api.get('/api/social/friends').then((r) => setFriends(r.data.friendships || [])).catch(console.error);
    }
    if (panel === 'fishing') {
      api.get('/api/fishing/spots').then((r) => setFishSpots(r.data.spots || [])).catch(console.error);
    }
    if (panel === 'mining') {
      api.get('/api/mining/zones').then((r) => setMineZones(r.data.zones || [])).catch(console.error);
    }
    if (panel === 'craft') {
      api.get('/api/craft/recipes').then((r) => setRecipes(r.data.recipes || [])).catch(console.error);
    }
  }, [panel, rankType]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const buyItem = async (itemId: string, qty = 1) => {
    try {
      const { data } = await api.post('/api/shop/buy', { itemId, quantity: qty });
      showToast(`ซื้อสำเร็จ! -${data.spent} 💰`);
      onRefresh?.();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'ซื้อไม่สำเร็จ');
    }
  };

  const sellItem = async (itemId: string, qty = 1) => {
    try {
      const { data } = await api.post('/api/shop/sell', { itemId, quantity: qty });
      showToast(`ขายสำเร็จ! +${data.earned} 💰`);
      onRefresh?.();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'ขายไม่สำเร็จ');
    }
  };

  const buyAnimal = async (type: string) => {
    try {
      const { data } = await api.post('/api/animal/buy', { type });
      showToast(`ซื้อ${type} สำเร็จ! -${data.cost} 💰`);
      setAnimals((prev) => [...prev, data.animal]);
      onRefresh?.();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'ซื้อสัตว์ไม่สำเร็จ');
    }
  };

  const feedAnimal = async (id: string) => {
    try {
      await api.post(`/api/animal/feed/${id}`);
      showToast('ให้อาหารแล้ว ❤️');
      const r = await api.get('/api/animal');
      setAnimals(r.data.animals || []);
      onRefresh?.();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'ให้อาหารไม่สำเร็จ');
    }
  };

  const collectAnimal = async (id: string) => {
    try {
      const { data } = await api.post(`/api/animal/collect/${id}`);
      showToast(`เก็บได้ ${data.collected.quantity}x ${data.collected.itemId}!`);
      const r = await api.get('/api/animal');
      setAnimals(r.data.animals || []);
      onRefresh?.();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'ยังไม่พร้อมเก็บ');
    }
  };

  const claimQuest = async (questId: string) => {
    try {
      const { data } = await api.post(`/api/quest/claim/${questId}`);
      showToast(`รับรางวัลแล้ว! +${data.rewards?.coin || 0} 💰`);
      const r = await api.get('/api/quest/daily');
      setUserQuests(r.data.userQuests || []);
      onRefresh?.();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'รับรางวัลไม่สำเร็จ');
    }
  };

  const placeFurniture = async (furnitureId: string) => {
    try {
      const x = 100 + Math.random() * 200;
      const y = 80 + Math.random() * 120;
      const { data } = await api.post('/api/house/place', { furnitureId, x, y });
      showToast(`วางเฟอร์นิเจอร์แล้ว! -${data.cost} 💰`);
      const r = await api.get('/api/house');
      setHouse(r.data.house);
      onRefresh?.();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'วางไม่สำเร็จ');
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 glass rounded-2xl px-5 py-2 font-bold text-primary-800 pointer-events-auto z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start pointer-events-auto">
        <button onClick={() => togglePanel('profile')} className="glass rounded-2xl px-4 py-2 flex items-center gap-3 hover:bg-white/80 transition">
          <div className="w-10 h-10 rounded-full bg-primary-400 flex items-center justify-center text-xl">🧑‍🌾</div>
          <div>
            <p className="font-bold text-primary-800 text-sm leading-tight">{user?.character?.name || user?.displayName}</p>
            <p className="text-xs text-primary-600">Lv.{user?.character?.level || 1}</p>
          </div>
        </button>

        <div className="flex gap-2 flex-wrap justify-end items-center">
          <div className="glass rounded-2xl px-3 py-2 flex items-center gap-1.5">
            <span>💰</span><span className="font-bold text-primary-800">{coin}</span>
          </div>
          <div className="glass rounded-2xl px-3 py-2 flex items-center gap-1.5">
            <span>⚡</span><span className="font-bold text-primary-800">{energy}</span>
          </div>
          <div className="glass rounded-2xl px-3 py-2 flex items-center gap-1.5">
            <span>👥</span><span className="font-bold text-primary-800">{onlinePlayers.length + 1}</span>
          </div>
          <button
            onClick={onToggleSound}
            className="glass rounded-2xl w-10 h-10 flex items-center justify-center text-lg hover:bg-white/80"
            title={soundOn ? 'ปิดเสียง' : 'เปิดเสียง'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button
            onClick={onManualSave}
            className="glass rounded-2xl px-3 py-2 flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:bg-white/80"
            title="บันทึกเกม"
          >
            💾
            {lastSaved && (
              <span className="text-[10px] text-primary-500 hidden sm:inline">
                {lastSaved.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Daily quest strip */}
      {questPreview.length > 0 && (
        <div className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 pointer-events-auto max-w-[90vw]">
          <div className="flex gap-2 flex-wrap justify-center">
            {questPreview.map((uq: any) => {
              const reqs = uq.quest?.requirements || {};
              const progress = uq.progress || {};
              const key = Object.keys(reqs)[0];
              const done = uq.status === 'completed';
              return (
                <button
                  key={uq.id}
                  onClick={() => togglePanel('quests')}
                  className={`glass rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm ${
                    done ? 'bg-accent/80 text-primary-900' : 'text-primary-700'
                  }`}
                >
                  {done ? '✅ ' : '📜 '}
                  {uq.quest?.titleTh}
                  {key && !done && (
                    <span className="ml-1 text-primary-500">
                      {progress[key] || 0}/{reqs[key]}
                    </span>
                  )}
                  {done && <span className="ml-1">รับรางวัล!</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Side menu buttons */}
      <div className="absolute top-20 left-3 flex flex-col gap-2 pointer-events-auto">
        {[
          { id: 'shop', icon: '🏪', label: 'ร้านค้า' },
          { id: 'animals', icon: '🐾', label: 'สัตว์' },
          { id: 'fishing', icon: '🎣', label: 'ตกปลา' },
          { id: 'mining', icon: '⛏️', label: 'เหมือง' },
          { id: 'craft', icon: '⚒️', label: 'คราฟ' },
          { id: 'farmmgmt', icon: '📐', label: 'ขยายฟาร์ม' },
          { id: 'quests', icon: '📜', label: 'เควส' },
          { id: 'house', icon: '🏠', label: 'บ้าน' },
          { id: 'ranking', icon: '🏆', label: 'อันดับ' },
          { id: 'friends', icon: '🤝', label: 'เพื่อน' },
        ].map((b) => (
          <button
            key={b.id}
            onClick={() => togglePanel(b.id as Panel)}
            className={`glass rounded-xl w-12 h-12 flex items-center justify-center text-xl transition ${
              panel === b.id ? 'bg-primary-500 text-white scale-105' : 'hover:bg-white/80'
            }`}
            title={b.label}
          >
            {b.icon}
          </button>
        ))}
      </div>

      {/* Tool Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="glass rounded-2xl px-3 py-2 flex gap-2 items-center">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTool(t.id)}
              className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all ${
                selectedTool === t.id ? 'bg-primary-500 text-white scale-110 shadow-lg' : 'bg-white/60 hover:bg-white text-primary-800'
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="text-[10px] font-bold">{t.label}</span>
            </button>
          ))}
          <button
            onClick={() => togglePanel('inventory')}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all ${
              panel === 'inventory' ? 'bg-primary-500 text-white scale-110' : 'bg-white/60 hover:bg-white'
            }`}
          >
            <span className="text-2xl">🎒</span>
            <span className="text-[10px] font-bold">กระเป๋า</span>
          </button>
        </div>

        <AnimatePresence>
          {selectedTool === 'seed' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="glass rounded-2xl px-3 py-2 flex gap-2 mt-2 justify-center flex-wrap max-w-md">
              {SEEDS.map((s) => (
                <button key={s.id} onClick={() => setSelectedSeed(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold transition ${
                    selectedSeed === s.id ? 'bg-primary-500 text-white' : 'bg-white/70 text-primary-700'
                  }`}>
                  {s.icon} {s.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat */}
      <div className="absolute bottom-4 left-4 w-72 pointer-events-auto">
        <button onClick={() => setShowChat(!showChat)} className="glass rounded-xl px-3 py-1.5 text-sm font-bold text-primary-700 mb-1">
          💬 แชท {showChat ? '▼' : '▲'}
        </button>
        <AnimatePresence>
          {showChat && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="glass rounded-2xl overflow-hidden">
              <div className="h-32 overflow-y-auto p-2 space-y-1 text-sm">
                {chatMessages.length === 0 && <p className="text-primary-400 text-center text-xs py-4">ยังไม่มีข้อความ</p>}
                {chatMessages.map((m) => (
                  <div key={m.id} className="leading-tight">
                    <span className="font-bold text-primary-600">{m.displayName}: </span>
                    <span className="text-primary-900">{m.content}</span>
                  </div>
                ))}
              </div>
              <div className="flex border-t border-primary-100">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="พิมพ์ข้อความ..." className="flex-1 px-3 py-2 bg-transparent outline-none text-sm" />
                <button onClick={handleSend} className="px-3 text-primary-600 font-bold text-sm">ส่ง</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Online players */}
      {onlinePlayers.length > 0 && (
        <div className="absolute top-16 right-3 glass rounded-xl px-3 py-2 pointer-events-auto max-w-[140px]">
          <p className="text-[10px] font-bold text-primary-500 mb-1">ออนไลน์</p>
          {onlinePlayers.slice(0, 5).map((p) => (
            <p key={p.userId} className="text-xs text-primary-800 truncate">🟢 {p.displayName}</p>
          ))}
        </div>
      )}

      {/* ========== PANELS ========== */}
      <AnimatePresence>
        {panel !== 'none' && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="absolute top-16 right-3 bottom-24 w-80 max-w-[90vw] glass rounded-2xl overflow-hidden pointer-events-auto flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary-100">
              <h3 className="font-extrabold text-primary-800">
                {panel === 'inventory' && '🎒 กระเป๋า'}
                {panel === 'shop' && '🏪 ร้านค้า'}
                {panel === 'animals' && '🐾 สัตว์เลี้ยง'}
                {panel === 'quests' && '📜 เควสรายวัน'}
                {panel === 'house' && '🏠 บ้าน'}
                {panel === 'ranking' && '🏆 อันดับ'}
                {panel === 'profile' && '👤 โปรไฟล์'}
                {panel === 'friends' && '🤝 เพื่อน'}
                {panel === 'fishing' && '🎣 ตกปลา'}
                {panel === 'farmmgmt' && '📐 จัดการฟาร์ม'}
                {panel === 'mining' && '⛏️ เหมือง'}
                {panel === 'craft' && '⚒️ คราฟ'}
              </h3>
              <button onClick={() => setPanel('none')} className="text-primary-500 font-bold text-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Inventory */}
              {panel === 'inventory' && (
                <div className="grid grid-cols-4 gap-2">
                  {inventory.filter((i) => i.itemId !== 'coin' && i.quantity > 0).map((item) => (
                    <div key={item.itemId} className="bg-white/70 rounded-xl p-2 text-center">
                      <div className="text-lg">
                        {item.itemId.startsWith('seed_') ? '🌱' :
                         item.itemId.startsWith('crop_') ? '🥬' :
                         item.itemId.startsWith('fish_') ? '🐟' :
                         item.itemId.startsWith('ore_') ? '⛏️' :
                         item.itemId.startsWith('bar_') ? '🔩' :
                         item.itemId.startsWith('food_') || item.itemId.startsWith('drink_') ? '🍽️' :
                         item.itemId === 'egg' ? '🥚' :
                         item.itemId === 'milk' ? '🥛' :
                         item.itemId === 'fertilizer' ? '🌿' :
                         item.itemId === 'wool' ? '🧶' : '📦'}
                      </div>
                      <div className="text-[10px] font-bold text-primary-700 truncate">{item.itemId.replace(/^(seed_|crop_)/, '')}</div>
                      <div className="text-xs font-bold">x{item.quantity}</div>
                      {(item.itemId.startsWith('crop_') || item.itemId.startsWith('fish_') || item.itemId.startsWith('ore_') || item.itemId.startsWith('bar_') || ['egg', 'milk', 'wool'].includes(item.itemId) || item.itemId.startsWith('food_') || item.itemId.startsWith('drink_')) && (
                        <button onClick={() => sellItem(item.itemId, 1)} className="text-[10px] text-primary-600 underline mt-0.5">ขาย</button>
                      )}
                      {(item.itemId.startsWith('food_') || item.itemId.startsWith('drink_')) && (
                        <button onClick={async () => {
                          try {
                            const { data } = await api.post('/api/items/consume', { itemId: item.itemId });
                            showToast(`กินแล้ว +${data.energyGained} ⚡`);
                            onRefresh?.();
                          } catch (e: any) {
                            showToast(e.response?.data?.error || 'กินไม่สำเร็จ');
                          }
                        }} className="text-[10px] text-green-600 underline ml-1">กิน</button>
                      )}
                    </div>
                  ))}
                  {inventory.filter((i) => i.itemId !== 'coin' && i.quantity > 0).length === 0 && (
                    <p className="col-span-4 text-center text-primary-400 text-sm py-6">ว่างเปล่า</p>
                  )}
                </div>
              )}

              {/* Shop */}
              {panel === 'shop' && (
                <>
                  <p className="text-xs text-primary-500 font-semibold">ซื้อเมล็ด & ของใช้</p>
                  {shopItems.filter((i) => i.buyPrice > 0).map((item) => (
                    <div key={item.id} className="bg-white/70 rounded-xl p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-primary-800">{item.nameTh}</p>
                        <p className="text-xs text-primary-500">{item.buyPrice} 💰</p>
                      </div>
                      <button onClick={() => buyItem(item.id)} className="btn-primary text-xs py-1.5 px-3">ซื้อ</button>
                    </div>
                  ))}
                  <p className="text-xs text-primary-500 font-semibold mt-3">ขายของในกระเป๋าได้จากหน้ากระเป๋า</p>
                </>
              )}

              {/* Animals */}
              {panel === 'animals' && (
                <>
                  <p className="text-xs text-primary-500 font-semibold">สัตว์ในฟาร์ม ({animals.length}/12)</p>
                  {animals.map((a) => (
                    <div key={a.id} className="bg-white/70 rounded-xl p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{ANIMAL_EMOJI[a.type] || '🐾'}</span>
                        <div>
                          <p className="font-bold text-sm">{a.name || a.type}</p>
                          <p className="text-[10px] text-primary-500">❤️ {a.happiness}% · 🍽️ {a.hunger}%</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => feedAnimal(a.id)} className="flex-1 text-xs bg-primary-100 text-primary-700 font-bold py-1 rounded-lg">ให้อาหาร</button>
                        <button onClick={() => collectAnimal(a.id)}
                          className={`flex-1 text-xs font-bold py-1 rounded-lg ${a.productReady ? 'bg-accent text-primary-900' : 'bg-gray-200 text-gray-400'}`}>
                          {a.productReady ? 'เก็บผลผลิต' : 'ยังไม่พร้อม'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-primary-500 font-semibold mt-2">ซื้อสัตว์ใหม่</p>
                  {Object.entries(animalCatalog).map(([type, conf]: [string, any]) => (
                    <div key={type} className="bg-white/70 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{ANIMAL_EMOJI[type]}</span>
                        <div>
                          <p className="font-bold text-sm capitalize">{type}</p>
                          <p className="text-xs text-primary-500">{conf.buyPrice} 💰</p>
                        </div>
                      </div>
                      <button onClick={() => buyAnimal(type)} className="btn-primary text-xs py-1.5 px-3">ซื้อ</button>
                    </div>
                  ))}
                </>
              )}

              {/* Quests */}
              {panel === 'quests' && (
                <>
                  {userQuests.map((uq) => {
                    const reqs = uq.quest.requirements as Record<string, number>;
                    const progress = (uq.progress || {}) as Record<string, number>;
                    return (
                      <div key={uq.id} className="bg-white/70 rounded-xl p-3">
                        <p className="font-bold text-sm text-primary-800">{uq.quest.titleTh}</p>
                        <p className="text-xs text-primary-500 mb-1">{uq.quest.descriptionTh}</p>
                        {Object.entries(reqs).map(([k, v]) => (
                          <div key={k} className="text-xs text-primary-700">
                            {k}: {progress[k] || 0}/{v}
                            <div className="h-1.5 bg-primary-100 rounded-full mt-0.5">
                              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, ((progress[k] || 0) / v) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-primary-600">
                            รางวัล: {(uq.quest.rewards as any)?.coin || 0} 💰 · {(uq.quest.rewards as any)?.exp || 0} EXP
                          </span>
                          {uq.status === 'completed' && (
                            <button onClick={() => claimQuest(uq.questId)} className="btn-primary text-xs py-1 px-3">รับรางวัล</button>
                          )}
                          {uq.status === 'claimed' && <span className="text-xs text-green-600 font-bold">✓ รับแล้ว</span>}
                          {uq.status === 'active' && <span className="text-xs text-primary-400">กำลังทำ...</span>}
                        </div>
                      </div>
                    );
                  })}
                  {userQuests.length === 0 && <p className="text-center text-primary-400 text-sm py-6">กำลังโหลดเควส...</p>}
                </>
              )}

              {/* House */}
              {panel === 'house' && (
                <>
                  <div className="bg-white/70 rounded-xl p-3 mb-2">
                    <p className="font-bold text-sm">บ้าน Lv.{house?.level || 1}</p>
                    <p className="text-xs text-primary-500">เฟอร์นิเจอร์: {house?.furniture?.length || 0} ชิ้น</p>
                  </div>
                  <p className="text-xs text-primary-500 font-semibold">ซื้อเฟอร์นิเจอร์</p>
                  {furnitureCatalog.map((f) => (
                    <div key={f.id} className="bg-white/70 rounded-xl p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-primary-800">{f.nameTh}</p>
                        <p className="text-xs text-primary-500">{f.price} 💰 · {f.category}</p>
                      </div>
                      <button onClick={() => placeFurniture(f.id)} className="btn-primary text-xs py-1.5 px-3">ซื้อ+วาง</button>
                    </div>
                  ))}
                </>
              )}

              {/* Ranking */}
              {panel === 'ranking' && (
                <>
                  <div className="flex gap-1 mb-2">
                    {(['level', 'money', 'farm'] as const).map((t) => (
                      <button key={t} onClick={() => setRankType(t)}
                        className={`flex-1 text-xs font-bold py-1.5 rounded-lg ${rankType === t ? 'bg-primary-500 text-white' : 'bg-white/70 text-primary-700'}`}>
                        {t === 'level' ? 'เลเวล' : t === 'money' ? 'เงิน' : 'ฟาร์ม'}
                      </button>
                    ))}
                  </div>
                  {ranking.map((r) => (
                    <div key={r.rank} className="bg-white/70 rounded-xl p-2.5 flex items-center gap-3">
                      <span className={`font-extrabold text-lg w-6 ${r.rank <= 3 ? 'text-amber-500' : 'text-primary-400'}`}>#{r.rank}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{r.displayName || r.name}</p>
                        <p className="text-xs text-primary-500">
                          {rankType === 'level' && `Lv.${r.level} · ${r.experience} EXP`}
                          {rankType === 'money' && `${r.coins} 💰`}
                          {rankType === 'farm' && `ฟาร์ม Lv.${r.farmLevel}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Profile */}
              {panel === 'profile' && profile && (
                <div className="space-y-3">
                  <div className="bg-white/70 rounded-xl p-4 text-center">
                    <div className="text-4xl mb-2">🧑‍🌾</div>
                    <p className="font-extrabold text-lg text-primary-800">{profile.character?.name}</p>
                    <p className="text-sm text-primary-600">@{profile.displayName}</p>
                    <p className="text-sm mt-1">Lv.{profile.character?.level} · {profile.character?.experience} EXP</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3 grid grid-cols-2 gap-2 text-center text-sm">
                    <div><p className="font-bold text-primary-800">{profile.coins}</p><p className="text-xs text-primary-500">เหรียญ</p></div>
                    <div><p className="font-bold text-primary-800">{profile.farm?.animalCount}</p><p className="text-xs text-primary-500">สัตว์</p></div>
                    <div><p className="font-bold text-primary-800">{profile.farm?.plotCount}</p><p className="text-xs text-primary-500">แปลงปลูก</p></div>
                    <div><p className="font-bold text-primary-800">{profile.farm?.houseLevel}</p><p className="text-xs text-primary-500">บ้าน Lv.</p></div>
                  </div>
                </div>
              )}

              {/* Friends */}
              {panel === 'friends' && (
                <>
                  {friends.length === 0 && <p className="text-center text-primary-400 text-sm py-6">ยังไม่มีเพื่อน<br/>ค้นหาผู้เล่นจากรายชื่อออนไลน์</p>}
                  {friends.map((f: any) => {
                    const other = f.userId === user?.id ? f.friend : f.user;
                    return (
                      <div key={f.id} className="bg-white/70 rounded-xl p-2.5 flex items-center gap-2">
                        <span className="text-xl">🧑‍🌾</span>
                        <div>
                          <p className="font-bold text-sm">{other?.displayName}</p>
                          <p className="text-xs text-primary-500">Lv.{other?.character?.level || '?'}</p>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-primary-400 text-center mt-2">ผู้เล่นออนไลน์: {onlinePlayers.length} คน</p>
                  {onlinePlayers.map((p) => (
                    <div key={p.userId} className="bg-white/50 rounded-xl p-2 flex items-center justify-between text-sm">
                      <span>🟢 {p.displayName}</span>
                      <button
                        onClick={async () => {
                          try {
                            await api.post('/api/social/friend/request', { friendId: p.userId });
                            showToast('ส่งคำขอเป็นเพื่อนแล้ว');
                          } catch (e: any) {
                            showToast(e.response?.data?.error || 'ส่งไม่สำเร็จ');
                          }
                        }}
                        className="text-xs text-primary-600 font-bold underline"
                      >
                        เพิ่มเพื่อน
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* Fishing */}
              {panel === 'fishing' && (
                <>
                  <p className="text-xs text-primary-500 font-semibold">เลือกจุดตกปลา (ใช้พลังงาน)</p>
                  {fishSpots.map((spot: any) => (
                    <div key={spot.id} className="bg-white/70 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-primary-800">{spot.nameTh}</p>
                        <p className="text-xs text-primary-500">⚡ {spot.energyCost} · ปลดล็อก Lv.{spot.unlockLevel}</p>
                      </div>
                      <button
                        disabled={fishing}
                        onClick={async () => {
                          setFishing(true);
                          try {
                            const { data } = await api.post('/api/fishing/cast', { spotId: spot.id });
                            setLastCatch(data);
                            if (data.caught) {
                              showToast(`จับได้ ${data.result.nameTh}! +${data.expGained} EXP`);
                            } else {
                              showToast(`ได้ ${data.result.nameTh}...`);
                            }
                            onRefresh?.();
                          } catch (e: any) {
                            showToast(e.response?.data?.error || 'ตกปลาไม่สำเร็จ');
                          } finally {
                            setFishing(false);
                          }
                        }}
                        className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                      >
                        {fishing ? '...' : '🎣 โยนเบ็ด'}
                      </button>
                    </div>
                  ))}
                  {lastCatch && (
                    <div className="bg-primary-50 rounded-xl p-3 mt-2 text-center">
                      <p className="text-2xl mb-1">
                        {lastCatch.result.rarity === 'legendary' ? '✨' :
                         lastCatch.result.rarity === 'trash' ? '靴' : '🐟'}
                      </p>
                      <p className="font-bold text-primary-800">{lastCatch.result.nameTh}</p>
                      <p className="text-xs text-primary-500 capitalize">{lastCatch.result.rarity}
                        {lastCatch.caught ? ` · ขายได้ ${lastCatch.result.sellPrice} 💰` : ''}</p>
                      <p className="text-xs text-primary-600 mt-1">-{lastCatch.energySpent} ⚡ · +{lastCatch.expGained} EXP</p>
                    </div>
                  )}
                  <p className="text-[10px] text-primary-400 text-center mt-2">ปลาขายได้ที่ร้านค้า / กระเป๋า</p>
                </>
              )}

              {/* Farm management */}
              {panel === 'mining' && (
                <>
                  <p className="text-xs text-primary-500 font-semibold">เลือกโซนขุด (ใช้พลังงาน)</p>
                  {mineZones.map((z: any) => (
                    <div key={z.id} className="bg-white/70 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-primary-800">{z.nameTh}</p>
                        <p className="text-xs text-primary-500">⚡ {z.energyCost} · Lv.{z.unlockLevel}+</p>
                      </div>
                      <button
                        disabled={mining}
                        onClick={async () => {
                          setMining(true);
                          try {
                            const { data } = await api.post('/api/mining/mine', { zoneId: z.id });
                            setLastMine(data);
                            showToast(`ขุดได้ ${data.drops.length} ชิ้น! +${data.expGained} EXP`);
                            onRefresh?.();
                          } catch (e: any) {
                            showToast(e.response?.data?.error || 'ขุดไม่สำเร็จ');
                          } finally {
                            setMining(false);
                          }
                        }}
                        className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                      >
                        {mining ? '...' : '⛏️ ขุด'}
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await api.post('/api/mining/rest');
                        showToast(`พักฟื้น +${data.gained} ⚡ (${data.energy}/${data.maxEnergy})`);
                        onRefresh?.();
                      } catch (e: any) {
                        showToast(e.response?.data?.error || 'พักไม่สำเร็จ');
                      }
                    }}
                    className="btn-secondary w-full text-sm mt-2"
                  >
                    😴 พักฟื้นพลังงาน (+25)
                  </button>
                  {lastMine && (
                    <div className="bg-primary-50 rounded-xl p-3 mt-2">
                      <p className="font-bold text-sm text-primary-800 mb-1">ผลขุด — {lastMine.zone}</p>
                      {lastMine.drops.map((d: any, i: number) => (
                        <p key={i} className="text-xs text-primary-700">• {d.nameTh} ({d.rarity})</p>
                      ))}
                      <p className="text-xs text-primary-500 mt-1">-{lastMine.energySpent} ⚡ · +{lastMine.expGained} EXP</p>
                    </div>
                  )}
                </>
              )}

              {panel === 'craft' && (
                <>
                  <p className="text-xs text-primary-500 font-semibold">สูตรคราฟ</p>
                  {recipes.map((r: any) => (
                    <div key={r.id} className="bg-white/70 rounded-xl p-3">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="font-bold text-sm text-primary-800">{r.nameTh}</p>
                          <p className="text-[10px] text-primary-500 capitalize">{r.category}
                            {r.sellPrice > 0 ? ` · ขาย ${r.sellPrice}💰` : ''}</p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const { data } = await api.post('/api/craft/make', { recipeId: r.id, times: 1 });
                              showToast(`คราฟ ${data.recipe} x${data.result.quantity} สำเร็จ!`);
                              onRefresh?.();
                            } catch (e: any) {
                              showToast(e.response?.data?.error || 'คราฟไม่สำเร็จ');
                            }
                          }}
                          className="btn-primary text-xs py-1 px-2.5"
                        >
                          คราฟ
                        </button>
                      </div>
                      <div className="text-[11px] text-primary-600">
                        ใช้: {r.ingredients.map((ing: any) => `${String(ing.itemId).replace(/^(crop_|ore_|bar_)/, '')} x${ing.qty}`).join(', ')}
                      </div>
                      <div className="text-[11px] text-primary-700 font-semibold">
                        ได้: {String(r.result.itemId).replace(/^(food_|drink_|bar_|tool_|decor_)/, '')} x{r.result.qty}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {panel === 'farmmgmt' && (
                <>
                  <div className="bg-white/70 rounded-xl p-3 mb-2">
                    <p className="font-bold text-sm">ฟาร์ม Lv.{farm?.level || 1}</p>
                    <p className="text-xs text-primary-500">แปลงปลูก: {farm?.plots?.length || 0} ช่อง</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await api.post('/api/farm/expand');
                        showToast(`ขยายฟาร์มแล้ว! -${data.cost} 💰 (+${data.added} แปลง)`);
                        onRefresh?.();
                      } catch (e: any) {
                        showToast(e.response?.data?.error || 'ขยายไม่สำเร็จ');
                      }
                    }}
                    className="btn-primary w-full text-sm mb-3"
                  >
                    📐 ขยายแปลงปลูก
                  </button>
                  <p className="text-xs text-primary-500 font-semibold mb-1">ใส่ปุ๋ย</p>
                  <p className="text-[11px] text-primary-400 mb-2">
                    เลือกเครื่องมือด้านล่างเป็น 🌿 แล้วคลิกแปลงที่มีพืช
                    (ซื้อปุ๋ยได้ที่ร้านค้า · เร่งโต 30% + โอกาสคุณภาพสูง)
                  </p>
                  <div className="bg-primary-50 rounded-xl p-2 text-xs text-primary-700">
                    คุณภาพพืช: Common → Rare → Epic → Legendary<br/>
                    คุณภาพสูง = เก็บได้มากขึ้นตอนเก็บเกี่ยว
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
