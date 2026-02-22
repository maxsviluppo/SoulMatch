import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
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
  ThumbsUp
} from 'lucide-react';
import { cn, calculateAge } from './utils';
import { UserProfile, ChatRequest } from './types';

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

const Navbar = () => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) setUser(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
    }
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
          <Link to="/profile" className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-600 hover:bg-rose-50 hover:text-rose-600 transition-all">
            <User className="w-5 h-5" />
          </Link>
        ) : (
          <Link to="/register" className="btn-primary py-2 text-sm">Iscriviti</Link>
        )}
      </div>
    </nav>
  );
};

const ProfileCard: React.FC<{ profile: UserProfile; onInteract?: () => void }> = ({ profile, onInteract }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch (e) {}
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

  return (
    <Link to={`/profile-detail/${profile.id}`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 h-full"
      >
        <div className="aspect-[3/4] overflow-hidden relative">
          <img 
            src={profile.photo_url} 
            alt={profile.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent opacity-60" />
          
          {profile.is_online && (
            <div className="absolute top-3 right-3 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
          )}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <h3 className="text-lg font-bold leading-tight">{profile.name}, {calculateAge(profile.dob)}</h3>
              <div className="flex items-center gap-1 text-[10px] opacity-90">
                <MapPin className="w-2.5 h-2.5" />
                {profile.city}
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <div className="flex gap-2">
                <button 
                  onClick={(e) => handleInteract(e, 'like')}
                  className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-white/40 transition-all"
                >
                  <ThumbsUp className="w-3 h-3" /> {profile.likes_count || 0}
                </button>
                <button 
                  onClick={(e) => handleInteract(e, 'heart')}
                  className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-rose-600 transition-all"
                >
                  <Heart className="w-3 h-3 fill-current" /> {profile.hearts_count || 0}
                </button>
              </div>
            </div>
          </div>
        </div>

        {profile.is_paid && (
          <div className="absolute top-3 left-3 bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
            <Sparkles className="w-2.5 h-2.5" /> Premium
          </div>
        )}
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
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
                  <img src={p.img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white text-left flex justify-between items-end">
                    <div>
                      <p className="text-sm font-bold leading-tight">{p.name}, {p.age}</p>
                      <p className="text-[10px] opacity-80 flex items-center gap-0.5"><MapPin className="w-2 h-2" /> {p.city}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="flex items-center gap-0.5 bg-white/20 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[8px] font-bold">
                        <ThumbsUp className="w-2.5 h-2.5" /> {p.likes}
                      </div>
                      <div className="flex items-center gap-0.5 bg-rose-600/80 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[8px] font-bold">
                        <Heart className="w-2.5 h-2.5 fill-current" /> {p.hearts}
                      </div>
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
    } catch (e) {}

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
    
    const res = await fetch('/api/chat-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_user_id: currentUser.id, to_user_id: profile?.id })
    });
    
    if (res.ok) {
      setChatStatus('pending');
      setToast({ message: "Richiesta di chat inviata!", type: 'success' });
    } else {
      setToast({ message: "Richiesta già inviata.", type: 'error' });
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
        <img src={profile.photo_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
            className="flex flex-col items-center gap-1 group"
          >
            <div className={cn(
              "w-14 h-14 border rounded-2xl flex items-center justify-center transition-all shadow-sm",
              chatStatus === 'approved' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
              chatStatus === 'pending' ? "bg-amber-50 border-amber-100 text-amber-600" :
              "bg-white border-stone-200 text-stone-400 group-hover:text-blue-500 group-hover:border-blue-200"
            )}>
              <MessageSquare className="w-6 h-6" />
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

        {profile.photos && profile.photos.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-stone-900">Galleria</h2>
            <div className="grid grid-cols-2 gap-2">
              {profile.photos.map((url, i) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-stone-200">
                  <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-6 space-y-3">
          <button 
            onClick={handleChatRequest}
            className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 shadow-xl shadow-rose-200"
          >
            <MessageSquare className="w-6 h-6" /> 
            {chatStatus === 'approved' ? 'Apri Chat' : chatStatus === 'pending' ? 'Richiesta Inviata' : 'Invia un Messaggio'}
          </button>
          
          <button 
            onClick={() => navigate('/bacheca')}
            className="w-full py-4 text-stone-500 text-sm font-bold flex items-center justify-center gap-2 hover:text-stone-800 transition-all"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Torna alla Bacheca
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

  const filteredProfiles = profiles.filter(p => {
    // Basic filters (manual selection in UI)
    const genderMatch = filterGender === 'Tutti' || p.gender === filterGender;
    const orientationMatch = filterOrientation === 'Tutti' || p.orientation === filterOrientation;
    
    // Reciprocal matching logic (if user is logged in)
    let reciprocalMatch = true;
    if (currentUser) {
      // 1. Does the profile match what the current user is looking for?
      // (Already handled by genderMatch if filterGender is set to currentUser.looking_for_gender)
      
      // 2. Does the current user match what the profile is looking for?
      // If the profile has a specific preference, we must respect it.
      if (p.looking_for_gender && p.looking_for_gender !== 'Tutti') {
        if (p.looking_for_gender !== currentUser.gender) {
          reciprocalMatch = false;
        }
      }
      
      // Don't show the current user to themselves
      if (p.id === currentUser.id) reciprocalMatch = false;
    }

    return genderMatch && orientationMatch && reciprocalMatch;
  });

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-stone-50">
      <div className="max-w-md mx-auto space-y-6">
        <header className="space-y-4">
          <div>
            <p className="text-stone-500 text-sm">Persone in cerca di compagnia</p>
          </div>

          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex gap-2 min-w-max items-center">
              <Link 
                to="/" 
                className="w-9 h-9 bg-white border border-stone-200 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-all shrink-0 shadow-sm"
              >
                <Home className="w-4 h-4" />
              </Link>
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
  });

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
            <p className="text-stone-500 text-xs">Step {step} di 4</p>
          </div>
          <div className="flex gap-1.5 pb-1">
            {[1, 2, 3, 4].map(i => (
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Nascita</label>
                    <input name="dob" type="date" value={formData.dob} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 ml-1">Città</label>
                    <input name="city" value={formData.city} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Milano" />
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

                <button onClick={() => setStep(2)} className="btn-primary w-full py-4 text-sm mt-2">Continua</button>
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
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 ml-1">Altro</label>
                  <textarea name="looking_for_other" value={formData.looking_for_other} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none h-20" placeholder="Preferenze extra..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                  <button onClick={() => setStep(3)} className="btn-primary flex-1 py-4 text-sm">Continua</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
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
                  <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                  <button onClick={() => setStep(4)} className="btn-primary flex-1 py-4 text-sm">Riepilogo</button>
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
                  <button onClick={() => setStep(3)} className="btn-secondary flex-1 py-4 text-sm">Indietro</button>
                  <button onClick={handleSubmit} className="btn-primary flex-1 py-4 text-sm">Completa</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-rose-100">
              <img src={user.photo_url || `https://picsum.photos/seed/${user.name}/200`} className="w-full h-full object-cover" />
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

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">I Tuoi Dati</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-stone-400">Città:</span> <span className="font-medium">{user.city}</span></div>
              <div className="flex justify-between"><span className="text-stone-400">Lavoro:</span> <span className="font-medium">{user.job}</span></div>
              <div className="flex justify-between"><span className="text-stone-400">Genere:</span> <span className="font-medium">{user.gender}</span></div>
              <div className="flex justify-between"><span className="text-stone-400">Orientamento:</span> <span className="font-medium">{user.orientation}</span></div>
              <div className="flex justify-between"><span className="text-stone-400">Cerchi:</span> <span className="font-medium">{user.looking_for_gender}</span></div>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button onClick={() => navigate('/register')} className="btn-secondary w-full py-3 text-sm">Modifica Profilo</button>
            <button 
              onClick={() => { localStorage.removeItem('soulmatch_user'); navigate('/'); }} 
              className="w-full py-3 text-xs text-rose-600 font-bold"
            >
              Esci
            </button>
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

        <div className="bg-rose-600 text-white p-6 rounded-3xl shadow-lg shadow-rose-100 space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <h3 className="text-lg font-bold">Centro Notifiche</h3>
          </div>
          <p className="text-rose-100 text-xs leading-relaxed">
            Qui potrai vedere chi ha visitato il tuo profilo e chi ti ha inviato un like o un cuore.
          </p>
          <div className="bg-white/10 p-4 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              {chatRequests.length > 0 ? `Hai ${chatRequests.length} nuove richieste` : 'Nessuna nuova notifica'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
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
