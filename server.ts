import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("soulmatch.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    dob TEXT NOT NULL,
    city TEXT NOT NULL,
    job TEXT,
    description TEXT,
    hobbies TEXT,
    desires TEXT,
    gender TEXT,
    orientation TEXT,
    is_paid INTEGER DEFAULT 0,
    looking_for_gender TEXT,
    looking_for_job TEXT,
    looking_for_hobbies TEXT,
    looking_for_city TEXT,
    looking_for_age_min INTEGER,
    looking_for_age_max INTEGER,
    looking_for_height TEXT,
    looking_for_body_type TEXT,
    looking_for_other TEXT,
    photo_url TEXT,
    id_document_url TEXT,
    photos TEXT,
    body_type TEXT,
    height_cm INTEGER,
    province TEXT,
    conosciamoci_meglio TEXT
  );
`);

// Migrazione colonne mancanti SQLite
const migrateColumns = () => {
  const columns = [
    { name: 'province', type: 'TEXT' },
    { name: 'conosciamoci_meglio', type: 'TEXT' },
    { name: 'height_cm', type: 'INTEGER' },
    { name: 'body_type', type: 'TEXT' },
    { name: 'photos', type: 'TEXT' },
    { name: 'looking_for_other', type: 'TEXT' },
    { name: 'is_blocked', type: 'INTEGER DEFAULT 0' },
    { name: 'is_suspended', type: 'INTEGER DEFAULT 0' },
    { name: 'is_validated', type: 'INTEGER DEFAULT 0' }
  ];

  for (const col of columns) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Ignora errore se la colonna esiste già
    }
  }
};
migrateColumns();

db.exec(`
  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'like' or 'heart'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_user_id, to_user_id, type)
  );

  CREATE TABLE IF NOT EXISTS chat_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_user_id, to_user_id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    photos TEXT NOT NULL, -- JSON array of base64 strings
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS post_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'like' or 'heart'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id, type),
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS banner_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS banner_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    banner_message_id INTEGER NOT NULL,
    from_user_id INTEGER NOT NULL,
    reply_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(banner_message_id) REFERENCES banner_messages(id),
    FOREIGN KEY(from_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Ensure columns exist (for schema evolution)
try {
  db.prepare("ALTER TABLE users ADD COLUMN province TEXT").run();
} catch (e) { }
try {
  db.prepare("ALTER TABLE users ADD COLUMN conosciamoci_meglio TEXT").run();
} catch (e) { }
try {
  db.prepare("ALTER TABLE chat_requests ADD COLUMN message TEXT").run();
} catch (e) { }
try {
  db.prepare("ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0").run();
} catch (e) { }
try {
  db.prepare("ALTER TABLE users ADD COLUMN height_cm INTEGER").run();
} catch (e) { }
try {
  db.prepare("ALTER TABLE users ADD COLUMN body_type TEXT").run();
} catch (e) { }

// Initialize site settings if empty
const checkSettings = db.prepare("SELECT count(*) as count FROM site_settings").get() as { count: number };
if (checkSettings.count === 0) {
  const defaultSlider = [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=2000&auto=format&fit=crop"
  ];
  db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)").run('home_slider', JSON.stringify(defaultSlider));
}

