# 🌱 Green Valley Life v1.4 — รันง่าย

**ไม่ต้อง Docker / PostgreSQL / Prisma**  
Backend เป็น Node ล้วน เก็บข้อมูลในไฟล์ `backend/data/db.json`

## รัน (2 เทอร์มินัล)

### 1) Backend
```bash
cd green-valley-life/backend
node src/server.js
```
ต้องเห็น: `GVL API ready http://localhost:3001`

### 2) Frontend
```bash
cd green-valley-life/frontend
npm install
npm run dev
```
เปิด http://localhost:5173 → กด **Guest** หรือสมัคร

## ถ้าเข้าเกมไม่ได้
1. เปิด http://localhost:3001/health ต้องขึ้น `{"status":"ok"}`
2. ถ้าไม่ขึ้น = backend ยังไม่รัน
3. หน้าเกมขึ้น error = กด "ลองใหม่" หลัง backend พร้อม
4. ล้าง cache: DevTools → Application → Local Storage → ลบ `gvl-auth`

## ระบบที่มี
- ล็อกอิน Email / Guest
- ฟาร์ม ไถ ปลูก รดน้ำ เก็บ
- ไก่ / ตกปลา / ร้าน / ของขวัญรายวัน / แต่งบ้าน / เควส / เพื่อน
