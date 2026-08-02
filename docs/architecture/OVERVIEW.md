# Green Valley Life - Architecture Overview

## ชื่อเกม
Green Valley Life

## Genre
Farming Simulation / Life Simulation / Cozy Multiplayer / Sandbox

## เป้าหมาย MVP (เฟส 1)
- รองรับผู้เล่นพร้อมกัน ~20 คน
- Web + PWA (ติดตั้งเป็นแอปบนมือถือได้)
- ระบบหลัก: Auth, Character, Farm, House พื้นฐาน, Multiplayer (เยี่ยมฟาร์ม + แชท), เศรษฐกิจพื้นฐาน, Daily Quest

## Tech Stack ที่เลือกใช้จริง

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS + Framer Motion
- Phaser 3 (Game Engine สำหรับโลกฟาร์ม)
- Zustand (State Management)
- Socket.IO Client
- Firebase Auth (Client SDK)

### Backend
- Node.js + Express + TypeScript
- Socket.IO (Realtime)
- Prisma + PostgreSQL
- JWT + Firebase Admin (Auth)
- Redis (optional สำหรับ session/rate limit ในอนาคต)

### Storage & Auth
- Firebase Auth (Google, Email, Guest)
- Firebase Storage (Avatar, Cloud Save บางส่วน)
- PostgreSQL เป็นหลักสำหรับ game state

### Payment (เฟสหลัง)
- Stripe + PromptPay (ผ่าน Stripe)

## โครงสร้างโฟลเดอร์หลัก

```
green-valley-life/
├── frontend/          # React + Phaser
├── backend/           # Express + Socket.IO + Prisma
├── database/          # Migration scripts, seed
├── assets/            # Shared assets (หรือ copy ไป frontend)
├── docs/              # เอกสาร
├── scripts/           # Utility scripts
└── admin/             # Admin dashboard (เฟสหลัง)
```

## ระบบหลักในเฟส 1
1. Authentication (Email, Google, Guest)
2. Character Creation & Customization
3. Farm System (ปลูก, รดน้ำ, เก็บเกี่ยว, เวลาเติบโต)
4. House & Basic Decoration
5. Multiplayer (Room-based, Visit Farm, Chat)
6. Inventory + Economy (Coin)
7. Daily Quests
8. Auto Save / Cloud Save

## Scaling สำหรับ 20 คน
- Single Node.js process + Socket.IO เพียงพอ
- PostgreSQL connection pool
- ไม่ต้องใช้ microservices ในตอนนี้