// Seed Data
const seedUsers = [
  { name: 'Giulia', surname: 'Bianchi', dob: '1995-05-15', city: 'Roma', gender: 'Donna', orientation: JSON.stringify(['Eterosessuale']), looking_for_gender: JSON.stringify(['Uomo']), is_online: 1, body_type: 'Atletica', photo_url: 'https://picsum.photos/seed/giulia/400/600', photos: JSON.stringify(['https://picsum.photos/seed/giulia1/400/600', 'https://picsum.photos/seed/giulia2/400/600']) },
  { name: 'Marco', surname: 'Rossi', dob: '1990-08-22', city: 'Milano', gender: 'Uomo', orientation: JSON.stringify(['Eterosessuale']), looking_for_gender: JSON.stringify(['Donna']), is_online: 0, body_type: 'Robusta', photo_url: 'https://picsum.photos/seed/marco/400/600', photos: JSON.stringify(['https://picsum.photos/seed/marco1/400/600']) },
  { name: 'Elena', surname: 'Verdi', dob: '1998-12-01', city: 'Napoli', gender: 'Donna', orientation: JSON.stringify(['Lesbica']), looking_for_gender: JSON.stringify(['Donna']), is_online: 1, body_type: 'Snella', photo_url: 'https://picsum.photos/seed/elena/400/600', photos: JSON.stringify(['https://picsum.photos/seed/elena1/400/600']) },
  { name: 'Luca', surname: 'Neri', dob: '1988-03-10', city: 'Torino', gender: 'Uomo', orientation: JSON.stringify(['Gay']), looking_for_gender: JSON.stringify(['Uomo']), is_online: 0, body_type: 'Atletica', photo_url: 'https://picsum.photos/seed/luca/400/600', photos: JSON.stringify(['https://picsum.photos/seed/luca1/400/600']) },
  { name: 'Sofia', surname: 'Gialli', dob: '1992-07-18', city: 'Firenze', gender: 'Donna', orientation: JSON.stringify(['Bisessuale', 'Fluido']), looking_for_gender: JSON.stringify(['Tutti']), is_online: 1, body_type: 'Curvy', photo_url: 'https://picsum.photos/seed/sofia/400/600', photos: JSON.stringify(['https://picsum.photos/seed/sofia1/400/600']) },
  { name: 'Andrea', surname: 'Blu', dob: '1994-11-25', city: 'Bologna', gender: 'Altro', orientation: JSON.stringify(['Pansessuale', 'Queer']), looking_for_gender: JSON.stringify(['Tutti']), is_online: 1, body_type: 'Normale', photo_url: 'https://picsum.photos/seed/andrea/400/600', photos: JSON.stringify(['https://picsum.photos/seed/andrea1/400/600']) },
];

