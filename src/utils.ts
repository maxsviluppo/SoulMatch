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

  let score = 40; // Base score

  // 1. Common Interests (Hobbies)
  const h1 = (u1.hobbies || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
  const h2 = (u2.hobbies || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
  const common = h1.filter((h: string) => h2.includes(h));
  score += common.length * 12;

  // 2. City Proximity
  if (u1.city && u2.city && u1.city.toLowerCase() === u2.city.toLowerCase()) {
    score += 15;
  }

  // 3. Age Proximity
  const a1 = calculateAge(u1.dob);
  const a2 = calculateAge(u2.dob);
  const ageDiff = Math.abs(a1 - a2);
  if (ageDiff <= 3) score += 10;
  else if (ageDiff <= 7) score += 5;

  // 4. Orientation & Gender Harmony
  if (u1.orientation === u2.orientation) score += 5;

  // Cap score
  return Math.min(Math.max(score, 20), 99);
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
