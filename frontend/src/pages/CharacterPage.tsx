import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

const HAIR_COLORS = ['#4A3728', '#1a1a1a', '#C4A35A', '#E8D5B7', '#8B4513', '#FF6B6B', '#9B59B6'];
const SKIN_TONES = ['#F5D0C5', '#E0AC69', '#C68642', '#8D5524', '#FFDBB4'];
const EYE_COLORS = ['#2E5A1C', '#4A90D9', '#8B4513', '#1a1a1a', '#9B59B6'];

export default function CharacterPage() {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.character?.name || user?.displayName || '',
    gender: user?.character?.gender || 'male',
    hairStyle: user?.character?.hairStyle || 0,
    hairColor: user?.character?.hairColor || HAIR_COLORS[0],
    eyeStyle: user?.character?.eyeStyle || 0,
    eyeColor: user?.character?.eyeColor || EYE_COLORS[0],
    skinTone: user?.character?.skinTone || SKIN_TONES[0],
    outfitTop: user?.character?.outfitTop || 0,
    outfitBottom: user?.character?.outfitBottom || 0,
    shoes: user?.character?.shoes || 0,
  });
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/character', form);
      await fetchMe();
      navigate('/game');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full w-full flex flex-col md:flex-row bg-gradient-to-br from-primary-100 to-sky/20 overflow-auto">
      {/* Preview */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-3xl p-8 w-64 h-80 flex flex-col items-center justify-center relative"
        >
          {/* Simple character preview */}
          <div
            className="w-24 h-24 rounded-full mb-4 border-4 border-white shadow-lg"
            style={{ backgroundColor: form.skinTone }}
          />
          <div
            className="w-28 h-8 rounded-t-full -mt-8 mb-2"
            style={{ backgroundColor: form.hairColor }}
          />
          <div className="flex gap-4 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: form.eyeColor }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: form.eyeColor }} />
          </div>
          <div
            className="w-20 h-16 rounded-lg"
            style={{ backgroundColor: form.gender === 'male' ? '#4DAA57' : '#E879A0' }}
          />
          <p className="mt-4 font-bold text-primary-800 text-lg">{form.name || 'ชื่อของคุณ'}</p>
          <p className="text-sm text-primary-500 capitalize">{form.gender}</p>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <h1 className="text-2xl font-extrabold text-primary-800 mb-6">สร้างตัวละคร</h1>

        <div className="space-y-5 max-w-md">
          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-1">ชื่อ</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              maxLength={16}
              className="w-full px-4 py-2.5 rounded-xl border border-primary-200 bg-white/80 focus:ring-2 focus:ring-primary-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-1">เพศ</label>
            <div className="flex gap-3">
              {['male', 'female'].map((g) => (
                <button
                  key={g}
                  onClick={() => update('gender', g)}
                  className={`flex-1 py-2.5 rounded-xl font-bold transition ${
                    form.gender === g
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/70 text-primary-700 border border-primary-200'
                  }`}
                >
                  {g === 'male' ? 'ชาย' : 'หญิง'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-1">สีผิว</label>
            <div className="flex gap-2 flex-wrap">
              {SKIN_TONES.map((c) => (
                <button
                  key={c}
                  onClick={() => update('skinTone', c)}
                  className={`w-10 h-10 rounded-full border-2 ${
                    form.skinTone === c ? 'border-primary-600 scale-110' : 'border-white'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-1">สีผม</label>
            <div className="flex gap-2 flex-wrap">
              {HAIR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => update('hairColor', c)}
                  className={`w-10 h-10 rounded-full border-2 ${
                    form.hairColor === c ? 'border-primary-600 scale-110' : 'border-white'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-1">
              ทรงผม ({form.hairStyle})
            </label>
            <input
              type="range"
              min={0}
              max={8}
              value={form.hairStyle}
              onChange={(e) => update('hairStyle', Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary-700 mb-1">สีตา</label>
            <div className="flex gap-2 flex-wrap">
              {EYE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => update('eyeColor', c)}
                  className={`w-10 h-10 rounded-full border-2 ${
                    form.eyeColor === c ? 'border-primary-600 scale-110' : 'border-white'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="btn-primary w-full text-lg mt-4 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'เริ่มผจญภัย 🌱'}
          </button>
        </div>
      </div>
    </div>
  );
}
