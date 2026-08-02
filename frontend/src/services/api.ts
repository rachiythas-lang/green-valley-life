import axios from 'axios';

// ใช้ proxy ของ Vite ใน dev (baseURL ว่าง) หรือ VITE_API_URL ถ้าตั้งไว้
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
});

function getToken(): string | null {
  try {
    // หลีกเลี่ยง circular import กับ authStore
    const raw = localStorage.getItem('gvl-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      try {
        localStorage.removeItem('gvl-auth');
      } catch {}
      // ไม่ force reload — ให้หน้าจัดการเอง
    }
    return Promise.reject(err);
  }
);

export default api;
