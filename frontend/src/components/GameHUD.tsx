import { useState, useEffect } from 'react';
import api from '../services/api';

interface Props {
  user: any;
  coins: number;
  energy: number;
  level: number;
  loginStreak: number;
  tool: string;
  setTool: (t: any) => void;
  seed: string;
  setSeed: (s: string) => void;
  inventory: any[];
  weather?: string;
  timeOfDay?: string;
  onRefresh?: () => void;
  onToast?: (m: string) => void;
}

type Panel = 'none' | 'daily' | 'quest' | 'shop' | 'animal' | 'decor' | 'friends';

const TOOLS = [
  { id: 'hoe', icon: '🪓', label: 'ไถ' },
  { id: 'seed', icon: '🌱', label: 'ปลูก' },
  { id: 'water', icon: '💧', label: 'รด' },
  { id: 'hand', icon: '✋', label: 'เก็บ' },
];
const SEEDS = [
  { id: 'tomato', icon: '🍅' },
  { id: 'carrot', icon: '🥕' },
  { id: 'wheat', icon: '🌾' },
  { id: 'potato', icon: '🥔' },
];

export default function GameHUD({
  user, coins, energy, level, loginStreak,
  tool, setTool, seed, setSeed, inventory,
  weather = 'sunny', timeOfDay = 'morning',
  onRefresh, onToast,
}: Props) {
  const [panel, setPanel] = useState<Panel>('none');
  const [daily, setDaily] = useState<any>(null);
  const [quests, setQuests] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any>({});
  const [decorCat, setDecorCat] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);

  const toast = (m: string) => onToast?.(m);
  const toggle = (p: Panel) => setPanel((prev) => (prev === p ? 'none' : p));

  useEffect(() => {
    api.get('/api/quest/daily').then((r) => setQuests(r.data.userQuests || [])).catch(() => {});
  }, [inventory]);

  useEffect(() => {
    if (panel === 'daily') api.get('/api/daily').then((r) => setDaily(r.data)).catch(() => {});
    if (panel === 'quest') api.get('/api/quest/daily').then((r) => setQuests(r.data.userQuests || [])).catch(() => {});
    if (panel === 'shop') api.get('/api/shop').then((r) => setShopItems(r.data.items || [])).catch(() => {});
    if (panel === 'animal') api.get('/api/animal').then((r) => { setAnimals(r.data.animals || []); setCatalog(r.data.catalog || {}); }).catch(() => {});
    if (panel === 'decor') api.get('/api/decor').then((r) => setDecorCat(r.data.catalog || [])).catch(() => {});
    if (panel === 'friends') {
      api.get('/api/social/players').then((r) => setPlayers(r.data.players || [])).catch(() => {});
      api.get('/api/social/friends').then((r) => setFriends(r.data.friendships || [])).catch(() => {});
    }
  }, [panel]);

  const weatherIcon = weather === 'rain' ? '🌧️' : weather === 'cloudy' ? '☁️' : weather === 'windy' ? '💨' : '☀️';
  const timeIcon = timeOfDay === 'night' ? '🌙' : timeOfDay === 'evening' ? '🌅' : timeOfDay === 'afternoon' ? '🌞' : '🌄';

  const activeQuests = quests.filter((q) => q.status !== 'claimed').slice(0, 2);

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      
      {user?.role === 'admin' && (
        <a href="/admin" className="absolute top-14 right-2 pointer-events-auto panel-cream px-2 py-1 text-[10px] font-cute font-extrabold border-2 border-pixel-woodDark">
          🛠️ แอดมิน
        </a>
      )}

      {/* Top HUD */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-auto">
        <div className="flex items-center gap-2 hud-bar pl-1 pr-3 py-1">
          <div className="w-10 h-10 bg-pixel-pink border-2 border-pixel-woodDark flex items-center justify-center text-xl">🧑‍🌾</div>
          <div>
            <p className="font-cute font-extrabold text-xs text-pixel-woodDark leading-tight">
              {user?.character?.name || user?.displayName}
            </p>
            <p className="font-cute text-[10px] text-pixel-woodDark/80">Lv.{level} · 🔥{loginStreak}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <div className="hud-bar px-2 py-1 flex items-center gap-1 text-xs font-cute font-extrabold text-pixel-woodDark">
            {weatherIcon}{timeIcon}
          </div>
          <div className="hud-bar px-2.5 py-1 flex items-center gap-1">
            <span>💰</span>
            <span className="font-cute font-extrabold text-xs text-pixel-woodDark">{coins}</span>
          </div>
          <div className="hud-bar px-2.5 py-1 flex items-center gap-1">
            <span>❤️</span>
            <span className="font-cute font-extrabold text-xs text-pixel-woodDark">{energy}</span>
          </div>
        </div>
      </div>

      {/* Quest strip */}
      {activeQuests.length > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-auto max-w-[95vw] flex-wrap justify-center">
          {activeQuests.map((uq) => {
            const reqs = uq.quest?.requirements || {};
            const progress = uq.progress || {};
            const key = Object.keys(reqs)[0];
            const done = uq.status === 'completed';
            return (
              <button
                key={uq.id}
                onClick={() => toggle('quest')}
                className={`panel-cream px-2.5 py-1 text-[10px] font-cute font-extrabold ${done ? 'border-pixel-gold' : ''}`}
              >
                {done ? '✅ ' : '📜 '}
                {uq.quest?.titleTh}
                {key && !done && <span className="ml-1 opacity-70">{progress[key] || 0}/{reqs[key]}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Side menu */}
      <div className="absolute top-14 left-2 flex flex-col gap-1.5 pointer-events-auto">
        {[
          { id: 'daily', icon: '🎁', label: 'รายวัน' },
          { id: 'quest', icon: '📜', label: 'เควส' },
          { id: 'shop', icon: '🏪', label: 'ร้าน' },
          { id: 'animal', icon: '🐾', label: 'สัตว์' },
          { id: 'decor', icon: '🪑', label: 'แต่ง' },
          { id: 'friends', icon: '🤝', label: 'เพื่อน' },
          // admin handled below
        ].map((b) => (
          <button
            key={b.id}
            onClick={() => toggle(b.id as Panel)}
            className={`w-11 h-11 border-2 border-pixel-woodDark font-cute text-lg flex items-center justify-center ${
              panel === b.id ? 'bg-pixel-gold' : 'bg-pixel-cream'
            }`}
            title={b.label}
          >
            {b.icon}
          </button>
        ))}
      </div>

      {/* Tool bar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="panel-wood px-2 py-2 flex gap-1.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`w-13 h-14 w-14 border-2 border-pixel-woodDark flex flex-col items-center justify-center font-cute font-bold text-[10px] ${
                tool === t.id ? 'bg-pixel-gold' : 'bg-pixel-cream'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        {tool === 'seed' && (
          <div className="panel-cream mt-1 px-2 py-1.5 flex gap-1 justify-center">
            {SEEDS.map((s) => (
              <button key={s.id} onClick={() => setSeed(s.id)}
                className={`w-10 h-10 border-2 border-pixel-woodDark text-lg ${seed === s.id ? 'bg-pixel-green' : 'bg-white'}`}>
                {s.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inventory mini */}
      <div className="absolute bottom-3 right-3 pointer-events-auto">
        <div className="panel-cream p-2 w-28 max-h-32 overflow-y-auto">
          <p className="font-cute font-extrabold text-[10px] text-center mb-1">กระเป๋า</p>
          <div className="grid grid-cols-2 gap-1">
            {inventory.filter((i) => i.itemId !== 'coin' && i.quantity > 0).slice(0, 8).map((item) => (
              <div key={item.itemId} className="bg-white border-2 border-pixel-woodDark p-0.5 text-center">
                <div className="text-sm">
                  {item.itemId.startsWith('seed_') ? '🌱' :
                   item.itemId.startsWith('crop_') ? '🥬' :
                   item.itemId === 'egg' ? '🥚' :
                   item.itemId.startsWith('fish_') ? '🐟' :
                   item.itemId.startsWith('decor_') ? '🪑' : '📦'}
                </div>
                <div className="font-cute font-bold text-[9px]">x{item.quantity}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 pointer-events-none">
        <p className="font-cute text-[10px] text-white font-bold" style={{ textShadow: '1px 1px 0 #333' }}>
          WASD · คลิก NPC/บ่อ/ไก่
        </p>
      </div>

      {/* Panels */}
      {panel !== 'none' && (
        <div className="absolute top-14 right-2 bottom-28 w-72 max-w-[90vw] panel-cream overflow-hidden pointer-events-auto flex flex-col">
          <div className="flex justify-between items-center px-3 py-2 border-b-2 border-pixel-woodDark bg-pixel-green/20">
            <span className="font-cute font-extrabold text-sm text-pixel-dark">
              {panel === 'daily' && '🎁 ของขวัญรายวัน'}
              {panel === 'quest' && '📜 เควส'}
              {panel === 'shop' && '🏪 ร้านมิ้นท์'}
              {panel === 'animal' && '🐾 สัตว์'}
              {panel === 'decor' && '🪑 แต่งบ้าน'}
              {panel === 'friends' && '🤝 เพื่อน'}
            </span>
            <button onClick={() => setPanel('none')} className="font-bold text-pixel-woodDark">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-sm font-cute">
            {panel === 'daily' && daily && (
              <>
                <p className="text-xs text-pixel-woodDark">วันปัจจุบันในรอบ: {daily.currentDay}/7 · รับแล้ววันนี้: {daily.claimedToday ? 'ใช่' : 'ยัง'}</p>
                <div className="grid grid-cols-7 gap-1">
                  {(daily.rewards || []).map((r: any) => (
                    <div key={r.day} className={`border-2 border-pixel-woodDark p-1 text-center text-[9px] ${r.day === daily.currentDay ? 'bg-pixel-gold' : 'bg-white'}`}>
                      <div className="font-bold">D{r.day}</div>
                      <div>{r.day <= (daily.claimedToday ? daily.currentDay : daily.currentDay - 1) ? '✅' : '🎁'}</div>
                    </div>
                  ))}
                </div>
                <button
                  disabled={daily.claimedToday}
                  onClick={async () => {
                    try {
                      const { data } = await api.post('/api/daily/claim');
                      toast(`ได้ ${data.reward.label}!`);
                      setDaily(null);
                      setPanel('none');
                      onRefresh?.();
                    } catch (e: any) {
                      toast(e.response?.data?.error || 'รับไม่ได้');
                    }
                  }}
                  className="btn-pixel-green w-full py-2 text-xs disabled:opacity-50"
                >
                  {daily.claimedToday ? 'รับไปแล้ววันนี้' : 'รับรางวัลวันนี้'}
                </button>
              </>
            )}

            {panel === 'quest' && (
              <>
                {quests.map((uq) => {
                  const reqs = uq.quest?.requirements || {};
                  const progress = uq.progress || {};
                  return (
                    <div key={uq.id} className="bg-white border-2 border-pixel-woodDark p-2">
                      <p className="font-extrabold text-xs">{uq.quest?.titleTh}</p>
                      <p className="text-[10px] opacity-70 mb-1">{uq.quest?.descriptionTh}</p>
                      {Object.entries(reqs).map(([k, v]) => (
                        <p key={k} className="text-[10px]">{k}: {(progress as any)[k] || 0}/{v as number}</p>
                      ))}
                      {uq.status === 'completed' && (
                        <button
                          onClick={async () => {
                            try {
                              const { data } = await api.post(`/api/quest/claim/${uq.questId}`);
                              toast(`รับรางวัล +${data.rewards?.coin || 0}💰`);
                              onRefresh?.();
                              const r = await api.get('/api/quest/daily');
                              setQuests(r.data.userQuests || []);
                            } catch (e: any) {
                              toast(e.response?.data?.error || 'ไม่สำเร็จ');
                            }
                          }}
                          className="btn-pixel-green text-[10px] py-1 px-2 mt-1"
                        >
                          รับรางวัล
                        </button>
                      )}
                      {uq.status === 'claimed' && <span className="text-[10px] text-green-700">✓ รับแล้ว</span>}
                    </div>
                  );
                })}
              </>
            )}

            {panel === 'shop' && (
              <>
                <p className="text-[10px] font-bold">ซื้อ</p>
                {shopItems.filter((i) => i.buy > 0).map((item) => (
                  <div key={item.id} className="bg-white border-2 border-pixel-woodDark p-2 flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-xs">{item.nameTh}</p>
                      <p className="text-[10px]">{item.buy} 💰</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await api.post('/api/shop/buy', { itemId: item.id, quantity: 1 });
                          toast('ซื้อแล้ว!');
                          onRefresh?.();
                        } catch (e: any) {
                          toast(e.response?.data?.error || 'ซื้อไม่ได้');
                        }
                      }}
                      className="btn-pixel-green text-[10px] py-1 px-2"
                    >
                      ซื้อ
                    </button>
                  </div>
                ))}
                <p className="text-[10px] font-bold mt-2">ขายจากกระเป๋า</p>
                {inventory.filter((i) => i.quantity > 0 && !i.itemId.startsWith('seed_') && i.itemId !== 'coin').map((item) => (
                  <div key={item.itemId} className="bg-white border-2 border-pixel-woodDark p-2 flex justify-between items-center">
                    <span className="text-xs">{item.itemId} x{item.quantity}</span>
                    <button
                      onClick={async () => {
                        try {
                          const { data } = await api.post('/api/shop/sell', { itemId: item.itemId, quantity: 1 });
                          toast(`ขาย +${data.earned}💰`);
                          onRefresh?.();
                        } catch (e: any) {
                          toast(e.response?.data?.error || 'ขายไม่ได้');
                        }
                      }}
                      className="btn-pixel-cream text-[10px] py-1 px-2"
                    >
                      ขาย
                    </button>
                  </div>
                ))}
              </>
            )}

            {panel === 'animal' && (
              <>
                {animals.map((a) => (
                  <div key={a.id} className="bg-white border-2 border-pixel-woodDark p-2 flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-xs">{a.name || a.type}</p>
                      <p className="text-[10px]">{a.productReady ? 'พร้อมเก็บ!' : 'รอผลผลิต...'}</p>
                    </div>
                    <button
                      disabled={!a.productReady}
                      onClick={async () => {
                        try {
                          const { data } = await api.post(`/api/animal/collect/${a.id}`);
                          toast(`เก็บ ${data.product}!`);
                          const r = await api.get('/api/animal');
                          setAnimals(r.data.animals || []);
                          onRefresh?.();
                        } catch (e: any) {
                          toast(e.response?.data?.error || 'ยังไม่พร้อม');
                        }
                      }}
                      className="btn-pixel-green text-[10px] py-1 px-2 disabled:opacity-40"
                    >
                      เก็บ
                    </button>
                  </div>
                ))}
                <p className="text-[10px] font-bold mt-1">ซื้อสัตว์</p>
                {Object.entries(catalog).map(([type, conf]: [string, any]) => (
                  <div key={type} className="bg-white border-2 border-pixel-woodDark p-2 flex justify-between items-center">
                    <span className="text-xs capitalize">{conf.label || type} — {conf.price}💰</span>
                    <button
                      onClick={async () => {
                        try {
                          await api.post('/api/animal/buy', { type });
                          toast('ซื้อแล้ว!');
                          const r = await api.get('/api/animal');
                          setAnimals(r.data.animals || []);
                          onRefresh?.();
                        } catch (e: any) {
                          toast(e.response?.data?.error || 'ซื้อไม่ได้');
                        }
                      }}
                      className="btn-pixel-green text-[10px] py-1 px-2"
                    >
                      ซื้อ
                    </button>
                  </div>
                ))}
              </>
            )}

            {panel === 'decor' && (
              <>
                <p className="text-[10px]">ซื้อของแต่งที่ร้าน แล้วกดวาง (สุ่มตำแหน่งใกล้บ้าน)</p>
                {decorCat.map((d) => (
                  <div key={d.id} className="bg-white border-2 border-pixel-woodDark p-2 flex justify-between items-center">
                    <span className="text-xs">{d.emoji} {d.nameTh}</span>
                    <button
                      onClick={async () => {
                        try {
                          await api.post('/api/decor/place', {
                            itemId: d.id,
                            x: 700 + Math.random() * 120,
                            y: 260 + Math.random() * 80,
                          });
                          toast('วางแล้ว! รีโหลดแมพหลังรีเฟรช');
                          onRefresh?.();
                        } catch (e: any) {
                          toast(e.response?.data?.error || 'วางไม่ได้ (ซื้อก่อนที่ร้าน)');
                        }
                      }}
                      className="btn-pixel-green text-[10px] py-1 px-2"
                    >
                      วาง
                    </button>
                  </div>
                ))}
              </>
            )}

            {panel === 'friends' && (
              <>
                <p className="text-[10px] font-bold">ผู้เล่น</p>
                {players.map((p) => (
                  <div key={p.id} className="bg-white border-2 border-pixel-woodDark p-2 flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-xs">{p.displayName}</p>
                      <p className="text-[10px]">Lv.{p.character?.level || 1}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          try {
                            await api.post('/api/social/friend/request', { friendId: p.id });
                            toast('เพิ่มเพื่อนแล้ว');
                          } catch (e: any) {
                            toast(e.response?.data?.error || 'ไม่สำเร็จ');
                          }
                        }}
                        className="btn-pixel-cream text-[9px] py-1 px-1.5"
                      >
                        เพื่อน
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const { data } = await api.get(`/api/social/visit/${p.id}`);
                            toast(`เยี่ยม ${data.farm?.user?.displayName || p.displayName} — แปลง ${data.farm?.plots?.length || 0}`);
                          } catch (e: any) {
                            toast(e.response?.data?.error || 'เยี่ยมไม่ได้');
                          }
                        }}
                        className="btn-pixel-green text-[9px] py-1 px-1.5"
                      >
                        เยี่ยม
                      </button>
                    </div>
                  </div>
                ))}
                {players.length === 0 && <p className="text-xs text-center opacity-60 py-4">ยังไม่มีผู้เล่นอื่น</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
