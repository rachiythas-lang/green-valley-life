import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, '..', 'data', 'db.json');
const PORT = Number(process.env.PORT || 3001);
const SECRET = 'gvl-secret';

function load() {
  try {
    if (!fs.existsSync(DB)) {
      const d = { users: [], plots: [], animals: [], inventory: [], decorations: [] };
      fs.mkdirSync(path.dirname(DB), { recursive: true });
      fs.writeFileSync(DB, JSON.stringify(d));
      return d;
    }
    return JSON.parse(fs.readFileSync(DB, 'utf8'));
  } catch {
    return { users: [], plots: [], animals: [], inventory: [], decorations: [] };
  }
}
function save(db) {
  fs.mkdirSync(path.dirname(DB), { recursive: true });
  fs.writeFileSync(DB, JSON.stringify(db, null, 2));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function b64(o) {
  return Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
}
function makeToken(id) {
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64({ userId: id, exp: Date.now() + 30 * 864e5 });
  const s = crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + s;
}
function verify(t) {
  try {
    const [h, p, s] = t.split('.');
    if (crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url') !== s) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
function readBody(req) {
  return new Promise((r) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => {
      try {
        r(d ? JSON.parse(d) : {});
      } catch {
        r({});
      }
    });
  });
}
function send(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(obj));
}
function makePlots(fid) {
  const a = [];
  for (let x = 0; x < 6; x++)
    for (let y = 0; y < 4; y++)
      a.push({ id: uid(), farmId: fid, x, y, state: 'empty', cropType: null, plantedAt: null, wateredAt: null, growthStage: 0 });
  return a;
}
function add(db, userId, item, q) {
  const i = db.inventory.find((x) => x.userId === userId && x.itemId === item);
  if (i) i.quantity += q;
  else db.inventory.push({ id: uid(), userId, itemId: item, quantity: q });
}
function take(db, userId, item, q) {
  const i = db.inventory.find((x) => x.userId === userId && x.itemId === item);
  if (!i || i.quantity < q) return false;
  i.quantity -= q;
  return true;
}
function pub(db, u) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    provider: u.provider,
    role: u.role || 'player',
    isBanned: !!u.isBanned,
    loginStreak: u.loginStreak || 0,
    character: u.character,
    farm: u.farm
      ? {
          ...u.farm,
          plots: db.plots.filter((p) => p.farmId === u.farm.id),
          animals: db.animals.filter((a) => a.farmId === u.farm.id),
          decorations: db.decorations.filter((d) => d.farmId === u.farm.id),
        }
      : null,
    inventory: db.inventory.filter((i) => i.userId === u.id),
  };
}
function authUser(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  const p = verify(h.slice(7));
  if (!p) return null;
  return load().users.find((u) => u.id === p.userId) || null;
}
function createPlayer(db, name, email, passwordHash, provider) {
  const fid = uid();
  const user = {
    id: uid(),
    email,
    passwordHash,
    displayName: name,
    provider,
    role: 'player',
    isBanned: false,
    loginStreak: 1,
    dailyClaimDay: 0,
    lastDailyClaim: null,
    lastLoginAt: new Date().toISOString(),
    character: {
      name,
      gender: 'male',
      level: 1,
      experience: 0,
      energy: 100,
      maxEnergy: 100,
      hairColor: '#4A3728',
      skinTone: '#F5D0C5',
    },
    farm: { id: fid, name: name + "'s Farm", level: 1, weather: 'sunny', timeOfDay: 'morning' },
  };
  db.users.push(user);
  db.plots.push(...makePlots(fid));
  db.animals.push({
    id: uid(),
    farmId: fid,
    type: 'chicken',
    name: 'เจี๊ยบ',
    posX: 220,
    posY: 540,
    productReady: true,
    lastCollectedAt: null,
  });
  add(db, user.id, 'coin', 500);
  add(db, user.id, 'seed_tomato', 10);
  add(db, user.id, 'seed_carrot', 10);
  return user;
}

