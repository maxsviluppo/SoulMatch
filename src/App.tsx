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
  X
} from 'lucide-react';
import { cn, calculateAge, calculateMatchScore } from './utils';
import { UserProfile, ChatRequest, Post } from './types';
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

  const checkUser = () => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) setUser(JSON.parse(saved));
      else setUser(null);
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
            alt={profile.name}
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
              className="px-3 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-stone-900 transition-colors shadow-md shadow-rose-100 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Match
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
  const [simulatedProfiles, setSimulatedProfiles] = useState([
    { id: 1, name: 'Giulia', age: 30, city: 'Roma', img: 'https://picsum.photos/seed/giulia/400/500', likes: 12, hearts: 8 },
    { id: 2, name: 'Marco', age: 35, city: 'Milano', img: 'https://picsum.photos/seed/marco/400/500', likes: 5, hearts: 3 },
    { id: 3, name: 'Elena', age: 27, city: 'Napoli', img: 'https://picsum.photos/seed/elena/400/500', likes: 24, hearts: 15 },
    { id: 4, name: 'Luca', age: 37, city: 'Torino', img: 'https://picsum.photos/seed/luca/400/500', likes: 8, hearts: 2 }
  ]);

  const handleSimulatedInteract = (e: React.MouseEvent, index: number, type: 'likes' | 'hearts') => {
    e.preventDefault();
    e.stopPropagation();
    const next = [...simulatedProfiles];
    next[index][type]++;
    setSimulatedProfiles(next);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen pt-[450px] pb-12 px-4 flex flex-col items-center justify-center bg-stone-50 relative overflow-x-hidden">
      <HomeSlider />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-12 relative z-10"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-full text-[11px] font-black uppercase tracking-wider mb-2 shadow-lg shadow-rose-200">
            <Sparkles className="w-3.5 h-3.5" />
            Community in crescita
          </div>

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

        <div className="flex flex-col gap-4 pt-4 px-4">
          <Link to="/register" className="bg-rose-600 text-white text-lg py-5 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-rose-200 hover:scale-[1.02] active:scale-95 transition-all">
            Inizia Ora <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/bacheca" className="bg-white text-stone-900 text-sm py-4 rounded-[20px] font-bold border border-stone-100 flex items-center justify-center gap-2 shadow-xl shadow-stone-200 hover:bg-stone-50 transition-all">
              <Users className="w-4 h-4 text-rose-500" /> Esplora
            </Link>
            <Link to="/profile" className="bg-white text-stone-900 text-sm py-4 rounded-[20px] font-bold border border-stone-100 flex items-center justify-center gap-2 shadow-xl shadow-stone-200 hover:bg-stone-50 transition-all">
              <LayoutGrid className="w-4 h-4 text-rose-500" /> Profilo
            </Link>
          </div>
        </div>

        {/* Square Feature Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-12 pb-8">
          {[
            { icon: UserPlus, title: "Iscrizione", desc: "Semplice e Veloce", delay: 0.1, color: "rose", colSpan: false },
            { icon: MessageSquare, title: "Messaggi", desc: "Sempre Illimitati", delay: 0.2, color: "emerald", colSpan: false },
            { icon: Sparkles, title: "Matching", desc: "Smart & Intelligente", delay: 0.3, color: "rose", colSpan: true }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: feature.delay }}
              whileHover={{ y: -8, rotateX: 4, rotateY: 2, scale: 1.02 }}
              className={cn(
                "aspect-square rounded-[40px] bg-white border border-stone-100 shadow-[0_20px_45px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center gap-4 group p-8 text-center select-none cursor-pointer relative overflow-hidden perspective-1000",
                feature.colSpan ? "col-span-2 aspect-[auto] py-10" : ""
              )}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div
                className={cn(
                  "w-20 h-20 rounded-[28px] flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 shadow-lg",
                  feature.color === 'rose' ? "bg-rose-50 text-rose-600 shadow-rose-100" : "bg-emerald-50 text-emerald-600 shadow-emerald-100"
                )}
                style={{ transform: 'translateZ(20px)' }}
              >
                <feature.icon className="w-10 h-10" />
              </div>
              <div className="space-y-1" style={{ transform: 'translateZ(10px)' }}>
                <h3 className="text-[13px] font-black text-stone-900 uppercase tracking-[0.15em]">{feature.title}</h3>
                <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{feature.desc}</p>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <feature.icon className="w-24 h-24" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Simulated Bacheca Preview */}
        <div className="pt-16 space-y-6">
          <div className="flex justify-between items-end px-2">
            <div className="text-left">
              <h2 className="text-xl font-serif font-bold text-stone-900">Anteprima Bacheca</h2>
              <p className="text-stone-500 text-[10px] uppercase tracking-widest">Scopri chi è già con noi</p>
            </div>
            <button className="text-rose-600 text-xs font-bold flex items-center gap-1">
              Vedi il tutorial <PlayCircle className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {simulatedProfiles.map((p, i) => (
              <div key={i} className="block cursor-default">
                <div className="group relative overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-sm transition-all duration-300 flex flex-col h-full">
                  <div className="aspect-[3/4.5] overflow-hidden relative shrink-0">
                    <img src={p.img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  </div>
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between relative z-10">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-black text-stone-900 truncate pr-2">
                          {p.name}, {p.age}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                          <MapPin className="w-3 h-3 text-rose-500" />
                        </div>
                        <span className="text-xs font-bold text-stone-600 truncate">{p.city}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 border-t border-stone-100 pt-3">
                      <div className="flex gap-2">
                        <button onClick={(e) => handleSimulatedInteract(e, i, 'likes')} className="w-9 h-9 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-200 hover:bg-emerald-100 transition-colors">
                          <ThumbsUp className="w-4 h-4 fill-current" />
                          <span className="ml-1 text-[10px] font-bold">{p.likes}</span>
                        </button>
                        <button onClick={(e) => handleSimulatedInteract(e, i, 'hearts')} className="w-9 h-9 bg-rose-50 text-rose-400 rounded-xl flex items-center justify-center border border-rose-100 hover:bg-rose-100 transition-colors">
                          <Heart className="w-4 h-4 fill-current" />
                          <span className="ml-1 text-[10px] font-bold">{p.hearts}</span>
                        </button>
                      </div>
                      <button className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-100 hover:scale-110 active:scale-95 transition-all">
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-stone-400 text-[10px] italic">Anteprima simulata a scopo illustrativo</p>
        </div>
      </motion.div>
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
          likes_count:interactions!to_user_id(count),
          hearts_count:interactions!to_user_id(count)
        `)
        .eq('id', id)
        .single();

      if (error) console.error("ProfileDetail fetch error:", error);

      if (userProfile && !error) {
        // Post-process counts from aliases if needed, or handle them as objects
        const profileWithCounts = {
          ...userProfile,
          likes_count: (userProfile as any).likes_count?.[0]?.count || 0,
          hearts_count: (userProfile as any).hearts_count?.[0]?.count || 0
        };
        setProfile(profileWithCounts);
      } else {
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
    };

    fetchProfile();
    fetchStatus();
  }, [id]);

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
        likes_count:interactions!to_user_id(count),
        hearts_count:interactions!to_user_id(count)
      `)
      .eq('id', id)
      .single();

    if (updatedProfile) {
      setProfile({
        ...updatedProfile,
        likes_count: (updatedProfile as any).likes_count?.[0]?.count || 0,
        hearts_count: (updatedProfile as any).hearts_count?.[0]?.count || 0
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

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="relative h-[60vh] w-full max-w-md mx-auto overflow-hidden">
        <img
          src={(profile.photos && profile.photos.length > 0) ? profile.photos[0] : (profile.photo_url || `https://picsum.photos/seed/${profile.name}/600/800`)}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          alt={profile.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent" />

        <div className="absolute top-6 left-6 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all border border-white/30 shadow-lg"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>

          <button
            onClick={() => navigate('/bacheca')}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all border border-white/30 shadow-lg"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute top-6 right-6">
          {profile.is_online ? (
            <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-stone-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-500/30">
              <div className="w-2 h-2 bg-stone-400 rounded-full" />
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-wider">Offline</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-8 right-8 text-white">
          <div className="flex items-center gap-2 mb-2">
            {!!profile.is_paid && (
              <span className="bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Premium
              </span>
            )}
            <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {profile.gender}
            </span>
          </div>
          <h1 className="text-4xl font-serif font-bold">{profile.name}{calculateAge(profile.dob) > 0 ? `, ${calculateAge(profile.dob)}` : ""}</h1>
          <p className="flex items-center gap-1 opacity-80 text-sm mt-1"><MapPin className="w-4 h-4" /> {profile.city}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto -mt-6 relative z-10 bg-stone-50 rounded-t-[32px] px-8 pt-10 space-y-8">
        <div className="flex justify-around items-center py-2">
          <button
            onClick={() => handleInteract('like')}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={cn(
              "w-14 h-14 border rounded-2xl flex items-center justify-center transition-all shadow-sm",
              userInteractions.includes('like') ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-white border-stone-200 text-stone-400 group-hover:text-emerald-500 group-hover:border-emerald-200"
            )}>
              <ThumbsUp className={cn("w-6 h-6", userInteractions.includes('like') && "fill-current")} />
            </div>
            <span className={cn("text-[10px] font-bold", userInteractions.includes('like') ? "text-emerald-600" : "text-stone-400 group-hover:text-emerald-600")}>
              {profile.likes_count || 0} Like
            </span>
          </button>

          <button
            onClick={() => handleInteract('heart')}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={cn(
              "w-16 h-16 border rounded-full flex items-center justify-center transition-all shadow-md",
              userInteractions.includes('heart') ? "bg-rose-100 border-rose-200 text-rose-600 scale-110" : "bg-rose-50 border-rose-100 text-rose-600 group-hover:scale-110"
            )}>
              <Heart className={cn("w-8 h-8", userInteractions.includes('heart') && "fill-current")} />
            </div>
            <span className={cn("text-[10px] font-bold", userInteractions.includes('heart') ? "text-rose-700" : "text-rose-600")}>
              {profile.hearts_count || 0} Cuori
            </span>
          </button>

          <button
            onClick={handleInstantChat}
            className="flex flex-col items-center gap-1 group relative"
          >
            <div className={cn(
              "w-14 h-14 border rounded-2xl flex items-center justify-center transition-all shadow-sm relative",
              chatStatus === 'approved' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                chatStatus === 'pending' ? "bg-amber-50 border-amber-100 text-amber-600" :
                  "bg-white border-stone-200 text-stone-400 group-hover:text-blue-500 group-hover:border-blue-200"
            )}>
              <MessageSquare className="w-6 h-6" />
              {/* Online indicator dot for chat icon */}
              <div className={cn(
                "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm",
                profile.is_online ? "bg-emerald-500" : "bg-rose-500"
              )} />
            </div>
            <span className={cn(
              "text-[10px] font-bold",
              chatStatus === 'approved' ? "text-emerald-600" :
                chatStatus === 'pending' ? "text-amber-600" :
                  "text-stone-400 group-hover:text-blue-600"
            )}>
              {chatStatus === 'approved' ? 'Chat Attiva' : chatStatus === 'pending' ? 'In Attesa' : 'Chat'}
            </span>
          </button>
        </div>


        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-stone-900">Compatibilità</h2>
            {currentUser && (
              <span className="text-xs font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border border-rose-100">
                Calcolo Intelligente
              </span>
            )}
          </div>
          <div className="bg-white border border-stone-100 rounded-[32px] p-6 shadow-sm overflow-hidden relative">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-stone-100" />
                  <circle
                    cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent"
                    strokeDasharray={276}
                    strokeDashoffset={276 - (276 * calculateMatchScore(currentUser, profile)) / 100}
                    strokeLinecap="round"
                    className="text-rose-600 transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-stone-900 leading-none">{calculateMatchScore(currentUser, profile)}%</span>
                  <span className="text-[8px] font-bold text-stone-400 uppercase tracking-tighter">Affinità</span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-stone-800">Cosa vi unisce:</h3>
                <ul className="space-y-1.5">
                  {(() => {
                    const h1 = (profile.hobbies || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
                    const h2 = (currentUser?.hobbies || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
                    const common = h1.filter((h: string) => h2.includes(h)).slice(0, 2);

                    if (common.length > 0) {
                      return common.map((h, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px] text-stone-500">
                          <CheckCircle className="w-3 h-3 text-emerald-500" /> Passione comune per {h}
                        </li>
                      ));
                    } else {
                      return (
                        <li className="flex items-center gap-2 text-[11px] text-stone-500 italic">
                          Scoprite i vostri interessi parlando in chat!
                        </li>
                      );
                    }
                  })()}
                  {currentUser && profile && currentUser.city === profile.city && (
                    <li className="flex items-center gap-2 text-[11px] text-stone-500">
                      <CheckCircle className="w-3 h-3 text-emerald-500" /> Abitate nella stessa città
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {!currentUser && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                <div className="space-y-2">
                  <Sparkles className="w-6 h-6 text-rose-500 mx-auto" />
                  <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest leading-tight">
                    Iscriviti per calcolare<br />la tua affinità reale!
                  </p>
                  <button onClick={() => navigate('/register')} className="text-[10px] font-black text-rose-600 underline">Crea Profilo Gratis</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-stone-900">Bio</h2>
          <p className="text-stone-600 leading-relaxed text-sm italic">
            "{profile.description || 'Nessuna descrizione fornita.'}"
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-stone-100 rounded-2xl shadow-sm">
            <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Lavoro</p>
            <p className="text-sm font-medium text-stone-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-rose-500" /> {profile.job || 'Privato'}
            </p>
          </div>
          <div className="p-4 bg-white border border-stone-100 rounded-2xl shadow-sm">
            <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Orientamento</p>
            <p className="text-sm font-medium text-stone-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-500" /> {profile.orientation}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-stone-900">Interessi</h2>
          <div className="flex flex-wrap gap-2">
            {(profile.hobbies || '').split(',').map((h, i) => h.trim() && (
              <span key={i} className="px-3 py-1 bg-stone-200 text-stone-700 rounded-full text-xs font-medium">
                {h.trim()}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-stone-900">Cosa Cerca</h2>
          <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white shrink-0">
                <Search className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-stone-800">Preferenza: {profile.looking_for_gender}</p>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {profile.looking_for_other || 'In cerca di una connessione autentica e momenti speciali.'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-stone-900">Galleria</h2>
          <div className="grid grid-cols-2 gap-2">
            {profile.photos?.map((url, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-stone-200">
                <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100">
          <FeedComponent userId={profile.id} isOwner={false} />
        </div>

        <div className="pt-6 space-y-4 text-center">
          {chatStatus !== 'pending' && (
            <div className="p-4 bg-rose-600 text-white rounded-[32px] shadow-xl shadow-rose-200 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest">Incrocio dati intelligente</p>
              <h3 className="text-2xl font-serif font-bold">{chatStatus === 'approved' ? 'Chat Attiva' : 'Invia un Messaggio'}</h3>
              <p className="text-xs text-rose-100 px-4 leading-relaxed">
                {chatStatus === 'approved'
                  ? "Siete compatibili! Potete parlare liberamente."
                  : (currentUser && profile) ? `Siete compatibili al ${calculateMatchScore(currentUser, profile)}%. Non lasciarti scappare questa occasione!` : "Scopri il tuo livello di affinità iscrivendoti oggi!"}
              </p>
              <button
                onClick={handleOpenMessageModal}
                className="w-full bg-white text-rose-600 py-4 rounded-2xl text-base font-black uppercase tracking-tighter shadow-lg hover:bg-stone-50 transition-all flex items-center justify-center gap-3"
              >
                <MessageSquare className="w-5 h-5 fill-current" />
                {chatStatus === 'approved' ? 'Apri Chat' : 'Inizia Conversazione'}
              </button>
            </div>
          )}

          {chatStatus === 'pending' && (
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[32px] text-center space-y-2">
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-emerald-800 font-black uppercase text-[10px] tracking-widest">Richiesta Inviata</p>
              <p className="text-emerald-600/70 text-xs font-medium italic">Il tuo messaggio è in attesa di essere letto.</p>
            </div>
          )}

          <button
            onClick={() => navigate('/bacheca')}
            className="w-full py-4 text-stone-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-stone-600 transition-all uppercase tracking-widest"
          >
            <ChevronRight className="w-3 h-3 rotate-180" /> Esci dal Profilo
          </button>
        </div>
      </div>

      {/* Message Modal */}
      <AnimatePresence>
        {isMessageModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMessageModalOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-serif font-bold text-stone-900">Invia Messaggio</h3>
                <p className="text-stone-500 text-xs">Scrivi qualcosa a {profile.name} per iniziare.</p>
              </div>

              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Ciao! Mi piacerebbe conoscerti..."
                className="w-full h-32 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all resize-none font-medium text-stone-800"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setIsMessageModalOpen(false)}
                  className="flex-1 py-4 text-stone-400 text-xs font-black uppercase tracking-widest hover:text-stone-600 transition-all font-serif"
                >
                  Annulla
                </button>
                <button
                  onClick={sendChatMessage}
                  disabled={!messageText.trim()}
                  className="flex-1 bg-rose-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-rose-200 disabled:opacity-50 disabled:shadow-none hover:bg-rose-700 transition-all active:scale-95"
                >
                  Invia Ora
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BachecaPage = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGender, setFilterGender] = useState<string>('Tutti');
  const [filterOrientation, setFilterOrientation] = useState<string>('Tutti');
  const [filterCity, setFilterCity] = useState<string>('Tutte');
  const [filterBodyType, setFilterBodyType] = useState<string>('Tutte');
  const [filterAge, setFilterAge] = useState<[number, number]>([18, 99]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        likes_count:interactions!to_user_id(count),
        hearts_count:interactions!to_user_id(count)
      `);

    if (data && !error) {
      // Map counts from nested objects
      const processed = data.map(u => ({
        ...u,
        likes_count: (u as any).likes_count?.[0]?.count || 0,
        hearts_count: (u as any).hearts_count?.[0]?.count || 0
      }));
      setProfiles(processed);
    }
    setLoading(false);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        if (user.looking_for_gender) {
          setFilterGender(user.looking_for_gender);
        }
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
    }
    fetchProfiles();

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
    const cities = profiles.map(p => p.city);
    return ['Tutte', ...Array.from(new Set(cities))].sort();
  }, [profiles]);

  const filteredProfiles = profiles.filter(p => {
    // 1. Basic UI Filters
    const genderMatch = filterGender === 'Tutti' || p.gender === filterGender;
    const orientationMatch = filterOrientation === 'Tutti' || p.orientation === filterOrientation;
    const cityMatch = filterCity === 'Tutte' || p.city === filterCity;
    const bodyTypeMatch = filterBodyType === 'Tutte' || p.body_type === filterBodyType;
    const age = calculateAge(p.dob);
    const ageMatch = age >= filterAge[0] && age <= filterAge[1];

    if (!genderMatch || !orientationMatch || !cityMatch || !ageMatch || !bodyTypeMatch) return false;

    // 2. Strict Reciprocal Matching (if user is logged in)
    if (currentUser) {
      if (p.id === currentUser.id) return false;

      // Logic: I must match their preference AND they must match mine
      const isOpposite = (g1: string, g2: string) => (g1 === 'Uomo' && g2 === 'Donna') || (g1 === 'Donna' && g2 === 'Uomo');
      const isSame = (g1: string, g2: string) => (g1 === 'Uomo' && g2 === 'Uomo') || (g1 === 'Donna' && g2 === 'Donna');

      // Does the PROFILE want the VIEWER?
      let profileWantsViewer = true;
      if (p.orientation === 'Eterosessuale' && !isOpposite(p.gender, currentUser.gender)) profileWantsViewer = false;
      if (p.orientation === 'Gay' && (currentUser.gender !== 'Uomo' || p.gender !== 'Uomo')) profileWantsViewer = false;
      if (p.orientation === 'Lesbica' && (currentUser.gender !== 'Donna' || p.gender !== 'Donna')) profileWantsViewer = false;
      // If profile has specific gender preference, check it
      if (p.looking_for_gender && p.looking_for_gender !== 'Tutti' && p.looking_for_gender !== currentUser.gender) {
        profileWantsViewer = false;
      }

      // Does the VIEWER want the PROFILE?
      let viewerWantsProfile = true;
      if (currentUser.orientation === 'Eterosessuale' && !isOpposite(currentUser.gender, p.gender)) viewerWantsProfile = false;
      if (currentUser.orientation === 'Gay' && (p.gender !== 'Uomo' || currentUser.gender !== 'Uomo')) viewerWantsProfile = false;
      if (currentUser.orientation === 'Lesbica' && (p.gender !== 'Donna' || currentUser.gender !== 'Donna')) viewerWantsProfile = false;
      // Filter based on what the viewer is looking for (permanent filter)
      if (currentUser.looking_for_gender && currentUser.looking_for_gender !== 'Tutti' && currentUser.looking_for_gender !== p.gender) {
        viewerWantsProfile = false;
      }

      return profileWantsViewer && viewerWantsProfile;
    }

    return true;
  });

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-stone-50">
      <div className="max-w-md mx-auto space-y-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="w-10 h-10 bg-white border border-stone-200 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-all shadow-sm"
              >
                <Home className="w-5 h-5" />
              </Link>
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900">Bacheca</h2>
                <p className="text-stone-500 text-[10px] uppercase tracking-widest">Scopri nuovi profili</p>
              </div>
            </div>
          </div>

          {!currentUser ? (
            <>
              <div className="overflow-x-auto pb-2 -mx-4 px-4">
                <div className="flex gap-2 min-w-max items-center">
                  <div className="w-9 h-9 flex items-center justify-center text-stone-400 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  {['Tutti', ...genderOptions].map(g => (
                    <button
                      key={g}
                      onClick={() => setFilterGender(g)}
                      className={cn(
                        "px-5 py-2 rounded-full text-xs font-bold transition-all border shrink-0",
                        filterGender === g
                          ? "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100"
                          : "bg-white text-stone-600 border-stone-200 shadow-sm"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto pb-2 -mx-4 px-4">
                <div className="flex gap-2 min-w-max items-center">
                  <div className="w-9 h-9 flex items-center justify-center text-stone-400 shrink-0">
                    <Filter className="w-4 h-4" />
                  </div>
                  {['Tutti', ...orientationOptions].map(o => (
                    <button
                      key={o}
                      onClick={() => setFilterOrientation(o)}
                      className={cn(
                        "px-5 py-2 rounded-full text-xs font-bold transition-all border shrink-0",
                        filterOrientation === o
                          ? "bg-stone-800 text-white border-stone-800 shadow-lg shadow-stone-100"
                          : "bg-white text-stone-600 border-stone-200 shadow-sm"
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap gap-2">
                <div className="bg-rose-50 border border-rose-100 px-4 py-2 rounded-2xl flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-[11px] font-bold text-rose-700">Matching Attivo:</span>
                  <span className="text-[11px] text-rose-600 font-medium">
                    {currentUser.looking_for_gender} • {currentUser.orientation}
                  </span>
                </div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={cn(
                    "px-4 py-2 rounded-2xl flex items-center gap-2 transition-all border",
                    showAdvanced ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-200"
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Filtri Avanzati</span>
                </button>
              </div>

              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-stone-100 rounded-3xl p-5 shadow-sm space-y-5"
                >
                  {/* City Filter */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Città
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {cityOptions.map(c => (
                        <button
                          key={c}
                          onClick={() => setFilterCity(c)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border",
                            filterCity === c ? "bg-rose-600 text-white border-rose-600" : "bg-stone-50 text-stone-500 border-stone-100"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body Type Filter */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Corporatura
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Tutte', 'Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta'].map(b => (
                        <button
                          key={b}
                          onClick={() => setFilterBodyType(b)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border",
                            filterBodyType === b ? "bg-rose-600 text-white border-rose-600" : "bg-stone-50 text-stone-500 border-stone-100"
                          )}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age Filter */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> Età ({filterAge[0]} - {filterAge[1]})
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="18"
                        max="99"
                        value={filterAge[0]}
                        onChange={(e) => setFilterAge([parseInt(e.target.value), filterAge[1]])}
                        className="flex-1 accent-rose-600"
                      />
                      <input
                        type="range"
                        min="18"
                        max="99"
                        value={filterAge[1]}
                        onChange={(e) => setFilterAge([filterAge[0], parseInt(e.target.value)])}
                        className="flex-1 accent-rose-600"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </header>

        {currentUser?.is_paid && (
          <div className="bg-rose-600 text-white p-5 rounded-2xl flex flex-col gap-3 shadow-lg shadow-rose-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Matching Attivo</h3>
                <p className="text-rose-100 text-[11px]">Preferenza: {currentUser.looking_for_gender}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[3/4] bg-stone-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProfiles.map(profile => (
              <ProfileCard key={profile.id} profile={profile} onInteract={fetchProfiles} />
            ))}
          </div>
        )}

        {!loading && filteredProfiles.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Nessun risultato</h3>
            <p className="text-stone-500 text-xs">Prova a cambiare i filtri.</p>
          </div>
        )}
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
  const [step, setStep] = useState(1);
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    email: '',
    password: '',
    nickname: '',
    name: '',
    surname: '',
    dob: '',
    city: '',
    job: '',
    description: '',
    hobbies: '',
    desires: '',
    gender: 'Uomo',
    orientation: 'Eterosessuale',
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
    body_type: 'Normale',
    province: '',
    conosciamoci_meglio: {},
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const savedDraft = localStorage.getItem('soulmatch_reg_draft');
        if (savedDraft) {
          setFormData(JSON.parse(savedDraft));
          return;
        }

        const savedUserStr = localStorage.getItem('soulmatch_user');
        if (savedUserStr) {
          const user = JSON.parse(savedUserStr);
          if (user.id) {
            // Fetch fresh data from Supabase
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single();

            if (data && !error) {
              setFormData(prev => ({ ...prev, ...data }));
            } else if (typeof user.id === 'string' && user.id.length > 10) {
              // Probably already a UUID, just use it
              setFormData(prev => ({ ...prev, ...user }));
            }
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

  const handleNextToStep1 = () => {
    if (isLogin) {
      handleLogin();
      return;
    }
    if (!formData.email || !formData.password || !formData.nickname) {
      alert("Inserisci email, password e nickname per procedere.");
      return;
    }
    setStep(2);
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      alert("Inserisci email e password per accedere.");
      return;
    }
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        alert("Errore accesso: " + authError.message);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        localStorage.setItem('soulmatch_user', JSON.stringify(profile));
        window.dispatchEvent(new Event('user-auth-change'));
        navigate('/bacheca');
      } else {
        alert("Account creato, ma profilo incompleto. Completa i dati ora.");
        setIsLogin(false);
        setStep(2);
      }
    } catch (e) {
      alert("Errore di connessione.");
    }
  };

  const handleNextToStep2 = () => {
    const required = ['name', 'surname', 'dob', 'city', 'job', 'description'];
    const missing = required.filter(k => !formData[k as keyof UserProfile]);
    if (missing.length > 0) {
      alert("Per favore, completa tutti i campi del profilo per continuare.");
      return;
    }
    setStep(3);
  };

  const handleNextToStep3 = () => {
    if (!formData.looking_for_age_min || !formData.looking_for_age_max) {
      alert("Inserisci l'età minima e massima che cerchi in un partner.");
      return;
    }
    setStep(4);
  };

  const handleNextToStep4 = () => {
    setStep(5);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newPhotoUrls = files.map(file => URL.createObjectURL(file as File));
      setFormData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), ...newPhotoUrls].slice(0, 5)
      }));
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  const replacePhoto = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newUrl = URL.createObjectURL(e.target.files[0] as File);
      setFormData(prev => {
        const newPhotos = [...(prev.photos || [])];
        newPhotos[index] = newUrl;
        return { ...prev, photos: newPhotos };
      });
    }
  };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Simulate upload
      setFormData(prev => ({ ...prev, id_document_url: URL.createObjectURL(e.target.files![0] as File) }));
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
          alert("Errore durante la creazione account: " + authError.message);
          return;
        }

        if (!authData.user) {
          alert("Errore imprevisto durante la registrazione.");
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
        alert("Errore durante il salvataggio del profilo: " + error.message);
        return;
      }

      console.log("Supabase Success:", data);
      localStorage.setItem('soulmatch_user', JSON.stringify(data));
      localStorage.removeItem('soulmatch_reg_draft');
      window.dispatchEvent(new Event('user-auth-change'));

      setTimeout(() => {
        navigate('/bacheca');
      }, 100);
    } catch (err) {
      console.error("Process error:", err);
      alert("Errore di connessione o configurazione.");
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-stone-50 flex justify-center">
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
                {localStorage.getItem('soulmatch_user') ? 'Modifica Profilo' : 'Iscriviti'}
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
                  {!isLogin && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 ml-1">Nickname (Nome Utente)</label>
                      <input name="nickname" value={formData.nickname} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Mario90" />
                      <p className="text-[10px] text-stone-500 ml-1">Verrà usato per identificarti nella community.</p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <button onClick={handleNextToStep1} className="btn-primary w-full py-4 text-sm mt-2">
                    {isLogin ? 'Accedi' : 'Continua'}
                  </button>
                  <p className="text-center text-xs text-stone-500 font-medium">
                    {isLogin ? (
                      <>Non hai un account? <button onClick={() => setIsLogin(false)} className="text-rose-600 font-bold hover:underline">Iscriviti</button></>
                    ) : (
                      <>Hai già un account? <button onClick={() => setIsLogin(true)} className="text-rose-600 font-bold hover:underline">Accedi qui</button></>
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
                    <input name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Mario" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Cognome</label>
                    <input name="surname" value={formData.surname} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Rossi" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 ml-1">Nascita</label>
                  <input name="dob" type="date" value={formData.dob} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
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
                    <option value="Transgender">Transgender</option>
                    <option value="Genderfluid">Genderfluid</option>
                    <option value="Queer">Queer</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Orientamento Sessuale</label>
                    <select name="orientation" value={formData.orientation} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none">
                      <option value="Eterosessuale">Eterosessuale</option>
                      <option value="Gay">Gay</option>
                      <option value="Lesbica">Lesbica</option>
                      <option value="Bisessuale">Bisessuale</option>
                      <option value="Pansessuale">Pansessuale</option>
                      <option value="Queer">Queer</option>
                      <option value="Altro">Altro</option>
                    </select>
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
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 ml-1">Chi cerchi?</label>
                  <select name="looking_for_gender" value={formData.looking_for_gender} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none">
                    <option value="Tutti">Tutti</option>
                    <option value="Uomo">Uomo</option>
                    <option value="Donna">Donna</option>
                    <option value="Non-binario">Non-binario</option>
                    <option value="Transgender">Transgender</option>
                    <option value="Genderfluid">Genderfluid</option>
                    <option value="Queer">Queer</option>
                    <option value="Altro">Altro</option>
                  </select>
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
                    <label className="text-xs font-bold text-stone-700 ml-1">Altezza</label>
                    <input name="looking_for_height" value={formData.looking_for_height} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="175cm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Statura</label>
                    <input name="looking_for_body_type" value={formData.looking_for_body_type} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Atletica" />
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
                      <div className="text-stone-400">Nickname:</div> <div className="text-stone-900 font-medium">{formData.nickname}</div>
                    </div>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-3">
                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider">Dati Personali</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div className="text-stone-400">Nome:</div> <div className="text-stone-900 font-medium">{formData.name} {formData.surname}</div>
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
    </div>
  );
};

const FeedComponent = ({ userId, isOwner }: { userId: any, isOwner?: boolean }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostDesc, setNewPostDesc] = useState('');
  const [newPostPhotos, setNewPostPhotos] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

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
          likes_count:post_interactions!post_interactions_post_id_fkey(count),
          hearts_count:post_interactions!post_interactions_post_id_fkey(count)
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
          likes_count: p.likes_count?.[0]?.count || 0,
          hearts_count: p.hearts_count?.[0]?.count || 0,
          has_liked: viewerInteractions.some(i => i.post_id === p.id && i.type === 'like'),
          has_hearted: viewerInteractions.some(i => i.post_id === p.id && i.type === 'heart'),
        }));
        setPosts(processed);
      } else if (error) {
        console.error("Fetch posts error:", error);
      }
    } catch (e) {
      console.error("Fetch posts exception:", e);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).slice(0, 3 - newPostPhotos.length);
      const newUrls = files.map(f => URL.createObjectURL(f as File));
      setNewPostPhotos(prev => [...prev, ...newUrls].slice(0, 3));
    }
  };

  const submitPost = async () => {
    if (newPostPhotos.length === 0 && !newPostDesc) return;
    setIsPosting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          user_id: userId,
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
          className="bg-white p-6 rounded-[32px] shadow-xl border border-stone-100 flex flex-col gap-4 relative overflow-hidden"
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
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white rounded-[40px] overflow-hidden shadow-2xl border border-stone-50 group hover:shadow-rose-100/50 transition-shadow duration-500"
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
                <div className="w-full aspect-square overflow-x-auto snap-x snap-mandatory flex scrollbar-hide relative group/slider">
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

              <div className="p-6 space-y-5">
                <p className="text-base text-stone-800 leading-relaxed font-medium">
                  {post.description}
                </p>
                <div className="flex gap-6 items-center pt-2">
                  <button
                    onClick={() => toggleInteraction(post.id, 'like')}
                    className={cn(
                      "flex items-center gap-2.5 text-xs font-black tracking-widest uppercase transition-all",
                      post.has_liked ? "text-blue-500 scale-110" : "text-stone-300 hover:text-blue-400"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", post.has_liked ? "bg-blue-50" : "bg-stone-50")}>
                      <ThumbsUp className={cn("w-5 h-5", post.has_liked ? "fill-current" : "")} />
                    </div>
                    {post.likes_count}
                  </button>
                  <button
                    onClick={() => toggleInteraction(post.id, 'heart')}
                    className={cn(
                      "flex items-center gap-2.5 text-xs font-black tracking-widest uppercase transition-all",
                      post.has_hearted ? "text-rose-500 scale-110" : "text-stone-300 hover:text-rose-400"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", post.has_hearted ? "bg-rose-50" : "bg-stone-50")}>
                      <Heart className={cn("w-5 h-5", post.has_hearted ? "fill-current" : "")} />
                    </div>
                    {post.hearts_count}
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const navigate = useNavigate();

  const fetchData = async (userId: string) => {
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('users')
        .select(`
          *,
          likes_count:interactions!to_user_id(count),
          hearts_count:interactions!to_user_id(count)
        `)
        .eq('id', userId)
        .single();

      if (profileErr) {
        console.error("Profile fetch error:", profileErr);
      }

      if (profileData) {
        setUser({
          ...profileData,
          likes_count: (profileData as any).likes_count?.[0]?.count || 0,
          hearts_count: (profileData as any).hearts_count?.[0]?.count || 0
        });
      } else {
        console.warn("No profile found for ID:", userId);
        // Do not redirect immediately if it's a connection/schema issue
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
    const saved = localStorage.getItem('soulmatch_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) fetchData(parsed.id);
        else navigate('/register');
      } catch (e) { navigate('/register'); }
    } else navigate('/register');
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

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-24 px-6 relative overflow-x-hidden">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="max-w-md mx-auto space-y-12">
        {/* Header Stats Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[48px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] border border-stone-100 space-y-10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-50 rounded-full blur-[80px] -mr-16 -mt-16 opacity-70" />

          <div className="flex items-center gap-6 relative z-10">
            <div className="w-28 h-28 rounded-[38px] overflow-hidden border-4 border-white shadow-2xl rotate-3">
              <img
                src={(user.photos && user.photos.length > 0) ? user.photos[0] : (user.photo_url || `https://picsum.photos/seed/${user.name}/200`)}
                className="w-full h-full object-cover"
                alt={user.name}
              />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-black text-stone-900 leading-none mb-2">{user.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border",
                  user.is_paid ? "bg-rose-600 text-white border-rose-500" : "bg-white text-stone-400 border-stone-100"
                )}>
                  {user.is_paid ? 'Membro Premium' : 'Piano Base'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 relative z-10">
            {[
              { label: 'Like', val: user.likes_count || 0, icon: ThumbsUp, color: 'blue' },
              { label: 'Cuori', val: user.hearts_count || 0, icon: Heart, color: 'rose' },
              { label: 'Foto', val: user.photos?.length || 0, icon: Camera, color: 'emerald' },
              { label: 'Msg', val: 0, icon: MessageSquare, color: 'amber' }
            ].map((stat, i) => (
              <div key={i} className="bg-stone-50/40 backdrop-blur-sm p-4 rounded-[28px] text-center border border-white/50 shadow-inner flex flex-col items-center gap-2 group hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-1 transition-transform group-hover:scale-110",
                  stat.color === 'blue' ? "bg-blue-50 text-blue-500" :
                    stat.color === 'rose' ? "bg-rose-50 text-rose-500" :
                      stat.color === 'emerald' ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                )}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-stone-900 leading-none tracking-tighter">{stat.val}</p>
                <p className="text-stone-400 text-[8px] uppercase font-black tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Notification Center Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-stone-900 p-10 rounded-[56px] shadow-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(225,29,72,0.1),transparent)]" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-rose-600/10 rounded-full blur-[100px]" />

          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-black text-white flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                  <Bell className="w-6 h-6 text-rose-500" />
                </div>
                Notifiche
              </h2>
              {chatRequests.length > 0 && (
                <div className="flex flex-col items-end">
                  <span className="bg-rose-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-[0_0_30px_rgba(225,29,72,0.5)] animate-pulse">
                    {chatRequests.length} NUOVE
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-5 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
              {chatRequests.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-[40px] border border-dashed border-white/10">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-white/10" />
                  </div>
                  <p className="text-white/40 text-[14px] font-bold tracking-tight">Tutto tranquillo! Nessuna novità.</p>
                </div>
              ) : (
                chatRequests.map((req) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={req.id}
                    className="p-6 bg-white/5 rounded-[36px] border border-white/5 flex items-center justify-between gap-4 group/item hover:bg-white/10 transition-all duration-500 hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-[24px] overflow-hidden border-2 border-white/10 ring-4 ring-white/5 shadow-2xl transition-transform group-hover/item:rotate-3">
                        <img src={req.photo_url || `https://picsum.photos/seed/${req.from_user_id}/100`} className="w-full h-full object-cover" />
                      </div>
                      <div className="max-w-[140px]">
                        <h4 className="text-base font-black text-white leading-tight mb-1">{req.name}</h4>
                        <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.1em] opacity-80">
                          {req.message?.slice(0, 25) || "Ti ha notato!"}...
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleRequestAction(req.id, 'approved')} className="w-12 h-12 bg-rose-600 text-white rounded-[20px] flex items-center justify-center hover:bg-rose-500 transition-all active:scale-90 shadow-xl shadow-rose-900/60">
                        <Heart className="w-6 h-6 fill-current" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Feed Section */}
        <div className="pt-4">
          <FeedComponent userId={user.id} isOwner={true} />
        </div>

        {/* Action Buttons Box */}
        <div className="bg-white p-10 rounded-[56px] shadow-2xl border border-stone-100 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <button onClick={() => navigate('/register')} className="flex-1 bg-stone-50 text-stone-900 py-6 rounded-[32px] text-[12px] font-black uppercase tracking-[0.2em] hover:bg-stone-100 transition-all flex items-center justify-center gap-3 active:scale-95 border border-stone-200">
              <Settings2 className="w-5 h-5 text-rose-600" /> Profilo
            </button>
            <button onClick={() => navigate('/')} className="flex-1 bg-stone-900 text-white py-6 rounded-[32px] text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-stone-400 hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95">
              <Home className="w-5 h-5" /> Home
            </button>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('soulmatch_user');
              window.dispatchEvent(new Event('user-auth-change'));
              navigate('/');
            }}
            className="w-full py-4 text-[10px] text-rose-600 font-black uppercase tracking-[0.5em] opacity-20 hover:opacity-100 transition-all mt-4 hover:tracking-[0.6em] duration-500"
          >
            Esci dall'Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <BackgroundDecorations />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bacheca" element={<BachecaPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile-detail/:id" element={<ProfileDetailPage />} />
      </Routes>
    </Router>
  );
}