const checkUsers = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (checkUsers.count === 0) {
  const insert = db.prepare(`
    INSERT INTO users (name, surname, dob, city, gender, orientation, looking_for_gender, is_online, body_type, photo_url, photos, is_paid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  for (const user of seedUsers) {
    insert.run(user.name, user.surname, user.dob, user.city, user.gender, user.orientation, user.looking_for_gender, user.is_online, user.body_type, user.photo_url, user.photos);
  }

  // Seed some interactions
  const seedInteractions = [
    { from: 1, to: 2, type: 'like' },
    { from: 1, to: 3, type: 'heart' },
    { from: 2, to: 1, type: 'like' },
    { from: 3, to: 1, type: 'heart' },
    { from: 4, to: 1, type: 'like' },
    { from: 5, to: 2, type: 'heart' },
  ];
  const insertInteraction = db.prepare("INSERT OR IGNORE INTO interactions (from_user_id, to_user_id, type) VALUES (?, ?, ?)");
  for (const inter of seedInteractions) {
    insertInteraction.run(inter.from, inter.to, inter.type);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const serializeArray = (val: any): string => {
    if (!val) return '[]';
    if (Array.isArray(val)) return JSON.stringify(val);
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? JSON.stringify(p) : JSON.stringify([String(p)]);
    } catch {
      return JSON.stringify([String(val)]);
    }
  };

  // Safe array parser: handles plain strings ('Eterosessuale'), JSON arrays ('["Gay","Bisessuale"]'), and Arrays
  const parseArrayField = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    const s = String(val).trim();
    if (s.startsWith('[')) {
      try { return JSON.parse(s); } catch { /* fall through */ }
    }
    return s ? [s] : [];  // wrap plain string in array
  };

  const parseUser = (u: any) => ({
    ...u,
    is_paid: u.is_paid === 1 || u.is_paid === true,
    is_online: u.is_online === 1 || u.is_online === true,
    photos: (() => { try { return JSON.parse(u.photos || '[]'); } catch { return []; } })(),
    orientation: parseArrayField(u.orientation),
    looking_for_gender: parseArrayField(u.looking_for_gender),
    conosciamoci_meglio: (() => {
      if (!u.conosciamoci_meglio) return {};
      try { return JSON.parse(u.conosciamoci_meglio); } catch { return {}; }
    })(),
  });

  // API Routes
  app.get("/api/profiles", (req, res) => {
    const profiles = db.prepare(`
      SELECT u.*, 
        (SELECT COUNT(*) FROM interactions WHERE to_user_id = u.id AND type = 'like') as likes_count,
        (SELECT COUNT(*) FROM interactions WHERE to_user_id = u.id AND type = 'heart') as hearts_count
      FROM users u
      WHERE u.is_blocked = 0 
        AND u.is_suspended = 0 
    `).all();

    const parsedProfiles = profiles.map((p: any) => ({ ...parseUser(p), likes_count: p.likes_count || 0, hearts_count: p.hearts_count || 0 }));
    res.json(parsedProfiles);
  });

  app.get("/api/profiles/:id", (req, res) => {
    const { id } = req.params;
    const profile = db.prepare(`
      SELECT u.*, 
        (SELECT COUNT(*) FROM interactions WHERE to_user_id = u.id AND type = 'like') as likes_count,
        (SELECT COUNT(*) FROM interactions WHERE to_user_id = u.id AND type = 'heart') as hearts_count
      FROM users u
      WHERE u.id = ?
    `).get(id) as any;

    if (!profile) return res.status(404).json({ error: "Not found" });

    res.json({ ...parseUser(profile), likes_count: profile.likes_count || 0, hearts_count: profile.hearts_count || 0 });
  });

  app.post("/api/interactions", (req, res) => {
    const { from_user_id, to_user_id, type } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO interactions (from_user_id, to_user_id, type) VALUES (?, ?, ?)");
      stmt.run(from_user_id, to_user_id, type);
      res.json({ success: true });
    } catch (err) {
      // If already exists, we could remove it (toggle)
      const del = db.prepare("DELETE FROM interactions WHERE from_user_id = ? AND to_user_id = ? AND type = ?");
      const result = del.run(from_user_id, to_user_id, type);
      res.json({ success: true, toggled: result.changes > 0 });
    }
  });

  app.get("/api/interactions/:fromId/:toId", (req, res) => {
    const { fromId, toId } = req.params;
    const interactions = db.prepare("SELECT type FROM interactions WHERE from_user_id = ? AND to_user_id = ?").all(fromId, toId);
    res.json(interactions.map((i: any) => i.type));
  });

  app.post("/api/register", (req, res) => {
    const userData = req.body;
    const stmt = db.prepare(`
      INSERT INTO users (
        name, surname, dob, city, province, job, description, hobbies, desires, gender, orientation, is_paid,
        looking_for_gender, looking_for_job, looking_for_hobbies, looking_for_city,
        looking_for_age_min, looking_for_age_max, looking_for_height, looking_for_body_type,
        looking_for_other, photo_url, id_document_url, photos, body_type, conosciamoci_meglio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        userData.name,
        userData.surname,
        userData.dob,
        userData.city,
        userData.province || null,
        userData.job,
        userData.description,
        userData.hobbies,
        userData.desires,
        userData.gender,
        serializeArray(userData.orientation),
        userData.is_paid ? 1 : 0,
        serializeArray(userData.looking_for_gender),
        userData.looking_for_job,
        userData.looking_for_hobbies,
        userData.looking_for_city,
        userData.looking_for_age_min,
        userData.looking_for_age_max,
        userData.looking_for_height,
        userData.looking_for_body_type,
        userData.looking_for_other,
        userData.photo_url || (userData.photos && userData.photos.length > 0 ? userData.photos[0] : `https://picsum.photos/seed/${Math.random()}/400/600`),
        userData.id_document_url,
        JSON.stringify(userData.photos || []),
        userData.body_type,
        userData.conosciamoci_meglio ? JSON.stringify(userData.conosciamoci_meglio) : null
      );

      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
      res.json(parseUser(user));
    } catch (err) {
      console.error("Registration error details:", err);
      res.status(500).json({ error: "Errore interno durante l'iscrizione. Verifica i dati inseriti." });
    }
  });

  app.put("/api/profiles/:id", (req, res) => {
    const { id } = req.params;
    const d = req.body;
    try {
      const stmt = db.prepare(`
        UPDATE users SET
          name = ?, surname = ?, dob = ?, city = ?, province = ?,
          job = ?, description = ?, hobbies = ?, desires = ?,
          gender = ?, orientation = ?, is_paid = ?,
          looking_for_gender = ?, looking_for_job = ?, looking_for_hobbies = ?,
          looking_for_city = ?, looking_for_age_min = ?, looking_for_age_max = ?,
          looking_for_height = ?, looking_for_body_type = ?, looking_for_other = ?,
          photos = ?, body_type = ?, height_cm = ?,
          conosciamoci_meglio = ?
        WHERE id = ?
      `);

      stmt.run(
        d.name, d.surname, d.dob, d.city, d.province || null,
        d.job, d.description, d.hobbies, d.desires,
        d.gender, serializeArray(d.orientation), d.is_paid ? 1 : 0,
        serializeArray(d.looking_for_gender), d.looking_for_job, d.looking_for_hobbies,
        d.looking_for_city, d.looking_for_age_min, d.looking_for_age_max,
        d.looking_for_height, d.looking_for_body_type, d.looking_for_other,
        JSON.stringify(d.photos || []), d.body_type, d.height_cm || null,
        d.conosciamoci_meglio ? JSON.stringify(d.conosciamoci_meglio) : null,
        id
      );

      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      if (!user) return res.status(404).json({ error: "Utente non trovato" });
      res.json(parseUser(user));
    } catch (err) {
      console.error("Update error:", err);
      res.status(500).json({ error: "Errore durante l'aggiornamento" });
    }
  });

  app.delete("/api/profiles/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      db.prepare("DELETE FROM interactions WHERE from_user_id = ? OR to_user_id = ?").run(id, id);
      db.prepare("DELETE FROM chat_requests WHERE from_user_id = ? OR to_user_id = ?").run(id, id);
      db.prepare("DELETE FROM posts WHERE user_id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Errore durante l'eliminazione" });
    }
  });

  // Chat Requests
  app.post("/api/chat-requests", (req, res) => {
    const { from_user_id, to_user_id, message } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO chat_requests (from_user_id, to_user_id, message) VALUES (?, ?, ?)");
      stmt.run(from_user_id, to_user_id, message || null);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Richiesta già inviata o errore." });
    }
  });

  app.get("/api/chat-requests/:userId", (req, res) => {
    const { userId } = req.params;
    const requests = db.prepare(`
      SELECT cr.*, u.name, u.surname, u.photo_url 
      FROM chat_requests cr
      JOIN users u ON cr.from_user_id = u.id
      WHERE cr.to_user_id = ? AND cr.status = 'pending'
    `).all(userId);
    res.json(requests);
  });

  app.patch("/api/chat-requests/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    const stmt = db.prepare("UPDATE chat_requests SET status = ? WHERE id = ?");
    stmt.run(status, id);
    res.json({ success: true });
  });

  app.get("/api/chat-status/:fromId/:toId", (req, res) => {
    const { fromId, toId } = req.params;
    const request = db.prepare("SELECT * FROM chat_requests WHERE from_user_id = ? AND to_user_id = ?").get(fromId, toId);
    res.json(request || { status: 'none' });
  });

  // Posts
  app.post("/api/posts", (req, res) => {
    const { user_id, photos, description } = req.body;

    // Check if user already posted today
    const lastPost = db.prepare(`SELECT created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`).get(user_id) as any;
    if (lastPost) {
      const today = new Date().toISOString().split('T')[0];
      const postDate = new Date(lastPost.created_at).toISOString().split('T')[0];
      if (today === postDate) {
        return res.status(400).json({ error: "Puoi pubblicare solo un post al giorno." });
      }
    }

    try {
      const stmt = db.prepare("INSERT INTO posts (user_id, photos, description) VALUES (?, ?, ?)");
      const result = stmt.run(user_id, JSON.stringify(photos || []), description);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
      res.status(500).json({ error: "Errore durante la creazione del post." });
    }
  });

  app.get("/api/posts", (req, res) => {
    const callerId = req.query.user_id; // For interactions check
    const posts = db.prepare(`
      SELECT p.*, u.name as author_name, u.photo_url as author_photo,
        (SELECT COUNT(*) FROM post_interactions WHERE post_id = p.id AND type = 'like') as likes_count,
        (SELECT COUNT(*) FROM post_interactions WHERE post_id = p.id AND type = 'heart') as hearts_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();

    const result = posts.map((p: any) => ({
      ...p,
      photos: JSON.parse(p.photos || '[]'),
      has_liked: callerId ? !!db.prepare("SELECT 1 FROM post_interactions WHERE post_id = ? AND user_id = ? AND type = 'like'").get(p.id, callerId) : false,
      has_hearted: callerId ? !!db.prepare("SELECT 1 FROM post_interactions WHERE post_id = ? AND user_id = ? AND type = 'heart'").get(p.id, callerId) : false,
    }));
    res.json(result);
  });

  app.get("/api/users/:userId/posts", (req, res) => {
    const { userId } = req.params;
    const callerId = req.query.user_id;
    const posts = db.prepare(`
      SELECT p.*, u.name as author_name, u.photo_url as author_photo,
        (SELECT COUNT(*) FROM post_interactions WHERE post_id = p.id AND type = 'like') as likes_count,
        (SELECT COUNT(*) FROM post_interactions WHERE post_id = p.id AND type = 'heart') as hearts_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(userId);

    const result = posts.map((p: any) => ({
      ...p,
      photos: JSON.parse(p.photos || '[]'),
      has_liked: callerId ? !!db.prepare("SELECT 1 FROM post_interactions WHERE post_id = ? AND user_id = ? AND type = 'like'").get(p.id, callerId) : false,
      has_hearted: callerId ? !!db.prepare("SELECT 1 FROM post_interactions WHERE post_id = ? AND user_id = ? AND type = 'heart'").get(p.id, callerId) : false,
    }));
    res.json(result);
  });

  app.post("/api/posts/:postId/interactions", (req, res) => {
    const { postId } = req.params;
    const { user_id, type } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO post_interactions (post_id, user_id, type) VALUES (?, ?, ?)");
      stmt.run(postId, user_id, type);
      res.json({ success: true, toggled: false });
    } catch (err) {
      // Toggle if already exists
      const del = db.prepare("DELETE FROM post_interactions WHERE post_id = ? AND user_id = ? AND type = ?");
      const result = del.run(postId, user_id, type);
      res.json({ success: true, toggled: result.changes > 0 });
    }
  });

  // Banner Messages
  app.get("/api/banner-messages", (req, res) => {
    // Cleanup vecchi di 24h
    db.prepare("DELETE FROM banner_messages WHERE created_at < datetime('now', '-24 hours')").run();

    const messages = db.prepare(`
      SELECT b.*, u.name, u.surname, u.photo_url, u.dob, u.city
      FROM banner_messages b
      JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `).all();
    res.json(messages);
  });

  app.post("/api/banner-messages", (req, res) => {
    const { user_id, message } = req.body;
    // cancella messaggi precedenti dello stesso utente
    db.prepare("DELETE FROM banner_messages WHERE user_id = ?").run(user_id);
    const stmt = db.prepare("INSERT INTO banner_messages (user_id, message) VALUES (?, ?)");
    stmt.run(user_id, message);
    res.json({ success: true });
  });

  app.delete("/api/banner-messages/:id", (req, res) => {
    db.prepare("DELETE FROM banner_messages WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/banner-messages/:id/replies", (req, res) => {
    const { from_user_id, reply_text } = req.body;
    db.prepare("INSERT INTO banner_replies (banner_message_id, from_user_id, reply_text) VALUES (?, ?, ?)").run(req.params.id, from_user_id, reply_text);
    res.json({ success: true });
  });

  app.get("/api/users/:userId/banner-data", (req, res) => {
    const activeMsg = db.prepare("SELECT id, message, created_at FROM banner_messages WHERE user_id = ? AND created_at >= datetime('now', '-24 hours') ORDER BY created_at DESC LIMIT 1").get(req.params.userId) as any;
    if (!activeMsg) return res.json(null);
    const replies = db.prepare(`
      SELECT r.*, u.name, u.photo_url 
      FROM banner_replies r
      JOIN users u ON r.from_user_id = u.id
      WHERE r.banner_message_id = ?
      ORDER BY r.created_at DESC
    `).all(activeMsg.id);
    res.json({ message: activeMsg, replies });
  });

  // Site Settings
  app.get("/api/settings/:key", (req, res) => {
    const { key } = req.params;
    const setting = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key) as any;
    if (setting) {
      res.json(JSON.parse(setting.value));
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.post("/api/settings/:key", (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24700 } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = process.env.PORT || 3006;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