function ensureAdmin() {
  const db = load();
  const email = 'rachiytahs@gmail.com';
  const hash = crypto.scryptSync('1369900', 'gvl', 32).toString('hex');
  let user = db.users.find((u) => u.email === email);
  if (!user) {
    user = createPlayer(db, 'Admin', email, hash, 'email');
    user.role = 'admin';
    user.isBanned = false;
    // แอดมินได้ของเริ่มเยอะหน่อย
    add(db, user.id, 'coin', 9500);
    console.log('Admin account created:', email);
  } else {
    user.passwordHash = hash;
    user.role = 'admin';
    user.isBanned = false;
    console.log('Admin account ready:', email);
  }
  save(db);
}

function requireAdmin(req) {
  const u = authUser(req);
  if (!u || u.role !== 'admin') return null;
  return u;
}

const CROPS = {
  tomato: { ms: 35000, st: 4, sell: 25 },
  carrot: { ms: 25000, st: 3, sell: 18 },
  wheat: { ms: 50000, st: 4, sell: 15 },
  potato: { ms: 40000, st: 3, sell: 20 },
};

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    return res.end();
  }
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const b = req.method === 'POST' ? await readBody(req) : {};
  try {
    if (p === '/health') return send(res, 200, { status: 'ok', version: '1.4.0' });

    if (p === '/api/auth/guest' && req.method === 'POST') {
      const db = load();
      const name = (b.displayName || 'ชาวนา' + Math.floor(Math.random() * 9000 + 1000)).slice(0, 16);
      const user = createPlayer(db, name, null, null, 'guest');
      save(db);
      return send(res, 200, { token: makeToken(user.id), user: pub(db, user), loginStreak: 1 });
    }
    if (p === '/api/auth/register' && req.method === 'POST') {
      const db = load();
      if (!b.email || !b.password || b.password.length < 6)
        return send(res, 400, { error: 'กรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัว' });
      if (db.users.find((u) => u.email === b.email)) return send(res, 400, { error: 'อีเมลนี้ถูกใช้แล้ว' });
      const name = (b.displayName || b.email.split('@')[0]).slice(0, 16);
      const hash = crypto.scryptSync(b.password, 'gvl', 32).toString('hex');
      const user = createPlayer(db, name, b.email, hash, 'email');
      save(db);
      return send(res, 200, { token: makeToken(user.id), user: pub(db, user), loginStreak: 1 });
    }
    if (p === '/api/auth/login' && req.method === 'POST') {
      const db = load();
      const user = db.users.find((u) => u.email === b.email);
      const hash = b.password ? crypto.scryptSync(b.password, 'gvl', 32).toString('hex') : '';
      if (!user || user.passwordHash !== hash) return send(res, 401, { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      if (user.isBanned) return send(res, 403, { error: 'บัญชีถูกระงับโดยแอดมิน' });
      user.loginStreak = (user.loginStreak || 0) + 1;
      user.lastLoginAt = new Date().toISOString();
      save(db);
      return send(res, 200, { token: makeToken(user.id), user: pub(db, user), loginStreak: user.loginStreak });
    }
    if (p === '/api/auth/me') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      return send(res, 200, { user: pub(load(), u), loginStreak: u.loginStreak || 0 });
    }
    if (p === '/api/farm' && req.method === 'GET') {
      const u = authUser(req);
      if (!u?.farm) return send(res, 401, { error: 'Unauthorized' });
      const db = load();
      const now = Date.now();
      for (const plot of db.plots.filter((x) => x.farmId === u.farm.id)) {
        if ((plot.state === 'planted' || plot.state === 'growing') && plot.plantedAt && plot.cropType) {
          const c = CROPS[plot.cropType];
          if (!c) continue;
          const st = Math.min(c.st, Math.floor(((now - new Date(plot.plantedAt).getTime()) / c.ms) * c.st));
          plot.growthStage = st;
          plot.state = st >= c.st ? 'ready' : 'growing';
        }
      }
      save(db);
      return send(res, 200, {
        farm: {
          ...u.farm,
          plots: db.plots.filter((x) => x.farmId === u.farm.id),
          animals: db.animals.filter((x) => x.farmId === u.farm.id),
          decorations: db.decorations.filter((x) => x.farmId === u.farm.id),
        },
      });
    }
    if (p === '/api/farm/till' && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      const db = load();
      const plot = db.plots.find((x) => x.farmId === u.farm.id && x.x === b.x && x.y === b.y);
      if (!plot || (plot.state !== 'empty' && plot.state !== 'dead')) return send(res, 400, { error: 'ไถไม่ได้' });
      Object.assign(plot, { state: 'tilled', cropType: null, plantedAt: null, growthStage: 0 });
      save(db);
      return send(res, 200, { plot });
    }
    if (p === '/api/farm/plant' && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      if (!CROPS[b.cropType]) return send(res, 400, { error: 'พืชไม่รู้จัก' });
      const db = load();
      const plot = db.plots.find((x) => x.farmId === u.farm.id && x.x === b.x && x.y === b.y);
      if (!plot || plot.state !== 'tilled') return send(res, 400, { error: 'ต้องไถก่อน' });
      if (!take(db, u.id, 'seed_' + b.cropType, 1)) return send(res, 400, { error: 'เมล็ดไม่พอ' });
      Object.assign(plot, { state: 'planted', cropType: b.cropType, plantedAt: new Date().toISOString(), growthStage: 0 });
      save(db);
      return send(res, 200, { plot });
    }
    if (p === '/api/farm/water' && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      const db = load();
      const plot = db.plots.find((x) => x.farmId === u.farm.id && x.x === b.x && x.y === b.y);
      if (!plot || !['planted', 'growing'].includes(plot.state)) return send(res, 400, { error: 'รดน้ำไม่ได้' });
      plot.wateredAt = new Date().toISOString();
      save(db);
      return send(res, 200, { plot });
    }
    if (p === '/api/farm/harvest' && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      const db = load();
      const plot = db.plots.find((x) => x.farmId === u.farm.id && x.x === b.x && x.y === b.y);
      if (!plot || plot.state !== 'ready' || !plot.cropType) return send(res, 400, { error: 'ยังไม่พร้อมเก็บ' });
      const ct = plot.cropType;
      const qty = 1 + Math.floor(Math.random() * 2);
      add(db, u.id, 'crop_' + ct, qty);
      Object.assign(plot, { state: 'empty', cropType: null, plantedAt: null, wateredAt: null, growthStage: 0 });
      save(db);
      return send(res, 200, { plot, harvested: { itemId: 'crop_' + ct, quantity: qty, sellPrice: CROPS[ct]?.sell || 10 } });
    }
    if (p === '/api/farm/save') return send(res, 200, { ok: true });

    if (p === '/api/daily') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      const claimed = !!(u.lastDailyClaim && new Date(u.lastDailyClaim).toDateString() === new Date().toDateString());
      return send(res, 200, {
        rewards: [
          { day: 1, itemId: 'coin', qty: 50, label: '50 เหรียญ' },
          { day: 2, itemId: 'seed_tomato', qty: 5, label: 'เมล็ด x5' },
          { day: 3, itemId: 'coin', qty: 100, label: '100 เหรียญ' },
          { day: 4, itemId: 'seed_carrot', qty: 5, label: 'แครอท x5' },
          { day: 5, itemId: 'decor_bench', qty: 1, label: 'ม้านั่ง' },
          { day: 6, itemId: 'coin', qty: 150, label: '150 เหรียญ' },
          { day: 7, itemId: 'decor_fountain', qty: 1, label: 'น้ำพุ' },
        ],
        currentDay: u.dailyClaimDay || 0,
        claimedToday: claimed,
        loginStreak: u.loginStreak || 0,
      });
    }
    if (p === '/api/daily/claim' && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      if (u.lastDailyClaim && new Date(u.lastDailyClaim).toDateString() === new Date().toDateString())
        return send(res, 400, { error: 'รับแล้ววันนี้' });
      const db = load();
      const uu = db.users.find((x) => x.id === u.id);
      const next = (uu.dailyClaimDay || 0) >= 7 ? 1 : (uu.dailyClaimDay || 0) + 1;
      const map = { 1: ['coin', 50], 2: ['seed_tomato', 5], 3: ['coin', 100], 4: ['seed_carrot', 5], 5: ['decor_bench', 1], 6: ['coin', 150], 7: ['decor_fountain', 1] };
      const [item, qty] = map[next];
      add(db, u.id, item, qty);
      if (next === 7) add(db, u.id, 'coin', 200);
      uu.dailyClaimDay = next;
      uu.lastDailyClaim = new Date().toISOString();
      save(db);
      return send(res, 200, { ok: true, day: next, reward: { day: next, itemId: item, qty, label: item } });
    }

    if (p === '/api/shop')
      return send(res, 200, {
        items: [
          { id: 'seed_tomato', nameTh: 'เมล็ดมะเขือ', buy: 12, sell: 0 },
          { id: 'seed_carrot', nameTh: 'เมล็ดแครอท', buy: 10, sell: 0 },
          { id: 'seed_wheat', nameTh: 'เมล็ดข้าว', buy: 8, sell: 0 },
          { id: 'seed_potato', nameTh: 'เมล็ดมัน', buy: 11, sell: 0 },
          { id: 'crop_tomato', nameTh: 'มะเขือเทศ', buy: 0, sell: 25 },
          { id: 'crop_carrot', nameTh: 'แครอท', buy: 0, sell: 18 },
          { id: 'egg', nameTh: 'ไข่', buy: 0, sell: 20 },
          { id: 'fish_carp', nameTh: 'ปลา', buy: 0, sell: 30 },
          { id: 'decor_bench', nameTh: 'ม้านั่ง', buy: 80, sell: 0 },
          { id: 'decor_fence', nameTh: 'รั้ว', buy: 40, sell: 0 },
          { id: 'decor_flower', nameTh: 'ดอกไม้', buy: 50, sell: 0 },
        ],
      });
    if (p === '/api/shop/buy' && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      const prices = { seed_tomato: 12, seed_carrot: 10, seed_wheat: 8, seed_potato: 11, decor_bench: 80, decor_fence: 40, decor_flower: 50 };
      const price = prices[b.itemId];
      if (!price) return send(res, 400, { error: 'ซื้อไม่ได้' });
      const db = load();
      if (!take(db, u.id, 'coin', price)) return send(res, 400, { error: 'เหรียญไม่พอ' });
      add(db, u.id, b.itemId, 1);
      save(db);
      return send(res, 200, { ok: true, spent: price });
    }
    if (p === '/api/shop/sell' && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      const sells = { crop_tomato: 25, crop_carrot: 18, crop_wheat: 15, crop_potato: 20, egg: 20, fish_carp: 30 };
      const price = sells[b.itemId];
      if (!price) return send(res, 400, { error: 'ขายไม่ได้' });
      const db = load();
      if (!take(db, u.id, b.itemId, 1)) return send(res, 400, { error: 'ของไม่พอ' });
      add(db, u.id, 'coin', price);
      save(db);
      return send(res, 200, { ok: true, earned: price });
    }

    if (p === '/api/animal') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      return send(res, 200, {
        animals: load().animals.filter((a) => a.farmId === u.farm.id),
        catalog: { chicken: { product: 'egg', price: 150, label: 'ไก่' }, duck: { product: 'egg', price: 180, label: 'เป็ด' } },
      });
    }
    if (p.startsWith('/api/animal/collect/') && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      const id = p.split('/').pop();
      const db = load();
      const a = db.animals.find((x) => x.id === id && x.farmId === u.farm.id);
      if (!a) return send(res, 404, { error: 'ไม่พบ' });
      if (!a.productReady) return send(res, 400, { error: 'ยังไม่พร้อม' });
      add(db, u.id, 'egg', 1);
      a.productReady = false;
      a.lastCollectedAt = new Date().toISOString();
      save(db);
      return send(res, 200, { ok: true, product: 'egg', quantity: 1 });
    }
    if (p === '/api/animal/buy' && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      const price = b.type === 'duck' ? 180 : 150;
      const db = load();
      if (!take(db, u.id, 'coin', price)) return send(res, 400, { error: 'เหรียญไม่พอ' });
      const a = {
        id: uid(),
        farmId: u.farm.id,
        type: b.type || 'chicken',
        name: b.type === 'duck' ? 'เป็ด' : 'ไก่',
        posX: 200,
        posY: 520,
        productReady: false,
        lastCollectedAt: new Date().toISOString(),
      };
      db.animals.push(a);
      save(db);
      return send(res, 200, { animal: a, cost: price });
    }

    if (p === '/api/fishing/cast' && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      if (u.character.energy < 5) return send(res, 400, { error: 'พลังงานไม่พอ' });
      const db = load();
      const uu = db.users.find((x) => x.id === u.id);
      uu.character.energy -= 5;
      const fish = [
        { id: 'fish_carp', nameTh: 'ปลาตะเพียน' },
        { id: 'fish_golden', nameTh: 'ปลาทอง' },
        { id: 'trash_boot', nameTh: 'รองเท้าเก่า' },
      ];
      const picked = fish[Math.floor(Math.random() * fish.length)];
      const caught = !picked.id.startsWith('trash_');
      if (caught) add(db, u.id, picked.id, 1);
      save(db);
      return send(res, 200, { result: picked, caught, energySpent: 5 });
    }

    if (p === '/api/decor') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      return send(res, 200, {
        decorations: load().decorations.filter((d) => d.farmId === u.farm.id),
        catalog: [
          { id: 'decor_bench', nameTh: 'ม้านั่ง', emoji: '🪑' },
          { id: 'decor_fence', nameTh: 'รั้ว', emoji: '🪵' },
          { id: 'decor_flower', nameTh: 'ดอกไม้', emoji: '🌸' },
          { id: 'decor_fountain', nameTh: 'น้ำพุ', emoji: '⛲' },
        ],
      });
    }
    if (p === '/api/decor/place' && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      const db = load();
      if (!take(db, u.id, b.itemId, 1)) return send(res, 400, { error: 'ไม่มีของ' });
      const d = { id: uid(), farmId: u.farm.id, itemId: b.itemId, x: b.x || 700, y: b.y || 280 };
      db.decorations.push(d);
      save(db);
      return send(res, 200, { decoration: d });
    }

    if (p === '/api/quest/daily')
      return send(res, 200, {
        quests: [],
        userQuests: [
          {
            id: 'q1',
            status: 'active',
            progress: {},
            quest: { id: 'q1', titleTh: 'ปลูกพืช 1 แปลง', descriptionTh: 'ลองปลูก', requirements: { plant: 1 }, rewards: { coin: 30 } },
          },
        ],
      });
    if (p.startsWith('/api/quest/claim/') && req.method === 'POST') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      const db = load();
      add(db, u.id, 'coin', 30);
      save(db);
      return send(res, 200, { ok: true, rewards: { coin: 30 } });
    }

    if (p === '/api/world/state') {
      const h = new Date().getHours();
      return send(res, 200, {
        timeOfDay: h < 11 ? 'morning' : h < 16 ? 'afternoon' : h < 19 ? 'evening' : 'night',
        weather: 'sunny',
        npcs: [
          { id: 'mint', name: 'มิ้นท์', x: 620, y: 280, lines: ['สวัสดีจ้า!'] },
          { id: 'uncle_fish', name: 'ลุงปลา', x: 980, y: 460, lines: ['ลองตกปลาสิ!'] },
        ],
      });
    }

    if (p === '/api/social/players') {
      const u = authUser(req);
      if (!u) return send(res, 401, { error: 'Unauthorized' });
      return send(res, 200, {
        players: load()
          .users.filter((x) => x.id !== u.id)
          .slice(0, 20)
          .map((x) => ({
            id: x.id,
            displayName: x.displayName,
            character: { name: x.character?.name, level: x.character?.level || 1 },
            farm: { name: x.farm?.name },
          })),
      });
    }
    if (p === '/api/social/friend/request') return send(res, 200, { ok: true });
    if (p === '/api/social/friends') return send(res, 200, { friendships: [] });
    if (p.startsWith('/api/social/visit/')) {
      const id = p.split('/').pop();
      const db = load();
      const uu = db.users.find((x) => x.id === id);
      if (!uu?.farm) return send(res, 404, { error: 'ไม่พบ' });
      return send(res, 200, {
        farm: {
          ...uu.farm,
          plots: db.plots.filter((x) => x.farmId === uu.farm.id),
          animals: db.animals.filter((x) => x.farmId === uu.farm.id),
          decorations: db.decorations.filter((x) => x.farmId === uu.farm.id),
          user: { displayName: uu.displayName, character: uu.character },
        },
        readonly: true,
      });
    }


    // ===== ADMIN =====
    if (p === '/api/admin/stats' && req.method === 'GET') {
      const admin = requireAdmin(req);
      if (!admin) return send(res, 403, { error: 'ต้องเป็นแอดมิน' });
      const db = load();
      return send(res, 200, {
        players: db.users.length,
        plots: db.plots.length,
        animals: db.animals.length,
        announcements: db.announcements || [],
      });
    }
    if (p === '/api/admin/players' && req.method === 'GET') {
      const admin = requireAdmin(req);
      if (!admin) return send(res, 403, { error: 'ต้องเป็นแอดมิน' });
      const db = load();
      const players = db.users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role || 'player',
        isBanned: !!u.isBanned,
        loginStreak: u.loginStreak || 0,
        lastLoginAt: u.lastLoginAt,
        level: u.character?.level || 1,
        coins: (db.inventory.find((i) => i.userId === u.id && i.itemId === 'coin') || {}).quantity || 0,
      }));
      return send(res, 200, { players });
    }
    if (p === '/api/admin/ban' && req.method === 'POST') {
      const admin = requireAdmin(req);
      if (!admin) return send(res, 403, { error: 'ต้องเป็นแอดมิน' });
      const db = load();
      const u = db.users.find((x) => x.id === b.userId);
      if (!u) return send(res, 404, { error: 'ไม่พบผู้เล่น' });
      if (u.role === 'admin') return send(res, 400, { error: 'แบนแอดมินไม่ได้' });
      u.isBanned = !!b.ban;
      save(db);
      return send(res, 200, { ok: true, userId: u.id, isBanned: u.isBanned });
    }
    if (p === '/api/admin/give' && req.method === 'POST') {
      const admin = requireAdmin(req);
      if (!admin) return send(res, 403, { error: 'ต้องเป็นแอดมิน' });
      const db = load();
      const u = db.users.find((x) => x.id === b.userId);
      if (!u) return send(res, 404, { error: 'ไม่พบผู้เล่น' });
      const itemId = b.itemId || 'coin';
      const qty = Math.min(99999, Math.max(1, Number(b.quantity) || 1));
      add(db, u.id, itemId, qty);
      save(db);
      return send(res, 200, { ok: true, itemId, quantity: qty });
    }
    if (p === '/api/admin/announce' && req.method === 'POST') {
      const admin = requireAdmin(req);
      if (!admin) return send(res, 403, { error: 'ต้องเป็นแอดมิน' });
      const db = load();
      if (!db.announcements) db.announcements = [];
      const msg = String(b.message || '').slice(0, 200);
      if (!msg) return send(res, 400, { error: 'ใส่ข้อความ' });
      db.announcements.unshift({ id: uid(), message: msg, at: new Date().toISOString(), by: admin.displayName });
      db.announcements = db.announcements.slice(0, 20);
      save(db);
      return send(res, 200, { ok: true, announcements: db.announcements });
    }
    if (p === '/api/announcements' && req.method === 'GET') {
      const db = load();
      return send(res, 200, { announcements: db.announcements || [] });
    }

    send(res, 404, { error: 'Not found ' + p });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: String(e.message || e) });
  }
}

ensureAdmin();
http.createServer(handle).listen(PORT, '0.0.0.0', () => {
  console.log('GVL API ready http://localhost:' + PORT);
  console.log('Admin: rachiytahs@gmail.com');
});
