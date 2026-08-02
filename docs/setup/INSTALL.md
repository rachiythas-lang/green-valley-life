# วิธีติดตั้งและรัน Green Valley Life

## ความต้องการของระบบ
- Node.js 20+
- PostgreSQL 15+
- npm หรือ pnpm
- (แนะนำ) Docker สำหรับ PostgreSQL

## 1. Clone / เข้าโฟลเดอร์โปรเจกต์
```bash
cd green-valley-life
```

## 2. ติดตั้ง Backend
```bash
cd backend
npm install
cp .env.example .env
# แก้ไข DATABASE_URL, JWT_SECRET, FIREBASE ฯลฯ
npx prisma generate
npx prisma db push
npm run dev
```

## 3. ติดตั้ง Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 4. เปิดเบราว์เซอร์
http://localhost:5173

## 5. สร้างเป็น PWA
- Frontend ใช้ Vite PWA plugin แล้ว
- บนมือถือ Chrome/Safari → Add to Home Screen

## Environment Variables สำคัญ

### Backend (.env)
```
DATABASE_URL="postgresql://user:pass@localhost:5432/green_valley"
JWT_SECRET="your-secret"
FIREBASE_PROJECT_ID=
PORT=3001
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

## หมายเหตุ
- ตอนนี้ยังเป็น MVP โครงสร้างหลัก
- ระบบฟาร์มและ Multiplayer ทำงานได้ในระดับพื้นฐาน
- สินทรัพย์ใช้ placeholder สีและรูปเรขาคณิต สามารถแทนที่ได้ทีหลัง
