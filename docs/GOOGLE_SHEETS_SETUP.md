# ตั้งค่าบันทึก Login เช้า → Google Sheets

## 1. สร้าง Google Sheet
1. ไปที่ https://docs.google.com/spreadsheets/
2. สร้างสเปรดชีตใหม่ ชื่อเช่น `Green Valley Logins`
3. แถวแรกใส่หัวตาราง:
   `timestamp | userId | displayName | email | isMorning | loginStreak | provider`

## 2. สร้าง Apps Script
1. ในชีต: **Extensions → Apps Script**
2. ลบโค้ดเดิม แล้ววาง:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.userId || '',
      data.displayName || '',
      data.email || '',
      data.isMorning ? 'YES' : 'NO',
      data.loginStreak || 0,
      data.provider || ''
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. คัดลอก **Web app URL**

## 3. ใส่ URL ใน Backend
ใน `backend/.env`:

```
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/XXXX/exec
```

รีสตาร์ท backend ทุกครั้งที่มีคน login (โดยเฉพาะช่วงเช้า 05:00–12:00) จะถูก append ลงชีตอัตโนมัติ

## หมายเหตุ
- เช้า = ชั่วโมง 5–11 ตามเวลาเซิร์ฟเวอร์
- โบนัสในเกม: +50 เหรียญ เมื่อ login ตอนเช้า
- ถ้าไม่ใส่ URL ระบบยังทำงานได้ แค่ไม่ sync ชีต
