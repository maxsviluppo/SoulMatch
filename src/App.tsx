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
  Image as ImageIcon
} from 'lucide-react';
import { cn, calculateAge, calculateMatchScore } from './utils';
import { UserProfile, ChatRequest, Post } from './types';

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
  const [randomData, setRandomData] = useState<{ icon: string, pos: string, rot: string } | null>(null);

  useEffect(() => {
    const icons = ['venus', 'mars', 'heart'];
    const positions = [
      '-top-32 -left-32 w-[60rem] h-[60rem]',
      'top-[20%] -right-48 w-[55rem] h-[55rem]',
      '-bottom-48 -left-24 w-[50rem] h-[50rem]',
      'bottom-[10%] -right-32 w-[45rem] h-[45rem]'
    ];
    const rotations = ['rotate-12', '-rotate-12', 'rotate-45', '-rotate-45', 'rotate-[30deg]'];

    setRandomData({
      icon: icons[Math.floor(Math.random() * icons.length)],
      pos: positions[Math.floor(Math.random() * positions.length)],
      rot: rotations[Math.floor(Math.random() * rotations.length)]
    });
  }, [location.pathname]);

  if (!randomData) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] select-none">
      {randomData.icon === 'venus' && <Venus className={cn("absolute text-[#FFF9E5] opacity-20", randomData.pos, randomData.rot)} />}
      {randomData.icon === 'mars' && <Mars className={cn("absolute text-[#FFF9E5] opacity-20", randomData.pos, randomData.rot)} />}
      {randomData.icon === 'heart' && <Heart className={cn("absolute text-[#FFF9E5] opacity-20", randomData.pos, randomData.rot)} />}
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
                {profile.name}, {calculateAge(profile.dob)}
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
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-stone-900 transition-colors shadow-md shadow-rose-100 flex items-center gap-1.5"
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

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-rose-50 via-stone-50 to-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center space-y-6"
      >
        {/* ... existing content ... */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3" />
          Community in crescita
        </div>

        <h1 className="text-4xl font-serif font-bold leading-tight tracking-tight text-stone-900">
          Trova la tua <span className="text-rose-600 italic">compagnia</span> ideale.
        </h1>

        <p className="text-stone-500 text-[10px] font-medium uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          Membri Certificati e Sicurezza Garantita
        </p>

        <p className="text-base text-stone-600 leading-relaxed px-2">
          SoulMatch è il luogo sicuro dove incontrare persone reali. Ogni profilo è verificato manualmente per la tua sicurezza.
        </p>

        <div className="flex flex-col gap-3 pt-4 px-4">
          <Link to="/register" className="btn-primary text-base py-4 flex items-center justify-center gap-2">
            Inizia Ora <ChevronRight className="w-4 h-4" />
          </Link>
          <Link to="/bacheca" className="btn-secondary text-base py-4 flex items-center justify-center gap-2">
            Esplora Bacheca <Users className="w-4 h-4" />
          </Link>
          <Link to="/profile" className="btn-secondary text-base py-4 flex items-center justify-center gap-2">
            La Mia Bacheca <LayoutGrid className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-12">
          {[
            { icon: UserPlus, title: "Iscrizione Semplice", desc: "Crea il tuo profilo in pochi minuti." },
            { icon: MessageSquare, title: "Messaggi Illimitati", desc: "Per gli utenti Premium." },
            { icon: Sparkles, title: "Matching Smart", desc: "Filtri basati sulle tue preferenze." }
          ].map((feature, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-stone-100 shadow-sm text-left flex items-center gap-4">
              <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                <feature.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">{feature.title}</h3>
                <p className="text-stone-500 text-xs leading-relaxed">{feature.desc}</p>
              </div>
            </div>
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
                      <button className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Match
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

  const fetchInteractionState = (currentUserId: number) => {
    fetch(`/api/interactions/${currentUserId}/${id}`)
      .then(res => res.json())
      .then(data => setUserInteractions(data));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    let currentUserId: number | null = null;
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        currentUserId = user.id;
      }
    } catch (e) { }

    fetch(`/api/profiles/${id}`)
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    if (currentUserId && id) {
      fetch(`/api/chat-status/${currentUserId}/${id}`)
        .then(res => res.json())
        .then(data => setChatStatus(data.status));
      fetchInteractionState(currentUserId);
    }
  }, [id]);

  const handleInteract = async (type: 'like' | 'heart') => {
    if (!currentUser?.id) {
      setToast({ message: "Devi essere iscritto per interagire!", type: 'error' });
      return;
    }
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_user_id: currentUser.id, to_user_id: profile?.id, type })
    });

    const res = await fetch(`/api/profiles/${id}`);
    const data = await res.json();
    setProfile(data);
    fetchInteractionState(currentUser.id);

    const isRemoving = userInteractions.includes(type);
    setToast({
      message: isRemoving ? "Interazione rimossa." : (type === 'like' ? "Like inviato!" : "Cuore inviato!"),
      type: isRemoving ? 'info' : 'success'
    });
  };

  const handleChatRequest = async () => {
    if (!currentUser?.id) {
      setToast({ message: "Devi essere iscritto!", type: 'error' });
      return;
    }
    if (!currentUser.is_paid) {
      setToast({ message: "Funzione riservata agli utenti Premium!", type: 'info' });
      return;
    }
    if (chatStatus === 'none' || chatStatus === 'rejected') {
      setIsMessageModalOpen(true);
    } else if (chatStatus === 'approved') {
      setToast({ message: "Chat già attiva!", type: 'success' });
    } else {
      setToast({ message: "Richiesta già in attesa", type: 'info' });
    }
  };

  const sendChatMessage = async () => {
    if (!messageText.trim()) return;
    const res = await fetch('/api/chat-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_user_id: currentUser!.id, to_user_id: profile?.id, message: messageText })
    });
    const data = await res.json();
    if (res.ok) {
      setChatStatus('pending');
      setToast({ message: "Messaggio inviato!", type: 'success' });
      setIsMessageModalOpen(false);
      setMessageText('');
    } else {
      setToast({ message: data.error || "Errore", type: 'error' });
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
            {profile.is_paid && (
              <span className="bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Premium
              </span>
            )}
            <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {profile.gender}
            </span>
          </div>
          <h1 className="text-4xl font-serif font-bold">{profile.name}, {calculateAge(profile.dob)}</h1>
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
            onClick={handleChatRequest}
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
          <div className="p-4 bg-rose-600 text-white rounded-[32px] shadow-xl shadow-rose-200 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest">Incrocio dati intelligente</p>
            <h3 className="text-2xl font-serif font-bold">Invia un Messaggio</h3>
            <p className="text-xs text-rose-100 px-4 leading-relaxed">
              {(currentUser && profile) ? `Siete compatibili al ${calculateMatchScore(currentUser, profile)}%. Non lasciarti scappare questa occasione!` : "Scopri il tuo livello di affinità iscrivendoti oggi!"}
            </p>
            <button
              onClick={handleChatRequest}
              className="w-full bg-white text-rose-600 py-4 rounded-2xl text-base font-black uppercase tracking-tighter shadow-lg hover:bg-stone-50 transition-all flex items-center justify-center gap-3"
            >
              <MessageSquare className="w-5 h-5 fill-current" />
              {chatStatus === 'approved' ? 'Apri Chat' : chatStatus === 'pending' ? 'Richiesta Inviata' : 'Inizia Conversazione'}
            </button>
          </div>

          <button
            onClick={() => navigate('/bacheca')}
            className="w-full py-4 text-stone-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-stone-600 transition-all uppercase tracking-widest"
          >
            <ChevronRight className="w-3 h-3 rotate-180" /> Esci dal Profilo
          </button>
        </div>
      </div>
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

  const fetchProfiles = () => {
    fetch('/api/profiles')
      .then(res => res.json())
      .then(data => {
        setProfiles(data);
        setLoading(false);
      });
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

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<UserProfile>({
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
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          setFormData(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch (e) { }
  }, []);

  const handleNextToStep2 = () => {
    if (!formData.name || !formData.surname || !formData.dob || !formData.city || !formData.job || !formData.description) {
      alert("Compila tutti i campi obbligatori del primo step (Nome, Cognome, Nascita, Città, Lavoro, Descrizione) per proseguire.");
      return;
    }
    setStep(2);
  };

  const handleNextToStep3 = () => {
    if (!formData.looking_for_age_min || !formData.looking_for_age_max) {
      alert("Inserisci l'età minima e massima che cerchi in un partner.");
      return;
    }
    setStep(3);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).slice(0, 5);
      // In a real app, we'd upload these to a server and get URLs back.
      // For this demo, we'll create object URLs to show preview.
      const newPhotoUrls = files.map(file => URL.createObjectURL(file as File));
      setFormData(prev => ({ ...prev, photos: [...(prev.photos || []), ...newPhotoUrls].slice(0, 5) }));
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
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      localStorage.setItem('soulmatch_user', JSON.stringify(data));
      window.dispatchEvent(new Event('user-auth-change'));
      navigate('/bacheca');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-stone-50 flex justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-serif font-bold text-stone-900">Iscriviti</h1>
            <p className="text-stone-500 text-xs">Step {step} di 5</p>
          </div>
          <div className="flex gap-1.5 pb-1">
            {[1, 2, 3, 4, 5].map(i => (
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
                      <div key={i} className="aspect-square rounded-lg overflow-hidden border border-stone-200 relative">
                        <img src={url} className="w-full h-full object-cover" />
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
                    Carica un documento per la sicurezza della community. La tua richiesta sarà valutata dall'amministrazione.
                  </p>
                  <label className={cn(
                    "w-full p-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors",
                    formData.id_document_url ? "border-emerald-200 bg-emerald-50" : "border-stone-200 hover:bg-stone-100"
                  )}>
                    {formData.id_document_url ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-700">Documento Caricato</span>
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

                <button onClick={handleNextToStep2} className="btn-primary w-full py-4 text-sm mt-2">Continua</button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div className="p-3 bg-rose-50 rounded-xl flex gap-2 items-start border border-rose-100">
                  <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-800 leading-tight">Questi dati servono per il matching intelligente Premium.</p>
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
                  <textarea name="looking_for_other" value={formData.looking_for_other} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none h-24" placeholder="Descrivi il tuo partner ideale, che connessione cerchi, che momenti speciali vuoi condividere..." />
                  <p className="text-[10px] text-stone-500 ml-1 leading-tight">Questo testo sarà visibile sul tuo profilo sotto la voce "Cosa Cerca".</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                  <button onClick={handleNextToStep3} className="btn-primary flex-1 py-4 text-sm">Continua</button>
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
                <div className="p-3 bg-stone-50 rounded-xl flex gap-2 items-start border border-stone-200 text-center flex-col items-center">
                  <Sparkles className="w-5 h-5 text-rose-500 mb-1" />
                  <h3 className="text-sm font-bold text-stone-900">Conosciamoci Meglio (Opzionale)</h3>
                  <p className="text-[10px] text-stone-500 leading-tight block">Più dettagli fornisci, più il matching sarà preciso.</p>
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
                  <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                  <button onClick={() => setStep(4)} className="btn-primary flex-1 py-4 text-sm">Continua</button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
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
                  <button onClick={() => setStep(3)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                  <button onClick={() => setStep(5)} className="btn-primary flex-1 py-4 text-sm">Riepilogo</button>
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
                  <h3 className="text-xl font-bold text-stone-900">Riepilogo Dati</h3>
                  <p className="text-stone-500 text-[11px]">Controlla che tutto sia corretto.</p>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
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
                  <button onClick={() => setStep(4)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
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

const FeedComponent = ({ userId, isOwner }: { userId: number, isOwner?: boolean }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostDesc, setNewPostDesc] = useState('');
  const [newPostPhotos, setNewPostPhotos] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const fetchPosts = async () => {
    try {
      const viewerId = localStorage.getItem('soulmatch_user') ? JSON.parse(localStorage.getItem('soulmatch_user')!).id : undefined;
      let url = viewerId ? `/api/users/${userId}/posts?user_id=${viewerId}` : `/api/users/${userId}/posts`;
      const res = await fetch(url);
      if (res.ok) {
        setPosts(await res.json());
      }
    } catch (e) { }
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
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          photos: newPostPhotos,
          description: newPostDesc
        })
      });
      if (res.ok) {
        setNewPostDesc('');
        setNewPostPhotos([]);
        fetchPosts();
      } else {
        const err = await res.json();
        alert(err.error || "Errore");
      }
    } catch (e) {
      alert("Errore");
    }
    setIsPosting(false);
  };

  const toggleInteraction = async (postId: number, type: 'like' | 'heart') => {
    try {
      const viewer = localStorage.getItem('soulmatch_user') ? JSON.parse(localStorage.getItem('soulmatch_user')!) : null;
      if (!viewer) {
        alert("Devi registrarti per interagire!");
        return;
      }
      const res = await fetch(`/api/posts/${postId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: viewer.id, type })
      });
      if (res.ok) fetchPosts();
    } catch (e) { }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
        <LayoutGrid className="w-5 h-5 text-rose-600" />
        {isOwner ? "La Mia Bacheca" : "Bacheca Feed"}
      </h2>

      {isOwner && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex flex-col gap-3">
          <textarea
            value={newPostDesc}
            onChange={(e) => setNewPostDesc(e.target.value)}
            placeholder="A cosa stai pensando oggi?"
            className="w-full text-sm outline-none resize-none bg-transparent placeholder:text-stone-400"
            rows={2}
          />

          {newPostPhotos.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
              {newPostPhotos.map((url, i) => (
                <div key={i} className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden relative border border-stone-200">
                  <img src={url} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setNewPostPhotos(p => p.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-stone-100 pt-3">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-stone-500 font-bold bg-stone-50 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                {newPostPhotos.length < 3 ? "Aggiungi Foto" : "Max 3 foto"}
                <input type="file" accept="image/*" multiple className="hidden" disabled={newPostPhotos.length >= 3} onChange={handlePhotoUpload} />
              </label>
            </div>
            <button
              onClick={submitPost}
              disabled={isPosting || (newPostPhotos.length === 0 && !newPostDesc)}
              className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider disabled:opacity-50 transition-all hover:bg-rose-700"
            >
              Pubblica
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {posts.length === 0 ? (
          <p className="text-center text-stone-400 text-xs py-8 italic border border-dashed border-stone-200 rounded-3xl">Nessun post da mostrare.</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">
              <div className="p-3 flex items-center gap-3">
                <img src={post.author_photo || `https://picsum.photos/seed/${post.author_name}/100`} className="w-8 h-8 rounded-full object-cover border border-stone-200" />
                <div>
                  <h4 className="text-xs font-bold text-stone-900">{post.author_name}</h4>
                  <p className="text-[10px] text-stone-400">{new Date(post.created_at).toLocaleDateString()} alle {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {post.photos.length > 0 && (
                <div className="w-full aspect-square overflow-x-auto snap-x snap-mandatory flex scrollbar-hide">
                  {post.photos.map((ph, i) => (
                    <div key={i} className="w-full h-full shrink-0 snap-center">
                      <img src={ph} className="w-full h-full object-cover" onContextMenu={(e) => e.preventDefault()} />
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 space-y-3">
                <p className="text-sm text-stone-800 leading-relaxed"><span className="font-bold text-xs">{post.author_name}</span> {post.description}</p>
                <div className="flex gap-4 items-center pt-2">
                  <button onClick={() => toggleInteraction(post.id, 'like')} className={cn("flex items-center gap-1.5 text-xs font-bold transition-colors", post.has_liked ? "text-blue-500" : "text-stone-400 hover:text-blue-400")}>
                    <ThumbsUp className={cn("w-5 h-5", post.has_liked ? "fill-current" : "")} />
                    {post.likes_count}
                  </button>
                  <button onClick={() => toggleInteraction(post.id, 'heart')} className={cn("flex items-center gap-1.5 text-xs font-bold transition-colors", post.has_hearted ? "text-rose-500" : "text-stone-400 hover:text-rose-400")}>
                    <Heart className={cn("w-5 h-5", post.has_hearted ? "fill-current" : "")} />
                    {post.hearts_count}
                  </button>
                </div>
              </div>
            </div>
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

  const fetchData = async (userId: number) => {
    try {
      const [profileRes, requestsRes] = await Promise.all([
        fetch(`/api/profiles/${userId}`),
        fetch(`/api/chat-requests/${userId}`)
      ]);
      const profileData = await profileRes.json();
      const requestsData = await requestsRes.json();
      setUser(profileData);
      setChatRequests(requestsData);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          fetchData(parsed.id);
        } else {
          setLoading(false);
          navigate('/register');
        }
      } else {
        setLoading(false);
        navigate('/register');
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      setLoading(false);
      navigate('/register');
    }
  }, [navigate]);

  const handleRequestAction = async (requestId: number, status: 'approved' | 'rejected') => {
    const res = await fetch(`/api/chat-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      setToast({
        message: status === 'approved' ? "Richiesta approvata!" : "Richiesta rifiutata.",
        type: status === 'approved' ? 'success' : 'info'
      });
      if (user?.id) fetchData(user.id);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-12 px-6">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="max-w-md mx-auto space-y-8">
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-lg space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-rose-100 bg-stone-100">
              <img
                src={(user.photos && user.photos.length > 0) ? user.photos[0] : (user.photo_url || `https://picsum.photos/seed/${user.name}/200`)}
                className="w-full h-full object-cover"
                alt={user.name}
              />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-900">{user.name} {user.surname}</h1>
              <p className="text-stone-500 text-xs">{user.is_paid ? 'Membro Premium' : 'Membro Base'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-50 p-3 rounded-2xl text-center">
              <p className="text-stone-400 text-[10px] uppercase font-bold">Like</p>
              <p className="text-xl font-bold text-stone-900">{user.likes_count || 0}</p>
            </div>
            <div className="bg-stone-50 p-3 rounded-2xl text-center">
              <p className="text-stone-400 text-[10px] uppercase font-bold">Cuori</p>
              <p className="text-xl font-bold text-stone-900">{user.hearts_count || 0}</p>
            </div>
            <div className="bg-stone-50 p-3 rounded-2xl text-center">
              <p className="text-stone-400 text-[10px] uppercase font-bold">Messaggi</p>
              <p className="text-xl font-bold text-stone-900">0</p>
            </div>
          </div>

        </div>

        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="text-sm font-bold text-stone-900 pb-2">Galleria</h3>
          {user.photos && user.photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {user.photos.map((url, i) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-stone-200">
                  <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-400 text-xs italic">Nessuna foto aggiunta.</p>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="text-sm font-bold text-stone-900 pb-2">I Tuoi Dati</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-stone-400">Città:</span> <span className="font-medium">{user.city}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Lavoro:</span> <span className="font-medium">{user.job || 'Non specificato'}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Genere:</span> <span className="font-medium">{user.gender}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Orientamento:</span> <span className="font-medium">{user.orientation}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Cerchi:</span> <span className="font-medium">{user.looking_for_gender}</span></div>
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <button onClick={() => navigate('/register')} className="btn-secondary w-full py-4 text-sm font-bold shadow-sm">Modifica Profilo</button>
          <button onClick={() => navigate('/')} className="btn-secondary w-full py-4 text-sm font-bold shadow-sm flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Torna in Home
          </button>
          <div className="pt-2 border-t border-stone-100 mt-2">
            <button
              onClick={() => {
                localStorage.removeItem('soulmatch_user');
                window.dispatchEvent(new Event('user-auth-change'));
                navigate('/');
              }}
              className="w-full py-2 text-[10px] text-rose-600 font-black uppercase tracking-[0.2em] opacity-60 hover:opacity-100 transition-all"
            >
              Disconnetti Account
            </button>
          </div>
        </div>
      </div>

      {chatRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-serif font-bold text-stone-900">Richieste di Chat</h3>
            <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{chatRequests.length}</span>
          </div>
          <div className="space-y-3">
            {chatRequests.map((req) => (
              <div key={req.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={req.photo_url} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <p className="text-sm font-bold text-stone-900">{req.name} {req.surname}</p>
                    <p className="text-[10px] text-stone-500">Ti ha inviato una richiesta</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequestAction(req.id, 'rejected')}
                    className="w-8 h-8 bg-stone-100 text-stone-500 rounded-lg flex items-center justify-center hover:bg-stone-200 transition-all"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRequestAction(req.id, 'approved')}
                    className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifiche Container */}
      <div className="bg-rose-600 text-white p-6 rounded-3xl shadow-lg shadow-rose-100 space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6" />
          <h3 className="text-lg font-bold">Centro Notifiche</h3>
        </div>
        <p className="text-rose-100 text-xs leading-relaxed">Qui potrai vedere chi ha visitato il tuo profilo e chi ti ha inviato un like o un cuore.</p>
        <div className="bg-white/10 p-4 rounded-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{chatRequests.length > 0 ? `Hai ${chatRequests.length} nuove richieste` : 'Nessuna nuova notifica'}</p>
        </div>
      </div>

      {/* Area Post/Feed Utente */}
      <FeedComponent userId={user.id} isOwner={true} />

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
        <Route path="/profile-detail/:id" element={<ProfileDetailPage />} />
      </Routes>
    </Router>
  );
}
