import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateAge(dob: string): number {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function calculateMatchScore(u1: any, u2: any): number {
  if (!u1 || !u2) return 0;

  let score = 0;

  // 1. Common Interests (Hobbies) - handle both string and array
  const getHobbies = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(s => String(s).toLowerCase().trim());
    return String(val).toLowerCase().split(/[,;]/).map(s => s.trim()).filter(Boolean);
  };

  const h1 = getHobbies(u1.hobbies);
  const h2 = getHobbies(u2.hobbies);
  const common = h1.filter(h => h2.includes(h));

  if (common.length > 0) {
    score += common.length * 12;
    if (common.length >= 3) score += 15;
  }

  // 2. City Proximity
  if (u1.city && u2.city && u1.city.toLowerCase().trim() === u2.city.toLowerCase().trim()) {
    score += 25;
  }

  // 3. Age Proximity
  const a1 = calculateAge(u1.dob);
  const a2 = calculateAge(u2.dob);
  if (a1 > 0 && a2 > 0) {
    const ageDiff = Math.abs(a1 - a2);
    if (ageDiff <= 3) score += 20;
    else if (ageDiff <= 6) score += 12;
    else if (ageDiff <= 10) score += 5;
  }

  // 4. Orientation Harmony (handle array vs array)
  const ori1 = Array.isArray(u1.orientation) ? u1.orientation : [u1.orientation].filter(Boolean);
  const ori2 = Array.isArray(u2.orientation) ? u2.orientation : [u2.orientation].filter(Boolean);
  const commonOri = ori1.filter((o: any) => ori2.includes(o));
  if (commonOri.length > 0) {
    score += 15;
  }

  // 5. Bio and Description match word check
  const bioWordsU = (u1.description || "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
  const bioWordsT = (u2.description || "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
  const commonWords = bioWordsU.filter(w => bioWordsT.includes(w));
  if (commonWords.length > 0) score += commonWords.length * 2;

  // Base bonus for any match
  if (score > 10) score += 15;
  else if (score > 0) score += 10;
  
  // Minimal score for compatible profiles (never 0 if they reach this stage)
  if (score === 0) {
    // Salt if everything fails but they are compatible
    const hash = (String(u1.id).length + String(u2.id).length) % 15;
    score = 45 + hash;
  }

  // Cap score
  return Math.min(Math.max(score, 10), 99);
}

export async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Could not get canvas context"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function fileToBase64(file: File): Promise<string> {
  // If it's an image, compress it first
  if (file.type.startsWith('image/')) {
    return compressImage(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

let audioCtx: AudioContext | null = null;

export function playTapSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Keyboard-like 'thud' sound: low frequency sine with fast decay
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    // Fail silently if audio is not supported
  }
}

export const ITALIAN_CITIES = ['Agrigento', 'Alessandria', 'Ancona', 'Aosta', 'Arezzo', 'Ascoli Piceno', 'Asti', 'Avellino', 'Bari', 'Barletta-Andria-Trani', 'Belluno', 'Benevento', 'Bergamo', 'Biella', 'Bologna', 'Bolzano', 'Brescia', 'Brindisi', 'Cagliari', 'Caltanissetta', 'Campobasso', 'Caserta', 'Catania', 'Catanzaro', 'Chieti', 'Como', 'Cosenza', 'Cremona', 'Crotone', 'Cuneo', 'Enna', 'Fermo', 'Ferrara', 'Firenze', 'Foggia', 'Forli-Cesena', 'Frosinone', 'Genova', 'Gorizia', 'Grosseto', 'Imperia', 'Isernia', "L'Aquila", 'La Spezia', 'Latina', 'Lecce', 'Lecco', 'Livorno', 'Lodi', 'Lucca', 'Macerata', 'Mantova', 'Massa-Carrara', 'Matera', 'Messina', 'Milano', 'Modena', 'Monza e della Brianza', 'Napoli', 'Novara', 'Nuoro', 'Oristano', 'Padova', 'Palermo', 'Parma', 'Pavia', 'Perugia', 'Pesaro e Urbino', 'Pescara', 'Piacenza', 'Pisa', 'Pistoia', 'Pordenone', 'Potenza', 'Prato', 'Ragusa', 'Ravenna', 'Reggio Calabria', 'Reggio Emilia', 'Rieti', 'Rimini', 'Roma', 'Rovigo', 'Salerno', 'Sassari', 'Savona', 'Siena', 'Siracusa', 'Sondrio', 'Sud Sardegna', 'Taranto', 'Teramo', 'Terni', 'Torino', 'Trapani', 'Trento', 'Treviso', 'Trieste', 'Udine', 'Varese', 'Venezia', 'Verbano-Cusio-Ossola', 'Vercelli', 'Verona', 'Vibo Valentia', 'Vicenza', 'Viterbo'];
