import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Users,
  Search,
  Filter,
  UserPlus,
  CreditCard,
  CheckCircle,
  MessageSquare,
  MapPin,
  Calendar,
  Briefcase,
  Sparkles,
  ChevronRight,
  Info,
  Home,
  PlayCircle,
  User,
  ThumbsUp,
  Venus,
  Mars,
  Camera,
  LayoutGrid,
  Image as ImageIcon,
  Settings2,
  Bell,
  ArrowRight,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Plus,
  X,
  LogOut,
  ShieldCheck,
  Share2,
  AlertTriangle,
  Link2,
  UserCheck
} from 'lucide-react';
import { cn, calculateAge, calculateMatchScore, fileToBase64, playTapSound } from './utils';
import { UserProfile, ChatRequest, Post, SoulLink } from './types';
import { supabase } from './supabase';

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 20, x: '-50%' }}
      className={cn(
        "fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px]",
        type === 'success' ? "bg-emerald-600 text-white" :
          type === 'error' ? "bg-rose-600 text-white" : "bg-stone-800 text-white"
      )}
    >
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> :
        type === 'error' ? <Info className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      <span className="text-sm font-bold">{message}</span>
    </motion.div>
  );
};

const BackgroundDecorations = () => {
  const location = useLocation();
  const [bgImage, setBgImage] = useState<string>('');

  useEffect(() => {
    // Random high-quality generic images for page backgrounds
    const backgrounds = [
      "https://images.unsplash.com/photo-1516589174184-c68526614488?q=80&w=2000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1522673607200-164848d79c6f?q=80&w=2000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?q=80&w=2000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=2000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2000&auto=format&fit=crop"
    ];
    setBgImage(backgrounds[Math.floor(Math.random() * backgrounds.length)]);
  }, [location.pathname]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] select-none">
      {/* Soft Background Image */}
      {bgImage && (
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.08 }}
          transition={{ duration: 2 }}
          className="absolute inset-0"
        >
          <img src={bgImage} className="w-full h-full object-cover grayscale brightness-150 contrast-50" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-50 via-transparent to-stone-50" />
        </motion.div>
      )}

      {/* Floating Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-[40rem] h-[40rem] bg-rose-200/5 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-[40rem] h-[40rem] bg-emerald-200/5 rounded-full blur-[100px] animate-pulse delay-1000" />
    </div>
  );
};

const Navbar = () => {
  const [user, setUser] = useState<UserProfile | null>(null);

  const checkUser = async () => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        setUser(JSON.parse(saved));
        return;
      }

      // Fallback: check Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          setUser(profile);
          localStorage.setItem('soulmatch_user', JSON.stringify(profile));
          return;
        }
      }
      setUser(null);
    } catch (e) {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUser();
    // Listen for storage changes in other tabs
    window.addEventListener('storage', checkUser);
    // Custom event to trigger update in same tab
    window.addEventListener('user-auth-change', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('user-auth-change', checkUser);
    };
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-stone-100">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
          <Heart className="text-white w-6 h-6 fill-current" />
        </div>
        <span className="text-2xl font-serif font-bold tracking-tight text-stone-900">SoulMatch</span>
      </Link>
      <div className="flex gap-4 items-center">
        {user ? (
          <Link to="/profile" className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white border border-red-700 shadow-xl shadow-red-100/50 transition-all hover:scale-110 active:scale-95 ring-2 ring-white/50">
            <User className="w-5 h-5 fill-current" />
          </Link>
        ) : (
          <Link to="/register" className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 border border-stone-200 shadow-sm transition-all hover:bg-stone-200 hover:text-stone-500 active:scale-95">
            <User className="w-5 h-5" />
          </Link>
        )}
      </div>
    </nav>
  );
};

const ProfileCard: React.FC<{ profile: UserProfile; onInteract?: () => void }> = ({ profile, onInteract }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch (e) { }
  }, []);

  const handleInteract = async (e: React.MouseEvent, type: 'like' | 'heart') => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser?.id) {
      alert("Devi essere iscritto per interagire!");
      return;
    }
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_user_id: currentUser.id, to_user_id: profile.id, type })
    });
    if (onInteract) onInteract();
  };

  const handleTestMatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      alert("Registrati per calcolare l'affinità!");
      return;
    }
    setShowScore(true);
  };

  const score = useMemo(() => calculateMatchScore(currentUser, profile), [currentUser, profile]);

  return (
    <Link to={`/profile-detail/${profile.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full"
      >
        <div className="aspect-[3/4.5] overflow-hidden relative shrink-0">
          <img
            src={(profile.photos && profile.photos.length > 0) ? profile.photos[0] : (profile.photo_url || `https://picsum.photos/seed/${profile.name}/400/600`)}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Test Match Button on Photo */}
          {!showScore && (
            <button
              onClick={handleTestMatch}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl scale-0 group-hover:scale-100 transition-all duration-300 flex items-center gap-2 border border-rose-100 group/btn"
            >
              <Sparkles className="w-4 h-4 text-rose-600 animate-pulse" />
              <span className="text-[11px] font-black text-rose-600 uppercase tracking-tighter">Test Match</span>
            </button>
          )}

          {/* Test Match Result - In basso a destra della foto */}
          {showScore && (
            <div className="absolute bottom-4 right-4 bg-rose-600/90 backdrop-blur-md text-white w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-xl border-2 border-white/30 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-500 scale-110">
              <Sparkles className="w-2.5 h-2.5 mb-0.5 text-rose-200" />
              <span className="text-[11px] font-black leading-none">{score}%</span>
            </div>
          )}

          {profile.is_online && (
            <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
          )}

          {profile.is_paid && (
            <div className="absolute top-3 left-3 bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
              <Sparkles className="w-2.5 h-2.5" /> Premium
            </div>
          )}
        </div>

        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-stone-900 truncate pr-2">
                {profile.name}{calculateAge(profile.dob) > 0 ? `, ${calculateAge(profile.dob)}` : ""}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-stone-500">
              <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <MapPin className="w-3 h-3 text-rose-500" />
              </div>
              <span className="text-xs font-bold text-stone-600 truncate">{profile.city}</span>
              {showScore && (
                <span className="ml-auto text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                  {score}% Match
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-1.5 border-t border-stone-100 pt-3">
            <div className="flex gap-2">
              <button
                onClick={(e) => handleInteract(e, 'like')}
                className="w-9 h-9 bg-stone-50 text-stone-400 rounded-xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-500 transition-all border border-stone-100 hover:border-emerald-200"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleInteract(e, 'heart')}
                className="w-9 h-9 bg-rose-50 text-rose-400 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>
            </div>

            <button
              onClick={handleTestMatch}
              className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 hover:bg-stone-900 hover:scale-110 transition-all active:scale-95"
              title="Calcola Affinità"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

// --- Pages ---

// --- Home Slider ---
const HomeSlider = () => {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch('/api/settings/home_slider')
      .then(res => res.json())
      .then(data => setImages(data))
      .catch(() => { });
  }, []);

  const fallbackImages = [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2000&auto=format&fit=crop"
  ];
  const displayImages = images.length > 0 ? images : fallbackImages;

  useEffect(() => {
    if (displayImages.length <= 1) return;
    const itv = setInterval(() => {
      setIndex(prev => (prev + 1) % displayImages.length);
    }, 5000);
    return () => clearInterval(itv);
  }, [displayImages]);

  return (
    <div className="absolute top-0 left-0 right-0 h-[450px] w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={displayImages[index]}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.5 }}
          className="w-full h-full object-cover"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-stone-50" />
    </div>
  );
};

const HomePage = () => {
  const [simulatedProfiles] = useState([
    { id: 1, name: 'Giulia', age: 30, city: 'Roma', img: 'https://picsum.photos/seed/giulia/400/500', likes: 12, hearts: 8, match: 92 },
    { id: 2, name: 'Marco', age: 35, city: 'Milano', img: 'https://picsum.photos/seed/marco/400/500', likes: 5, hearts: 3, match: 78 },
    { id: 3, name: 'Elena', age: 27, city: 'Napoli', img: 'https://picsum.photos/seed/elena/400/500', likes: 24, hearts: 15, match: 85 },
    { id: 4, name: 'Luca', age: 37, city: 'Torino', img: 'https://picsum.photos/seed/luca/400/500', likes: 8, hearts: 2, match: 61 },
    { id: 5, name: 'Sara', age: 29, city: 'Firenze', img: 'https://picsum.photos/seed/sara29/400/500', likes: 17, hearts: 11, match: 74 },
    { id: 6, name: 'Andrea', age: 32, city: 'Bologna', img: 'https://picsum.photos/seed/andrea32/400/500', likes: 6, hearts: 4, match: 55 },
  ]);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [demoLikes, setDemoLikes] = useState<Record<number, boolean>>({});
  const [demoHearts, setDemoHearts] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const checkAuth = async () => {
      window.scrollTo(0, 0);
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        setIsLoggedIn(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
      }
    };
    checkAuth();
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SoulMatch',
          text: 'Entra anche tu in SoulMatch, la community per trovare la tua compagnia ideale! ❤️',
          url: window.location.origin,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support share
      navigator.clipboard.writeText(window.location.origin);
      alert('Link copiato negli appunti! Condividilo con i tuoi amici.');
    }
  };

  return (
    <div className="min-h-screen pt-[450px] pb-12 px-4 flex flex-col items-center justify-center bg-stone-50 relative overflow-x-hidden">
      <HomeSlider />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-12 relative z-10"
      >
        {/* Hero text */}
        <div className="space-y-4">
          <motion.button
            onClick={handleShare}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05, backgroundColor: '#be123c' }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex flex-col items-center gap-1.5 px-6 py-3 bg-rose-600 text-white rounded-[22px] shadow-xl shadow-rose-200 transition-all mb-4 border border-rose-500/20 group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-[12px] font-black uppercase tracking-[0.15em]">Community in crescita</span>
            </div>
            <div className="flex items-center gap-2 opacity-90 border-t border-white/20 pt-2 w-full justify-center">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-1 rounded-full group-hover:bg-white/20 transition-colors">
                <Share2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Condividi App</span>
              </div>
            </div>
          </motion.button>

          <h1 className="text-5xl font-serif font-black leading-[1.1] tracking-tight text-stone-900 drop-shadow-sm">
            Trova la tua <br /><span className="text-rose-600 italic">compagnia</span> ideale.
          </h1>

          <p className="text-stone-500 text-[11px] font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
            Membri Certificati e Sicurezza Garantita
          </p>

          <p className="text-lg text-stone-600 leading-relaxed px-4 font-medium opacity-80">
            SoulMatch è il luogo sicuro dove incontrare persone reali. Ogni profilo è verificato manualmente per la tua sicurezza.
          </p>
        </div>

        {/* Single CTA */}
        <div className="px-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Link
              to={isLoggedIn ? "/bacheca" : "/register"}
              className="w-full flex items-center justify-between gap-4 bg-gradient-to-r from-rose-600 to-rose-500 text-white py-4 px-6 rounded-[22px] font-black shadow-xl shadow-rose-300/50 hover:shadow-rose-400/60 transition-all"
            >
              {/* Left icon */}
              <div className="w-10 h-10 bg-white/15 rounded-[14px] flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              {/* Label */}
              <div className="flex-1 text-left">
                <p className="text-base font-black uppercase tracking-widest leading-none">
                  {isLoggedIn ? "Vai alla Bacheca" : "Inizia Ora"}
                </p>
                <p className="text-rose-200 text-[10px] font-semibold mt-0.5">
                  {isLoggedIn ? "I tuoi match ti aspettano" : "Gratis — nessuna carta"}
                </p>
              </div>
              {/* Right arrow bubble */}
              <div className="w-10 h-10 bg-white/15 rounded-[14px] flex items-center justify-center shrink-0">
                <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Feature cards — horizontal list style */}
        <div className="space-y-3 px-1">
          <h2 className="text-left text-sm font-black text-stone-400 uppercase tracking-widest px-1">Perché SoulMatch</h2>
          {[
            {
              icon: UserPlus,
              title: "Iscrizione gratuita",
              desc: "Crea il tuo profilo in 2 minuti, nessuna carta richiesta",
              color: "rose",
              bg: "bg-rose-50",
              iconColor: "text-rose-600",
            },
            {
              icon: ShieldCheck,
              title: "Profili verificati",
              desc: "Ogni iscritto è verificato manualmente dal nostro team",
              color: "emerald",
              bg: "bg-emerald-50",
              iconColor: "text-emerald-600",
            },
            {
              icon: Sparkles,
              title: "SoulMatch AI",
              desc: "Algoritmo di compatibilità che migliora con il tempo",
              color: "amber",
              bg: "bg-amber-50",
              iconColor: "text-amber-600",
            },
            {
              icon: MessageSquare,
              title: "Messaggi privati",
              desc: "Chatta in totale sicurezza con chi ti interessa",
              color: "blue",
              bg: "bg-blue-50",
              iconColor: "text-blue-600",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white border border-stone-100 rounded-[20px] p-4 flex items-center gap-4 shadow-sm"
            >
              <div className={cn('w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0', f.bg)}>
                <f.icon className={cn('w-6 h-6', f.iconColor)} />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-stone-900">{f.title}</h3>
                <p className="text-[11px] text-stone-400 font-medium leading-snug mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── DEMO BACHECA ── */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-1">
            <div className="text-left">
              <h2 className="text-xl font-serif font-bold text-stone-900">Anteprima Bacheca</h2>
              <p className="text-stone-400 text-[10px] uppercase tracking-widest font-bold">Demo interattiva — prova i tasti!</p>
            </div>
            <span className="bg-rose-600 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">Live Demo</span>
          </div>

          {/* Mock device frame */}
          <div className="relative rounded-[32px] overflow-hidden border-2 border-stone-200 shadow-2xl bg-[#F8F4EF]">
            {/* Fake status bar */}
            <div className="bg-white/90 backdrop-blur-sm px-5 py-2 flex items-center justify-between border-b border-stone-100">
              <span className="text-[10px] font-black text-stone-400">SoulMatch</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center">
                  <Heart className="w-2 h-2 text-white fill-current" />
                </div>
                <span className="text-[10px] font-black text-rose-600">Bacheca</span>
              </div>
            </div>

            {/* Demo grid */}
            <div className="p-3 grid grid-cols-2 gap-3">
              {simulatedProfiles.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="group relative overflow-hidden rounded-[20px] bg-white border border-stone-200 shadow-sm"
                >
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img src={p.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    {/* Match badge */}
                    <div className="absolute top-2 left-2 bg-rose-600/90 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />{p.match}%
                    </div>
                    {/* Online dot */}
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-black text-stone-900 truncate">{p.name}, {p.age}</p>
                    <p className="text-[10px] text-stone-400 font-semibold flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{p.city}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 border-t border-stone-100 pt-2">
                      <button
                        onClick={(e) => { e.preventDefault(); setDemoLikes(prev => ({ ...prev, [p.id]: !prev[p.id] })); }}
                        className={cn(
                          'flex-1 h-8 rounded-[10px] flex items-center justify-center gap-1 text-[9px] font-black border transition-all',
                          demoLikes[p.id] ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-stone-50 text-stone-400 border-stone-100'
                        )}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        {p.likes + (demoLikes[p.id] ? 1 : 0)}
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); setDemoHearts(prev => ({ ...prev, [p.id]: !prev[p.id] })); }}
                        className={cn(
                          'flex-1 h-8 rounded-[10px] flex items-center justify-center gap-1 text-[9px] font-black border transition-all',
                          demoHearts[p.id] ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50 text-rose-400 border-rose-100'
                        )}
                      >
                        <Heart className="w-3 h-3 fill-current" />
                        {p.hearts + (demoHearts[p.id] ? 1 : 0)}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Subtle blur overlay with CTA */}
            <div className="relative bg-gradient-to-t from-[#F8F4EF] via-[#F8F4EF]/60 to-transparent -mt-16 pt-16 pb-5 px-4 flex flex-col items-center gap-3">
              <p className="text-xs text-stone-500 font-semibold text-center">Accedi per vedere tutti i profili reali nella tua zona</p>
              <Link
                to={isLoggedIn ? "/bacheca" : "/register"}
                className="bg-rose-600 text-white px-8 py-3 rounded-[16px] text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-all"
              >
                {isLoggedIn ? "Apri Bacheca" : "Iscriviti Gratis"}
              </Link>
            </div>
          </div>

          <p className="text-stone-300 text-[9px] italic text-center">Profile demo a scopo illustrativo</p>
        </div>
      </motion.div>

      {/* ── DECORATIVE BOTTOM ELEMENT (tone-on-tone) ── */}
      <div className="pointer-events-none select-none w-full mt-16 pb-8 flex flex-col items-center gap-4 relative overflow-hidden">
        {/* Large faded heart */}
        <div className="relative flex items-center justify-center">
          <Heart className="w-40 h-40 text-stone-200/60 fill-current" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Heart className="w-20 h-20 text-rose-200/40 fill-current" />
          </div>
        </div>
        {/* Wavy line decoration */}
        <svg viewBox="0 0 320 24" className="w-64 text-stone-200" fill="none">
          <path d="M0 12 Q40 0 80 12 Q120 24 160 12 Q200 0 240 12 Q280 24 320 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
        <p className="text-stone-300 text-[9px] font-black uppercase tracking-[0.3em]">SoulMatch &copy; 2025</p>
      </div>

      {/* Footer */}
      <AppFooter />
    </div>
  );
};


const ProfileDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [chatStatus, setChatStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [userInteractions, setUserInteractions] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [soulLinkStatus, setSoulLinkStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected'>('none');
  const [soulLinkId, setSoulLinkId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchInteractionState = async (currentUserId: string) => {
    const { data } = await supabase
      .from('interactions')
      .select('type')
      .eq('from_user_id', currentUserId)
      .eq('to_user_id', id);
    if (data) setUserInteractions(data.map(i => i.type));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    let currentUserId: string | null = null;
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        currentUserId = user.id;
      }
    } catch (e) { }

    const fetchProfile = async () => {
      // Get user with like/heart counts
      const { data: userProfile, error } = await supabase
        .from('users')
        .select(`
          *,
          interactions!to_user_id(type)
        `)
        .eq('id', id)
        .single();

      if (error) console.error("ProfileDetail fetch error:", error);

      if (userProfile && !error) {
        const profileWithCounts = {
          ...userProfile,
          likes_count: (userProfile.interactions as any[] || []).filter(i => i.type === 'like').length,
          hearts_count: (userProfile.interactions as any[] || []).filter(i => i.type === 'heart').length
        };
        setProfile(profileWithCounts);
      }
      else {
        console.warn("No detail profile found for ID:", id);
      }
      setLoading(false);
    };

    const fetchStatus = async () => {
      if (!currentUserId || !id) return;

      const { data } = await supabase
        .from('chat_requests')
        .select('status')
        .eq('from_user_id', currentUserId)
        .eq('to_user_id', id)
        .single();

      if (data) setChatStatus(data.status);
      else setChatStatus('none');

      fetchInteractionState(currentUserId);

      // Fetch SoulLink status
      const { data: slData } = await supabase
        .from('soul_links')
        .select('id, sender_id, receiver_id, status')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${currentUserId})`)
        .single();

      if (slData) {
        setSoulLinkId(slData.id);
        if (slData.status === 'accepted') {
          setSoulLinkStatus('accepted');
        } else if (slData.status === 'pending') {
          setSoulLinkStatus(slData.sender_id === currentUserId ? 'pending_sent' : 'pending_received');
        } else {
          setSoulLinkStatus('rejected');
        }
      } else {
        setSoulLinkStatus('none');
        setSoulLinkId(null);
      }
    };

    fetchProfile();
    fetchStatus();
  }, [id]);

  const handleSendSoulLink = async () => {
    if (!currentUser?.id) {
      setToast({ message: 'Devi essere iscritto!', type: 'error' });
      return;
    }
    if (currentUser.id === id) return;

    const { data, error } = await supabase
      .from('soul_links')
      .insert([{ sender_id: currentUser.id, receiver_id: id }])
      .select()
      .single();

    if (!error && data) {
      setSoulLinkId(data.id);
      setSoulLinkStatus('pending_sent');
      setToast({ message: '✨ SoulLink inviato! Attendi la risposta.', type: 'success' });
    } else {
      setToast({ message: 'Errore nell\'invio del SoulLink.', type: 'error' });
    }
  };

  const handleAcceptSoulLink = async () => {
    if (!soulLinkId) return;
    const { error } = await supabase
      .from('soul_links')
      .update({ status: 'accepted' })
      .eq('id', soulLinkId);

    if (!error) {
      setSoulLinkStatus('accepted');
      setToast({ message: '🎉 SoulLink accettato! Siete ora connessi.', type: 'success' });
    }
  };

  const handleRemoveSoulLink = async () => {
    if (!soulLinkId) return;
    const { error } = await supabase
      .from('soul_links')
      .delete()
      .eq('id', soulLinkId);

    if (!error) {
      setSoulLinkStatus('none');
      setSoulLinkId(null);
      setToast({ message: 'SoulLink rimosso.', type: 'info' });
    }
  };

  const handleInteract = async (type: 'like' | 'heart') => {
    if (!currentUser?.id) {
      setToast({ message: "Devi essere iscritto per interagire!", type: 'error' });
      return;
    }

    const isRemoving = userInteractions.includes(type);

    if (isRemoving) {
      await supabase
        .from('interactions')
        .delete()
        .eq('from_user_id', currentUser.id)
        .eq('to_user_id', profile?.id)
        .eq('type', type);
    } else {
      await supabase
        .from('interactions')
        .insert([{ from_user_id: currentUser.id, to_user_id: profile?.id, type }]);
    }

    // Refresh profile and state
    const { data: updatedProfile } = await supabase
      .from('users')
      .select(`
        *,
        interactions!to_user_id(type)
      `)
      .eq('id', id)
      .single();

    if (updatedProfile) {
      setProfile({
        ...updatedProfile,
        likes_count: (updatedProfile.interactions as any[] || []).filter(i => i.type === 'like').length,
        hearts_count: (updatedProfile.interactions as any[] || []).filter(i => i.type === 'heart').length
      });
    }
    fetchInteractionState(currentUser.id);

    setToast({
      message: isRemoving ? "Interazione rimossa." : (type === 'like' ? "Like inviato!" : "Cuore inviato!"),
      type: isRemoving ? 'info' : 'success'
    });
  };

  const handleInstantChat = async () => {
    if (!currentUser?.id) {
      setToast({ message: "Devi essere iscritto!", type: 'error' });
      return;
    }
    if (!currentUser.is_paid) {
      setToast({ message: "Funzione riservata agli utenti Premium!", type: 'info' });
      return;
    }

    // Check if user is online for instant chat
    if (!profile?.is_online) {
      setToast({ message: "L'utente non è online. Puoi solo inviare un messaggio offline (in basso).", type: 'info' });
      return;
    }

    if (chatStatus === 'approved') {
      setToast({ message: "Chat già attiva!", type: 'success' });
      return;
    }

    if (chatStatus === 'pending') {
      setToast({ message: "Richiesta già inviata!", type: 'info' });
      return;
    }

    // Send instant chat request to Supabase
    const { error } = await supabase
      .from('chat_requests')
      .insert([{
        from_user_id: currentUser.id,
        to_user_id: profile?.id,
        message: "Richiesta di chat istantanea"
      }]);

    if (!error) {
      setChatStatus('pending');
      setToast({ message: "Richiesta di chat istantanea inviata!", type: 'success' });
    } else {
      setToast({ message: "Errore durante l'invio della richiesta.", type: 'error' });
    }
  };

  const handleOpenMessageModal = () => {
    if (!currentUser?.id) {
      setToast({ message: "Devi essere iscritto!", type: 'error' });
      return;
    }
    if (!currentUser.is_paid) {
      setToast({ message: "Funzione Premium riservata!", type: 'info' });
      return;
    }
    setIsMessageModalOpen(true);
  };

  const sendChatMessage = async () => {
    if (!messageText.trim()) return;

    // ── Limit free users to max 5 sent messages ──
    if (currentUser && !currentUser.is_paid) {
      const { count } = await supabase
        .from('chat_requests')
        .select('*', { count: 'exact', head: true })
        .eq('from_user_id', currentUser.id);
      if ((count ?? 0) >= 5) {
        setIsMessageModalOpen(false);
        setToast({ message: "Hai raggiunto il limite di 5 messaggi. Passa a Premium per scrivere senza limiti!", type: 'info' });
        return;
      }
    }

    // Close modal immediately for better UX
    setIsMessageModalOpen(false);
    const textToSend = messageText;
    setMessageText('');

    try {
      const { error } = await supabase
        .from('chat_requests')
        .insert([{
          from_user_id: currentUser!.id,
          to_user_id: profile?.id,
          message: textToSend
        }]);

      if (!error) {
        setChatStatus('pending');
        setToast({ message: "Messaggio inviato con successo!", type: 'success' });
      } else {
        console.error("Supabase error:", error);
        setToast({ message: "Errore durante l'invio del messaggio.", type: 'error' });
      }
    } catch (err) {
      setToast({ message: "Errore di connessione", type: 'error' });
    }
  };


  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Sparkles className="w-8 h-8 text-rose-600 animate-pulse" /></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center bg-stone-50">Profilo non trovato</div>;

  const heroPhoto = (profile.photos && profile.photos.length > 0) ? profile.photos[0] : (profile.photo_url || `https://picsum.photos/seed/${profile.name}/400/600`);
  const matchScore = calculateMatchScore(currentUser, profile);

  return (
    <div className="min-h-screen bg-[#F8F4EF] pt-16 pb-32 relative overflow-x-hidden">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── HERO PHOTO ── */}
      <div className="relative w-full h-[55vh] min-h-[320px] overflow-hidden">
        <img src={heroPhoto} alt={profile.name} className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
        {/* Gradient: dark at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#F8F4EF]" />

        {/* Status badge top-right */}
        <div className="absolute top-4 right-5 z-20">
          {profile.is_online ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-400/40">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              <div className="w-2 h-2 bg-stone-400 rounded-full" />
              <span className="text-[10px] font-black text-stone-300 uppercase tracking-wider">Offline</span>
            </div>
          )}
        </div>

        {/* Name / age / city overlaid on gradient */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 z-10">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {!!profile.is_paid && (
                  <span className="bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Premium
                  </span>
                )}
                <span className="bg-white/25 backdrop-blur text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">{profile.gender}</span>
              </div>
              <h1 className="text-3xl font-serif font-black text-stone-900 leading-tight drop-shadow-sm">
                {profile.name}{calculateAge(profile.dob) > 0 ? <span className="font-light text-2xl text-stone-500">, {calculateAge(profile.dob)}</span> : null}
              </h1>
              {profile.city && (
                <p className="flex items-center gap-1 text-stone-500 text-sm font-semibold mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />{profile.city}{profile.province ? `, ${profile.province}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION STRIP (4 cols) ── */}
      <div className="mx-4 mt-3 bg-white rounded-[28px] shadow-sm border border-stone-100 grid grid-cols-4 divide-x divide-stone-100 overflow-hidden">
        {/* Like */}
        <button onClick={() => handleInteract('like')} className="flex flex-col items-center py-4 gap-1 group">
          <div className={cn(
            "w-10 h-10 rounded-[14px] flex items-center justify-center transition-all",
            userInteractions.includes('like') ? "bg-emerald-100 text-emerald-600" : "bg-stone-50 text-stone-400 group-hover:bg-emerald-50 group-hover:text-emerald-500"
          )}>
            <ThumbsUp className={cn("w-5 h-5", userInteractions.includes('like') && "fill-current")} />
          </div>
          <span className="text-lg font-black text-stone-900">{profile.likes_count || 0}</span>
          <span className={cn("text-[9px] font-bold uppercase tracking-widest", userInteractions.includes('like') ? "text-emerald-600" : "text-stone-400")}>Like</span>
        </button>

        {/* Heart */}
        <button onClick={() => handleInteract('heart')} className="flex flex-col items-center py-3 gap-1 group">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md",
            userInteractions.includes('heart') ? "bg-rose-600 text-white scale-105" : "bg-rose-50 text-rose-500 group-hover:scale-105"
          )}>
            <Heart className={cn("w-6 h-6", userInteractions.includes('heart') && "fill-current")} />
          </div>
          <span className="text-lg font-black text-stone-900">{profile.hearts_count || 0}</span>
          <span className={cn("text-[9px] font-bold uppercase tracking-widest", userInteractions.includes('heart') ? "text-rose-600" : "text-stone-400")}>Cuori</span>
        </button>

        {/* SoulLink */}
        <button
          onClick={
            soulLinkStatus === 'none' ? handleSendSoulLink :
              soulLinkStatus === 'pending_received' ? handleAcceptSoulLink :
                soulLinkStatus === 'accepted' ? handleRemoveSoulLink :
                  () => { }
          }
          className="flex flex-col items-center py-4 gap-1 group"
        >
          <div className={cn(
            "w-10 h-10 rounded-[14px] flex items-center justify-center transition-all relative",
            soulLinkStatus === 'accepted' ? "bg-violet-100 text-violet-600" :
              soulLinkStatus === 'pending_sent' ? "bg-amber-100 text-amber-600" :
                soulLinkStatus === 'pending_received' ? "bg-emerald-100 text-emerald-600" :
                  "bg-stone-50 text-stone-400 group-hover:bg-violet-50 group-hover:text-violet-500"
          )}>
            <Link2 className="w-5 h-5" />
            {soulLinkStatus === 'pending_received' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </div>
          <span className="text-lg font-black text-stone-900">&nbsp;</span>
          <span className={cn("text-[9px] font-bold uppercase tracking-widest",
            soulLinkStatus === 'accepted' ? "text-violet-600" :
              soulLinkStatus === 'pending_sent' ? "text-amber-600" :
                soulLinkStatus === 'pending_received' ? "text-emerald-600" :
                  "text-stone-400"
          )}>
            {soulLinkStatus === 'accepted' ? 'Connessi' :
              soulLinkStatus === 'pending_sent' ? 'Attesa' :
                soulLinkStatus === 'pending_received' ? 'Accetta' :
                  'SoulLink'}
          </span>
        </button>

        {/* Chat */}
        <button onClick={handleInstantChat} className="flex flex-col items-center py-4 gap-1 group relative">
          <div className={cn(
            "w-10 h-10 rounded-[14px] flex items-center justify-center transition-all relative",
            chatStatus === 'approved' ? "bg-emerald-100 text-emerald-600" :
              chatStatus === 'pending' ? "bg-amber-100 text-amber-600" :
                "bg-stone-50 text-stone-400 group-hover:bg-blue-50 group-hover:text-blue-500"
          )}>
            <MessageSquare className="w-5 h-5" />
            <div className={cn(
              "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
              profile.is_online ? "bg-emerald-500" : "bg-rose-400"
            )} />
          </div>
          <span className="text-lg font-black text-stone-900">&nbsp;</span>
          <span className={cn("text-[9px] font-bold uppercase tracking-widest",
            chatStatus === 'approved' ? "text-emerald-600" :
              chatStatus === 'pending' ? "text-amber-600" : "text-stone-400")}>
            {chatStatus === 'approved' ? 'Attiva' : chatStatus === 'pending' ? 'Attesa' : 'Chat'}
          </span>
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div className="mx-4 mt-4 space-y-4">

        {/* Compatibility card */}
        <div className="bg-white rounded-[24px] border border-stone-100 p-5 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-serif font-black text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" /> Compatibilità
            </h2>
            {currentUser && (
              <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-full uppercase tracking-widest border border-rose-100">Calcolo AI</span>
            )}
          </div>
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="7" fill="transparent" className="text-stone-100" />
                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="7" fill="transparent"
                  strokeDasharray={226}
                  strokeDashoffset={226 - (226 * matchScore) / 100}
                  strokeLinecap="round"
                  className="text-rose-600 transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-stone-900 leading-none">{matchScore}%</span>
                <span className="text-[7px] font-bold text-stone-400 uppercase tracking-tighter">Match</span>
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-xs font-black text-stone-600 uppercase tracking-widest">Cosa vi unisce</h3>
              <ul className="space-y-1">
                {(() => {
                  const h1 = (profile.hobbies || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
                  const h2 = (currentUser?.hobbies || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
                  const common = h1.filter((h: string) => h2.includes(h)).slice(0, 2);
                  return common.length > 0
                    ? common.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[11px] text-stone-500">
                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> {h}
                      </li>
                    ))
                    : <li className="text-[11px] text-stone-400 italic">Scoprite parlando in chat!</li>;
                })()}
                {currentUser?.city === profile.city && (
                  <li className="flex items-center gap-1.5 text-[11px] text-stone-500">
                    <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> Stessa città
                  </li>
                )}
              </ul>
            </div>
          </div>
          {!currentUser && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
              <div className="text-center space-y-2 px-6">
                <Sparkles className="w-5 h-5 text-rose-500 mx-auto" />
                <p className="text-[10px] font-black text-stone-600 uppercase tracking-widest leading-tight">Iscriviti per calcolare<br />la tua affinità reale!</p>
                <button onClick={() => navigate('/register')} className="text-[10px] font-black text-rose-600 underline">Crea Profilo Gratis</button>
              </div>
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.description && (
          <div className="bg-white rounded-[24px] border border-stone-100 p-5 shadow-sm">
            <h2 className="text-base font-serif font-black text-stone-900 mb-2">Bio</h2>
            <p className="text-stone-600 leading-relaxed text-sm italic">"{profile.description}"</p>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-[20px] border border-stone-100 p-4 shadow-sm">
            <p className="text-[9px] text-stone-400 uppercase font-bold tracking-widest mb-1">Lavoro</p>
            <p className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-rose-500 shrink-0" />{profile.job || 'Privato'}
            </p>
          </div>
          <div className="bg-white rounded-[20px] border border-stone-100 p-4 shadow-sm">
            <p className="text-[9px] text-stone-400 uppercase font-bold tracking-widest mb-1">Orientamento</p>
            <p className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-rose-500 shrink-0" />{profile.orientation}
            </p>
          </div>
        </div>

        {/* Interests */}
        {profile.hobbies && (
          <div className="bg-white rounded-[24px] border border-stone-100 p-5 shadow-sm">
            <h2 className="text-base font-serif font-black text-stone-900 mb-3">Interessi</h2>
            <div className="flex flex-wrap gap-2">
              {profile.hobbies.split(',').map((h, i) => h.trim() && (
                <span key={i} className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-xs font-semibold">{h.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {/* Looking for */}
        <div className="bg-rose-50 rounded-[24px] border border-rose-100 p-5 shadow-sm">
          <h2 className="text-base font-serif font-black text-stone-900 mb-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-rose-500" /> Cosa Cerca
          </h2>
          <p className="text-xs text-stone-500 font-semibold mb-1">Preferenza: <span className="text-stone-800">{profile.looking_for_gender}</span></p>
          <p className="text-xs text-stone-600 leading-relaxed">{profile.looking_for_other || 'In cerca di una connessione autentica e momenti speciali.'}</p>
        </div>

        {/* Gallery */}
        {profile.photos && profile.photos.length > 0 && (
          <div className="bg-white rounded-[24px] border border-stone-100 p-5 shadow-sm">
            <h2 className="text-base font-serif font-black text-stone-900 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-rose-500" /> Galleria
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {profile.photos.map((url, i) => (
                <div key={i} className="aspect-square rounded-[16px] overflow-hidden border border-stone-100 shadow-sm">
                  <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="pt-2">
          <FeedComponent userId={profile.id} isOwner={false} />
        </div>
      </div>

      {/* ── BOTTOM NAV BAR (iOS style) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-stone-100 shadow-2xl px-6 pb-6 pt-3">
        <div className="max-w-sm mx-auto flex items-center justify-around">

          {/* Home */}
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all"
          >
            <Home className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
          </button>

          {/* Centre — CTA message button, elevated */}
          {chatStatus === 'pending' ? (
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 -mt-6 rounded-[22px] bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-400/40 text-white">
                <CheckCircle className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Inviato</span>
            </div>
          ) : (
            <button
              onClick={handleOpenMessageModal}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-14 h-14 -mt-6 rounded-[22px] bg-rose-600 flex items-center justify-center shadow-xl shadow-rose-400/40 text-white active:scale-90 transition-all">
                <MessageSquare className="w-6 h-6 fill-current" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">
                {chatStatus === 'approved' ? 'Chat' : 'Scrivi'}
              </span>
            </button>
          )}

          {/* Bacheca */}
          <button
            onClick={() => navigate('/bacheca')}
            className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all"
          >
            <Users className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Bacheca</span>
          </button>

        </div>
      </div>


      {/* ── MESSAGE MODAL ── */}
      <AnimatePresence>
        {isMessageModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl space-y-5"
            >
              <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-2" />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[16px] overflow-hidden border border-stone-100 shadow-sm shrink-0">
                  <img src={heroPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-black text-stone-900">Scrivi a {profile.name}</h3>
                  <p className="text-stone-400 text-xs">Il tuo messaggio sarà visibile nel profilo</p>
                </div>
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Ciao! Mi piacerebbe conoscerti..."
                className="w-full h-28 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-rose-500/40 focus:bg-white transition-all resize-none font-medium text-stone-800"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setIsMessageModalOpen(false)}
                  className="flex-1 py-4 bg-stone-100 text-stone-500 rounded-[18px] text-xs font-black uppercase tracking-widest hover:bg-stone-200 transition-all"
                >Annulla</button>
                <button
                  onClick={sendChatMessage}
                  disabled={!messageText.trim()}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-[18px] text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-200 disabled:opacity-40 hover:bg-rose-700 transition-all active:scale-95"
                >Invia ❤️</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BachecaPage = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  // filterGender removed - matching is now automatic from user profile preferences
  const [filterCity, setFilterCity] = useState<string>('Tutte');
  const [filterBodyType, setFilterBodyType] = useState<string>('Tutte');
  const [filterAge, setFilterAge] = useState<[number, number]>([18, 99]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showSoulMatch, setShowSoulMatch] = useState(false);
  const [soulmatchToast, setSoulmatchToast] = useState(false);

  const SM_COOLDOWN_KEY = 'soulmatch_last_used';
  const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h


  const getSoulMatchCooldownRemaining = (): number => {
    const last = localStorage.getItem(SM_COOLDOWN_KEY);
    if (!last) return 0;
    const elapsed = Date.now() - parseInt(last);
    return Math.max(0, COOLDOWN_MS - elapsed);
  };

  const isSoulMatchOnCooldown = () => getSoulMatchCooldownRemaining() > 0;

  const formatCooldown = (): string => {
    const ms = getSoulMatchCooldownRemaining();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const handleSoulMatchPress = () => {
    if (isSoulMatchOnCooldown()) {
      setSoulmatchToast(true);
      setTimeout(() => setSoulmatchToast(false), 4000);
      return;
    }
    setShowSoulMatch(true);
  };

  const confirmSoulMatch = () => {
    localStorage.setItem(SM_COOLDOWN_KEY, Date.now().toString());
    // toast stays open, modal shows matches
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        interactions!to_user_id(type)
      `);

    if (data && !error) {
      const processed = data.map(u => ({
        ...u,
        likes_count: (u.interactions as any[] || []).filter(i => i.type === 'like').length,
        hearts_count: (u.interactions as any[] || []).filter(i => i.type === 'heart').length
      }));
      setProfiles(processed);
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const saved = localStorage.getItem('soulmatch_user');
        if (!saved) { navigate('/register'); return; }
        const localUser = JSON.parse(saved);
        if (!localUser?.id) { navigate('/register'); return; }

        // Carica sempre dal DB per avere preferenze aggiornate
        const { data: freshUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', localUser.id)
          .single();

        if (freshUser) {
          // Aggiorna anche localStorage con i dati freschi
          localStorage.setItem('soulmatch_user', JSON.stringify(freshUser));
          setCurrentUser(freshUser);
        } else {
          setCurrentUser(localUser);
        }
        fetchProfiles();
      } catch (e) {
        navigate('/register');
      }
    };
    init();

    // Save scroll position on unmount
    return () => {
      sessionStorage.setItem('bacheca_scroll', window.scrollY.toString());
    };
  }, []);

  // Restore scroll position after profiles are loaded
  useEffect(() => {
    if (!loading && profiles.length > 0) {
      const savedScroll = sessionStorage.getItem('bacheca_scroll');
      if (savedScroll) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScroll));
        }, 50);
      }
    }
  }, [loading, profiles]);

  const genderOptions = ['Uomo', 'Donna', 'Non-binario', 'Transgender', 'Genderfluid', 'Queer', 'Altro'];
  const orientationOptions = ['Eterosessuale', 'Gay', 'Lesbica', 'Bisessuale', 'Pansessuale', 'Queer', 'Altro'];
  const cityOptions = useMemo(() => {
    const cities = profiles.map(p => p.city).filter(Boolean);
    return ['Tutte', ...Array.from(new Set(cities))].sort();
  }, [profiles]);

  const filteredProfiles = profiles.filter(p => {
    // Exclude self
    if (currentUser && p.id === currentUser.id) return false;

    // ─── 1. Secondary UI filters (city, age, body type) ───
    const cityMatch = filterCity === 'Tutte' || p.city === filterCity;
    const bodyTypeMatch = filterBodyType === 'Tutte' || p.body_type === filterBodyType;
    const age = p.dob ? calculateAge(p.dob) : null;
    const ageMatch = !age || (age >= filterAge[0] && age <= filterAge[1]);
    if (!cityMatch || !ageMatch || !bodyTypeMatch) return false;

    // ─── 2. Preference-based matching (gender + orientation together) ───
    const toArr = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return [val as string];
    };

    const viewerWants = toArr(currentUser?.looking_for_gender);
    const profileWants = toArr(p.looking_for_gender);

    // Orientations that are open to all / multiple genders
    const openOrientations = ['Bisessuale', 'Pansessuale', 'Fluido', 'Polisessuale', 'Queer', 'Curioso/a', 'Sapiosexual'];
    const viewerOrientation = toArr(currentUser?.orientation);
    const profileOrientation = toArr(p.orientation);
    const viewerIsOpen = viewerOrientation.some(o => openOrientations.includes(o));
    const profileIsOpen = profileOrientation.some(o => openOrientations.includes(o));

    // Viewer wants this profile's gender?
    const viewerWantsProfile =
      viewerIsOpen || // open orientation → sees all genders
      viewerWants.length === 0 ||
      (p.gender ? viewerWants.includes(p.gender) : true);

    // Profile wants the viewer's gender?
    const profileWantsViewer =
      profileIsOpen || // open orientation → visible to all genders
      profileWants.length === 0 ||
      (currentUser?.gender ? profileWants.includes(currentUser.gender) : true);

    if (!viewerWantsProfile || !profileWantsViewer) return false;

    return true;
  });

  const userWantsGender: string[] = (() => {
    const lfg = currentUser?.looking_for_gender;
    if (!lfg) return [];
    if (Array.isArray(lfg)) return lfg;
    return [lfg as unknown as string];
  })();

  // Quick reaction on profile cards (one per user)
  const [cardReactions, setCardReactions] = useState<Record<string, 'like' | 'heart' | null>>({});

  const handleQuickReaction = async (profileId: string, type: 'like' | 'heart', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser?.id) return;
    const existing = cardReactions[profileId];
    if (existing === type) return; // already reacted with this type
    setCardReactions(prev => ({ ...prev, [profileId]: type }));
    playTapSound();
    try {
      const { error } = await supabase
        .from('interactions')
        .upsert({
          from_user_id: currentUser.id,
          to_user_id: profileId,
          type: type
        }, { onConflict: 'from_user_id,to_user_id' });
      if (error) throw error;
    } catch (err) {
      console.error('Quick reaction error:', err);
    }
  };


  const [heroIndex, setHeroIndex] = useState(0);
  const heroProfiles = filteredProfiles.slice(0, Math.min(5, filteredProfiles.length));

  // Auto-rotate hero slider
  useEffect(() => {
    if (heroProfiles.length < 2) return;
    const timer = setInterval(() => setHeroIndex(i => (i + 1) % heroProfiles.length), 4000);
    return () => clearInterval(timer);
  }, [heroProfiles.length]);

  const heroProfile = heroProfiles[heroIndex];

  return (
    <div className="min-h-screen bg-[#F8F4EF] pt-16 pb-28 relative overflow-x-hidden">

      {/* ── HERO SLIDER ── */}
      {!loading && heroProfile && (
        <div className="relative w-full h-[42vh] min-h-[260px] overflow-hidden">
          <AnimatePresence mode="sync">
            <motion.img
              key={heroProfile.id}
              src={(heroProfile.photos?.[0]) || heroProfile.photo_url || `https://picsum.photos/seed/${heroProfile.name}/600/800`}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          </AnimatePresence>
          {/* Gradient fade */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#F8F4EF]" />
          {/* Name + CTA overlaid */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex items-end justify-between z-10">
            <div>
              <h2 className="text-2xl font-serif font-black text-stone-900 drop-shadow-sm">
                {heroProfile.name}{calculateAge(heroProfile.dob) > 0 ? <span className="font-light text-xl text-stone-500">, {calculateAge(heroProfile.dob)}</span> : null}
              </h2>
              {heroProfile.city && (
                <p className="text-stone-500 text-xs font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{heroProfile.city}
                </p>
              )}
            </div>
            <Link
              to={`/profile-detail/${heroProfile.id}`}
              className="bg-rose-600 text-white px-5 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-300/40 active:scale-95 transition-all"
            >
              Visita
            </Link>
          </div>
          {/* Dot indicators */}
          {heroProfiles.length > 1 && (
            <div className="absolute top-4 right-5 flex gap-1.5">
              {heroProfiles.map((_, i) => (
                <button key={i} onClick={() => setHeroIndex(i)}
                  className={cn('w-1.5 h-1.5 rounded-full transition-all', i === heroIndex ? 'bg-white w-4' : 'bg-white/40')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="max-w-md mx-auto px-4 space-y-5 mt-4">

        {/* Filter bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-[16px] border text-xs font-black uppercase tracking-widest transition-all shrink-0',
                  showAdvanced ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                Filtri
                {(filterCity !== 'Tutte' || filterAge[0] !== 18 || filterAge[1] !== 99) && (
                  <span className="w-2 h-2 bg-rose-600 rounded-full" />
                )}
              </button>
              {/* Show user's preference tags read-only */}
              {userWantsGender.length > 0 && (
                <span className="flex items-center gap-1.5 bg-stone-100 text-stone-600 border border-stone-200 px-3 py-1 rounded-full text-[10px] font-black shrink-0">
                  🎯 {userWantsGender.join(' · ')}
                </span>
              )}
              {filterCity !== 'Tutte' && (
                <span className="flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1 rounded-full text-[10px] font-black shrink-0">
                  {filterCity}
                  <button onClick={() => setFilterCity('Tutte')} className="text-rose-400 hover:text-rose-600">×</button>
                </span>
              )}
            </div>
          </div>

          {showAdvanced && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[24px] border border-stone-100 p-5 shadow-sm space-y-5"
            >
              {/* Genere - readonly info from profile */}
              <div className="p-3 bg-stone-50 rounded-[16px] border border-stone-100">
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">🎯 Genere cercato</p>
                <p className="text-[11px] text-stone-700 font-semibold">
                  {userWantsGender.length > 0 ? userWantsGender.join(', ') : 'Nessuna preferenza impostata'}
                </p>
                <p className="text-[9px] text-stone-400 mt-1">Modifica in: Profilo → Modifica Profilo</p>
              </div>
              {/* City */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3" /> Città</label>
                <div className="flex flex-wrap gap-1.5">
                  {cityOptions.map(c => (
                    <button key={c} onClick={() => setFilterCity(c)}
                      className={cn('px-3 py-1 rounded-full text-[10px] font-semibold border transition-all',
                        filterCity === c ? 'bg-rose-600 text-white border-rose-600' : 'bg-stone-50 text-stone-500 border-stone-100')}
                    >{c}</button>
                  ))}
                </div>
              </div>
              {/* Age */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Età ({filterAge[0]}-{filterAge[1]})</label>
                <div className="flex gap-3">
                  <input type="range" min="18" max="99" value={filterAge[0]}
                    onChange={e => setFilterAge([+e.target.value, filterAge[1]])} className="flex-1 accent-rose-600" />
                  <input type="range" min="18" max="99" value={filterAge[1]}
                    onChange={e => setFilterAge([filterAge[0], +e.target.value])} className="flex-1 accent-rose-600" />
                </div>
              </div>
              {/* Reset */}
              <button
                onClick={() => { setFilterCity('Tutte'); setFilterAge([18, 99]); setFilterBodyType('Tutte'); setShowAdvanced(false); }}
                className="text-[10px] font-black text-stone-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
              >Azzera filtri</button>
            </motion.div>
          )}
        </div>

        {/* Section title */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-serif font-black text-stone-900">Scopri</h2>
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{filteredProfiles.length} profili</span>
        </div>

        {/* Profile grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-[3/4] bg-stone-200 animate-pulse rounded-[20px]" />)}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[28px] border border-stone-100 px-6">
            <div className="w-14 h-14 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-stone-200" />
            </div>
            <h3 className="text-sm font-black text-stone-900 mb-1">Nessun profilo compatibile</h3>
            <p className="text-[11px] text-stone-400 mb-6 leading-relaxed">
              Non ci sono profili che corrispondono alle tue preferenze. Prova a modificare il tuo profilo.
            </p>
            <button
              onClick={() => { setFilterCity('Tutte'); setFilterAge([18, 99]); setFilterBodyType('Tutte'); setShowAdvanced(false); }}
              className="text-[10px] font-black uppercase tracking-widest bg-stone-900 text-white px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-all"
            >
              Azzera filtri secondari
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProfiles.map(profile => (
              <div key={profile.id} className="relative group">
                <Link to={`/profile-detail/${profile.id}`}>
                  <div className="aspect-[4/5] rounded-[20px] overflow-hidden bg-stone-200 relative shadow-sm">
                    <img
                      src={profile.photos?.[0] || profile.photo_url || `https://picsum.photos/seed/${profile.name}/400/500`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onContextMenu={e => e.preventDefault()}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-black truncate">{profile.name}{profile.dob && calculateAge(profile.dob) > 0 ? `, ${calculateAge(profile.dob)}` : ''}</p>
                      {profile.city && <p className="text-white/70 text-[9px] font-semibold truncate flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{profile.city}</p>}
                    </div>
                  </div>
                </Link>
                {/* Quick reaction buttons */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                  <button
                    onClick={e => handleQuickReaction(profile.id, 'heart', e)}
                    className={cn(
                      'w-9 h-9 rounded-[12px] flex items-center justify-center shadow-lg backdrop-blur-sm transition-all active:scale-90',
                      cardReactions[profile.id] === 'heart'
                        ? 'bg-rose-600 text-white'
                        : 'bg-white/80 text-stone-400 hover:text-rose-500'
                    )}
                    title="Cuore"
                  >
                    <Heart className={cn('w-4 h-4', cardReactions[profile.id] === 'heart' && 'fill-current')} />
                  </button>
                  <button
                    onClick={e => handleQuickReaction(profile.id, 'like', e)}
                    className={cn(
                      'w-9 h-9 rounded-[12px] flex items-center justify-center shadow-lg backdrop-blur-sm transition-all active:scale-90',
                      cardReactions[profile.id] === 'like'
                        ? 'bg-rose-600 text-white'
                        : 'bg-white/80 text-stone-400 hover:text-rose-500'
                    )}
                    title="Like"
                  >
                    <ThumbsUp className={cn('w-4 h-4', cardReactions[profile.id] === 'like' && 'fill-current')} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-stone-100 shadow-2xl px-6 pb-6 pt-3">
        <div className="max-w-sm mx-auto flex items-center justify-around">

          <Link to="/"
            className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all"
          >
            <Home className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
          </Link>

          {/* Centre: SoulMatch button */}
          <button
            onClick={handleSoulMatchPress}
            className="flex flex-col items-center gap-1 relative"
          >
            <div className={cn(
              "w-14 h-14 -mt-6 rounded-[22px] flex items-center justify-center shadow-xl transition-all active:scale-90",
              isSoulMatchOnCooldown()
                ? "bg-stone-300 shadow-stone-200/60"
                : "bg-rose-600 shadow-rose-400/40 hover:bg-rose-700"
            )}>
              <Heart className="w-6 h-6 text-white fill-current" />
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              isSoulMatchOnCooldown() ? "text-stone-400" : "text-rose-600"
            )}>SoulMatch</span>
          </button>

          {/* SoulLink button */}
          <Link to="/soul-links"
            className="flex flex-col items-center gap-1 text-stone-400 hover:text-violet-600 active:scale-90 transition-all"
          >
            <div className="relative">
              <Link2 className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">SoulLink</span>
          </Link>

          <Link to="/profile"
            className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all"
          >
            <User className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Profilo</span>
          </Link>
        </div>
      </div>

      {/* ── COOLDOWN TOAST ── */}
      <AnimatePresence>
        {soulmatchToast && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="fixed bottom-24 left-4 right-4 z-50 bg-stone-900 text-white rounded-[20px] p-4 shadow-2xl flex items-center gap-3 max-w-sm mx-auto"
          >
            <div className="w-10 h-10 bg-stone-700 rounded-[14px] flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-rose-400 fill-current" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-rose-400">SoulMatch in pausa</p>
              <p className="text-[10px] text-stone-300 mt-0.5">Disponibile tra {formatCooldown()} · il potere va usato con saggezza 🌙</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SOULMATCH OVERLAY ── */}
      <AnimatePresence>
        {showSoulMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-[#F8F4EF]"
          >
            {/* Top bar */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-stone-100 px-5 py-4 flex items-center justify-between">
              <button onClick={() => setShowSoulMatch(false)} className="w-10 h-10 bg-stone-100 rounded-[16px] flex items-center justify-center text-stone-600 active:scale-90">
                <X className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h2 className="text-base font-serif font-black text-stone-900 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-600 fill-current" /> SoulMatch
                </h2>
                <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Top 10 affinità</p>
              </div>
              <div className="w-10" />
            </div>

            {/* Confirmation notice (first time) */}
            <SoulMatchConfirmBanner onConfirm={confirmSoulMatch} />

            {/* Top-10 compatible profiles */}
            <div className="max-w-md mx-auto px-4 pt-4 pb-28 space-y-4">
              {(() => {
                const ranked = [...filteredProfiles]
                  .map(p => ({ ...p, _score: calculateMatchScore(currentUser, p) }))
                  .sort((a, b) => b._score - a._score)
                  .slice(0, 10);

                return ranked.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="bg-white rounded-[24px] border border-stone-100 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Rank badge */}
                      <div className={cn(
                        "w-8 h-8 rounded-[12px] flex items-center justify-center text-xs font-black shrink-0",
                        idx === 0 ? "bg-amber-400 text-stone-900" :
                          idx === 1 ? "bg-stone-300 text-stone-700" :
                            idx === 2 ? "bg-orange-300 text-stone-700" :
                              "bg-stone-100 text-stone-500"
                      )}>
                        #{idx + 1}
                      </div>
                      {/* Photo */}
                      <div className="w-16 h-16 rounded-[18px] overflow-hidden border border-stone-100 shadow-sm shrink-0">
                        <img src={p.photos?.[0] || p.photo_url || `https://picsum.photos/seed/${p.name}/200`} className="w-full h-full object-cover" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-stone-900 truncate">
                          {p.name}{calculateAge(p.dob) > 0 ? `, ${calculateAge(p.dob)}` : ''}
                        </h3>
                        {p.city && <p className="text-[10px] text-stone-400 font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" />{p.city}</p>}
                        {/* Match bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${p._score}%` }}
                              transition={{ delay: idx * 0.06 + 0.3, duration: 0.7 }}
                              className={cn('h-full rounded-full', p._score >= 70 ? 'bg-rose-500' : p._score >= 40 ? 'bg-amber-400' : 'bg-stone-300')}
                            />
                          </div>
                          <span className={cn('text-[10px] font-black shrink-0', p._score >= 70 ? 'text-rose-600' : p._score >= 40 ? 'text-amber-500' : 'text-stone-400')}>
                            {p._score}%
                          </span>
                        </div>
                      </div>
                      {/* CTA */}
                      <Link
                        to={`/profile-detail/${p.id}`}
                        onClick={() => setShowSoulMatch(false)}
                        className="w-10 h-10 bg-rose-600 text-white rounded-[14px] flex items-center justify-center shadow-md active:scale-90 shrink-0"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </motion.div>
                ));
              })()}

              {filteredProfiles.length === 0 && (
                <div className="text-center py-16">
                  <Heart className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                  <p className="text-stone-400 text-sm">Nessun profilo compatibile trovato</p>
                </div>
              )}
            </div>

            {/* Bottom nav same style */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-stone-100 shadow-2xl px-6 pb-6 pt-3">
              <div className="max-w-sm mx-auto flex items-center justify-around">
                <Link to="/" className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all">
                  <Home className="w-6 h-6" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
                </Link>
                <button onClick={() => setShowSoulMatch(false)} className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 -mt-6 rounded-[22px] bg-stone-300 flex items-center justify-center shadow-xl shadow-stone-200/60">
                    <Heart className="w-6 h-6 text-white fill-current" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">Chiudi</span>
                </button>
                <Link to="/profile" className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all">
                  <User className="w-6 h-6" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Profilo</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
};

// ── SoulMatch Confirm Banner (shown once per session) ──
const SoulMatchConfirmBanner = ({ onConfirm }: { onConfirm: () => void }) => {
  const [confirmed, setConfirmed] = useState(false);
  if (confirmed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4 bg-rose-600 text-white rounded-[24px] p-5 shadow-xl shadow-rose-300/30"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-[14px] flex items-center justify-center shrink-0 mt-0.5">
          <Heart className="w-5 h-5 fill-current" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black uppercase tracking-widest mb-1">✨ SoulMatch attivato!</h3>
          <p className="text-[11px] text-rose-100 leading-relaxed">
            Stiamo mostrando i <strong className="text-white">10 profili più compatibili</strong> con te in questo momento.
            Dopo la consultazione, SoulMatch entrerà in <strong className="text-white">pausa di 24 ore</strong> per rendere ogni incontro speciale.
          </p>
          <button
            onClick={() => { onConfirm(); setConfirmed(true); }}
            className="mt-3 bg-white text-rose-600 px-5 py-2 rounded-[14px] text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            Capito, mostrami i match!
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── SoulLinks Page ──────────────────────────────────────────────────────
const SoulLinksPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<SoulLink[]>([]);
  const [pendingIn, setPendingIn] = useState<SoulLink[]>([]);
  const [friendsPosts, setFriendsPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'amici' | 'richieste'>('feed');

  const fetchSoulLinks = async (userId: string) => {
    // Fetch all soul_links where user is involved
    const { data: sentData } = await supabase
      .from('soul_links')
      .select(`
        id, sender_id, receiver_id, status, created_at,
        receiver:users!receiver_id(id, name, surname, photos, photo_url, city, is_online)
      `)
      .eq('sender_id', userId);

    const { data: receivedData } = await supabase
      .from('soul_links')
      .select(`
        id, sender_id, receiver_id, status, created_at,
        sender:users!sender_id(id, name, surname, photos, photo_url, city, is_online)
      `)
      .eq('receiver_id', userId);

    const acceptedFriends: SoulLink[] = [];
    const incoming: SoulLink[] = [];

    (sentData || []).forEach((sl: any) => {
      if (sl.status === 'accepted') {
        acceptedFriends.push({ ...sl, other_user: sl.receiver });
      }
    });

    (receivedData || []).forEach((sl: any) => {
      if (sl.status === 'accepted') {
        acceptedFriends.push({ ...sl, other_user: sl.sender });
      } else if (sl.status === 'pending') {
        incoming.push({ ...sl, other_user: sl.sender });
      }
    });

    setFriends(acceptedFriends);
    setPendingIn(incoming);

    // Fetch posts of friends
    if (acceptedFriends.length > 0) {
      const friendIds = acceptedFriends.map(f => f.other_user!.id);
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          user:users(name, photos, photo_url)
        `)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(30);

      if (postsData) {
        setFriendsPosts(postsData.map((p: any) => ({
          ...p,
          author_name: p.user?.name,
          author_photo: p.user?.photos?.[0] || p.user?.photo_url,
        })));
      }
    } else {
      setFriendsPosts([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        fetchSoulLinks(user.id);
      } else {
        navigate('/register');
      }
    } catch (e) {
      navigate('/register');
    }
  }, []);

  const handleAccept = async (slId: string) => {
    const { error } = await supabase
      .from('soul_links')
      .update({ status: 'accepted' })
      .eq('id', slId);

    if (!error) {
      setToast({ message: '🎉 SoulLink accettato! Siete ora connessi.', type: 'success' });
      if (currentUser?.id) fetchSoulLinks(currentUser.id);
    }
  };

  const handleReject = async (slId: string) => {
    const { error } = await supabase
      .from('soul_links')
      .delete()
      .eq('id', slId);

    if (!error) {
      setToast({ message: 'Richiesta rifiutata.', type: 'info' });
      if (currentUser?.id) fetchSoulLinks(currentUser.id);
    }
  };

  const handleRemoveFriend = async (slId: string) => {
    const { error } = await supabase
      .from('soul_links')
      .delete()
      .eq('id', slId);

    if (!error) {
      setToast({ message: 'SoulLink rimosso.', type: 'info' });
      if (currentUser?.id) fetchSoulLinks(currentUser.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4EF] pt-16 pb-28 relative overflow-x-hidden">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-xl border-b border-stone-100 px-5 py-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-[16px] flex items-center justify-center">
              <Link2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-base font-serif font-black text-stone-900">I miei SoulLink</h1>
              <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
                {loading ? '...' : `${friends.length} connessioni`}
              </p>
            </div>
          </div>
          {pendingIn.length > 0 && (
            <button onClick={() => setActiveTab('richieste')} className="flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full animate-pulse">
              <span>{pendingIn.length}</span>
              <span>Nuove</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-md mx-auto mt-3 flex gap-1 bg-stone-100 rounded-[14px] p-1">
          {(['feed', 'amici', 'richieste'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1',
                activeTab === tab ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
              )}
            >
              {tab === 'feed' && <LayoutGrid className="w-3 h-3" />}
              {tab === 'amici' && <UserCheck className="w-3 h-3" />}
              {tab === 'richieste' && <Bell className="w-3 h-3" />}
              {tab}
              {tab === 'richieste' && pendingIn.length > 0 && (
                <span className="w-4 h-4 bg-emerald-500 text-white rounded-full text-[8px] flex items-center justify-center">{pendingIn.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* ── TAB: FEED ── */}
        {activeTab === 'feed' && (
          <>
            {/* Friends avatar strip */}
            {friends.length > 0 && (
              <div className="bg-white rounded-[24px] border border-stone-100 p-4 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-3">I tuoi SoulLink — tap per visitare</p>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {friends.map(f => (
                    <button
                      key={f.id}
                      onClick={() => navigate(`/profile-detail/${f.other_user?.id}`)}
                      className="flex flex-col items-center gap-1.5 shrink-0 group"
                    >
                      <div className="relative">
                        <div className="w-14 h-14 rounded-[18px] overflow-hidden border-2 border-violet-200 shadow-sm group-hover:border-violet-400 transition-all ring-2 ring-violet-50">
                          <img
                            src={f.other_user?.photos?.[0] || f.other_user?.photo_url || `https://picsum.photos/seed/${f.other_user?.name}/200`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {f.other_user?.is_online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <span className="text-[9px] font-black text-stone-600 truncate max-w-[52px]">{f.other_user?.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Friends posts feed */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-64 bg-stone-200 animate-pulse rounded-[28px]" />)}
              </div>
            ) : friends.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 bg-white rounded-[32px] border border-stone-100 space-y-5"
              >
                <div className="relative w-20 h-20 mx-auto">
                  <div className="w-20 h-20 bg-violet-50 rounded-[24px] flex items-center justify-center">
                    <Link2 className="w-10 h-10 text-violet-300" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                    <Heart className="w-4 h-4 text-rose-400 fill-current" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-serif font-black text-stone-900 mb-2">Nessun SoulLink ancora</h2>
                  <p className="text-stone-400 text-xs px-8 leading-relaxed">
                    Visita i profili in bacheca e invia un <strong className="text-violet-600">SoulLink</strong> — come una richiesta di amicizia speciale!
                  </p>
                </div>
                <button
                  onClick={() => navigate('/bacheca')}
                  className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-[16px] text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-200 active:scale-95 transition-all"
                >
                  <Users className="w-4 h-4" />
                  Scopri persone
                </button>
              </motion.div>
            ) : friendsPosts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[28px] border border-stone-100">
                <ImageIcon className="w-8 h-8 text-stone-200 mx-auto mb-3" />
                <p className="text-stone-400 text-sm font-medium">I tuoi SoulLink non hanno ancora pubblicato nulla.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {friendsPosts.map(post => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-stone-50"
                  >
                    {/* Post header */}
                    <div className="p-4 flex items-center gap-3">
                      <button onClick={() => navigate(`/profile-detail/${post.user_id}`)}>
                        <div className="w-10 h-10 rounded-[14px] overflow-hidden border-2 border-violet-100">
                          <img src={post.author_photo || `https://picsum.photos/seed/${post.author_name}/100`} className="w-full h-full object-cover" />
                        </div>
                      </button>
                      <div>
                        <h4 className="text-sm font-black text-stone-900">{post.author_name}</h4>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                          {new Date(post.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="ml-auto w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center">
                        <Link2 className="w-3 h-3 text-violet-500" />
                      </div>
                    </div>

                    {/* Photos */}
                    {post.photos?.length > 0 && (
                      <div className="w-full aspect-square overflow-hidden">
                        <img src={post.photos[0]} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Caption + reactions */}
                    <div className="p-4 space-y-3">
                      {post.description && (
                        <p className="text-sm text-stone-700 leading-relaxed">{post.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-stone-400 text-xs font-black">
                        <span className="flex items-center gap-1.5">
                          <ThumbsUp className="w-4 h-4" />{post.likes_count}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Heart className="w-4 h-4 fill-current text-rose-300" />{post.hearts_count}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: AMICI ── */}
        {activeTab === 'amici' && (
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-20 bg-stone-200 animate-pulse rounded-[20px]" />)
            ) : friends.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[28px] border border-stone-100">
                <UserCheck className="w-8 h-8 text-stone-200 mx-auto mb-3" />
                <p className="text-stone-400 text-sm">Nessun SoulLink confermato</p>
              </div>
            ) : friends.map(f => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[22px] border border-stone-100 p-4 flex items-center gap-4 shadow-sm"
              >
                <button onClick={() => navigate(`/profile-detail/${f.other_user?.id}`)} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-[18px] overflow-hidden border-2 border-violet-100">
                      <img
                        src={f.other_user?.photos?.[0] || f.other_user?.photo_url || `https://picsum.photos/seed/${f.other_user?.name}/200`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {f.other_user?.is_online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-stone-900 truncate">{f.other_user?.name} {f.other_user?.surname}</h3>
                    {f.other_user?.city && (
                      <p className="text-[10px] text-stone-400 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{f.other_user.city}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 bg-violet-400 rounded-full" />
                      <span className="text-[9px] font-black text-violet-600 uppercase tracking-widest">SoulLink</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/profile-detail/${f.other_user?.id}`)}
                    className="w-9 h-9 bg-violet-50 text-violet-600 rounded-[12px] flex items-center justify-center hover:bg-violet-100 transition-all"
                    title="Visita profilo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(f.id)}
                    className="w-9 h-9 bg-stone-50 text-stone-400 rounded-[12px] flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"
                    title="Rimuovi SoulLink"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── TAB: RICHIESTE ── */}
        {activeTab === 'richieste' && (
          <div className="space-y-3">
            {loading ? (
              [1, 2].map(i => <div key={i} className="h-24 bg-stone-200 animate-pulse rounded-[20px]" />)
            ) : pendingIn.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[28px] border border-stone-100">
                <Bell className="w-8 h-8 text-stone-200 mx-auto mb-3" />
                <p className="text-stone-400 text-sm">Nessuna richiesta in arrivo</p>
              </div>
            ) : pendingIn.map((req, idx) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="bg-white rounded-[22px] border border-emerald-100 p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate(`/profile-detail/${req.other_user?.id}`)}>
                    <div className="w-14 h-14 rounded-[18px] overflow-hidden border-2 border-emerald-200 shadow-sm">
                      <img
                        src={req.other_user?.photos?.[0] || req.other_user?.photo_url || `https://picsum.photos/seed/${req.other_user?.name}/200`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-stone-900 truncate">{req.other_user?.name}</h3>
                    {req.other_user?.city && (
                      <p className="text-[10px] text-stone-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{req.other_user.city}
                      </p>
                    )}
                    <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Vuole essere il tuo SoulLink!
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAccept(req.id)}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-[14px] text-[10px] font-black uppercase tracking-widest shadow-md shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accetta
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="flex-1 py-3 bg-stone-100 text-stone-500 rounded-[14px] text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    Rifiuta
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-stone-100 shadow-2xl px-6 pb-6 pt-3">
        <div className="max-w-sm mx-auto flex items-center justify-around">
          <Link to="/" className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all">
            <Home className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
          </Link>
          <Link to="/bacheca" className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all">
            <Users className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Bacheca</span>
          </Link>
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 -mt-6 rounded-[22px] bg-violet-600 flex items-center justify-center shadow-xl shadow-violet-400/40">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-violet-600">SoulLink</span>
          </div>
          <Link to="/profile" className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all">
            <User className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Profilo</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

// --- Admin Page ---
const AdminPage = () => {
  const [sliderImages, setSliderImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const fetchSliderImages = async () => {
    try {
      const res = await fetch('/api/settings/home_slider');
      if (res.ok) {
        setSliderImages(await res.json());
      }
    } catch (e) { }
    setLoading(false);
  };

  useEffect(() => {
    fetchSliderImages();
  }, []);

  const handleUpdateSlider = async (newImages: string[]) => {
    try {
      const res = await fetch('/api/settings/home_slider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newImages })
      });
      if (res.ok) {
        setSliderImages(newImages);
        setToast({ message: "Slider aggiornato con successo!", type: 'success' });
      }
    } catch (e) {
      setToast({ message: "Errore durante l'aggiornamento.", type: 'error' });
    }
  };

  const addImage = () => {
    if (!newUrl) return;
    const updated = [...sliderImages, newUrl];
    handleUpdateSlider(updated);
    setNewUrl('');
  };

  const removeImage = (index: number) => {
    const updated = sliderImages.filter((_, i) => i !== index);
    handleUpdateSlider(updated);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Caricamento Admin...</div>;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-stone-50">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-stone-100 italic">
          <h1 className="text-3xl font-serif font-black text-stone-900 mb-2 flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-rose-600" />
            Pannello Amministrativo
          </h1>
          <p className="text-stone-500 text-sm mb-8">Gestisci i contenuti globali dell'applicazione.</p>

          <div className="space-y-6">
            <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
              <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-rose-500" />
                Gestione Slider Home
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {sliderImages.map((img, i) => (
                  <div key={i} className="aspect-video rounded-2xl overflow-hidden relative group border border-stone-200 shadow-sm transition-transform hover:scale-[1.02]">
                    <img src={img} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="URL nuova immagine..."
                  className="flex-1 p-4 rounded-2xl bg-white border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all font-medium"
                />
                <button
                  onClick={addImage}
                  className="bg-rose-600 text-white px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-wider hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 active:scale-95"
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(() => {
    const savedUser = localStorage.getItem('soulmatch_user');
    const isEditing = savedUser ? true : false;
    return isEditing ? 2 : 1;
  });
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [formData, setFormData] = useState<UserProfile>({
    email: '',
    password: '',
    name: '',
    surname: '',
    dob: '',
    city: '',
    job: '',
    description: '',
    hobbies: '',
    desires: '',
    is_paid: false,
    looking_for_gender: 'Donna',
    looking_for_job: '',
    looking_for_hobbies: '',
    looking_for_city: '',
    looking_for_age_min: 18,
    looking_for_age_max: 99,
    looking_for_height: '',
    looking_for_body_type: '',
    looking_for_other: '',
    photos: [],
    id_document_url: '',
    gender: 'Uomo',
    orientation: 'Eterosessuale',
    body_type: 'Normale',
    province: '',
    conosciamoci_meglio: {},
  });

  const handleClearDraft = () => {
    localStorage.removeItem('soulmatch_reg_draft');
    localStorage.removeItem('soulmatch_user');
    window.location.reload();
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const authenticatedUserRaw = localStorage.getItem('soulmatch_user');
        const savedDraft = localStorage.getItem('soulmatch_reg_draft');

        if (savedDraft) {
          setFormData(JSON.parse(savedDraft));
          return;
        }

        const effectiveId = authenticatedUserRaw ? JSON.parse(authenticatedUserRaw).id : null;
        if (effectiveId) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', effectiveId)
            .single();

          if (data && !error) {
            setFormData(prev => ({ ...prev, ...data }));
          }
        }
      } catch (e) {
        console.error("Error initializing registration form:", e);
      }
    };
    initData();
  }, []);


  useEffect(() => {
    localStorage.setItem('soulmatch_reg_draft', JSON.stringify(formData));
  }, [formData]);

  const handleNextToStep1 = async () => {
    console.log("handleNextToStep1 called, isLogin:", isLogin);
    if (isLogin) {
      handleLogin();
      return;
    }
    if (!isEditing && (!formData.email || !formData.password)) {
      setToast({ message: "Inserisci email e password per procedere.", type: 'info' });
      return;
    }

    // Se stiamo creando un nuovo account, verifichiamo se l'email esiste già
    // per evitare di far rifare tutto il form a chi è già registrato.
    try {
      const email = formData.email.trim();
      const password = formData.password;

      // Proviamo a fare il login. Se l'utente esiste e la password è corretta, 
      // lo portiamo direttamente dentro.
      const { data: authCheck, error: authCheckErr } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!authCheckErr && authCheck.user) {
        // L'utente esiste ed è entrato!
        console.log("User already exists and login succeeded, skipping registration.");
        const { data: profile } = await supabase.from('users').select('*').eq('id', authCheck.user.id).single();
        if (profile) {
          setToast({ message: "Bentornato! Sei già registrato. Ti stiamo portando alla tua bacheca.", type: 'success' });
          localStorage.setItem('soulmatch_user', JSON.stringify(profile));
          window.dispatchEvent(new Event('user-auth-change'));
          setTimeout(() => navigate('/bacheca'), 1500);
          return;
        } else {
          // Utente auth esiste ma senza profilo public.users completo
          setToast({ message: "Account esistente trovato. Completa il tuo profilo.", type: 'info' });
          setStep(2);
          return;
        }
      }

      // Se l'errore NON è "credenziali non valide" (quindi l'utente probabilmente non esiste)
      // procediamo con la registrazione normale.
      // Se l'errore è "credenziali non valide" (ma l'utente esiste!), avvisiamo l'utente.
      if (authCheckErr && authCheckErr.message === 'Invalid login credentials') {
        // Verifichiamo se l'email è almeno presente nel DB pubblico per essere sicuri
        const { data: emailExists } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (emailExists) {
          setToast({ message: "Questa email è già registrata con una password diversa. Prova ad accedere.", type: 'error' });
          setIsLogin(true);
          return;
        }
      }
    } catch (e) {
      console.error("Errore durante il controllo utente esistente:", e);
    }

    setStep(2);
  };

  const handleLogin = async () => {
    console.log("Starting login for:", formData.email);
    if (!formData.email || !formData.password) {
      setToast({ message: "Inserisci email e password per accedere.", type: 'info' });
      return;
    }
    try {
      const email = formData.email.trim();
      const password = formData.password;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error("Auth login error:", authError);
        setToast({
          message: authError.message === 'Invalid login credentials' ? "Credenziali non valide. Riprova." : "Errore accesso: " + authError.message,
          type: 'error'
        });
        return;
      }

      console.log("Auth success, fetching profile for:", authData.user?.id);

      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user?.id)
        .single();

      if (profileErr) {
        console.warn("Profile fetch error after login:", profileErr);
      }

      if (profile) {
        console.log("Profile found, saving to local storage");
        localStorage.setItem('soulmatch_user', JSON.stringify(profile));
        window.dispatchEvent(new Event('user-auth-change'));
        navigate('/bacheca');
      } else {
        console.log("No profile record found in 'users' table. Redirecting to complete registration.");
        setToast({ message: "Bentornato! Il tuo account esiste ma il profilo non è completo. Per favore completa i dati mancanti.", type: 'info' });
        setIsLogin(false);
        setStep(2);
      }
    } catch (e) {
      console.error("Exception during login process:", e);
      setToast({ message: "Errore imprevisto durante l'accesso.", type: 'error' });
    }
  };

  const handleNextToStep2 = () => {
    const required = ['name', 'surname', 'dob', 'city', 'job', 'description'];
    const missing = required.filter(k => !formData[k as keyof UserProfile]);
    if (missing.length > 0) {
      setToast({ message: "Per favore, completa tutti i campi del profilo per continuare.", type: 'info' });
      return;
    }
    setStep(3);
  };

  const handleNextToStep3 = () => {
    if (!formData.looking_for_age_min || !formData.looking_for_age_max) {
      setToast({ message: "Inserisci l'età minima e massima che cerchi in un partner.", type: 'info' });
      return;
    }
    setStep(4);
  };

  const handleNextToStep4 = () => {
    setStep(5);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      try {
        const base64s = await Promise.all(files.map(f => fileToBase64(f as File)));
        setFormData(prev => ({
          ...prev,
          photos: [...(prev.photos || []), ...base64s].slice(0, 5)
        }));
      } catch (err) {
        setToast({ message: "Errore durante l'elaborazione delle foto.", type: 'error' });
      }
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  const replacePhoto = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setFormData(prev => {
          const newPhotos = [...(prev.photos || [])];
          newPhotos[index] = base64;
          return { ...prev, photos: newPhotos };
        });
      } catch (err) {
        setToast({ message: "Errore durante l'elaborazione della foto.", type: 'error' });
      }
    }
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setFormData(prev => ({ ...prev, id_document_url: base64 }));
      } catch (err) {
        setToast({ message: "Errore durante l'elaborazione del documento.", type: 'error' });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      console.log("Submitting formData:", formData);

      const submissionData = { ...formData };
      const userId = submissionData.id;
      const email = submissionData.email;
      const password = submissionData.password;

      // Clean up data for database insert
      delete (submissionData as any).id;
      delete (submissionData as any).password; // Don't store plain password in public table
      delete (submissionData as any).likes_count;
      delete (submissionData as any).hearts_count;

      let finalUserId = userId;

      if (!userId) {
        // 1. Sign up user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email!,
          password: password!,
        });

        if (authError) {
          console.error("Auth error:", authError);
          const msg = authError.message === 'User already registered'
            ? "Questo utente è già registrato. Vai alla pagina di accesso."
            : "Errore durante la creazione account: " + authError.message;
          setToast({ message: msg, type: 'error' });
          return;
        }

        if (!authData.user) {
          setToast({ message: "Errore imprevisto durante la registrazione.", type: 'error' });
          return;
        }

        finalUserId = authData.user.id;
      }

      // 2. Insert or Update profile in public.users table
      const profileData = { ...submissionData, id: finalUserId };

      const { data, error } = await supabase
        .from('users')
        .upsert(profileData)
        .select()
        .single();

      if (error) {
        console.error("Supabase Profile error:", error);
        setToast({ message: "Errore durante il salvataggio del profilo: " + error.message, type: 'error' });
        return;
      }

      console.log("Supabase Success:", data);
      try {
        localStorage.setItem('soulmatch_user', JSON.stringify(data));
      } catch (err) {
        console.error("LocalStorage error:", err);
      }
      localStorage.removeItem('soulmatch_reg_draft');
      window.dispatchEvent(new Event('user-auth-change'));

      setTimeout(() => {
        navigate('/bacheca');
      }, 100);
    } catch (err) {
      console.error("Process error:", err);
      setToast({ message: "Errore di connessione o configurazione.", type: 'error' });
    }
  };

  const isEditing = !!formData.id;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-stone-50 flex justify-center">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-between items-end">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white border border-stone-200 rounded-full flex items-center justify-center text-stone-600 shadow-sm hover:bg-stone-50 transition-all"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-900">
                {isEditing ? 'Modifica Profilo' : 'Iscriviti'}
              </h1>
              <p className="text-stone-500 text-xs">Step {step} di 6</p>
            </div>
          </div>
          <div className="flex gap-1.5 pb-1">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={cn("w-2 h-2 rounded-full", step >= i ? "bg-rose-600" : "bg-stone-200")} />
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-lg space-y-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold text-stone-900">{isLogin ? 'Bentornato/a' : 'Crea Account'}</h3>
                  <p className="text-stone-500 text-[11px]">{isLogin ? 'Inserisci i tuoi dati per accedere.' : 'Dati necessari per l\'accesso.'}</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Email</label>
                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="mario@esempio.it" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Password</label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none pr-12"
                        placeholder="Minimo 6 caratteri"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  {/* Nickname removed */}
                </div>
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleNextToStep1}
                    className="btn-primary w-full py-4 text-sm mt-2"
                  >
                    {isLogin ? 'Accedi' : 'Continua'}
                  </button>
                  <p className="text-center text-xs text-stone-500 font-medium">
                    {isLogin ? (
                      <>Non hai un account? <button type="button" onClick={() => { console.log("Switching to Register"); setIsLogin(false); }} className="text-rose-600 font-bold hover:underline">Iscriviti</button></>
                    ) : (
                      <>Hai già un account? <button type="button" onClick={() => { console.log("Switching to Login"); setIsLogin(true); }} className="text-rose-600 font-bold hover:underline">Accedi qui</button></>
                    )}
                  </p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Nome</label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={isEditing && !!formData.name}
                      className={cn(
                        "w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none",
                        isEditing && formData.name ? "opacity-60 cursor-not-allowed bg-stone-100" : ""
                      )}
                      placeholder="Mario"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Cognome</label>
                    <input
                      name="surname"
                      value={formData.surname}
                      onChange={handleInputChange}
                      disabled={isEditing && !!formData.surname}
                      className={cn(
                        "w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none",
                        isEditing && formData.surname ? "opacity-60 cursor-not-allowed bg-stone-100" : ""
                      )}
                      placeholder="Rossi"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Nascita</label>
                    <input
                      name="dob"
                      type="date"
                      value={formData.dob}
                      onChange={handleInputChange}
                      disabled={isEditing && !!formData.dob}
                      className={cn(
                        "w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none",
                        isEditing && formData.dob ? "opacity-60 cursor-not-allowed bg-stone-100" : ""
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="space-y-1.5 col-span-3">
                      <label className="text-xs font-bold text-stone-700 ml-1">Città</label>
                      <input name="city" value={formData.city} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Milano" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-stone-700 ml-1">Prov</label>
                      <input name="province" value={formData.province || ''} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none uppercase" placeholder="MI" maxLength={2} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Identità di Genere</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none">
                      <option value="Uomo">Uomo</option>
                      <option value="Donna">Donna</option>
                      <option value="Non-binario">Non-binario</option>
                      <option value="Transgender (M→F)">Transgender (M→F)</option>
                      <option value="Transgender (F→M)">Transgender (F→M)</option>
                      <option value="Genderfluid">Genderfluid</option>
                      <option value="Genderqueer">Genderqueer</option>
                      <option value="Agender">Agender</option>
                      <option value="Bigender">Bigender</option>
                      <option value="Pangender">Pangender</option>
                      <option value="Demi-genere">Demi-genere</option>
                      <option value="Intersessuale">Intersessuale</option>
                      <option value="Neutrois">Neutrois</option>
                      <option value="Queer">Queer</option>
                      <option value="Altro">Altro</option>
                    </select>
                  </div>

                  {/* Orientamento — multi-selezione */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-700 ml-1">Orientamento Sessuale <span className="text-stone-400 font-normal">(puoi scegliere più di uno)</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Eterosessuale', 'Gay', 'Lesbica', 'Bisessuale', 'Pansessuale', 'Asessuale', 'Demisessuale', 'Sapiosexual', 'Polisessuale', 'Queer', 'Fluido', 'Aromantic', 'Curioso/a', 'Altro'].map(o => {
                        const cur: string[] = Array.isArray(formData.orientation) ? formData.orientation : formData.orientation ? [formData.orientation as unknown as string] : [];
                        const sel = cur.includes(o);
                        return (
                          <button key={o} type="button"
                            onClick={() => setFormData(prev => {
                              const c: string[] = Array.isArray(prev.orientation) ? prev.orientation : prev.orientation ? [prev.orientation as unknown as string] : [];
                              const next = c.includes(o) ? c.filter(x => x !== o) : [...c, o];
                              return { ...prev, orientation: next };
                            })}
                            className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left',
                              sel ? 'bg-rose-600 border-rose-600 text-white' : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-rose-300'
                            )}
                          >
                            <span className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', sel ? 'bg-white border-white' : 'border-stone-300')}>
                              {sel && <span className="text-rose-600 text-[10px] font-black">✓</span>}
                            </span>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Corporatura</label>
                    <select name="body_type" value={formData.body_type} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none">
                      <option value="Snella">Snella</option>
                      <option value="Atletica">Atletica</option>
                      <option value="Normale">Normale</option>
                      <option value="Curvy">Curvy</option>
                      <option value="Robusta">Robusta</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Lavoro</label>
                    <input name="job" value={formData.job} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Es. Designer" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Descrizione</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none h-20" placeholder="Raccontaci di te..." />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-stone-700 ml-1">Foto Profilo (Max 5)</label>
                    <div className="grid grid-cols-5 gap-2">
                      {formData.photos?.map((url, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden border border-stone-200 relative group">
                          <img src={url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="p-1.5 bg-white rounded-full text-stone-600 cursor-pointer hover:text-rose-600 shadow-sm">
                              <RefreshCw className="w-3.5 h-3.5" />
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => replacePhoto(i, e)} />
                            </label>
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              className="p-1.5 bg-white rounded-full text-stone-600 hover:text-rose-600 shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {i === 0 && <div className="absolute bottom-0 left-0 right-0 bg-rose-600 text-[8px] text-white text-center py-0.5 font-bold">Principale</div>}
                        </div>
                      ))}
                      {(formData.photos?.length || 0) < 5 && (
                        <label className="aspect-square rounded-lg border-2 border-dashed border-stone-200 flex items-center justify-center cursor-pointer hover:bg-stone-50">
                          <UserPlus className="w-4 h-4 text-stone-400" />
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                    <div className="flex items-center gap-2 text-stone-900 text-xs font-bold mb-1">
                      <CreditCard className="w-4 h-4" /> Documento d'Identità
                    </div>
                    <p className="text-[10px] text-stone-500 leading-tight mb-2">
                      Carica un documento per la sicurezza della community.
                    </p>
                    <label className={cn(
                      "w-full p-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors",
                      formData.id_document_url ? "border-emerald-200 bg-emerald-50" : "border-stone-200 hover:bg-stone-100"
                    )}>
                      {formData.id_document_url ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-700">Caricato</span>
                        </>
                      ) : (
                        <>
                          <Info className="w-5 h-5 text-stone-400" />
                          <span className="text-[10px] font-bold text-stone-600">Seleziona File</span>
                        </>
                      )}
                      <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleIdUpload} />
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                    <button onClick={handleNextToStep2} className="btn-primary flex-1 py-4 text-sm">Continua</button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div className="p-3 bg-rose-50 rounded-xl flex gap-2 items-start border border-rose-100">
                  <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-800 leading-tight">Dati per il matching intelligente.</p>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-stone-700 ml-1">Chi cerchi? <span className="text-stone-400 font-normal">(scelta multipla)</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Uomo', 'Donna', 'Tutti', 'Non-binario', 'Transgender', 'Genderfluid', 'Queer', 'Altro'].map(g => {
                      const cur = Array.isArray(formData.looking_for_gender) ? formData.looking_for_gender : (formData.looking_for_gender ? [formData.looking_for_gender as any] : []);
                      const sel = cur.includes(g);
                      return (
                        <button key={g} type="button"
                          onClick={() => setFormData(prev => {
                            const c = Array.isArray(prev.looking_for_gender) ? prev.looking_for_gender : (prev.looking_for_gender ? [prev.looking_for_gender as any] : []);
                            let next;
                            if (g === 'Tutti') {
                              next = sel ? [] : ['Tutti'];
                            } else {
                              const withoutTutti = c.filter(x => x !== 'Tutti');
                              next = sel ? withoutTutti.filter(x => x !== g) : [...withoutTutti, g];
                            }
                            return { ...prev, looking_for_gender: next };
                          })}
                          className={cn('py-3 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all text-left flex items-center gap-2',
                            sel ? 'bg-rose-600 border-rose-600 text-white' : 'bg-stone-50 border-stone-200 text-stone-500'
                          )}
                        >
                          <div className={cn("w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0", sel ? "bg-white border-white" : "bg-white border-stone-200")}>
                            {sel && <div className="w-1.5 h-1.5 bg-rose-600 rounded-full" />}
                          </div>
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Età Min</label>
                    <input name="looking_for_age_min" type="number" value={formData.looking_for_age_min} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Età Max</label>
                    <input name="looking_for_age_max" type="number" value={formData.looking_for_age_max} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Altezza Preferita</label>
                    <select name="looking_for_height" value={formData.looking_for_height} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none">
                      <option value="">Indifferente</option>
                      <option value="Piccola (<160)">Piccola (&lt;160cm)</option>
                      <option value="Media (160-175)">Media (160-175cm)</option>
                      <option value="Alta (175-190)">Alta (175-190cm)</option>
                      <option value="Molto Alta (>190)">Molto Alta (&gt;190cm)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Statura/Corp.</label>
                    <select name="looking_for_body_type" value={formData.looking_for_body_type} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none">
                      <option value="Tutte">Tutte</option>
                      <option value="Snella">Snella</option>
                      <option value="Atletica">Atletica</option>
                      <option value="Normale">Normale</option>
                      <option value="Curvy">Curvy</option>
                      <option value="Robusta">Robusta</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-stone-700 ml-1">Cosa Cerchi in un Partner?</label>
                  <textarea name="looking_for_other" value={formData.looking_for_other} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none h-24" placeholder="Descrivi il tuo partner ideale..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                  <button onClick={handleNextToStep3} className="btn-primary flex-1 py-4 text-sm">Continua</button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div className="p-3 bg-stone-50 rounded-xl flex gap-2 items-start border border-stone-200 text-center flex-col items-center">
                  <Sparkles className="w-5 h-5 text-rose-500 mb-1" />
                  <h3 className="text-sm font-bold text-stone-900">Conosciamoci Meglio</h3>
                  <p className="text-[10px] text-stone-500 leading-tight">Opzionale ma consigliato.</p>
                </div>

                {[
                  { key: 'Fumo', options: ['Non fumo', 'Occasionalmente', 'Fumo', 'Misto'] },
                  { key: 'Sport_e_Attivita', options: ['Molto Attivo/a', 'Naturale', 'Poco Sportivo/a', 'Odio lo sport'] },
                  { key: 'Animale_Domestico', options: ['Cane', 'Gatto', 'Nessuno', 'Altro'] },
                  { key: 'Stile_di_Vita', options: ['Casa e Relax', 'Viaggi ed Escursioni', 'Feste e Locali', 'Equilibrato'] },
                  { key: 'Famiglia', options: ['Voglio figli', 'Non voglio figli', 'Posso cambiare idea', 'Ne ho già'] }
                ].map(question => (
                  <div key={question.key} className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">{question.key.replace(/_/g, ' ')}</label>
                    <select
                      value={formData.conosciamoci_meglio?.[question.key] || ''}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        conosciamoci_meglio: { ...(prev.conosciamoci_meglio || {}), [question.key]: e.target.value }
                      }))}
                      className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                    >
                      <option value="">-- Seleziona --</option>
                      {question.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(3)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                  <button onClick={() => setStep(5)} className="btn-primary flex-1 py-4 text-sm">Continua</button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold text-stone-900">Piano</h3>
                  <p className="text-stone-500 text-[11px]">Scegli come vuoi iniziare.</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, is_paid: false }))}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 text-left transition-all relative",
                      !formData.is_paid ? "border-rose-600 bg-rose-50" : "border-stone-100"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold">Gratis</h4>
                        <p className="text-stone-500 text-[10px]">Solo ricezione messaggi.</p>
                      </div>
                      <div className="text-lg font-bold">€0</div>
                    </div>
                    {!formData.is_paid && <CheckCircle className="absolute -top-2 -right-2 text-rose-600 w-5 h-5 bg-white rounded-full" />}
                  </button>

                  <button
                    onClick={() => setFormData(prev => ({ ...prev, is_paid: true }))}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 text-left transition-all relative",
                      formData.is_paid ? "border-rose-600 bg-rose-50" : "border-stone-100"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold">Premium</h4>
                          <span className="bg-rose-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase">Top</span>
                        </div>
                        <p className="text-stone-500 text-[10px]">Messaggi + Matching.</p>
                      </div>
                      <div className="text-lg font-bold">€19.90<span className="text-[10px] font-normal text-stone-400">/anno</span></div>
                    </div>
                    {formData.is_paid && <CheckCircle className="absolute -top-2 -right-2 text-rose-600 w-5 h-5 bg-white rounded-full" />}
                  </button>
                </div>

                {formData.is_paid && (
                  <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                    <div className="flex items-center gap-2 text-stone-900 text-xs font-bold">
                      <CreditCard className="w-4 h-4" /> Pagamento
                    </div>
                    <div className="space-y-2">
                      <input className="w-full p-3 rounded-xl border border-stone-200 text-sm outline-none" placeholder="Numero Carta" />
                      <div className="grid grid-cols-2 gap-2">
                        <input className="w-full p-3 rounded-xl border border-stone-200 text-sm outline-none" placeholder="MM/AA" />
                        <input className="w-full p-3 rounded-xl border border-stone-200 text-sm outline-none" placeholder="CVV" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(4)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                  <button onClick={() => setStep(6)} className="btn-primary flex-1 py-4 text-sm">Riepilogo</button>
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold text-stone-900">Riepilogo Dati</h3>
                  <p className="text-stone-500 text-[11px]">Controlla che tutto sia corretto.</p>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider">Account</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div className="text-stone-400">Email:</div> <div className="text-stone-900 font-medium">{formData.email}</div>
                    </div>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider">Dati Personali</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div className="text-stone-400">Nome:</div> <div className="text-stone-900 font-medium">{formData.name}</div>
                      <div className="text-stone-400">Nascita:</div> <div className="text-stone-900 font-medium">{formData.dob}</div>
                      <div className="text-stone-400">Città:</div> <div className="text-stone-900 font-medium">{formData.city}</div>
                      <div className="text-stone-400">Genere:</div> <div className="text-stone-900 font-medium">{formData.gender}</div>
                      <div className="text-stone-400">Orientamento:</div> <div className="text-stone-900 font-medium">{formData.orientation}</div>
                      <div className="text-stone-400">Lavoro:</div> <div className="text-stone-900 font-medium">{formData.job}</div>
                    </div>
                  </div>

                  {formData.conosciamoci_meglio && Object.keys(formData.conosciamoci_meglio).some(key => formData.conosciamoci_meglio[key]) && (
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                      <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider">Conosciamoci Meglio</h4>
                      <div className="grid grid-cols-2 gap-y-2 text-xs">
                        {Object.entries(formData.conosciamoci_meglio).map(([key, value]) => value && (
                          <>
                            <div className="text-stone-400">{key.replace(/_/g, ' ')}:</div> <div className="text-stone-900 font-medium">{value}</div>
                          </>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider">Preferenze Matching</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div className="text-stone-400">Cerca:</div> <div className="text-stone-900 font-medium">{formData.looking_for_gender}</div>
                      <div className="text-stone-400">Età:</div> <div className="text-stone-900 font-medium">{formData.looking_for_age_min} - {formData.looking_for_age_max}</div>
                      <div className="text-stone-400">Altezza:</div> <div className="text-stone-900 font-medium">{formData.looking_for_height || '-'}</div>
                      <div className="text-stone-400">Statura:</div> <div className="text-stone-900 font-medium">{formData.looking_for_body_type || '-'}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider">Piano Scelto</h4>
                    <div className="flex justify-between items-center">
                      <div className="text-stone-900 font-bold">{formData.is_paid ? 'Premium' : 'Gratis'}</div>
                      <div className="text-stone-900 font-bold">{formData.is_paid ? '€19.90/anno' : '€0'}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider">Documento e Foto</h4>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", formData.id_document_url ? "bg-emerald-500" : "bg-rose-500")} />
                      <span className="text-xs text-stone-600">{formData.id_document_url ? 'Documento caricato' : 'Documento mancante'}</span>
                    </div>
                    <div className="flex gap-2">
                      {formData.photos?.map((url, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg overflow-hidden border border-stone-200">
                          <img src={url} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(5)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                  <button onClick={handleSubmit} className="btn-primary flex-1 py-4 text-sm">Termina</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div >
  );
};

const FeedComponent = ({ userId, isOwner }: { userId: any, isOwner?: boolean }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostDesc, setNewPostDesc] = useState('');
  const [newPostPhotos, setNewPostPhotos] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});

  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from('post_comments')
      .select('*, user:users(name, photos, photo_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (data) setPostComments(prev => ({ ...prev, [postId]: data }));
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev =>
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
    if (!expandedComments.includes(postId)) fetchComments(postId);
  };

  const submitComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text) return;
    const viewer = localStorage.getItem('soulmatch_user') ? JSON.parse(localStorage.getItem('soulmatch_user')!) : null;
    if (!viewer?.id) return;
    await supabase.from('post_comments').insert([{ post_id: postId, user_id: viewer.id, text }]);
    setCommentTexts(prev => ({ ...prev, [postId]: '' }));
    fetchComments(postId);
    fetchPosts();
  };

  const fetchPosts = async () => {
    try {
      const viewer = localStorage.getItem('soulmatch_user') ? JSON.parse(localStorage.getItem('soulmatch_user')!) : null;
      const viewerId = viewer?.id;

      // Fetch posts with author info and interaction counts
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:users (name, photos, photo_url),
          post_interactions!post_interactions_post_id_fkey(type)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsData && !error) {
        // Fetch current viewer's interactions for these posts
        let viewerInteractions: any[] = [];
        if (viewerId) {
          const { data: interactionData } = await supabase
            .from('post_interactions')
            .select('post_id, type')
            .eq('user_id', viewerId)
            .in('post_id', postsData.map(p => p.id));
          viewerInteractions = interactionData || [];
        }

        const processed = postsData.map((p: any) => ({
          ...p,
          author_name: p.user?.name,
          author_photo: p.user?.photos?.[0] || p.user?.photo_url,
          likes_count: (p.post_interactions as any[] || []).filter(i => i.type === 'like').length,
          hearts_count: (p.post_interactions as any[] || []).filter(i => i.type === 'heart').length,
          has_liked: viewerInteractions.some(i => i.post_id === p.id && i.type === 'like'),
          has_hearted: viewerInteractions.some(i => i.post_id === p.id && i.type === 'heart'),
        }));
        setPosts(processed);
      }
      else if (error) {
        console.error("Fetch posts error:", error);
      }
    } catch (e) {
      console.error("Fetch posts exception:", e);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).slice(0, 3 - newPostPhotos.length);
      try {
        const base64s = await Promise.all(files.map(f => fileToBase64(f as File)));
        setNewPostPhotos(prev => [...prev, ...base64s].slice(0, 3));
      } catch (err) {
        alert("Errore nell'elaborazione delle foto.");
      }
    }
  };

  const submitPost = async () => {
    if (newPostPhotos.length === 0 && !newPostDesc) return;
    setIsPosting(true);
    try {
      // Usa la sessione auth attiva per garantire compatibilità RLS
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id || userId;

      if (!authUserId) {
        alert("Devi essere autenticato per pubblicare.");
        setIsPosting(false);
        return;
      }

      const { error } = await supabase
        .from('posts')
        .insert([{
          user_id: authUserId,
          photos: newPostPhotos,
          description: newPostDesc
        }]);

      if (!error) {
        setNewPostDesc('');
        setNewPostPhotos([]);
        fetchPosts();
      } else {
        alert("Errore durante la pubblicazione: " + error.message);
      }
    } catch (e) {
      alert("Errore di connessione.");
    }
    setIsPosting(false);
  };


  const toggleInteraction = async (postId: string, type: 'like' | 'heart') => {
    try {
      const viewer = localStorage.getItem('soulmatch_user') ? JSON.parse(localStorage.getItem('soulmatch_user')!) : null;
      if (!viewer?.id) return;

      const post = posts.find(p => p.id === postId);
      const isRemoving = type === 'like' ? post?.has_liked : post?.has_hearted;

      if (isRemoving) {
        await supabase
          .from('post_interactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', viewer.id)
          .eq('type', type);
      } else {
        await supabase
          .from('post_interactions')
          .insert([{ post_id: postId, user_id: viewer.id, type }]);
      }
      fetchPosts();
    } catch (e) { }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-serif font-black text-stone-900 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-emerald-500" />
          </div>
          {isOwner ? "La Mia Bacheca" : "Bacheca Feed"}
        </h2>
      </div>

      {isOwner && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[32px] shadow-sm border border-stone-100 flex flex-col gap-4 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-20" />
          <textarea
            value={newPostDesc}
            onChange={(e) => setNewPostDesc(e.target.value)}
            placeholder="A cosa stai pensando oggi?"
            className="w-full text-base outline-none resize-none bg-transparent placeholder:text-stone-300 font-medium leading-relaxed"
            rows={3}
          />

          {newPostPhotos.length > 0 && (
            <div className="flex gap-3 mb-2 overflow-x-auto pb-2 scrollbar-hide">
              {newPostPhotos.map((url, i) => (
                <div key={i} className="w-24 h-24 shrink-0 rounded-[20px] overflow-hidden relative border-2 border-stone-50 shadow-md">
                  <img src={url} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setNewPostPhotos(p => p.filter((_, idx) => idx !== i))}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs shadow-xl active:scale-90 transition-transform"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-stone-50 pt-4 mt-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-[11px] text-emerald-700 font-black uppercase tracking-widest bg-emerald-50 px-4 py-2.5 rounded-2xl cursor-pointer hover:bg-emerald-100 transition-all active:scale-95">
                <ImageIcon className="w-4 h-4" />
                {newPostPhotos.length < 3 ? "Aggiungi Foto" : "Max Raggiunto"}
                <input type="file" accept="image/*" multiple className="hidden" disabled={newPostPhotos.length >= 3} onChange={handlePhotoUpload} />
              </label>
            </div>
            <button
              onClick={submitPost}
              disabled={isPosting || (newPostPhotos.length === 0 && !newPostDesc)}
              className="bg-stone-900 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] disabled:opacity-20 transition-all hover:bg-black shadow-lg active:scale-95"
            >
              Pubblica
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-8">
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[40px] border border-dashed border-stone-200">
            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-stone-200" />
            </div>
            <p className="text-stone-400 text-sm font-medium italic">Ancora nessun post nella tua bacheca.</p>
          </div>
        ) : (
          posts.map(post => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-stone-50 group hover:shadow-md transition-shadow duration-500"
            >
              <div className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-stone-50 ring-4 ring-stone-50/50">
                  <img src={post.author_photo || `https://picsum.photos/seed/${post.author_name}/100`} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-stone-900 leading-none mb-1">{post.author_name}</h4>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                    {new Date(post.created_at).toLocaleDateString()} • {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {post.photos.length > 0 && (
                <div className="w-full aspect-[9/16] overflow-x-auto snap-x snap-mandatory flex scrollbar-hide relative group/slider">
                  {post.photos.map((ph, i) => (
                    <div key={i} className="w-full h-full shrink-0 snap-center">
                      <img src={ph} className="w-full h-full object-cover" onContextMenu={(e) => e.preventDefault()} />
                    </div>
                  ))}
                  {post.photos.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                      {post.photos.map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50 backdrop-blur-md" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="p-6 space-y-4">
                {post.description && (
                  <p className="text-base text-stone-800 leading-relaxed font-medium">{post.description}</p>
                )}
                {/* Interaction row */}
                <div className="flex gap-4 items-center pt-1 border-t border-stone-50">
                  <button
                    onClick={() => toggleInteraction(post.id, 'like')}
                    className={cn(
                      "flex items-center gap-2 text-xs font-black tracking-widest uppercase transition-all",
                      post.has_liked ? "text-blue-500" : "text-stone-300 hover:text-blue-400"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", post.has_liked ? "bg-blue-50" : "bg-stone-50")}>
                      <ThumbsUp className={cn("w-4 h-4", post.has_liked && "fill-current")} />
                    </div>
                    {post.likes_count}
                  </button>
                  <button
                    onClick={() => toggleInteraction(post.id, 'heart')}
                    className={cn(
                      "flex items-center gap-2 text-xs font-black tracking-widest uppercase transition-all",
                      post.has_hearted ? "text-rose-500" : "text-stone-300 hover:text-rose-400"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", post.has_hearted ? "bg-rose-50" : "bg-stone-50")}>
                      <Heart className={cn("w-4 h-4", post.has_hearted && "fill-current")} />
                    </div>
                    {post.hearts_count}
                  </button>
                  {/* Comment toggle */}
                  <button
                    onClick={() => toggleComments(post.id)}
                    className={cn(
                      "ml-auto flex items-center gap-2 text-xs font-black tracking-widest uppercase transition-all",
                      expandedComments.includes(post.id) ? "text-emerald-600" : "text-stone-300 hover:text-emerald-500"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", expandedComments.includes(post.id) ? "bg-emerald-50" : "bg-stone-50")}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span>{(postComments[post.id]?.length) ?? post.comments_count ?? 0}</span>
                  </button>
                </div>

                {/* Comments section */}
                <AnimatePresence>
                  {expandedComments.includes(post.id) && (
                    <motion.div
                      key={`comments-${post.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-2">
                        {/* Existing comments */}
                        {(postComments[post.id] || []).map((c: any) => (
                          <div key={c.id} className="flex gap-2.5">
                            <div className="w-8 h-8 rounded-[12px] overflow-hidden bg-stone-100 shrink-0">
                              <img src={c.user?.photos?.[0] || c.user?.photo_url || `https://picsum.photos/seed/${c.user_id}/100`} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 bg-stone-50 rounded-[16px] px-3 py-2">
                              <span className="text-[10px] font-black text-stone-700">{c.user?.name} </span>
                              <span className="text-[11px] text-stone-600">{c.text}</span>
                            </div>
                          </div>
                        ))}
                        {/* New comment input */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={commentTexts[post.id] || ''}
                            onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                            placeholder="Scrivi un commento..."
                            className="flex-1 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-400/30 placeholder:text-stone-300"
                          />
                          <button
                            onClick={() => submitComment(post.id)}
                            disabled={!commentTexts[post.id]?.trim()}
                            className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center disabled:opacity-30"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const EditProfilePage = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      // Verifica sessione Supabase attiva
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/register');
        return;
      }

      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        try {
          setUser(JSON.parse(saved));
          setLoading(false);
          return;
        } catch (e) {
          console.error("Error parsing user from localStorage:", e);
        }
      }

      // If no localStorage, fetch from DB
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile && !error) {
        setUser(profile);
        localStorage.setItem('soulmatch_user', JSON.stringify(profile));
        setLoading(false);
      } else {
        navigate('/register');
      }
    };
    init();
  }, [navigate]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Verifica sessione attiva prima di salvare
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setToast({ message: 'Sessione scaduta. Effettua nuovamente il login.', type: 'error' });
        setTimeout(() => navigate('/register'), 2000);
        return;
      }

      const toCleanArray = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return [...new Set(val.filter(Boolean))];
        return [val as string];
      };

      const cleanedUser = {
        ...user,
        id: session.user.id,
        orientation: toCleanArray(user.orientation),
        looking_for_gender: toCleanArray(user.looking_for_gender),
      };

      const { data, error } = await supabase
        .from('users')
        .upsert(cleanedUser)
        .select()
        .single();

      if (error) throw error;

      try {
        localStorage.setItem('soulmatch_user', JSON.stringify(data));

      } catch (err) {
        console.error("LocalStorage error:", err);
      }
      setToast({ message: 'Profilo aggiornato con successo!', type: 'success' });
      setTimeout(() => navigate('/profile'), 1500);
    } catch (e: any) {
      setToast({ message: 'Errore: ' + e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user) return;
    try {
      setSaving(true);

      // Delete user data from all related tables via secure RPC function
      console.log("Deleting user data for:", user.id);

      // Esegui la funzione RPC che distrugge l'intero account lato server
      // (Bypassa RLS e include auth.users per una rimozione completa)
      const { error } = await supabase.rpc('delete_user_account');

      if (error) {
        throw new Error("Impossibile eliminare l'account in modo definitivo tramite funzione database. Assicurati di aver incollato lo script delete_user_function.sql nell'editor SQL. Dettaglio: " + error.message);
      }

      // 5. Sign out locally
      await supabase.auth.signOut();

      localStorage.removeItem('soulmatch_user');
      setToast({ message: 'Profilo eliminato con successo. Arrivederci!', type: 'info' });

      setTimeout(() => {
        window.dispatchEvent(new Event('user-auth-change'));
        navigate('/');
      }, 2000);
    } catch (err: any) {
      console.error("Delete error:", err);
      setToast({ message: 'Errore durante l\'eliminazione: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof UserProfile, value: any) => {
    if (user) setUser({ ...user, [field]: value });
  };

  const updateConosciamoci = (key: string, value: string) => {
    if (user) {
      setUser({
        ...user,
        conosciamoci_meglio: { ...(user.conosciamoci_meglio || {}), [key]: value }
      });
    }
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Sparkles className="animate-spin text-rose-500" /></div>;

  const InputField = ({ label, value, onChange, disabled = false, type = "text", placeholder = "" }: any) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => !disabled && onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "w-full p-4 rounded-3xl text-sm font-medium transition-all outline-none border",
          disabled
            ? "bg-stone-50 border-stone-100 text-stone-400 cursor-not-allowed"
            : "bg-white border-stone-100 focus:border-rose-200 focus:ring-4 focus:ring-rose-500/5 text-stone-900"
        )}
      />
    </div>
  );

  const TextAreaField = ({ label, value, onChange, placeholder = "" }: any) => (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full p-5 rounded-[32px] bg-white border border-stone-100 focus:border-rose-200 focus:ring-4 focus:ring-rose-500/5 text-sm font-medium outline-none transition-all resize-none"
      />
    </div>
  );

  const SelectGroup = ({ label, options, currentValue, onSelect, columns = 2 }: any) => (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">{label}</label>
      <div className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
        {options.map((opt: string) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={cn(
              "py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all border",
              currentValue === opt
                ? "bg-stone-900 border-stone-900 text-white shadow-md"
                : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFDF5] via-white to-[#FDF9F0] pt-24 pb-32 px-6">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="max-w-md mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between sticky top-24 z-30 bg-white/40 backdrop-blur-md p-4 -mx-4 rounded-3xl border border-white/50 shadow-sm">
          <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white border border-stone-100 text-stone-600 hover:text-rose-600 shadow-sm transition-all">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-xl font-serif font-black text-stone-900">Modifica Profilo</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-50 transition-all active:scale-95"
          >
            {saving ? '...' : 'Salva'}
          </button>
        </div>

        {/* Form Sections */}
        <div className="space-y-12">
          {/* Section: Anagrafica (Locked) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1 h-6 bg-rose-600 rounded-full" />
              <h2 className="text-sm font-black uppercase tracking-widest text-stone-900">Anagrafica</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Nome" value={user.name} disabled />
              <InputField label="Cognome" value={user.surname} disabled />
            </div>
            <div className="max-w-[200px]">
              <InputField label="Data di Nascita" value={user.dob} disabled type="date" />
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <Info className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-[10px] text-amber-700 leading-relaxed font-bold">
                Nome e data di nascita sono verificati tramite documento e non modificabili.
              </p>
            </div>
          </section>

          {/* Section: Identità */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1 h-6 bg-rose-600 rounded-full" />
              <h2 className="text-sm font-black uppercase tracking-widest text-stone-900">Identità</h2>
            </div>
            <SelectGroup
              label="Il mio Genere"
              options={['Uomo', 'Donna', 'Non-binario', 'Transgender (M→F)', 'Transgender (F→M)', 'Genderfluid', 'Genderqueer', 'Agender', 'Bigender', 'Pangender', 'Demi-genere', 'Intersessuale', 'Neutrois', 'Queer', 'Altro']}
              currentValue={user.gender}
              onSelect={(v: string) => updateField('gender', v)}
              columns={2}
            />
            {/* Orientamento - multi-selezione */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
                Orientamento Sessuale <span className="normal-case text-stone-300 font-normal">(selezione multipla)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Eterosessuale', 'Gay', 'Lesbica', 'Bisessuale', 'Pansessuale', 'Asessuale', 'Demisessuale', 'Sapiosexual', 'Polisessuale', 'Queer', 'Fluido', 'Aromantic', 'Curioso/a', 'Altro'].map(o => {
                  const cur: string[] = Array.isArray(user.orientation) ? user.orientation : user.orientation ? [user.orientation as unknown as string] : [];
                  const sel = cur.includes(o);
                  return (
                    <button key={o} type="button"
                      onClick={() => {
                        const next = sel ? cur.filter(x => x !== o) : [...cur, o];
                        updateField('orientation', next);
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-3 rounded-2xl border text-[10px] font-black tracking-wide uppercase transition-all text-left',
                        sel ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-100 text-stone-400 hover:border-stone-300'
                      )}
                    >
                      <span className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', sel ? 'bg-rose-500 border-rose-500' : 'border-stone-300')}>
                        {sel && <span className="text-white text-[9px] font-black">✓</span>}
                      </span>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section: Info Profilo */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1 h-6 bg-rose-600 rounded-full" />
              <h2 className="text-sm font-black uppercase tracking-widest text-stone-900">Info Profilo</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Città" value={user.city} onChange={(v: string) => updateField('city', v)} placeholder="es. Milano" />
              <InputField label="Provincia" value={user.province} onChange={(v: string) => updateField('province', v)} placeholder="es. MI" />
            </div>
            <InputField label="Professione" value={user.job} onChange={(v: string) => updateField('job', v)} placeholder="es. Designer, Medico..." />
            <TextAreaField label="Bio / Descrizione" value={user.description} onChange={(v: string) => updateField('description', v)} placeholder="Racconta qualcosa di te..." />
            <InputField label="Hobby" value={user.hobbies} onChange={(v: string) => updateField('hobbies', v)} placeholder="Cosa ti piace fare?" />
            <InputField label="Cosa cerchi / Desideri" value={user.desires} onChange={(v: string) => updateField('desires', v)} placeholder="es. Relazione seria, Amicizia..." />

            <SelectGroup
              label="La mia Corporatura"
              options={['Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta']}
              currentValue={user.body_type}
              onSelect={(v: string) => updateField('body_type', v)}
              columns={3}
            />
            <InputField label="Altezza (cm)" type="number" value={user.height_cm} onChange={(v: string) => updateField('height_cm', parseInt(v))} placeholder="es. 175" />
          </section>

          {/* Section: Conosciamoci Meglio */}
          <section className="space-y-8 p-8 bg-stone-900 rounded-[48px] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-3xl" />
            <div className="flex items-center gap-3 px-1 relative z-10">
              <Sparkles className="w-5 h-5 text-rose-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Conosciamoci Meglio</h2>
            </div>

            <div className="space-y-8 relative z-10">
              {[
                { label: 'Fumo', key: 'Fumo', options: ['Non fumo', 'Occasionalmente', 'Fumo', 'Misto'] },
                { label: 'Sport e Attività', key: 'Sport_e_Attivita', options: ['Molto Attivo/a', 'Naturale', 'Poco Sportivo/a', 'Odio lo sport'] },
                { label: 'Animali', key: 'Animale_Domestico', options: ['Cane', 'Gatto', 'Nessuno', 'Altro'] },
                { label: 'Stile di Vita', key: 'Stile_di_Vita', options: ['Casa e Relax', 'Viaggi ed Escursioni', 'Feste e Locali', 'Equilibrato'] },
                { label: 'Famiglia', key: 'Famiglia', options: ['Voglio figli', 'Non voglio figli', 'Posso cambiare idea', 'Ne ho già'] }
              ].map(q => (
                <div key={q.key} className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-500 ml-1">{q.label}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => updateConosciamoci(q.key, opt)}
                        className={cn(
                          "py-3 rounded-2xl text-[9px] font-black tracking-widest uppercase transition-all border",
                          user.conosciamoci_meglio?.[q.key] === opt
                            ? "bg-rose-600 border-rose-600 text-white"
                            : "bg-white/5 border-white/10 text-stone-400 hover:border-white/20"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Preferenze Matching */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1 h-6 bg-rose-600 rounded-full" />
              <h2 className="text-sm font-black uppercase tracking-widest text-stone-900">Chi cerchi</h2>
            </div>

            {/* Genere Preferito - Multi-selezione */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">
                Chi cerchi <span className="normal-case text-stone-300 font-normal">(selezione multipla)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Uomo', 'Donna', 'Tutti', 'Non-binario', 'Transgender', 'Genderfluid', 'Queer', 'Altro'].map(g => {
                  const cur = Array.isArray(user.looking_for_gender) ? user.looking_for_gender : (user.looking_for_gender ? [user.looking_for_gender as any] : []);
                  const sel = cur.includes(g);
                  return (
                    <button key={g} type="button"
                      onClick={() => {
                        const next = g === 'Tutti'
                          ? (sel ? [] : ['Tutti'])
                          : (sel ? cur.filter(x => x !== g) : [...cur.filter(x => x !== 'Tutti'), g]);
                        updateField('looking_for_gender', next);
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-3 rounded-2xl border text-[10px] font-black tracking-wide uppercase transition-all text-left',
                        sel ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-100 text-stone-400 hover:border-stone-300'
                      )}
                    >
                      <span className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', sel ? 'bg-rose-500 border-rose-500' : 'border-stone-300')}>
                        {sel && <span className="text-white text-[9px] font-black">✓</span>}
                      </span>
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>


            <div className="grid grid-cols-2 gap-4">
              <InputField label="Età Minima" type="number" value={user.looking_for_age_min} onChange={(v: string) => updateField('looking_for_age_min', parseInt(v))} />
              <InputField label="Età Massima" type="number" value={user.looking_for_age_max} onChange={(v: string) => updateField('looking_for_age_max', parseInt(v))} />
            </div>

            <SelectGroup
              label="Statura Partner"
              options={['Tutte', 'Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta']}
              currentValue={user.looking_for_body_type}
              onSelect={(v: string) => updateField('looking_for_body_type', v)}
              columns={3}
            />

            <InputField label="Città desiderata" value={user.looking_for_city} onChange={(v: string) => updateField('looking_for_city', v)} placeholder="es. Roma o Indifferente" />
            <TextAreaField label="Altre preferenze" value={user.looking_for_other} onChange={(v: string) => updateField('looking_for_other', v)} placeholder="es. Solo non fumatori, amanti dei gatti..." />
          </section>
        </div>

        {/* Footer Info */}
        <p className="text-center text-[10px] text-stone-400 font-bold uppercase tracking-widest pb-6">
          Il tuo profilo è protetto e i dati sensibili sono crittografati.
        </p>

        {/* Delete Profile Section */}
        <div className="pb-20 px-4">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-4 rounded-3xl border-2 border-rose-500/20 text-rose-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-500/10 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Elimina Profilo
            </button>
          ) : (
            <div className="bg-rose-500/10 border-2 border-rose-500 p-6 rounded-[32px] space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-3 text-rose-500">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="font-black uppercase tracking-widest text-sm">Sei sicuro?</h3>
              </div>
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                Questa azione è irreversibile. Tutti i tuoi messaggi, foto, post e interazioni verranno eliminati per sempre dal server.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteProfile}
                  disabled={saving}
                  className="flex-1 py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20"
                >
                  {saving ? 'ELIMINAZIONE...' : 'SÌ, ELIMINA TUTTO'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 bg-stone-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                  ANNULLA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'notifications' | 'gallery' | 'feed'>('notifications');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const navigate = useNavigate();

  const fetchData = async (userId: string) => {
    try {
      // Determina se siamo in modalità locale (ID numerico) o Supabase (UUID)
      const isLocalId = /^\d+$/.test(String(userId));

      if (isLocalId) {
        // Modalità locale: usa l'API REST Express
        const res = await fetch(`/api/profiles/${userId}`);
        if (res.ok) {
          const profileData = await res.json();
          const fullProfile = {
            ...profileData,
            likes_count: profileData.likes_count || 0,
            hearts_count: profileData.hearts_count || 0,
            photos: Array.isArray(profileData.photos) ? profileData.photos : [],
          };
          setUser(fullProfile);
          localStorage.setItem('soulmatch_user', JSON.stringify(fullProfile));
        } else {
          console.warn("Local profile not found for ID:", userId);
        }

        // Chat requests locali
        const reqRes = await fetch(`/api/chat-requests/${userId}`);
        if (reqRes.ok) {
          setChatRequests(await reqRes.json());
        }
        setLoading(false);
        return;
      }

      // Modalità Supabase (UUID)
      const { data: profileData, error: profileErr } = await supabase
        .from('users')
        .select(`
          *,
          interactions!to_user_id(type)
        `)
        .eq('id', userId)
        .single();

      if (profileErr) {
        console.error("Profile fetch error:", profileErr);
      }

      if (profileData) {
        const fullProfile = {
          ...profileData,
          likes_count: (profileData.interactions as any[] || []).filter(i => i.type === 'like').length,
          hearts_count: (profileData.interactions as any[] || []).filter(i => i.type === 'heart').length
        };
        setUser(fullProfile);
        localStorage.setItem('soulmatch_user', JSON.stringify(fullProfile));
      }
      else {
        console.warn("No profile found for ID:", userId);
        // Non reindirizzare subito – mostra il profilo dalla cache se c'è
      }

      const { data: requestsData, error: requestsErr } = await supabase
        .from('chat_requests')
        .select(`
          *,
          from_user:users!from_user_id(name, surname, photo_url, photos)
        `)
        .eq('to_user_id', userId);

      if (requestsErr) console.error("Requests fetch error:", requestsErr);

      if (requestsData) {
        const processedRequests = requestsData.map((r: any) => ({
          ...r,
          name: r.from_user?.name,
          surname: r.from_user?.surname,
          photo_url: r.from_user?.photos?.[0] || r.from_user?.photo_url
        }));
        setChatRequests(processedRequests);
      }
      setLoading(false);
    } catch (e) {
      console.error("fetchData exception:", e);
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.id) {
            // Mostra subito il profilo dalla cache – non c'è bisogno di aspettare la rete
            setUser(parsed);
            setLoading(false);
            // Aggiorna in background (silenzioso, non blocca la UI)
            fetchData(String(parsed.id)).catch(() => { });
            return;
          }
        } catch (e) {
          console.error("Error parsing saved user:", e);
        }
      }

      // Se no localStorage, controlla sessione Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          fetchData(session.user.id);
        } else {
          navigate('/register');
        }
      } catch (e) {
        navigate('/register');
      }
    };
    init();
  }, [navigate]);

  const handleRequestAction = async (requestId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('chat_requests')
      .update({ status })
      .eq('id', requestId);

    if (!error) {
      setToast({
        message: status === 'approved' ? "Richiesta approvata!" : "Richiesta rifiutata.",
        type: status === 'approved' ? 'success' : 'info'
      });
      if (user?.id) fetchData(user.id);
    }
  };

  const handleSendReply = async (recipientId: string) => {
    if (!replyText.trim() || !user) return;
    setIsSendingReply(true);
    try {
      const { error } = await supabase
        .from('chat_requests')
        .insert([{
          from_user_id: user.id,
          to_user_id: recipientId,
          message: replyText
        }]);

      if (!error) {
        setToast({ message: 'Risposta inviata!', type: 'success' });
        setReplyText('');
        setReplyingTo(null);
        fetchData(user.id);
      } else {
        setToast({ message: 'Errore nell\'invio.', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Errore di connessione.', type: 'error' });
    }
    setIsSendingReply(false);
  };

  const removeProfilePhoto = async (index: number) => {
    if (!user) return;
    const newPhotos = user.photos.filter((_, i) => i !== index);

    const { error } = await supabase
      .from('users')
      .update({ photos: newPhotos })
      .eq('id', user.id);

    if (error) {
      setToast({ message: "Errore durante l'eliminazione.", type: 'error' });
    } else {
      setToast({ message: "Foto rimossa correttamente!", type: 'success' });
      fetchData(user.id);
    }
  };

  const replaceProfilePhoto = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const base64 = await fileToBase64(file);
    const newPhotos = [...user.photos];
    newPhotos[index] = base64;

    const { error } = await supabase
      .from('users')
      .update({ photos: newPhotos })
      .eq('id', user.id);

    if (error) {
      setToast({ message: "Errore durante la sostituzione.", type: 'error' });
    } else {
      setToast({ message: "Foto aggiornata!", type: 'success' });
      fetchData(user.id);
    }
  };

  const addProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files) return;
    const files = Array.from(e.target.files);
    const base64s = await Promise.all(files.map(f => fileToBase64(f as File)));
    const newPhotos = [...(user.photos || []), ...base64s].slice(0, 5);

    const { error } = await supabase
      .from('users')
      .update({ photos: newPhotos })
      .eq('id', user.id);

    if (error) {
      setToast({ message: "Errore durante l'aggiunta.", type: 'error' });
    } else {
      setToast({ message: "Foto aggiunte alla galleria!", type: 'success' });
      fetchData(user.id);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 gap-4">
      <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-stone-400 text-sm font-medium animate-pulse">Caricamento profilo...</p>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-6 text-center">
      <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
        <Info className="w-10 h-10 text-stone-300" />
      </div>
      <h2 className="text-xl font-serif font-black text-stone-900 mb-2">Profilo non trovato</h2>
      <p className="text-stone-500 text-sm mb-8 max-w-xs">Non è stato possibile caricare i dati del tuo profilo. Potrebbe esserci un problema di connessione o il database non è aggiornato.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={() => navigate('/register')} className="btn-primary py-4">Completa Registrazione</button>
        <button onClick={() => window.location.reload()} className="btn-secondary py-4">Riprova</button>
      </div>
    </div>
  );

  const heroPhoto = (user.photos && user.photos.length > 0) ? user.photos[0] : (user.photo_url || `https://picsum.photos/seed/${user.name}/400/600`);

  return (
    <div className="min-h-screen bg-[#F8F4EF] pt-16 pb-28 relative overflow-x-hidden">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── HERO PHOTO ── */}
      <div className="relative w-full h-[55vh] min-h-[340px] overflow-hidden">
        <img
          src={heroPhoto}
          alt={user.name}
          className="w-full h-full object-cover object-top"
        />
        {/* Gradient overlay: transparent at top, full colour at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#F8F4EF]" />


        {/* Name + badge floated over gradient */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 z-10">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-serif font-black text-stone-900 leading-tight drop-shadow-sm">
                {user.name} <span className="text-stone-500 font-light text-2xl">{calculateAge(user.dob)}</span>
              </h1>
              {user.city && (
                <p className="text-stone-500 text-sm font-semibold mt-0.5">{user.city}{user.province ? `, ${user.province}` : ''}</p>
              )}
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
              user.is_paid ? "bg-rose-600 text-white" : "bg-white/80 backdrop-blur text-stone-500 border border-stone-200"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", user.is_paid ? "bg-white animate-pulse" : "bg-stone-300")} />
              {user.is_paid ? 'Premium' : 'Base'}
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="mx-4 mt-3 bg-white rounded-[28px] shadow-sm border border-stone-100 grid grid-cols-4 divide-x divide-stone-100 overflow-hidden">
        {[
          { icon: ThumbsUp, val: user.likes_count || 0, label: 'Like', color: 'text-blue-500' },
          { icon: Heart, val: user.hearts_count || 0, label: 'Cuori', color: 'text-rose-500' },
          { icon: Camera, val: user.photos?.length || 0, label: 'Foto', color: 'text-emerald-500' },
          { icon: MessageSquare, val: chatRequests.length, label: 'Msg', color: 'text-amber-500' }
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center py-4 gap-1">
            <span className="text-xl font-black text-stone-900">{s.val}</span>
            <s.icon className={cn("w-4 h-4", s.color)} />
            <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── TAB BAR ── */}
      <div className="mx-4 mt-5 bg-white rounded-[24px] shadow-sm border border-stone-100 flex p-1.5">
        {[
          { id: 'notifications', label: 'Notifiche', icon: Bell, badge: chatRequests.length },
          { id: 'gallery', label: 'Galleria', icon: Camera, badge: 0 },
          { id: 'feed', label: 'Bacheca', icon: ImageIcon, badge: 0 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 py-3 rounded-[18px] flex flex-col items-center gap-1 transition-all duration-300 relative",
              activeTab === tab.id ? "text-rose-600" : "text-stone-400"
            )}
          >
            {activeTab === tab.id && (
              <motion.div layoutId="profileTabBg" className="absolute inset-0 bg-rose-50 rounded-[18px]" />
            )}
            <div className="relative z-10">
              <tab.icon className="w-5 h-5" />
              {tab.badge > 0 && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {tab.badge}
                </div>
              )}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="mx-4 mt-4">
        <AnimatePresence mode="wait">

          {activeTab === 'notifications' && (
            <motion.div key="tab-notif" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {chatRequests.length === 0 ? (
                <div className="bg-white rounded-[28px] border border-stone-100 p-10 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-stone-300" />
                  </div>
                  <p className="text-stone-400 text-sm font-bold">Tutto tranquillo! Nessuna novità.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatRequests.map((req) => (
                    <motion.div key={req.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-2">
                      <div className="bg-white rounded-[24px] border border-stone-100 p-4 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-[16px] overflow-hidden border border-stone-100 shadow-sm shrink-0">
                            <img src={req.photo_url || `https://picsum.photos/seed/${req.from_user_id}/100`} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-stone-900">{req.name}</h4>
                              <span className="bg-rose-100 text-rose-600 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Nuovo</span>
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium line-clamp-1">{req.message || "Ti ha notato!"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {replyingTo !== req.id ? (
                            <button onClick={() => setReplyingTo(req.id)} className="w-9 h-9 bg-stone-50 border border-stone-100 text-rose-500 rounded-[14px] flex items-center justify-center">
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => setReplyingTo(null)} className="w-9 h-9 bg-stone-100 text-stone-500 rounded-[14px] flex items-center justify-center">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleRequestAction(req.id, 'approved')} className="w-9 h-9 bg-rose-600 text-white rounded-[14px] flex items-center justify-center shadow-md active:scale-90">
                            <Heart className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      </div>
                      <AnimatePresence>
                        {replyingTo === req.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="bg-white p-3 rounded-[20px] border border-rose-100 flex gap-2 mx-2 mt-1 shadow-md">
                              <input
                                type="text" autoFocus value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendReply(req.from_user_id)}
                                placeholder="Scrivi la tua risposta..."
                                className="flex-1 bg-stone-50 text-sm outline-none px-3 py-2 rounded-xl placeholder:text-stone-300"
                              />
                              <button onClick={() => handleSendReply(req.from_user_id)} disabled={!replyText.trim() || isSendingReply} className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center disabled:opacity-30">
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'gallery' && (
            <motion.div key="tab-gallery" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-[28px] border border-stone-100 p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-base font-serif font-black text-stone-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-rose-500" /> La Mia Galleria
                </h2>
                <span className="text-[10px] text-stone-400 font-black uppercase tracking-widest">{user.photos?.length || 0}/5</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {user.photos?.map((url, i) => (
                  <div key={i} className="aspect-square rounded-[20px] overflow-hidden relative group shadow-md border border-stone-50">
                    <img src={url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-stone-600 cursor-pointer hover:text-rose-600 shadow-lg active:scale-90">
                        <RefreshCw className="w-4 h-4" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => replaceProfilePhoto(i, e)} />
                      </label>
                      <button onClick={() => { if (window.confirm("Eliminare la foto?")) removeProfilePhoto(i); }} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-stone-600 hover:text-rose-600 shadow-lg active:scale-90">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {i === 0 && <div className="absolute top-2 left-2 bg-rose-600 text-[7px] text-white px-1.5 py-0.5 rounded-md font-black uppercase">Principale</div>}
                  </div>
                ))}
                {(user.photos?.length || 0) < 5 && (
                  <label className="aspect-square rounded-[20px] border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-rose-50 hover:border-rose-300 transition-all group">
                    <div className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center group-hover:bg-rose-100 transition-all">
                      <Plus className="w-5 h-5 text-stone-400 group-hover:text-rose-500" />
                    </div>
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest group-hover:text-rose-400">Aggiungi</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={addProfilePhoto} />
                  </label>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'feed' && (
            <motion.div key="tab-feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <FeedComponent userId={user.id} isOwner={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM NAV BAR (fixed, iOS style) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        {/* backdrop blur pill */}
        <div className="bg-white/90 backdrop-blur-xl border-t border-stone-100 shadow-2xl px-4 pb-6 pt-3">
          <div className="max-w-sm mx-auto flex items-center justify-around">

            {/* Home */}
            <button
              onClick={() => navigate('/')}
              className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all"
            >
              <Home className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
            </button>

            {/* Bacheca */}
            <button
              onClick={() => navigate('/bacheca')}
              className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all"
            >
              <Users className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-widest">Bacheca</span>
            </button>

            {/* Centre button – Modifica (elevated) */}
            <button
              onClick={() => navigate('/edit-profile')}
              className="flex flex-col items-center gap-1"
              title="Modifica profilo"
            >
              <div className="w-[52px] h-[52px] -mt-5 rounded-[18px] bg-rose-600 flex items-center justify-center shadow-xl shadow-rose-400/40 text-white active:scale-90 transition-all">
                <Settings2 className="w-5 h-5" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 mt-0.5">Modifica</span>
            </button>

            {/* SoulLink */}
            <button
              onClick={() => navigate('/soul-links')}
              className="flex flex-col items-center gap-1 text-stone-400 hover:text-violet-600 active:scale-90 transition-all"
            >
              <Link2 className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-widest">SoulLink</span>
            </button>

            {/* Esci */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex flex-col items-center gap-1 text-stone-400 hover:text-rose-600 active:scale-90 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase tracking-widest">Esci</span>
            </button>

          </div>
        </div>
      </div>

      {/* ── LOGOUT MODAL ── */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl text-center space-y-6"
            >
              <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-4" />
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
                <LogOut className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-black text-stone-900">Sei sicuro di uscire?</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed px-4">
                  Dovrai reinserire le tue credenziali per accedere nuovamente.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 bg-stone-100 text-stone-600 py-4 rounded-[18px] font-black uppercase tracking-widest text-sm hover:bg-stone-200 transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={async () => {
                    setShowLogoutConfirm(false);
                    setToast({ message: 'Logout effettuato. A presto!', type: 'success' });
                    try {
                      await supabase.auth.signOut();
                      localStorage.removeItem('soulmatch_user');
                      localStorage.removeItem('soulmatch_reg_draft');
                      window.dispatchEvent(new Event('user-auth-change'));
                      setTimeout(() => { window.location.href = '/'; }, 1000);
                    } catch (e) { window.location.href = '/'; }
                  }}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-[18px] font-black uppercase tracking-widest text-sm shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
                >
                  Esci
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ══════════════════════════════════════
// APP FOOTER
// ══════════════════════════════════════
const AppFooter = () => {
  const sections = [
    {
      title: 'Legale',
      links: [
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Cookie Policy', to: '/cookie' },
        { label: 'Termini e Condizioni', to: '/termini' },
        { label: 'DMCA', to: '/dmca' },
      ],
    },
    {
      title: 'Community',
      links: [
        { label: 'Regolamento', to: '/regolamento' },
        { label: 'Segnalazioni', to: '/segnalazioni' },
        { label: 'FAQ', to: '/faq' },
        { label: 'Contatti', to: '/contatti' },
      ],
    },
  ];

  return (
    <footer className="w-full bg-stone-900 text-white mt-12 border-t-4 border-rose-600">


      <div className="px-6 pt-2 pb-10 max-w-md mx-auto">
        {/* Logo row */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-rose-600 rounded-[14px] flex items-center justify-center shadow-lg shadow-rose-900/40">
            <Heart className="w-5 h-5 text-white fill-current" />
          </div>
          <div>
            <p className="text-base font-serif font-black text-white">SoulMatch</p>
            <p className="text-stone-500 text-[9px] uppercase tracking-widest font-bold">Trova la tua anima gemella</p>
          </div>
        </div>

        {/* Link grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-[9px] font-black text-stone-500 uppercase tracking-[0.25em] mb-3">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-stone-400 text-xs font-medium hover:text-white transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-stone-700 group-hover:bg-rose-500 transition-colors shrink-0" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-stone-800 pt-5 flex flex-col gap-3">
          {/* App store badges placeholder */}
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-[12px] px-3 py-2 flex-1">
              <div className="w-5 h-5 bg-stone-600 rounded-md flex items-center justify-center">
                <span className="text-[8px] font-black text-white">▲</span>
              </div>
              <div>
                <p className="text-[7px] text-stone-500 uppercase tracking-widest">Presto su</p>
                <p className="text-[10px] font-black text-stone-300">App Store</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-[12px] px-3 py-2 flex-1">
              <div className="w-5 h-5 bg-stone-600 rounded-md flex items-center justify-center">
                <span className="text-[8px] font-black text-white">▶</span>
              </div>
              <div>
                <p className="text-[7px] text-stone-500 uppercase tracking-widest">Presto su</p>
                <p className="text-[10px] font-black text-stone-300">Google Play</p>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-stone-600 text-[9px] text-center font-medium">
            © {new Date().getFullYear()} SoulMatch — Tutti i diritti riservati
            <br />
            <span className="text-stone-700">P.IVA 00000000000 · Made in Italy 🇮🇹</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

// ══════════════════════════════════════
// LEGAL PAGE TEMPLATE
// ══════════════════════════════════════
type LegalSection = { heading: string; body: string };

const LegalPage = ({
  title, subtitle, icon: Icon, iconBg, iconColor, sections, badge
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sections: LegalSection[];
  badge?: string;
}) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F8F4EF] pt-[72px] pb-24">
      {/* Header */}
      <div className="px-5 pt-4 pb-6 max-w-md mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-500 text-xs font-black uppercase tracking-widest mb-5 active:scale-95 transition-all"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Indietro
        </button>

        <div className="flex items-start gap-4">
          <div className={cn('w-14 h-14 rounded-[18px] flex items-center justify-center shrink-0 shadow-sm', iconBg)}>
            <Icon className={cn('w-7 h-7', iconColor)} />
          </div>
          <div>
            {badge && (
              <span className="text-[8px] font-black text-rose-600 bg-rose-50 uppercase tracking-widest px-2 py-0.5 rounded-full border border-rose-100 mb-1 inline-block">{badge}</span>
            )}
            <h1 className="text-2xl font-serif font-black text-stone-900 leading-tight">{title}</h1>
            <p className="text-stone-400 text-xs font-semibold mt-1">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 max-w-md mx-auto space-y-4">
        {sections.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-[20px] border border-stone-100 p-5 shadow-sm"
          >
            <h2 className="text-sm font-black text-stone-900 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 bg-rose-50 rounded-[8px] flex items-center justify-center text-[9px] font-black text-rose-600 shrink-0">{i + 1}</span>
              {s.heading}
            </h2>
            <p className="text-[12px] text-stone-500 leading-relaxed font-medium">{s.body}</p>
          </motion.div>
        ))}

        {/* Placeholder notice */}
        <div className="bg-amber-50 border border-amber-100 rounded-[16px] p-4 flex gap-3">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
            Questo documento è in fase di redazione. Il contenuto definitivo sarà disponibile prima del lancio ufficiale dell'applicazione.
          </p>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="pointer-events-none mt-16 flex flex-col items-center gap-3">
        <Icon className={cn('w-24 h-24 opacity-[0.04]', iconColor)} />
        <p className="text-stone-300 text-[9px] font-black uppercase tracking-[0.3em]">SoulMatch © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

// ── Individual legal pages ──
const PrivacyPage = () => (
  <LegalPage
    title="Privacy Policy"
    subtitle="Come raccogliamo e proteggiamo i tuoi dati"
    icon={ShieldCheck}
    iconBg="bg-emerald-50"
    iconColor="text-emerald-600"
    badge="GDPR Compliant"
    sections={[
      { heading: 'Dati raccolti', body: 'Raccogliamo nome, email, data di nascita, foto del profilo e preferenze di matching al momento della registrazione. Questi dati sono necessari per offrirti il servizio.' },
      { heading: 'Utilizzo dei dati', body: 'I tuoi dati vengono utilizzati esclusivamente per il funzionamento del servizio SoulMatch, inclusi matching, notifiche e comunicazioni essenziali.' },
      { heading: 'Conservazione', body: 'I dati vengono conservati per la durata dell\'account. Puoi richiedere la cancellazione completa in qualsiasi momento dalla sezione impostazioni o contattandoci.' },
      { heading: 'Condivisione con terzi', body: 'Non vendiamo né condividiamo i tuoi dati personali con terze parti a scopi commerciali. Usiamo fornitori tecnici certificati GDPR.' },
      { heading: 'I tuoi diritti', body: 'Hai diritto di accesso, rettifica, cancellazione, portabilità e opposizione al trattamento. Contattaci a privacy@soulmatch.it per esercitare i tuoi diritti.' },
    ]}
  />
);

const CookiePage = () => (
  <LegalPage
    title="Cookie Policy"
    subtitle="Informazioni sull'uso dei cookie"
    icon={Info}
    iconBg="bg-blue-50"
    iconColor="text-blue-600"
    sections={[
      { heading: 'Cosa sono i cookie', body: 'I cookie sono piccoli file di testo memorizzati nel tuo browser che ci aiutano a migliorare la tua esperienza di navigazione.' },
      { heading: 'Cookie tecnici', body: 'Utilizziamo cookie di sessione e cookie tecnici essenziali per il funzionamento dello login e della navigazione. Non richiedono consenso.' },
      { heading: 'Cookie analitici', body: 'Con il tuo consenso, utilizziamo strumenti di analisi anonimi per migliorare l\'app. Nessun dato personale viene trasmesso a terzi.' },
      { heading: 'Gestione cookie', body: 'Puoi gestire o disabilitare i cookie in qualsiasi momento dalle impostazioni del tuo browser. La disabilitazione dei cookie tecnici potrebbe limitare alcune funzionalità.' },
    ]}
  />
);

const TerminiPage = () => (
  <LegalPage
    title="Termini e Condizioni"
    subtitle="Regole generali di utilizzo del servizio"
    icon={CheckCircle}
    iconBg="bg-rose-50"
    iconColor="text-rose-600"
    badge="Aggiornato 2025"
    sections={[
      { heading: 'Accettazione', body: 'Utilizzando SoulMatch accetti i presenti Termini e Condizioni. Se non li accetti, ti invitiamo a non utilizzare il servizio.' },
      { heading: 'Età minima', body: 'SoulMatch è riservato a utenti maggiorenni (18+). Gli utenti minorenni non sono autorizzati a registrarsi e utilizzare la piattaforma.' },
      { heading: 'Responsabilità dell\'utente', body: 'L\'utente è responsabile di tutte le attività svolte tramite il proprio account. È vietato usare SoulMatch per attività illecite, truffe o molestie.' },
      { heading: 'Sospensione account', body: 'Ci riserviamo il diritto di sospendere o cancellare account che violino i presenti termini, senza preavviso e senza rimborso di abbonamenti in corso.' },
      { heading: 'Limitazione di responsabilità', body: 'SoulMatch non è responsabile per le interazioni tra utenti al di fuori della piattaforma. Ogni incontro fisico avviene sotto la responsabilità degli utenti.' },
      { heading: 'Modifiche ai termini', body: 'Ci riserviamo il diritto di aggiornare questi termini. Gli utenti saranno informati via email o notifica in-app.' },
    ]}
  />
);

const RegolamentoPage = () => (
  <LegalPage
    title="Regolamento Community"
    subtitle="Le regole per un ambiente sano e rispettoso"
    icon={Users}
    iconBg="bg-amber-50"
    iconColor="text-amber-600"
    sections={[
      { heading: 'Rispetto reciproco', body: 'Ogni utente ha diritto a essere trattato con rispetto. Linguaggio offensivo, discriminatorio o violento è severamente vietato.' },
      { heading: 'Profili autentici', body: 'È obbligatorio inserire informazioni veritiere. È vietato impersonare altre persone o creare profili falsi. Ogni profilo viene verificato dal team.' },
      { heading: 'Foto appropriate', body: 'Le foto caricate devono essere recenti e raffigurare chiaramente il titolare del profilo. È vietato pubblicare contenuti espliciti, violenti o di minori.' },
      { heading: 'Messaggi', body: 'È vietato inviare messaggi spam, catene, pubblicità, link a siti esterni o richieste di denaro. I messaggi devono essere rispettosi e pertinenti.' },
      { heading: 'Sistema di segnalazione', body: 'Incoraggiamo gli utenti a segnalare comportamenti inappropriati. Ogni segnalazione viene esaminata entro 24 ore dal nostro team di moderazione.' },
      { heading: 'Sanzioni', body: 'Le violazioni del regolamento comportano avvertimenti, sospensioni temporanee o ban permanente in base alla gravità del comportamento.' },
    ]}
  />
);

const ContattiPage = () => (
  <LegalPage
    title="Contattaci"
    subtitle="Siamo qui per aiutarti"
    icon={MessageSquare}
    iconBg="bg-rose-50"
    iconColor="text-rose-600"
    sections={[
      { heading: 'Supporto generale', body: 'Per domande generali sull\'utilizzo dell\'app: support@soulmatch.it · Risposta entro 48 ore lavorative.' },
      { heading: 'Privacy e dati', body: 'Per richieste relative ai tuoi dati personali, cancellazione account o diritti GDPR: privacy@soulmatch.it' },
      { heading: 'Segnalazioni urgenti', body: 'Per segnalare comportamenti pericolosi o contenuti illegali con necessità di intervento urgente: safety@soulmatch.it' },
      { heading: 'Partnership e stampa', body: 'Per collaborazioni commerciali, partnership o richieste media: business@soulmatch.it' },
      { heading: 'Sede legale', body: 'SoulMatch S.r.l. · Via [da completare] · [CAP] [Città], Italia · P.IVA 00000000000' },
    ]}
  />
);

const SegnalazioniPage = () => (
  <LegalPage
    title="Segnalazioni"
    subtitle="Come segnalare comportamenti inappropriati"
    icon={ShieldCheck}
    iconBg="bg-red-50"
    iconColor="text-red-600"
    badge="Safety First"
    sections={[
      { heading: 'Come segnalare un profilo', body: 'Dalla pagina del profilo, premi i tre punti in alto a destra e seleziona "Segnala". Scegli il motivo e invia. Il nostro team esaminerà la segnalazione entro 24h.' },
      { heading: 'Cosa puoi segnalare', body: 'Profili falsi · Foto inappropriate · Messaggi offensivi · Spam e pubblicità · Comportamenti minacciosi · Impersonificazione · Contenuti illegali.' },
      { heading: 'Protezione dell\'anonimato', body: 'Le segnalazioni sono anonime. L\'utente segnalato non saprà mai chi lo ha segnalato.' },
      { heading: 'Blocco utenti', body: 'Puoi bloccare un utente in qualsiasi momento. Un utente bloccato non potrà più visualizzare il tuo profilo né contattarti.' },
      { heading: 'Segnalazione urgente', body: 'Se sei in pericolo o hai assistito a un reato, contatta le autorità competenti al 112. Per emergenze sulla piattaforma: safety@soulmatch.it' },
      { heading: 'Abuso del sistema di segnalazione', body: 'Le segnalazioni false o strumentali possono comportare sanzioni all\'account del segnalante.' },
    ]}
  />
);

const FaqPage = () => (
  <LegalPage
    title="FAQ"
    subtitle="Domande frequenti"
    icon={Info}
    iconBg="bg-blue-50"
    iconColor="text-blue-600"
    sections={[
      { heading: 'Come funziona il matching?', body: 'Il nostro algoritmo analizza le preferenze, l\'orientamento, gli interessi comuni e la posizione geografica per calcolare una percentuale di affinità tra profili.' },
      { heading: 'Il servizio è gratuito?', body: 'La registrazione e le funzionalità base sono gratuite. Il piano Premium sblocca funzionalità avanzate come messaggi illimitati, SoulMatch AI e visualizzazione dei profili che ti hanno messo "cuore".' },
      { heading: 'Come verifico il mio profilo?', body: 'Dopo la registrazione, puoi caricare un documento d\'identità per ottenere il badge "Verificato". La verifica aumenta la fiducia degli altri utenti.' },
      { heading: 'Posso cancellare il mio account?', body: 'Sì, puoi cancellare il tuo account in qualsiasi momento dalla sezione Impostazioni → Gestione Account → Elimina Account. Tutti i tuoi dati saranno rimossi entro 30 giorni.' },
      { heading: 'Come funziona SoulMatch (la feature)?', body: 'Il tasto SoulMatch nella Bacheca calcola i tuoi 10 profili più compatibili e li mostra in ordine di affinità. È utilizzabile una volta ogni 24 ore per mantenere il valore speciale di ogni match.' },
      { heading: 'L\'app sarà disponibile su iOS e Android?', body: 'Sì, SoulMatch sarà disponibile su App Store e Google Play. Seguici per essere notificato al momento del lancio.' },
    ]}
  />
);

const DmcaPage = () => (
  <LegalPage
    title="DMCA & Copyright"
    subtitle="Protezione della proprietà intellettuale"
    icon={ShieldCheck}
    iconBg="bg-stone-100"
    iconColor="text-stone-600"
    sections={[
      { heading: 'Proprietà dei contenuti', body: 'Gli utenti mantengono la piena proprietà delle foto e dei contenuti caricati. Caricando contenuti su SoulMatch, concedi una licenza limitata per la visualizzazione all\'interno della piattaforma.' },
      { heading: 'Violazioni copyright', body: 'Se ritieni che un contenuto presente su SoulMatch violi i tuoi diritti d\'autore, puoi inviare una richiesta di rimozione DMCA a: dmca@soulmatch.it' },
      { heading: 'Procedura di rimozione', body: 'Una richiesta DMCA valida deve includere: identificazione dell\'opera, URL del contenuto, dichiarazione di buona fede e firma. Risponderemo entro 5 giorni lavorativi.' },
      { heading: 'Contenuti vietati', body: 'È vietato caricare contenuti di cui non si possiedono i diritti: foto di altre persone, immagini coperte da copyright, loghi o marchi registrati altrui.' },
    ]}
  />
);

export default function App() {
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Find if the click or its parents are a button or anchor
      const target = e.target as HTMLElement;
      const interactive = target.closest('button, a, [role="button"]');
      if (interactive) {
        // playTapSound(); // Disattivato su richiesta
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  return (
    <Router>
      <style>{`
        /* Global Scrollbar Styles */
        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #e11d48;
          border-radius: 20px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #be123c;
        }

        /* Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: #e11d48 transparent;
        }

        /* Body specifically for full page scroll */
        body {
          scrollbar-width: thin;
          scrollbar-color: #e11d48 transparent;
        }
        body::-webkit-scrollbar {
          width: 5px;
        }
        body::-webkit-scrollbar-track {
          background: transparent;
        }
        body::-webkit-scrollbar-thumb {
          background: #e11d48;
          border-radius: 20px;
        }
      `}</style>
      <BackgroundDecorations />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bacheca" element={<BachecaPage />} />
        <Route path="/soul-links" element={<SoulLinksPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile-detail/:id" element={<ProfileDetailPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cookie" element={<CookiePage />} />
        <Route path="/termini" element={<TerminiPage />} />
        <Route path="/regolamento" element={<RegolamentoPage />} />
        <Route path="/contatti" element={<ContattiPage />} />
        <Route path="/segnalazioni" element={<SegnalazioniPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/dmca" element={<DmcaPage />} />
      </Routes>
    </Router>
  );
}
