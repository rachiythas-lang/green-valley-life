import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from '../utils/sound';

const STEPS = [
  {
    title: 'ยินดีต้อนรับสู่หุบเขาเขียว! 🌱',
    body: 'ที่นี่อากาศดี นกร้อง และฟาร์มของคุณกำลังรอการดูแล — มาเริ่มวันแรกกันเถอะ!',
    emoji: '🏡',
  },
  {
    title: 'เครื่องมือมหัศจรรย์',
    body: '🪓 ไถดิน → 🌱 ปลูก → 💧 รดน้ำ → 🌿 ปุ๋ย → ✋ เก็บเกี่ยวเมื่อเห็นเครื่องหมาย !',
    emoji: '🛠️',
  },
  {
    title: 'โลกมีชีวิต',
    body: 'เดินเล่นด้วย WASD · สัตว์เดินในคอก · มีบ่อตกปลา เหมือง และ NPC อยู่รอบฟาร์ม',
    emoji: '🌤️',
  },
  {
    title: 'ภารกิจมุมบน',
    body: 'ดูเควสรายวันที่แถบบนจอ กดเพื่อเปิดและรับรางวัล — เล่นนิดเดียวก็ได้ของ!',
    emoji: '📜',
  },
  {
    title: 'พร้อมลุยแล้ว!',
    body: 'ลองปลูกพืชแปลงแรก แล้วฟังเสียงฉลองตอนเก็บเกี่ยว — ขอให้มีความสุขใน Green Valley 💛',
    emoji: '✨',
  },
];

interface Props { onFinish: () => void; }

export default function Tutorial({ onFinish }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    sfx.click();
    if (isLast) {
      localStorage.setItem('gvl-tutorial-done', '1');
      onFinish();
    } else setStep((s) => s + 1);
  };

  const skip = () => {
    sfx.click();
    localStorage.setItem('gvl-tutorial-done', '1');
    onFinish();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-300/40 via-sky/30 to-accent/20 pointer-events-auto backdrop-blur-[2px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="glass rounded-3xl p-6 md:p-8 w-[90%] max-w-md text-center shadow-xl border-2 border-white/60"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.6 }}
            className="text-5xl mb-4"
          >
            {current.emoji}
          </motion.div>
          <h2 className="text-xl font-extrabold text-primary-800 mb-2">{current.title}</h2>
          <p className="text-primary-600 text-sm leading-relaxed mb-6">{current.body}</p>
          <div className="flex justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'bg-primary-500 w-5' : 'bg-primary-200 w-2'}`} />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={skip} className="btn-secondary flex-1 text-sm">ข้าม</button>
            <button onClick={next} className="btn-primary flex-1 text-sm">
              {isLast ? 'เริ่มผจญภัย 🌱' : 'ถัดไป'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
