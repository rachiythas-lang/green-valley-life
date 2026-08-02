import Phaser from 'phaser';

const TILE = 48;
const CROP_COLORS: Record<string, number[]> = {
  tomato: [0x6D4C41, 0x66BB6A, 0x43A047, 0xEF5350],
  carrot: [0x6D4C41, 0xAED581, 0xFF9800],
  wheat: [0x6D4C41, 0x9CCC65, 0xFFEE58, 0xF9A825],
  potato: [0x6D4C41, 0x7CB342, 0xD4A574],
  corn: [0x6D4C41, 0x66BB6A, 0x9CCC65, 0xFFEE58, 0xFDD835],
  strawberry: [0x6D4C41, 0xA5D6A7, 0x66BB6A, 0xEC407A],
};
const ANIMAL_COLOR: Record<string, number> = { chicken: 0xFFF9C4, cow: 0xEFEBE9, duck: 0xFFE082 };
const DECOR_EMOJI: Record<string, string> = {
  decor_bench: '🪑', decor_fence: '🪵', decor_flower: '🌸', decor_lamp: '🏮', decor_fountain: '⛲',
};

interface AnimalSpr {
  id: string; type: string; container: Phaser.GameObjects.Container;
  tx: number; ty: number; speed: number; productReady: boolean;
}

export class FarmScene extends Phaser.Scene {
  private farm: any;
  private world: any;
  private player!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: any;
  private plotSprites = new Map<string, Phaser.GameObjects.Container>();
  private animals: AnimalSpr[] = [];
  private onPlotClick!: (x: number, y: number) => void;
  private onNpcClick?: (npcId: string) => void;
  private onAnimalClick?: (animalId: string) => void;
  private onPondClick?: () => void;
  private clouds: Phaser.GameObjects.Rectangle[] = [];
  private rainDrops: Phaser.GameObjects.Rectangle[] = [];
  private bubble?: Phaser.GameObjects.Container;
  private pen = { x: 160, y: 500, w: 280, h: 140 };

  constructor() { super('FarmScene'); }

