# 🌱 Green Valley Life v1.1.0-MVP

**Cozy · สดใส · น่าเล่นขึ้น**

## ของใหม่ใน v1.1 (ชุด “สดใส”)
- 🌤️ ฉากฟาร์มใหม่: ท้องฟ้าตามเวลา, เมฆเคลื่อน, ต้นไม้ ดอกไม้ ทางเดิน
- 🏠 บ้าน + บ่อตกปลา + ทางเข้าเหมือง + NPC บนแมพ
- 🧑‍🌾 ตัวละครตาโต มี bounce ตอนเดิน · สัตว์น่ารักขึ้น
- ✨ พืชพร้อมเก็บมีเครื่องหมาย ! กระพริบ
- 🔢 ตัวเลขลอยตอนปลูก/เก็บเกี่ยว
- 📜 เควสรายวันโชว์บนจอหลัก
- ⏱️ พืชโตเร็วขึ้นสำหรับช่วงแรก
- 🎨 พื้นหลัง UI โทนพาสเทลสดใส

## ระบบครบ MVP
ฟาร์ม · สัตว์ · บ้าน · ร้าน · เควส · ตกปลา · เหมือง · คราฟ · Multiplayer · Ranking · Tutorial · เสียง · Auto-save · PWA

## รัน
```bash
docker run --name gvl-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=green_valley_life -p 5432:5432 -d postgres:16
cd backend && npm install && npx prisma generate && npx prisma db push && npm run dev
cd frontend && npm install && npm run dev
```
http://localhost:5173
