import Phaser from 'phaser';

const TILE = 64;

const CROP_COLORS: Record<string, number[]> = {
  tomato: [0x8B4513, 0x66BB6A, 0x43A047, 0xEF5350],
  carrot: [0x8B4513, 0xAED581, 0xFFA726],
  wheat: [0x8B4513, 0x9CCC65, 0xFFEE58, 0xF9A825],
  potato: [0x8B4513, 0x7CB342, 0xD4A574],
  corn: [0x8B4513, 0x66BB6A, 0x9CCC65, 0xFFEE58, 0xFDD835],
  strawberry: [0x8B4513, 0xA5D6A7, 0x66BB6A, 0xEC407A],
};

const ANIMAL_COLORS: Record<string, number> = {
  chicken: 0xFFF9C4, cow: 0xEFEBE9, pig: 0xF8BBD9,
  sheep: 0xFAFAFA, duck: 0xFFE082, rabbit: 0xD7CCC8,
};

interface AnimalSprite {
  id: string; type: string;
  container: Phaser.GameObjects.Container;
  targetX: number; targetY: number; speed: number;
}

export class FarmScene extends Phaser.Scene {
  private farm: any;
  private player!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;
  private plotSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private animalSprites: AnimalSprite[] = [];
  private onPlotClick!: (x: number, y: number) => void;
  private onPlayerMove!: (x: number, y: number) => void;
  private onFloatText?: (x: number, y: number, text: string, color: string) => void;
  private lastEmit = 0;
  private animalArea = { x: 150, y: 500, w: 420, h: 170 };
  private timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
  private sky!: Phaser.GameObjects.Rectangle;
  private sunMoon!: Phaser.GameObjects.Arc;
  private clouds: Phaser.GameObjects.Ellipse[] = [];
  private floatTexts: Phaser.GameObjects.Text[] = [];

  constructor() { super('FarmScene'); }