  create() {
    this.farm = this.registry.get('farm');
    this.world = this.registry.get('world') || {};
    this.onPlotClick = this.registry.get('onPlotClick');
    this.onNpcClick = this.registry.get('onNpcClick');
    this.onAnimalClick = this.registry.get('onAnimalClick');
    this.onPondClick = this.registry.get('onPondClick');
    const weather = this.world.weather || 'sunny';
    const timeOfDay = this.world.timeOfDay || 'morning';

    this.drawSky(timeOfDay, weather);
    this.drawGround();
    this.drawZoneLabels();
    this.drawTrees();
    this.drawHouse();
    this.drawPond();
    this.drawPen();
    this.drawPlots();
    this.drawDecorations();
    this.drawNPCs();
    this.spawnAnimals();
    this.createPlayer();
    this.applyWeatherFX(weather, timeOfDay);

    this.cameras.main.setBounds(0, 0, 1300, 950);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.1);
    this.cameras.main.roundPixels = true;
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D');

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const wx = p.worldX, wy = p.worldY;
      for (const n of (this.world.npcs || [])) {
        if (Math.abs(wx - n.x) < 28 && Math.abs(wy - n.y) < 36) {
          const lines = n.lines || ['สวัสดี!'];
          this.showBubble(n.x, n.y - 48, lines[Math.floor(Math.random() * lines.length)]);
          this.onNpcClick?.(n.id);
          return;
        }
      }
      if (wx > 920 && wx < 1080 && wy > 380 && wy < 480) { this.onPondClick?.(); return; }
      for (const a of this.animals) {
        if (Math.abs(wx - a.container.x) < 22 && Math.abs(wy - a.container.y) < 22) {
          this.onAnimalClick?.(a.id); return;
        }
      }
      const plots = this.farm?.plots || [];
      const maxX = plots.length ? Math.max(...plots.map((pl: any) => pl.x)) : 5;
      const maxY = plots.length ? Math.max(...plots.map((pl: any) => pl.y)) : 3;
      const plotX = Math.floor((wx - 80) / TILE);
      const plotY = Math.floor((wy - 180) / TILE);
      if (plotX >= 0 && plotX <= maxX && plotY >= 0 && plotY <= maxY) this.onPlotClick?.(plotX, plotY);
    });

    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.wanderAnimals() });
    this.time.addEvent({ delay: 40, loop: true, callback: () => {
      this.clouds.forEach((c, i) => { c.x += 0.25 + (i % 3) * 0.04; if (c.x > 1400) c.x = -60; });
      this.rainDrops.forEach((d) => { d.y += 4; if (d.y > 900) { d.y = 100; d.x = Math.random() * 1200; } });
    }});
  }

  drawSky(time: string, weather: string) {
    const skyColors: Record<string, number> = { morning: 0x81D4FA, afternoon: 0x4FC3F7, evening: 0xFF8A65, night: 0x1A237E };
    let col = skyColors[time] || 0x81D4FA;
    if (weather === 'rain' || weather === 'cloudy') col = time === 'night' ? 0x263238 : 0x90A4AE;
    this.add.rectangle(650, 80, 2000, 200, col).setDepth(-20);
    if (time !== 'night' && weather !== 'rain') this.add.rectangle(1080, 50, 36, 36, 0xFFD54F).setDepth(-19);
    else if (time === 'night') {
      this.add.rectangle(1080, 50, 28, 28, 0xFFF9C4).setDepth(-19);
      for (let i = 0; i < 12; i++) this.add.rectangle(80 + Math.random() * 1100, 20 + Math.random() * 100, 2, 2, 0xFFFFFF, 0.9).setDepth(-18);
    }
    for (let i = 0; i < 5; i++) {
      const cx = 100 + i * 250, cy = 35 + (i % 2) * 18, a = weather === 'rain' ? 0.5 : 0.9;
      this.clouds.push(this.add.rectangle(cx, cy, 48, 14, 0xFFFFFF, a).setDepth(-18));
      this.clouds.push(this.add.rectangle(cx + 18, cy - 6, 36, 14, 0xFFFFFF, a).setDepth(-18));
    }
  }

  applyWeatherFX(weather: string, time: string) {
    if (weather === 'rain') {
      for (let i = 0; i < 36; i++) this.rainDrops.push(this.add.rectangle(Math.random() * 1200, 120 + Math.random() * 600, 2, 8, 0xBBDEFB, 0.55).setDepth(25));
    }
    if (time === 'night') this.add.rectangle(650, 500, 2000, 1200, 0x1A237E, 0.2).setDepth(15);
    else if (time === 'evening') this.add.rectangle(650, 500, 2000, 1200, 0xFF8A65, 0.1).setDepth(15);
  }

  drawGround() {
    this.add.rectangle(650, 550, 2000, 950, 0x8BC34A).setDepth(-10);
    for (let gx = 0; gx < 28; gx++) for (let gy = 0; gy < 16; gy++)
      if ((gx + gy) % 4 === 0) this.add.rectangle(gx * 48 + 24, gy * 48 + 200, 44, 44, 0x9CCC65, 0.2).setDepth(-9);
    this.add.rectangle(400, 460, 500, 18, 0xBCAAA4).setDepth(-5);
    this.add.rectangle(700, 300, 18, 200, 0xBCAAA4).setDepth(-5);
  }

  drawZoneLabels() {
    [['🌾 ฟาร์ม', 200, 160], ['🏠 บ้าน', 780, 130], ['💧 น้ำ', 1000, 360], ['🐾 คอก', 280, 485]].forEach(([t, x, y]) => {
      this.add.text(x as number, y as number, t as string, { fontFamily: 'Nunito', fontSize: '11px', color: '#33691E', fontStyle: 'bold', backgroundColor: '#FFF8E1cc', padding: { x: 4, y: 2 } }).setDepth(5);
    });
  }

  drawTrees() {
    [[40, 280], [60, 600], [1150, 250], [1120, 520], [500, 140], [680, 130], [900, 160]].forEach(([x, y], i) => {
      this.add.rectangle(x, y + 14, 12, 26, 0x6D4C41).setDepth(1);
      const leaf = i % 3 === 0 ? 0xEC407A : 0x43A047;
      this.add.rectangle(x, y - 8, 34, 26, leaf).setDepth(1);
      this.add.rectangle(x, y - 22, 24, 16, leaf).setDepth(1);
    });
  }

  drawHouse() {
    const hx = 780, hy = 200;
    this.add.rectangle(hx, hy + 28, 100, 68, 0xFFCC80).setStrokeStyle(3, 0x5D4037).setDepth(2);
    this.add.rectangle(hx, hy - 18, 118, 26, 0xE53935).setDepth(2);
    this.add.rectangle(hx, hy - 34, 78, 18, 0xC62828).setDepth(2);
    this.add.rectangle(hx, hy + 38, 22, 34, 0x5D4037).setDepth(3);
    this.add.rectangle(hx - 28, hy + 18, 16, 16, 0x81D4FA).setStrokeStyle(2, 0x5D4037).setDepth(3);
    this.add.rectangle(hx + 28, hy + 18, 16, 16, 0x81D4FA).setStrokeStyle(2, 0x5D4037).setDepth(3);
  }

  drawPond() {
    this.add.ellipse(1000, 430, 150, 80, 0x4FC3F7, 0.9).setDepth(0);
    this.add.ellipse(990, 420, 50, 22, 0xB3E5FC, 0.5).setDepth(1);
    this.add.text(1000, 480, '🎣 บ่อปลา', { fontFamily: 'Nunito', fontSize: '11px', color: '#1565C0', fontStyle: 'bold' }).setOrigin(0.5).setDepth(2);
  }

  drawPen() {
    const { x, y, w, h } = this.pen;
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xA1887F, 0.35).setStrokeStyle(3, 0x6D4C41).setDepth(0);
    for (let i = 0; i <= 5; i++) {
      this.add.rectangle(x + i * (w / 5), y, 5, 14, 0x8D6E63).setDepth(1);
      this.add.rectangle(x + i * (w / 5), y + h, 5, 14, 0x8D6E63).setDepth(1);
    }
  }

  drawPlots() {
    const startX = 80, startY = 180;
    const plots = this.farm?.plots || [];
    const maxX = plots.length ? Math.max(...plots.map((p: any) => p.x)) : 5;
    const maxY = plots.length ? Math.max(...plots.map((p: any) => p.y)) : 3;
    for (let y = 0; y <= maxY; y++) for (let x = 0; x <= maxX; x++) {
      const plot = plots.find((p: any) => p.x === x && p.y === y);
      const container = this.add.container(startX + x * TILE + TILE / 2, startY + y * TILE + TILE / 2).setDepth(2);
      const bg = this.add.rectangle(0, 0, TILE - 4, TILE - 4, this.plotColor(plot));
      bg.setStrokeStyle(2, 0x5D4037);
      container.add(bg);
      this.drawCrop(container, plot);
      this.plotSprites.set(`${x},${y}`, container);
    }
  }

  plotColor(plot: any) {
    if (!plot) return 0xA1887F;
    if (plot.state === 'empty') return 0xA1887F;
    if (plot.state === 'tilled') return 0x6D4C41;
    if (plot.state === 'ready') return 0x5D4037;
    return 0x4E342E;
  }

  drawCrop(container: Phaser.GameObjects.Container, plot: any) {
    if (!plot?.cropType || plot.state === 'empty' || plot.state === 'tilled') return;
    const colors = CROP_COLORS[plot.cropType] || [0x66BB6A];
    const stage = Math.min(plot.growthStage || 0, colors.length - 1);
    container.add(this.add.rectangle(0, 0, 8 + stage * 5, 8 + stage * 5, colors[stage]));
    if (plot.state === 'ready') {
      const mark = this.add.text(12, -16, '!', { fontFamily: 'Press Start 2P', fontSize: '10px', color: '#FFD600', stroke: '#E65100', strokeThickness: 2 }).setOrigin(0.5);
      container.add(mark);
      this.tweens.add({ targets: mark, y: mark.y - 4, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 });
    }
  }

  updatePlot(plot: any) {
    const c = this.plotSprites.get(`${plot.x},${plot.y}`);
    if (!c) return;
    c.removeAll(true);
    const bg = this.add.rectangle(0, 0, TILE - 4, TILE - 4, this.plotColor(plot));
    bg.setStrokeStyle(2, 0x5D4037);
    c.add(bg);
    this.drawCrop(c, plot);
  }

  drawDecorations() {
    (this.farm?.decorations || []).forEach((d: any) => {
      this.add.text(d.x, d.y, DECOR_EMOJI[d.itemId] || '🪴', { fontSize: '22px' }).setOrigin(0.5).setDepth(4);
    });
  }

  drawNPCs() {
    const npcs = this.world.npcs || [
      { id: 'mint', name: 'มิ้นท์', x: 620, y: 280 },
      { id: 'uncle_fish', name: 'ลุงปลา', x: 980, y: 460 },
    ];
    npcs.forEach((n: any) => {
      const bodyC = n.id === 'mint' ? 0xF48FB1 : 0x42A5F5;
      this.add.rectangle(n.x, n.y + 6, 16, 22, bodyC).setStrokeStyle(2, 0x333).setDepth(6);
      this.add.rectangle(n.x, n.y - 12, 18, 16, 0xFFCC80).setStrokeStyle(2, 0x333).setDepth(6);
      this.add.rectangle(n.x - 4, n.y - 12, 3, 3, 0x212121).setDepth(7);
      this.add.rectangle(n.x + 4, n.y - 12, 3, 3, 0x212121).setDepth(7);
      this.add.text(n.x, n.y + 28, n.name, { fontFamily: 'Nunito', fontSize: '10px', color: '#4E342E', fontStyle: 'bold' }).setOrigin(0.5).setDepth(6);
    });
  }

  showBubble(x: number, y: number, text: string) {
    this.bubble?.destroy();
    this.bubble = this.add.container(x, y).setDepth(40);
    this.bubble.add(this.add.text(0, 0, text, { fontFamily: 'Nunito', fontSize: '11px', color: '#333', backgroundColor: '#FFF8E1', padding: { x: 8, y: 6 }, wordWrap: { width: 160 } }).setOrigin(0.5));
    this.time.delayedCall(3500, () => { this.bubble?.destroy(); this.bubble = undefined; });
  }

  spawnAnimals() {
    (this.farm?.animals || []).forEach((a: any, i: number) => {
      const sx = a.posX || this.pen.x + 40 + (i % 3) * 70;
      const sy = a.posY || this.pen.y + 40 + Math.floor(i / 3) * 50;
      const c = this.makeAnimal(a.type, sx, sy, a.productReady);
      this.animals.push({ id: a.id, type: a.type, container: c, tx: sx, ty: sy, speed: 20 + Math.random() * 20, productReady: !!a.productReady });
    });
  }

  makeAnimal(type: string, x: number, y: number, ready: boolean) {
    const c = this.add.container(x, y).setDepth(5);
    const col = ANIMAL_COLOR[type] || 0xFFF9C4;
    c.add(this.add.ellipse(0, 2, 22, 16, col).setStrokeStyle(2, 0x5D4037));
    c.add(this.add.circle(10, -4, 8, col).setStrokeStyle(2, 0x5D4037));
    c.add(this.add.circle(12, -6, 2, 0x212121));
    if (ready) c.add(this.add.text(0, -18, '!', { fontFamily: 'Press Start 2P', fontSize: '8px', color: '#FFD600' }).setOrigin(0.5));
    return c;
  }

  wanderAnimals() {
    this.animals.forEach((a) => {
      if (Math.random() > 0.4) {
        a.tx = this.pen.x + 20 + Math.random() * (this.pen.w - 40);
        a.ty = this.pen.y + 20 + Math.random() * (this.pen.h - 40);
      }
    });
  }

  createPlayer() {
    const user = this.registry.get('user');
    const char = user?.character;
    this.player = this.add.container(360, 420).setDepth(10);
    const skin = char?.skinTone ? Phaser.Display.Color.HexStringToColor(char.skinTone).color : 0xFFCC80;
    const bodyC = char?.gender === 'female' ? 0xF48FB1 : 0x42A5F5;
    this.player.add(this.add.rectangle(0, 20, 14, 5, 0x000000, 0.2));
    this.player.add(this.add.rectangle(0, 8, 16, 20, bodyC).setStrokeStyle(2, 0x333));
    this.player.add(this.add.rectangle(0, -10, 18, 16, skin).setStrokeStyle(2, 0x333));
    const hair = char?.hairColor ? Phaser.Display.Color.HexStringToColor(char.hairColor).color : 0x5D4037;
    this.player.add(this.add.rectangle(0, -18, 20, 8, hair));
    this.player.add(this.add.rectangle(-4, -10, 3, 3, 0x212121));
    this.player.add(this.add.rectangle(4, -10, 3, 3, 0x212121));
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
  }

  showFloat(wx: number, wy: number, text: string, color = '#FFF176') {
    const t = this.add.text(wx, wy, text, { fontFamily: 'Nunito', fontSize: '14px', color, fontStyle: 'bold', stroke: '#333', strokeThickness: 3 }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: wy - 40, alpha: 0, duration: 1000, onComplete: () => t.destroy() });
  }

  update(_t: number, delta: number) {
    if (!this.player) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = 150;
    body.setVelocity(0);
    if (this.cursors.left.isDown || this.wasd.A.isDown) body.setVelocityX(-speed);
    else if (this.cursors.right.isDown || this.wasd.D.isDown) body.setVelocityX(speed);
    if (this.cursors.up.isDown || this.wasd.W.isDown) body.setVelocityY(-speed);
    else if (this.cursors.down.isDown || this.wasd.S.isDown) body.setVelocityY(speed);
    const dt = delta / 1000;
    this.animals.forEach((a) => {
      const dx = a.tx - a.container.x, dy = a.ty - a.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) { a.container.x += (dx / dist) * a.speed * dt; a.container.y += (dy / dist) * a.speed * dt; }
    });
  }
}
