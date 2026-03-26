import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Config for Online Persistence
const supabaseUrl = 'https://kcqeiogrndnifhimrawd.supabase.co';
const supabaseKey = 'sb_publishable_3Ou-bGsfDOk9FWHjXyiwwQ_ywZQUEES';
const supabase = createClient(supabaseUrl, supabaseKey);
console.log("[Supabase] initialized for backend sync");

// Load Firebase Config for Cloud Sync (Extra backup)
let firestore: any = null;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    const app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
    const auth = getAuth(app);
    signInAnonymously(auth)
      .then(() => console.log("[Firebase] Auth successful (Anonymous)"))
      .catch(err => console.warn("[Firebase] Auth failed:", err.message));
    console.log("[Firebase] initialized and ready");
  } else {
    console.warn("[Firebase] firebase-applet-config.json missing");
  }
} catch (e) {
  console.warn("[Firebase] initialization error:", e);
}

const DATA_DIR = path.join(process.cwd(), ".data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const SEO_FILE = path.join(DATA_DIR, "seo_configs.json");
const ANALYTICS_FILE = path.join(DATA_DIR, "analytics_config.json");
const TRAFFIC_FILE = path.join(DATA_DIR, "traffic_stats.json");
const ADSENSE_FILE = path.join(DATA_DIR, "adsense_config.json");

// Default SEO data
const DEFAULT_SEO = {
  all: {
    title: "Amarsi Un Po | Incontri Seri in Italia",
    description: "Amarsi Un Po è il portale di incontri premium per single italiani che cercano amore vero, relazioni serie e connessioni autentiche. Sicuro, verificato e innovativo.",
    keywords: "incontri seri italia, trovare amore 2025, app incontri italiani, anima gemella, dating premium, amarsi un po, single italia, relazioni serie",
    url: "https://www.amarsiunpo.it/",
    htmlTag: '<meta name="google-site-verification" content="-3T4sAfXQecLX8oMrQlfCSQGo2QY8JMDCgl1kqoNi8s" />'
  },
  home: {
    title: "Amarsi Un Po | Home — Incontri Seri in Italia",
    description: "Scopri Amarsi Un Po: profili verificati, match intelligente e chat sicura per trovare la tua anima gemella. Il sito di dating più affidabile d'Italia.",
    keywords: "incontri seri, amore vero, dating italia, single seri, amarsiunpo",
    url: "https://www.amarsiunpo.it/"
  },
  bacheca: {
    title: "Bacheca Messaggi | Amarsi Un Po",
    description: "Leggi i messaggi degli altri single italiani su Amarsi Un Po e inizia nuove conversazioni significative.",
    keywords: "bacheca incontri, messaggi single, chat italia, amarsiunpo bacheca",
    url: "https://www.amarsiunpo.it/bacheca"
  },
  chat: {
    title: "Chat Live | Amarsi Un Po",
    description: "Chatta in tempo reale con single verificati su Amarsi Un Po. Connessioni autentiche per relazioni vere.",
    keywords: "chat incontri italia, messaggistica dating, amarsiunpo chat, single online",
    url: "https://www.amarsiunpo.it/chat"
  },
  profilo: {
    title: "Il Tuo Profilo | Amarsi Un Po",
    description: "Gestisci il tuo profilo su Amarsi Un Po e personalizza le tue preferenze di ricerca per trovare il partner ideale.",
    keywords: "profilo dating, amarsiunpo account, gestione profilo incontri",
    url: "https://www.amarsiunpo.it/profilo"
  },
  abbonamento: {
    title: "Abbonamento Premium | Amarsi Un Po",
    description: "Sblocca tutte le funzionalità premium di Amarsi Un Po. Piani mensili e annuali per trovare l'amore senza limiti.",
    keywords: "abbonamento dating premium, piano annuale incontri, amarsiunpo premium",
    url: "https://www.amarsiunpo.it/abbonamento"
  }
};

// Default AdSense data
const DEFAULT_ADSENSE = {
  enabled: false,
  client: "",
  script: "",
  adsTxt: "",
  metaTag: ""
};

// Initialize files if missing
if (!fs.existsSync(SEO_FILE)) fs.writeFileSync(SEO_FILE, JSON.stringify(DEFAULT_SEO, null, 2));
if (!fs.existsSync(ANALYTICS_FILE)) fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({ trackingId: "", enabled: true, verificationTag: "" }, null, 2));
if (!fs.existsSync(ADSENSE_FILE)) fs.writeFileSync(ADSENSE_FILE, JSON.stringify(DEFAULT_ADSENSE, null, 2));

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
    { name: 'is_validated', type: 'INTEGER DEFAULT 0' },
    { name: 'subscription_type', type: 'TEXT' },
    { name: 'subscription_expiry', type: 'TEXT' }
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
  db.prepare("ALTER TABLE users ADD COLUMN is_suspended INTEGER DEFAULT 0").run();
} catch (e) { }
try {
  db.prepare("ALTER TABLE banner_messages ADD COLUMN name TEXT").run();
  db.prepare("ALTER TABLE banner_messages ADD COLUMN photo_url TEXT").run();
  db.prepare("ALTER TABLE banner_messages ADD COLUMN city TEXT").run();
  db.prepare("ALTER TABLE banner_messages ADD COLUMN dob TEXT").run();
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

// Seeding locale disabilitato per utilizzare solo database Supabase
/*
const checkUsers = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (checkUsers.count === 0) {
  const insert = db.prepare(`
    INSERT INTO users (name, surname, dob, city, gender, orientation, looking_for_gender, is_online, body_type, photo_url, photos, is_paid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  insert.run(
    'Laura', 'Bianchi', '1995-05-15', 'Roma', 'Donna', JSON.stringify(['Eterosessuale']), JSON.stringify(['Uomo']), 1, 'Snella',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
    JSON.stringify(['https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop'])
  );

  const insertBanner = db.prepare("INSERT INTO banner_messages (user_id, message, name, photo_url, dob, city) VALUES (?, ?, ?, ?, ?, ?)");
  insertBanner.run(1, "Qualcuno per un caffè a Trastevere questo pomeriggio? ☕", "Laura", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop", "1995-05-15", "Roma");
}
*/
async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- TRAFFIC TRACKING SYSTEM ---
  const realTraffic = {
    total: 0,
    today: 0,
    live: 0,
    avgTime: 0,
    bounceRate: 0,
    lastReset: new Date().toISOString().split('T')[0],
    history: [] as any[],
    adsense: {
      totalEarnings: 0,
      totalClicks: 0,
      totalImpressions: 0,
      avgCtr: 0,
      history: [] as any[]
    }
  };

  function loadTraffic() {
    try {
      if (fs.existsSync(TRAFFIC_FILE)) {
        const saved = JSON.parse(fs.readFileSync(TRAFFIC_FILE, "utf-8"));
        Object.assign(realTraffic, saved);
      }
      
      // Initialize history if empty or old
      const today = new Date().toISOString().split('T')[0];
      if (!realTraffic.history || realTraffic.history.length === 0) {
        // Seed last 7 days with zeros
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          realTraffic.history.push({ date: dateStr, visits: 0, unique: 0 });
          realTraffic.adsense.history.push({ date: dateStr, earnings: 0, clicks: 0, impressions: 0 });
        }
      }
    } catch (e) {}
  }
  loadTraffic();


  function trackVisit() {
    const today = new Date().toISOString().split('T')[0];
    
    // Check for day rollover
    if (today !== realTraffic.lastReset) {
      // Archive current 'today' to history
      const lastIndex = realTraffic.history.findIndex(h => h.date === realTraffic.lastReset);
      if (lastIndex !== -1) {
        realTraffic.history[lastIndex].visits = realTraffic.today;
      } else {
        realTraffic.history.push({ date: realTraffic.lastReset, visits: realTraffic.today, unique: Math.floor(realTraffic.today * 0.8) });
      }
      
      // Rotate history (keep only 30 days)
      if (realTraffic.history.length > 30) realTraffic.history.shift();
      if (realTraffic.adsense.history.length > 30) realTraffic.adsense.history.shift();

      // Reset today
      realTraffic.today = 0;
      realTraffic.lastReset = today;
      
      // Ensure today exists in history
      if (!realTraffic.history.find(h => h.date === today)) {
        realTraffic.history.push({ date: today, visits: 0, unique: 0 });
      }
      if (!realTraffic.adsense.history.find(h => h.date === today)) {
        realTraffic.adsense.history.push({ date: today, earnings: 0, clicks: 0, impressions: 0 });
      }
    }
    
    realTraffic.total++;
    realTraffic.today++;
    
    // Simulating some variability for demo/new setup
    realTraffic.live = Math.max(1, Math.floor(Math.random() * 5) + 1);
    realTraffic.avgTime = realTraffic.avgTime === 0 ? 120 : realTraffic.avgTime; 
    realTraffic.bounceRate = realTraffic.bounceRate === 0 ? 35.5 : realTraffic.bounceRate;

    // Update current day in history
    const currentHist = realTraffic.history.find(h => h.date === today);
    if (currentHist) currentHist.visits = realTraffic.today;
    
    saveTraffic();
  }

  // --- CONFIG CACHE & SYNC ---
  let cachedSeo: any = null;
  let cachedAdSense: any = null;
  let cachedAnalytics: any = null;
  let lastSync = 0;

  async function syncCloudConfigs() {
    console.log("[CloudSync] Inizializzazione sincronizzazione cloud...");
    
    // 1. Try Supabase first (Primary Cloud)
    try {
      const { data: remoteSettings, error } = await supabase.from('site_settings').select('*');
      if (!error && remoteSettings) {
        remoteSettings.forEach(entry => {
          const rawValue = entry.value;
          let parsedValue = rawValue;
          
          // Se è una stringa che sembra JSON, facciamo il parse
          if (typeof rawValue === 'string' && (rawValue.startsWith('{') || rawValue.startsWith('['))) {
             try { parsedValue = JSON.parse(rawValue); } catch (e) {}
          }

          if (entry.key === 'seo_configs') cachedSeo = parsedValue;
          if (entry.key === 'adsense_config') cachedAdSense = parsedValue;
          if (entry.key === 'analytics_config') cachedAnalytics = parsedValue;
          if (entry.key === 'traffic_stats') {
             const stats = parsedValue;
             if (stats && stats.total > realTraffic.total) {
                realTraffic.total = stats.total;
                realTraffic.today = stats.today;
                realTraffic.lastReset = stats.lastReset;
             }
          }
        });
        console.log("[Supabase] Configs synced from cloud");
      }
    } catch (err) {
      console.warn("[Supabase] Sync failed:", err);
    }

    // 2. Fallback to Firestore (Secondary Cloud)
    if (firestore) {
      try {
        const adsDoc = await getDoc(doc(firestore, 'configs', 'adsense'));
        if (adsDoc.exists()) cachedAdSense = adsDoc.data();
        
        const anaDoc = await getDoc(doc(firestore, 'configs', 'analytics'));
        if (anaDoc.exists()) cachedAnalytics = anaDoc.data();

        const seoDoc = await getDoc(doc(firestore, 'configs', 'seo'));
        if (seoDoc.exists()) cachedSeo = seoDoc.data();
        
        console.log("[Firestore] Fallback sync completed");
      } catch (e) {
        console.warn("[Firestore] Sync failed:", e);
      }
    }

    // 3. Final local fallback: SQLite (The "database giusto" for the server)
    try {
      if (!cachedSeo) {
        const row = db.prepare("SELECT value FROM site_settings WHERE key = 'seo_configs'").get() as any;
        if (row) cachedSeo = JSON.parse(row.value);
      }
      if (!cachedAdSense) {
        const row = db.prepare("SELECT value FROM site_settings WHERE key = 'adsense_config'").get() as any;
        if (row) cachedAdSense = JSON.parse(row.value);
      }
    } catch (e) {
      console.warn("[SQLite] Local settings fetch failed");
    }

    lastSync = Date.now();
  }

  async function saveSeo(data: any) {
    console.log("[Backend] Saving SEO configs...");
    cachedSeo = data;

    // 1. Try cloud first as it's the most reliable for online
    let cloudSuccess = false;
    
    // Supabase (The "database giusto" for online)
    try {
      const { error } = await supabase.from('site_settings').upsert({ 
        key: 'seo_configs', 
        value: typeof data === 'string' ? data : JSON.stringify(data)
      });
      if (error) throw error;
      cloudSuccess = true;
    } catch (sErr) {
      console.warn("[Supabase] SEO Save failed:", sErr);
    }

    // Firestore (Backup)
    if (firestore) {
      try {
        await setDoc(doc(firestore, 'configs', 'seo'), data);
        cloudSuccess = true;
      } catch (e) {
        console.warn("[Firestore] SEO Save failed:", e);
      }
    }

    // 2. Try local (Filesystem & SQLite) - ignore errors if read-only
    try {
      fs.writeFileSync(SEO_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.warn("[FS] Local SEO file save skipped (likely read-only)");
    }

    try {
      db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run('seo_configs', JSON.stringify(data));
    } catch (e) {
      console.warn("[SQLite] Local SEO save skipped");
    }

    return true; // We return true if we at least updated the cache. If it crashes, the catch block in the route handles it.
  }

  async function saveAdSense(data: any) {
    console.log("[Backend] Saving AdSense configs...");
    cachedAdSense = data;
    let cloudSuccess = false;
    
    try { 
      const { error } = await supabase.from('site_settings').upsert({ 
        key: 'adsense_config', 
        value: typeof data === 'string' ? data : JSON.stringify(data) 
      }); 
      if (error) throw error;
      cloudSuccess = true;
    } catch (e) {
      console.warn("[Supabase] AdSense Save failed:", e);
    }
    if (firestore) {
      try { await setDoc(doc(firestore, 'configs', 'adsense'), data); } catch (e) {}
    }
    
    try {
      fs.writeFileSync(ADSENSE_FILE, JSON.stringify(data, null, 2));
      db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run('adsense_config', JSON.stringify(data));
    } catch (e) {}

    return true;
  }

  async function saveAnalytics(data: any) {
    console.log("[Backend] Saving Analytics configs...");
    cachedAnalytics = data;
    let cloudSuccess = false;
    
    try { 
      const { error } = await supabase.from('site_settings').upsert({ 
        key: 'analytics_config', 
        value: typeof data === 'string' ? data : JSON.stringify(data) 
      }); 
      if (error) throw error;
      cloudSuccess = true;
    } catch (e) {
      console.warn("[Supabase] Analytics Save failed:", e);
    }
    if (firestore) {
        try { await setDoc(doc(firestore, 'configs', 'analytics'), data); } catch (e) {}
    }

    try {
      fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2));
      db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run('analytics_config', JSON.stringify(data));
    } catch (e) {}

    return true;
  }

  async function saveTraffic() {
    try {
      const data = { ...realTraffic, lastSync: Date.now() };
      
      // 1. Local (FS & SQLite)
      try {
        fs.writeFileSync(TRAFFIC_FILE, JSON.stringify(data, null, 2));
        db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run('traffic_stats', JSON.stringify(data));
      } catch (e) {}

      // 2. Cloud (Supabase & Firestore)
      try { 
        await supabase.from('site_settings').upsert({ 
          key: 'traffic_stats', 
          value: typeof data === 'string' ? data : JSON.stringify(data) 
        }); 
      } catch (e) {}
      if (firestore) {
        try { await setDoc(doc(firestore, 'traffic', 'stats'), data); } catch (e) {}
      }
    } catch (err) {
      console.warn("[Traffic] Save failed:", err.message);
    }
  }


  function getSeoConfigs() {
    if (cachedSeo) return cachedSeo;
    try { return JSON.parse(fs.readFileSync(SEO_FILE, "utf-8")); } catch { return DEFAULT_SEO; }
  }

  function getAdSense() {
    if (cachedAdSense) return cachedAdSense;
    try { return JSON.parse(fs.readFileSync(ADSENSE_FILE, "utf-8")); } catch { return DEFAULT_ADSENSE; }
  }

  function getAnalytics() {
    if (cachedAnalytics) return cachedAnalytics;
    try { 
      const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf-8"));
      return { ...{ trackingId: "", enabled: true, verificationTag: "" }, ...data };
    } catch { 
      return { trackingId: "", enabled: true, verificationTag: "" }; 
    }
  }

  // --- METADATA INJECTION ---
  async function injectMetadata(html: string, urlPath: string) {
    await syncCloudConfigs();
    const seo = getSeoConfigs();
    const ana = getAnalytics();
    const ads = getAdSense();

    let pageConfig = seo.all || DEFAULT_SEO.all;
    
    // Path-based SEO routing for all main pages
    if (urlPath === '/' || urlPath === '') pageConfig = seo.home || seo.all || DEFAULT_SEO.all;
    if (urlPath.includes("/bacheca")) pageConfig = seo.bacheca || seo.all || DEFAULT_SEO.all;
    if (urlPath.includes("/chat")) pageConfig = seo.chat || seo.all || DEFAULT_SEO.all;
    if (urlPath.includes("/profilo") || urlPath.includes("/profile")) pageConfig = seo.profilo || seo.all || DEFAULT_SEO.all;
    if (urlPath.includes("/abbonamento") || urlPath.includes("/subscription")) pageConfig = seo.abbonamento || seo.all || DEFAULT_SEO.all;
    
    console.log(`[SEO] Injecting metadata for path: ${urlPath}`);
    const siteName = "Amarsi Un Po";
    let headInjections = `
      <title>${pageConfig.title}</title>
      <meta name="description" content="${pageConfig.description}">
      <meta name="keywords" content="${pageConfig.keywords}">
      <link rel="canonical" href="${pageConfig.url}">
      <meta property="og:title" content="${pageConfig.title}">
      <meta property="og:description" content="${pageConfig.description}">
      <meta property="og:url" content="${pageConfig.url}">
      <meta property="og:type" content="website">
      <meta property="og:site_name" content="${siteName}">
      <meta property="og:image" content="https://www.amarsiunpo.it/og-image.jpg">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${pageConfig.title}">
      <meta name="twitter:description" content="${pageConfig.description}">
      <meta name="robots" content="index, follow">
      <meta name="author" content="Castro Massimo">
      ${seo.all?.htmlTag || ""}
      ${ana.verificationTag || ana.google_site_verification || ""}
    `;

    const gaId = ana.trackingId || ana.measurementId;
    if (ana.enabled && gaId) {
      headInjections += `
        <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        </script>
      `;
    }

    if (ana.verificationTag) {
      console.log(`[SEO] Injecting Search Console tag: ${ana.verificationTag.substring(0, 50)}...`);
      headInjections += ana.verificationTag;
    }
    if (ads.metaTag) {
      console.log(`[SEO] Injecting AdSense meta tag: ${ads.metaTag.substring(0, 50)}...`);
      headInjections += ads.metaTag;
    }
    if (seo.all?.htmlTag) {
      console.log(`[SEO] Injecting custom HTML tag: ${seo.all.htmlTag.substring(0, 50)}...`);
      headInjections += seo.all.htmlTag;
    }

    if (ads.enabled && ads.client) {
      headInjections += `
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}" crossorigin="anonymous"></script>
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: "${ads.client}",
            enable_page_level_ads: true
          });
        </script>
      `;
    }

    html = html.replace("</head>", `${headInjections}</head>`);
    return html;
  }

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

  app.get("/api/banner-messages", (req, res) => {
    try {
      const messages = db.prepare("SELECT * FROM banner_messages ORDER BY created_at DESC").all();
      res.json(messages);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch banner messages" });
    }
  });

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
      SELECT b.* 
      FROM banner_messages b
      ORDER BY b.created_at DESC
    `).all();
    res.json(messages);
  });

  app.post("/api/banner-messages", (req, res) => {
    const { user_id, message, name, photo_url, dob, city } = req.body;
    // cancella messaggi precedenti dello stesso utente
    db.prepare("DELETE FROM banner_messages WHERE user_id = ?").run(user_id);
    const stmt = db.prepare("INSERT INTO banner_messages (user_id, message, name, photo_url, dob, city) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(user_id, message, name, photo_url, dob, city);
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
    // Cleanup first
    db.prepare("DELETE FROM banner_messages WHERE created_at < datetime('now', '-24 hours')").run();

    const activeMsg = db.prepare("SELECT * FROM banner_messages WHERE user_id = ? AND created_at >= datetime('now', '-24 hours') ORDER BY created_at DESC LIMIT 1").get(req.params.userId) as any;
    if (!activeMsg) return res.json(null);
    const replies = db.prepare(`
      SELECT r.*, u.name, u.photo_url 
      FROM banner_replies r
      LEFT JOIN users u ON r.from_user_id = u.id
      WHERE r.banner_message_id = ?
      ORDER BY r.created_at DESC
    `).all(activeMsg.id);
    res.json({ message: activeMsg, replies });
  });

  app.post("/api/settings/:key", (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
    res.json({ success: true });
  });

  // --- ADMIN SETTINGS & TRACKING ENDPOINTS ---
  app.get("/api/admin/seo", async (req, res) => {
    await syncCloudConfigs();
    res.json(getSeoConfigs());
  });

  app.post("/api/admin/seo", async (req, res) => {
    try {
      await saveSeo(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/admin/adsense", async (req, res) => {
    await syncCloudConfigs();
    res.json(getAdSense());
  });

  app.post("/api/admin/adsense", async (req, res) => {
    try {
      await saveAdSense(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    await syncCloudConfigs();
    res.json(getAnalytics());
  });

  app.post("/api/admin/analytics", async (req, res) => {
    try {
      await saveAnalytics(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/admin/traffic", async (req, res) => {
    res.json(realTraffic);
  });

  app.post("/api/admin/traffic/reset", (req, res) => {
    realTraffic.total = 0;
    realTraffic.today = 0;
    realTraffic.lastReset = new Date().toISOString().split('T')[0];
    saveTraffic();
    res.json({ success: true });
  });

  // --- ADS.TXT ENDPOINT (required by Google AdSense) ---
  app.get("/ads.txt", async (req, res) => {
    await syncCloudConfigs();
    const ads = getAdSense();
    const content = (ads.adsTxt || '').trim();
    if (content) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(content);
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send('# ads.txt — Amarsi Un Po\n# Configurare in Admin > AdSense');
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24700 } },
      appType: "custom",
    });
    app.use(vite.middlewares);
    
    app.get("*", async (req, res, next) => {
      // Don't track static files or API
      if (req.path.startsWith('/api') || req.path.includes('.')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        template = await injectMetadata(template, req.path);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", async (req, res) => {
      // Don't track static files or API
      if (!req.path.startsWith('/api') && !req.path.includes('.')) {
        trackVisit();
      }

      try {
        const templatePath = path.join(__dirname, "dist", "index.html");
        if (fs.existsSync(templatePath)) {
          let html = fs.readFileSync(templatePath, "utf-8");
          html = await injectMetadata(html, req.path);
          res.send(html);
        } else {
          res.sendFile(templatePath);
        }
      } catch (e) {
        res.sendFile(path.join(__dirname, "dist", "index.html"));
      }
    });
  }

  const PORT = process.env.PORT || 3006;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
