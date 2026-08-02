/**
 * ส่งบันทึกการเข้าใช้งานไป Google Sheets
 * ผ่าน Google Apps Script Web App URL
 *
 * วิธีตั้งค่า (docs/GOOGLE_SHEETS_SETUP.md):
 * 1. สร้าง Google Sheet ใหม่
 * 2. Extensions → Apps Script วางโค้ดจาก docs
 * 3. Deploy → Web app → Anyone
 * 4. ใส่ URL ใน GOOGLE_SHEETS_WEBHOOK_URL
 */

export interface LoginSheetRow {
  timestamp: string;
  userId: string;
  displayName: string;
  email: string;
  isMorning: boolean;
  loginStreak: number;
  provider: string;
}

export async function syncLoginToGoogleSheets(row: LoginSheetRow): Promise<boolean> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url) {
    console.log('[Sheets] ไม่ได้ตั้ง GOOGLE_SHEETS_WEBHOOK_URL — ข้าม sync');
    return false;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.warn('[Sheets] sync failed', res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Sheets] error', e);
    return false;
  }
}

/** เช้า = 05:00–11:59 ตามเวลาเซิร์ฟเวอร์ (ปรับเป็น Asia/Bangkok ได้) */
export function isMorningLogin(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 5 && hour < 12;
}
