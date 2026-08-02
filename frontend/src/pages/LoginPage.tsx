import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loginGuest = useAuthStore((s) => s.loginGuest);
  const navigate = useNavigate();

  const handleGuest = async () => {
    setLoading(true);
    setError('');
    try {
      await loginGuest(name || undefined);
      navigate('/character');
    } catch (e: any) {
      setError(e.response?.data?.error || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full w-full flex items-center justify-center bg-gradient-to-br from-primary-100 via-sky/50 to-accent/40 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-10 left-10 w-40 h-40 bg-primary-300/40 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-60 h-60 bg-sky/30 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass rounded-3xl p-8 md:p-10 w-[90%] max-w-md z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-6xl mb-3"
          >
            🌱
          </motion.div>
          <h1 className="text-3xl font-extrabold text-primary-800 tracking-tight">
            Green Valley Life
          </h1>
          <p className="text-primary-600 mt-2 font-medium">
            ชีวิตในหุบเขาเขียวขจี • Cozy Farming Multiplayer
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-1.5">
              ชื่อของคุณ (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ชาวนาตัวน้อย"
              maxLength={16}
              className="w-full px-4 py-3 rounded-2xl border border-primary-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-400 text-primary-900 placeholder:text-primary-300"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center font-medium">{error}</p>
          )}

          <button
            onClick={handleGuest}
            disabled={loading}
            className="btn-primary w-full text-lg disabled:opacity-60"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เล่นเลย (Guest)'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white/70 text-primary-500">หรือ</span>
            </div>
          </div>

          <button
            disabled
            className="btn-secondary w-full opacity-60 cursor-not-allowed"
          >
            เข้าสู่ระบบด้วย Google (เร็ว ๆ นี้)
          </button>
        </div>

        <p className="text-center text-xs text-primary-500 mt-6">
          เวอร์ชัน MVP • รองรับผู้เล่นพร้อมกัน ~20 คน
        </p>
      </motion.div>
    </div>
  );
}