  create() {
    this.farm = this.registry.get('farm');
    this.onPlotClick = this.registry.get('onPlotClick');
    this.onPlayerMove = this.registry.get('onPlayerMove');
    this.onFloatText = this.registry.get('onFloatText');

    // เวลาวันจากนาฬิกาจริง
    const h = new Date().getHours();
    if (h >= 5 && h < 11) this.timeOfDay = 'morning';
    else if (h >= 11 && h < 16) this.timeOfDay = 'afternoon';
    else if (h >= 16 && h < 19) this.timeOfDay = 'evening';
    else this.timeOfDay = 'night';

    this.drawSky();
    this.drawGround();
    this.drawDecorations();
    this.drawAnimalPen();
    this.drawPlots();
    this.drawHouse();
    this.drawPond();
    this.drawMineEntrance();
    this.drawNPCs();
    this.spawnAnimals();
    this.createPlayer();

    this.cameras.main.setBounds(0, 0, 1400, 1000);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);
    this.applyDayTint();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D');

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;
      const plots = this.farm?.plots || [];
      const maxX = plots.length ? Math.max(...plots.map((p: any) => p.x)) : 5;
      const maxY = plots.length ? Math.max(...plots.map((p: any) => p.y)) : 3;
      const plotX = Math.floor((worldX - 100) / TILE);
      const plotY = Math.floor((worldY - 200) / TILE);
      if (plotX >= 0 && plotX <= maxX && plotY >= 0 && plotY <= maxY) {
        this.onPlotClick?.(plotX, plotY);
      }
    });

    this.time.addEvent({ delay: 2200, loop: true, callback: () => this.randomizeAnimalTargets() });
    this.time.addEvent({ delay: 50, loop: true, callback: () => this.animateClouds() });
  }

  drawSky() {
    const colors: Record<string, number> = {
      morning: 0x81D4FA, afternoon: 0x4FC3F7, evening: 0xFF8A65, night: 0x1A237E,
    };
    this.sky = this.add.rectangle(700, 80, 2000, 220, colors[this.timeOfDay]).setDepth(-10);

    // ดวงอาทิตย์ / พระจันทร์
    const isNight = this.timeOfDay === 'night';
    this.sunMoon = this.add.circle(1100, 70, isNight ? 28 : 36, isNight ? 0xFFF9C4 : 0xFFD54F).setDepth(-9);
    if (!isNight) {
      this.add.circle(1100, 70, 50, 0xFFE082, 0.25).setDepth(-9);
    }

    // เมฆ
    for (let i = 0; i < 5; i++) {
      const c = this.add.ellipse(150 + i * 220, 40 + (i % 3) * 25, 90 + i * 10, 36, 0xFFFFFF, 0.55).setDepth(-8);
      this.clouds.push(c);
    }

    // ดาวตอนกลางคืน
    if (this.timeOfDay === 'night') {
      for (let i = 0; i < 20; i++) {
        this.add.circle(80 + Math.random() * 1200, 20 + Math.random() * 120, 1.5, 0xFFFFFF, 0.8).setDepth(-8);
      }
    }
  }

  drawGround() {
    // หญ้าหลายโทน
    this.add.rectangle(700, 600, 2000, 900, 0x81C784).setDepth(-5);
    // เนินเบา ๆ
    this.add.ellipse(300, 380, 400, 80, 0x66BB6A, 0.35).setDepth(-4);
    this.add.ellipse(900, 420, 350, 70, 0x66BB6A, 0.3).setDepth(-4);
  }

  drawDecorations() {
    // ต้นไม้
    const trees = [
      [50, 320], [60, 600], [1280, 300], [1250, 550], [500, 160], [950, 170],
    ];
    trees.forEach(([x, y]) => {
      this.add.rectangle(x, y + 20, 14, 36, 0x6D4C41).setDepth(1);
      this.add.circle(x, y - 10, 28, 0x43A047).setDepth(1);
      this.add.circle(x - 12, y, 18, 0x66BB6A).setDepth(1);
      this.add.circle(x + 12, y, 18, 0x66BB6A).setDepth(1);
    });

    // ดอกไม้
    const flowerColors = [0xEF5350, 0xFFCA28, 0xAB47BC, 0x42A5F5, 0xEC407A];
    for (let i = 0; i < 18; i++) {
      const fx = 80 + Math.random() * 1200;
      const fy = 350 + Math.random() * 280;
      // ข้ามโซนแปลงปลูกคร่าว ๆ
      if (fx > 90 && fx < 520 && fy > 190 && fy < 480) continue;
      this.add.circle(fx, fy, 4, flowerColors[i % flowerColors.length]).setDepth(0);
      this.add.rectangle(fx, fy + 6, 2, 8, 0x2E7D32).setDepth(0);
    }

    // ทางเดิน
    this.add.rectangle(400, 470, 500, 18, 0xD7CCC8, 0.7).setDepth(0);
  }

  drawPond() {
    const px = 1050, py = 420;
    this.add.ellipse(px, py, 140, 70, 0x4FC3F7, 0.85).setDepth(0);
    this.add.ellipse(px - 10, py - 5, 50, 20, 0xB3E5FC, 0.5).setDepth(1);
    this.add.text(px, py + 45, '🎣 บ่อตกปลา', {
      fontSize: '11px', color: '#1565C0', fontFamily: 'Nunito',
    }).setOrigin(0.5).setDepth(2);
  }

  drawMineEntrance() {
    const mx = 1200, my = 220;
    this.add.rectangle(mx, my + 10, 70, 50, 0x5D4037).setDepth(1);
    this.add.ellipse(mx, my - 15, 80, 40, 0x455A64).setDepth(1);
    this.add.ellipse(mx, my + 5, 36, 28, 0x212121).setDepth(2);
    this.add.text(mx, my + 50, '⛏️ เหมือง', {
      fontSize: '11px', color: '#37474F', fontFamily: 'Nunito',
    }).setOrigin(0.5).setDepth(2);
  }

  drawNPCs() {
    // NPC แม่ค้า
    const nx = 620, ny = 280;
    this.add.circle(nx, ny - 18, 14, 0xFFCC80).setDepth(3); // หัว
    this.add.rectangle(nx, ny + 6, 22, 28, 0xEC407A).setDepth(3); // ตัว
    this.add.ellipse(nx, ny - 26, 26, 12, 0x6D4C41).setDepth(3); // ผม
    this.add.text(nx, ny + 28, 'ร้านของมิ้นท์', {
      fontSize: '10px', color: '#AD1457', fontFamily: 'Nunito',
    }).setOrigin(0.5).setDepth(3);

    // NPC ชาวประมง
    const fx = 980, fy = 480;
    this.add.circle(fx, fy - 18, 14, 0xFFCC80).setDepth(3);
    this.add.rectangle(fx, fy + 6, 22, 28, 0x42A5F5).setDepth(3);
    this.add.text(fx, fy + 28, 'ลุงปลา', {
      fontSize: '10px', color: '#1565C0', fontFamily: 'Nunito',
    }).setOrigin(0.5).setDepth(3);
  }

  drawAnimalPen() {
    const { x, y, w, h } = this.animalArea;
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xA1887F, 0.4).setStrokeStyle(3, 0x6D4C41).setDepth(0);
    // รั้วไม้สั้น ๆ
    for (let i = 0; i <= 6; i++) {
      this.add.rectangle(x + i * (w / 6), y, 6, 16, 0x8D6E63).setDepth(1);
      this.add.rectangle(x + i * (w / 6), y + h, 6, 16, 0x8D6E63).setDepth(1);
    }
    this.add.text(x + 8, y - 20, '🐾 คอกสัตว์', {
      fontSize: '12px', color: '#5D4037', fontFamily: 'Nunito', fontStyle: 'bold',
    }).setDepth(2);
  }

  spawnAnimals() {
    const animals = this.farm?.animals || [];
    animals.forEach((a: any, i: number) => {
      const startX = this.animalArea.x + 40 + (i % 4) * 90;
      const startY = this.animalArea.y + 40 + Math.floor(i / 4) * 55;
      const container = this.createAnimalSprite(a.type, startX, startY);
      this.animalSprites.push({
        id: a.id, type: a.type, container,
        targetX: startX, targetY: startY, speed: 18 + Math.random() * 22,
      });
    });
  }

  createAnimalSprite(type: string, x: number, y: number) {
    const container = this.add.container(x, y).setDepth(4);
    const color = ANIMAL_COLORS[type] || 0xEEEEEE;
    const body = this.add.ellipse(0, 2, 30, 22, color);
    body.setStrokeStyle(2, 0x5D4037);
    const head = this.add.circle(13, -6, 11, color);
    head.setStrokeStyle(2, 0x5D4037);
    const eyeL = this.add.circle(15, -8, 2.5, 0x212121);
    const eyeR = this.add.circle(19, -8, 2.5, 0x212121);
    const cheek = this.add.circle(11, -4, 3, 0xFFAB91, 0.5);
    container.add([body, head, eyeL, eyeR, cheek]);
    return container;
  }

  randomizeAnimalTargets() {
    const { x, y, w, h } = this.animalArea;
    this.animalSprites.forEach((a) => {
      if (Math.random() > 0.35) {
        a.targetX = x + 25 + Math.random() * (w - 50);
        a.targetY = y + 25 + Math.random() * (h - 50);
      }
    });
  }

  addAnimal(animal: any) {
    const startX = this.animalArea.x + 40 + Math.random() * 300;
    const startY = this.animalArea.y + 40 + Math.random() * 100;
    const container = this.createAnimalSprite(animal.type, startX, startY);
    this.animalSprites.push({
      id: animal.id, type: animal.type, container,
      targetX: startX, targetY: startY, speed: 18 + Math.random() * 22,
    });
  }

  drawPlots() {
    const startX = 100, startY = 200;
    const plots = this.farm?.plots || [];
    const maxX = plots.length ? Math.max(...plots.map((p: any) => p.x)) : 5;
    const maxY = plots.length ? Math.max(...plots.map((p: any) => p.y)) : 3;

    for (let y = 0; y <= maxY; y++) {
      for (let x = 0; x <= maxX; x++) {
        const plot = plots.find((p: any) => p.x === x && p.y === y);
        const container = this.add.container(
          startX + x * TILE + TILE / 2,
          startY + y * TILE + TILE / 2
        ).setDepth(2);

        const bg = this.add.rectangle(0, 0, TILE - 6, TILE - 6, this.getPlotColor(plot));
        bg.setStrokeStyle(2, 0x5D4037);
        container.add(bg);

        this.drawCropOnPlot(container, plot);
        this.plotSprites.set(`${x},${y}`, container);
      }
    }
  }

  drawCropOnPlot(container: Phaser.GameObjects.Container, plot: any) {
    if (!plot) return;
    if (plot.cropType && plot.state !== 'empty' && plot.state !== 'tilled') {
      const colors = CROP_COLORS[plot.cropType] || [0x66BB6A];
      const stage = Math.min(plot.growthStage || 0, colors.length - 1);
      const r = 10 + stage * 5;
      const crop = this.add.circle(0, 0, r, colors[stage]);
      container.add(crop);

      // พร้อมเก็บ — กระพริบ + เครื่องหมาย !
      if (plot.state === 'ready') {
        const bang = this.add.text(16, -20, '!', {
          fontSize: '18px', color: '#FFD600', fontFamily: 'Nunito', fontStyle: 'bold',
          stroke: '#F57F17', strokeThickness: 3,
        }).setOrigin(0.5);
        container.add(bang);
        this.tweens.add({
          targets: bang, y: bang.y - 6, alpha: 0.5,
          duration: 500, yoyo: true, repeat: -1,
        });
        this.tweens.add({
          targets: crop, scaleX: 1.08, scaleY: 1.08,
          duration: 600, yoyo: true, repeat: -1,
        });
      }
    }
    if (plot.wateredAt && plot.state !== 'ready' && plot.state !== 'empty') {
      container.add(this.add.circle(18, -16, 5, 0x42A5F5, 0.75));
    }
    if (plot.fertilized) {
      container.add(this.add.circle(-18, -16, 5, 0x8BC34A, 0.8));
    }
  }

  getPlotColor(plot: any): number {
    if (!plot) return 0xBCAAA4;
    switch (plot.state) {
      case 'empty': return 0xBCAAA4;
      case 'tilled': return 0x8D6E63;
      case 'planted':
      case 'growing': return 0x6D4C41;
      case 'ready': return 0x5D4037;
      default: return 0xBCAAA4;
    }
  }

  updatePlot(plot: any) {
    const key = `${plot.x},${plot.y}`;
    const container = this.plotSprites.get(key);
    if (!container) return;
    container.removeAll(true);
    const bg = this.add.rectangle(0, 0, TILE - 6, TILE - 6, this.getPlotColor(plot));
    bg.setStrokeStyle(2, 0x5D4037);
    container.add(bg);
    this.drawCropOnPlot(container, plot);
  }

  /** ตัวเลขลอยในโลกเกม */
  showFloat(worldX: number, worldY: number, text: string, color = '#FFF176') {
    const t = this.add.text(worldX, worldY, text, {
      fontSize: '16px', color, fontFamily: 'Nunito', fontStyle: 'bold',
      stroke: '#333', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: t, y: worldY - 50, alpha: 0, duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  drawHouse() {
    const hx = 720, hy = 140;
    this.add.rectangle(hx, hy + 40, 130, 90, 0xFFE0B2).setStrokeStyle(3, 0x5D4037).setDepth(2);
    this.add.triangle(hx, hy - 25, 0, 45, -90, 45, 90, 45, 0xE53935).setDepth(2);
    this.add.rectangle(hx, hy + 55, 32, 45, 0x6D4C41).setDepth(3);
    this.add.rectangle(hx - 38, hy + 28, 26, 26, 0x81D4FA).setStrokeStyle(2, 0x5D4037).setDepth(3);
    this.add.rectangle(hx + 38, hy + 28, 26, 26, 0x81D4FA).setStrokeStyle(2, 0x5D4037).setDepth(3);
    // ปล่องควัน
    this.add.rectangle(hx + 40, hy - 30, 14, 28, 0x795548).setDepth(2);
    this.add.text(hx, hy + 100, '🏠 บ้านอุ่นใจ', {
      fontSize: '12px', color: '#5D4037', fontFamily: 'Nunito', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);
  }

  createPlayer() {
    const user = this.registry.get('user');
    const char = user?.character;
    this.player = this.add.container(400, 450).setDepth(10);

    const skin = char?.skinTone
      ? Phaser.Display.Color.HexStringToColor(char.skinTone).color : 0xFFCC80;
    const hair = char?.hairColor
      ? Phaser.Display.Color.HexStringToColor(char.hairColor).color : 0x5D4037;

    // เงา
    this.player.add(this.add.ellipse(0, 28, 24, 8, 0x000000, 0.2));
    // ตัว
    const bodyColor = char?.gender === 'female' ? 0xF48FB1 : 0x66BB6A;
    this.player.add(this.add.rectangle(0, 10, 26, 32, bodyColor).setStrokeStyle(2, 0x333333));
    // หัวกลมตาโต
    this.player.add(this.add.circle(0, -18, 16, skin).setStrokeStyle(2, 0x333333));
    // ผม
    this.player.add(this.add.ellipse(0, -28, 32, 16, hair));
    // ตาโต
    this.player.add(this.add.circle(-5, -18, 3.5, 0x212121));
    this.player.add(this.add.circle(5, -18, 3.5, 0x212121));
    this.player.add(this.add.circle(-4, -19, 1.2, 0xFFFFFF));
    this.player.add(this.add.circle(6, -19, 1.2, 0xFFFFFF));
    // แก้ม
    this.player.add(this.add.circle(-10, -12, 3, 0xFFAB91, 0.55));
    this.player.add(this.add.circle(10, -12, 3, 0xFFAB91, 0.55));

    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
  }

  applyDayTint() {
    const tints: Record<string, number> = {
      morning: 0xFFFFFF, afternoon: 0xFFFDE7, evening: 0xFFE0B2, night: 0x9FA8DA,
    };
    // soft overlay
    if (this.timeOfDay === 'night') {
      this.add.rectangle(700, 500, 2000, 1200, 0x1A237E, 0.18).setDepth(15).setScrollFactor(0);
    } else if (this.timeOfDay === 'evening') {
      this.add.rectangle(700, 500, 2000, 1200, 0xFF8A65, 0.08).setDepth(15).setScrollFactor(0);
    }
  }

  animateClouds() {
    this.clouds.forEach((c, i) => {
      c.x += 0.15 + i * 0.02;
      if (c.x > 1500) c.x = -100;
    });
  }

  update(_time: number, delta: number) {
    if (!this.player) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = 170;
    body.setVelocity(0);

    let moving = false;
    if (this.cursors.left.isDown || this.wasd.A.isDown) { body.setVelocityX(-speed); moving = true; }
    else if (this.cursors.right.isDown || this.wasd.D.isDown) { body.setVelocityX(speed); moving = true; }
    if (this.cursors.up.isDown || this.wasd.W.isDown) { body.setVelocityY(-speed); moving = true; }
    else if (this.cursors.down.isDown || this.wasd.S.isDown) { body.setVelocityY(speed); moving = true; }

    // bounce ตอนเดิน
    if (moving) {
      this.player.scaleY = 1 + Math.sin(Date.now() / 80) * 0.04;
    } else {
      this.player.scaleY = 1;
    }

    const dt = delta / 1000;
    this.animalSprites.forEach((a) => {
      const dx = a.targetX - a.container.x;
      const dy = a.targetY - a.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        a.container.x += (dx / dist) * a.speed * dt;
        a.container.y += (dy / dist) * a.speed * dt;
        a.container.scaleY = 1 + Math.sin(Date.now() / 100 + a.container.x) * 0.05;
      }
    });

    const now = Date.now();
    if (now - this.lastEmit > 100) {
      this.onPlayerMove?.(this.player.x, this.player.y);
      this.lastEmit = now;
    }
  }
}
