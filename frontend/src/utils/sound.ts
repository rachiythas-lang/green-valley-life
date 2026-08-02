/**
 * เสียงประกอบแบบง่ายด้วย Web Audio API
 * ไม่ต้องมีไฟล์เสียงภายนอก — สร้าง tone เอง
 */

let ctx: AudioContext | null = null;
let muted = false;
let bgmInterval: number | null = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
  if (muted) stopBgm();
}

export function isMuted() {
  return muted;
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
  if (muted) return;
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {}
}

export const sfx = {
  click: () => beep(600, 0.06, 'square', 0.05),
  till: () => beep(180, 0.12, 'triangle', 0.1),
  plant: () => {
    beep(400, 0.08, 'sine', 0.07);
    setTimeout(() => beep(520, 0.1, 'sine', 0.06), 80);
  },
  water: () => beep(700, 0.15, 'sine', 0.05),
  harvest: () => {
    beep(523, 0.1, 'sine', 0.08);
    setTimeout(() => beep(659, 0.1, 'sine', 0.08), 100);
    setTimeout(() => beep(784, 0.15, 'sine', 0.08), 200);
  },
  buy: () => {
    beep(440, 0.08, 'square', 0.06);
    setTimeout(() => beep(660, 0.12, 'square', 0.06), 90);
  },
  error: () => beep(150, 0.2, 'sawtooth', 0.06),
  success: () => {
    beep(523, 0.08, 'sine', 0.07);
    setTimeout(() => beep(784, 0.15, 'sine', 0.07), 100);
  },
  collect: () => beep(880, 0.1, 'triangle', 0.06),
};

/** BGM เบา ๆ แบบ loop โน้ตง่าย */
export function startBgm() {
  if (muted || bgmInterval) return;
  const notes = [262, 294, 330, 294, 262, 294, 349, 330]; // C D E D C D F E
  let i = 0;
  bgmInterval = window.setInterval(() => {
    if (muted) return;
    beep(notes[i % notes.length], 0.35, 'sine', 0.025);
    i++;
  }, 500);
}

export function stopBgm() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}
