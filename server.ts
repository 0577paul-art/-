import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "data.json");

// Load data from file or use defaults
let data = {
  bookings: {} as Record<string, Record<string, any>>,
  residents: {
    "13812345678": "3-702",
    "13900001111": "1-101",
    "13788889999": "2-505"
  } as Record<string, string>,
  adminPassword: process.env.ADMIN_PASSWORD || "jiahong888"
};

if (fs.existsSync(DATA_FILE)) {
  try {
    const savedData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data = { ...data, ...savedData };
  } catch (e) {
    console.error("Failed to load data.json, using defaults");
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === data.adminPassword) {
      return res.json({ success: true, token: "admin-token-" + Date.now() });
    }
    res.status(401).json({ error: "用户名或密码错误" });
  });

  app.post("/api/admin/change-password", (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "密码长度至少为6位" });
    }
    data.adminPassword = newPassword;
    saveData();
    res.json({ success: true });
  });

  app.get("/api/bookings", (req, res) => {
    res.json(data.bookings);
  });

  app.get("/api/residents", (req, res) => {
    res.json(data.residents);
  });

  app.post("/api/residents", (req, res) => {
    const { phone, room } = req.body;
    if (!phone || !room) {
      return res.status(400).json({ error: "缺少手机号或房号" });
    }
    data.residents[phone] = room;
    saveData();
    res.json({ success: true });
  });

  app.delete("/api/residents/:phone", (req, res) => {
    const { phone } = req.params;
    console.log(`Deleting resident: ${phone}`);
    if (data.residents[phone]) {
      delete data.residents[phone];
      saveData();
      console.log(`Resident ${phone} deleted successfully`);
      return res.json({ success: true });
    }
    console.log(`Resident ${phone} not found`);
    res.status(404).json({ error: "未找到该住户" });
  });

  app.post("/api/book", (req, res) => {
    const { date, slot, phone } = req.body;
    if (!date || !slot || !phone) {
      return res.status(400).json({ error: "缺少必要信息" });
    }

    const roomNumber = data.residents[phone];
    if (!roomNumber) {
      return res.json({ success: false, error: "非白名单住户，无法预定" });
    }

    // Concurrency Check: Ensure the slot is still available right before writing
    if (!data.bookings[date]) data.bookings[date] = {};
    const isSlotAvailable = !data.bookings[date][slot] || data.bookings[date][slot].Status === 0;
    if (!isSlotAvailable) {
      return res.json({ success: false, error: "该时段已被占用，请刷新重试" });
    }

    const userDayBookings = Object.values(data.bookings[date] || {}).filter(b => b.UserPhone === phone && b.Status !== 0);
    if (userDayBookings.length >= 2) {
      return res.json({ success: false, error: "每户单日限约 2 场" });
    }

    const bookingID = "BK" + Math.random().toString(36).substr(2, 7).toUpperCase();
    
    data.bookings[date][slot] = {
      BookingID: bookingID,
      UserPhone: phone,
      BookingDate: date,
      TimeSlot: slot,
      Status: 1,
      CreatedAt: new Date().toISOString(),
      RoomNumber: roomNumber,
      maskedPhone: phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
    };

    saveData();
    res.json({ success: true, booking: data.bookings[date][slot] });
  });

  app.post("/api/cancel", (req, res) => {
    const { date, slot, phone } = req.body;
    if (data.bookings[date] && data.bookings[date][slot] && data.bookings[date][slot].UserPhone === phone) {
      data.bookings[date][slot].Status = 0;
      saveData();
      return res.json({ success: true });
    }
    res.status(400).json({ error: "取消失败：未找到预定或无权操作" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
