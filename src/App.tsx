import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, Cell } from 'recharts';
import {
  Heart,
  Users,
  Search,
  Filter,
  UserPlus,
  CreditCard,
  CheckCircle,
  MessageSquare,
  MessageCircle,
  MapPin,
  Calendar,
  Briefcase,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Plus,
  X,
  Send,
  LogOut,
  ShieldCheck,
  Share2,
  AlertTriangle,
  Link2,
  UserCheck,
  XCircle,
  Archive,
  Lock,
  Zap,
  Globe,
  CloudUpload,
  Utensils,
  Coffee,
  Crown,
  Activity,
  BarChart3,
  Radio,
  Save
} from 'lucide-react';
import { cn, calculateAge, calculateMatchScore, fileToBase64, playTapSound, ITALIAN_CITIES } from './utils';
import { UserProfile, ChatRequest, Post, SoulLink } from './types';
import { supabase } from './supabase';

const calculateRemainingDays = (rejectedAt: string | null) => {
  if (!rejectedAt) return 15;
  const start = new Date(rejectedAt);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const remaining = 15 - diffDays;
  return remaining > 0 ? remaining : 0;
};

// ──────────────────────────────────────────────────────────────────────────────
// GLOBAL HELPER: normalize user profile — ensures array fields are always arrays
// Handles: plain string "Gay", JSON string '["Gay","Bisessuale"]', arrays
// ──────────────────────────────────────────────────────────────────────────────
const parseArrField = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  const s = String(val).trim();
  if (s.startsWith('[')) {
    try { return JSON.parse(s); } catch { /* fall through */ }
  }
  return s ? [s] : [];
};

const isUserOnline = (u: any): boolean => {
  if (!u) return false;
  if (u.is_online === false || u.is_online === 0) return false;
  if (!u.last_seen) return !!u.is_online;
  const lastSeen = new Date(u.last_seen).getTime();
  const now = new Date().getTime();
  // Se l'utente è stato visto negli ultimi 5 minuti (300.000 ms), lo consideriamo online
  return (now - lastSeen) < (5 * 60 * 1000);
};

const normalizeUser = (u: any): any => {
  let conosciamoci = {};
  if (u?.conosciamoci_meglio) {
    try {
      conosciamoci = (typeof u.conosciamoci_meglio === 'string')
        ? JSON.parse(u.conosciamoci_meglio)
        : u.conosciamoci_meglio;
    } catch (e) {
      console.warn("Failed to parse conosciamoci_meglio for user:", u.id);
      conosciamoci = {};
    }
  }

  return {
    ...u,
    is_paid: u?.is_paid === 1 || u?.is_paid === true,
    subscription_type: u?.subscription_type,
    subscription_expiry: u?.subscription_expiry,
    orientation: parseArrField(u?.orientation),
    looking_for_gender: parseArrField(u?.looking_for_gender),
    photos: parseArrField(u?.photos).filter(p => typeof p === 'string' && p.trim().length > 0),
    last_seen: u?.last_seen,
    conosciamoci_meglio: conosciamoci
  };
};

const isUserCompatible = (viewer: UserProfile, target: UserProfile): boolean => {
  if (!viewer || !target) return false;
  if (viewer.id === target.id) return false;

  const getMacroArea = (gender: string) => {
    const g = gender?.toLowerCase() || '';
    if (['uomo', 'mascolino'].includes(g)) return 'M';
    if (['donna', 'femminile'].includes(g)) return 'F';
    if (['non-binario', 'genderfluid', 'queer', 'genderqueer', 'agender', 'bigender', 'pangender', 'neutrois', 'intersex', 'altro'].includes(g)) return 'NB';
    if (['transgender'].includes(g)) return 'TRANS';
    return 'NB';
  };

  const macroV = getMacroArea(viewer.gender);
  const macroT = getMacroArea(target.gender);
  const isWildcard = (arr: string[]) => arr.some(v => ['tutti', 'tutte', 'entrambi', 'qualsiasi', 'tutti i generi'].includes(v.toLowerCase()));
  const targetGender = (target.gender || '').toLowerCase();

  const checkOri = (myMacro: string, myOris: string[], targetMacro: string) => {
    if (!myOris || myOris.length === 0) return true;
    if (myMacro === 'NB' || targetMacro === 'NB') return true;
    const oSet = new Set(myOris.map(o => o.toLowerCase()));
    if (oSet.has('eterosessuale')) {
      return (myMacro === 'M' && targetMacro === 'F') || (myMacro === 'F' && targetMacro === 'M') || targetMacro === 'TRANS';
    }
    if (oSet.has('gay') || oSet.has('lesbica')) {
      return myMacro === targetMacro || targetMacro === 'TRANS' || targetMacro === 'NB';
    }
    return true;
  };

  const profileWants = (viewer.looking_for_gender || []).map((g: string) => g.toLowerCase());
  const hasProfileWants = profileWants.length > 0 && !isWildcard(profileWants);

  if (hasProfileWants) {
    const targetAllowedByProfile = profileWants.some(pw => targetGender.startsWith(pw) || pw.startsWith(targetGender));
    if (!targetAllowedByProfile) return false;

    const orisT = target.orientation || [];
    return checkOri(macroT, orisT, macroV);
  }

  const orisV = viewer.orientation || [];
  const orisT = target.orientation || [];
  return checkOri(macroV, orisV, macroT) && checkOri(macroT, orisT, macroV);
};

// ── Shared Bottom Navigation Bar ──────────────────────────────────────────
const AppBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (delta > 0 && currentScrollY > 200) {
        setIsNavVisible(false);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const fetchPending = async () => {
    let currentUserId: string | null = null;
    try {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        const user = JSON.parse(saved);
        currentUserId = user.id;
      }
    } catch (e) { }

    if (!currentUserId) return;

    try {
      const { count: friendsCount } = await supabase
        .from('soul_links')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending');
      setPendingCount(friendsCount || 0);

      // Count pending chat requests (messages)
      const { count: msgsCount } = await supabase
        .from('chat_requests')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', currentUserId)
        .eq('status', 'pending');

      // Count unread room_messages (live chat messages not yet read)
      const readChats = JSON.parse(localStorage.getItem('sm_read_chats') || '[]') as string[];
      const { data: unreadRooms } = await supabase
        .from('room_messages')
        .select('sender_id')
        .eq('receiver_id', currentUserId)
        .order('created_at', { ascending: false });

      let unreadRoomCount = 0;
      if (unreadRooms && unreadRooms.length > 0) {
        const unreadSenders = new Set(
          unreadRooms
            .map((m: any) => m.sender_id)
            .filter((sid: string) => !readChats.includes(sid))
        );
        unreadRoomCount = unreadSenders.size;
      }

      setChatCount((msgsCount || 0) + unreadRoomCount);
    } catch (e) { }
  };

  useEffect(() => {
    let currentUserId: string | null = null;
    try {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        const user = JSON.parse(saved);
        currentUserId = user.id;
      }
    } catch (e) { }

    if (!currentUserId) return;

    fetchPending();

    // Sottoscrizioni Real-time
    const slChannel = supabase.channel(`nav_sl_${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'soul_links', filter: `receiver_id=eq.${currentUserId}` }, fetchPending)
      .subscribe();

    const crChannel = supabase.channel(`nav_cr_${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_requests', filter: `to_user_id=eq.${currentUserId}` }, fetchPending)
      .subscribe();

    const rmChannel = supabase.channel(`nav_rm_${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `receiver_id=eq.${currentUserId}` }, () => {
        fetchPending();
        const chatIcon = document.getElementById('nav-chat-icon');
        if (chatIcon) {
          chatIcon.classList.add('animate-bounce');
          setTimeout(() => chatIcon.classList.remove('animate-bounce'), 2000);
        }
      })
      .subscribe();

    const handleReadUpdate = () => {
      fetchPending();
    };
    window.addEventListener('chat-read-update', handleReadUpdate);

    const interval = setInterval(fetchPending, 10000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(slChannel);
      supabase.removeChannel(crChannel);
      supabase.removeChannel(rmChannel);
    };
  }, [location.pathname]); // Re-run when path changes to catch login/logout

  // Determina il tab attivo in base al percorso
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/bacheca')) return 'bacheca';
    if (path.startsWith('/amici')) return 'soullink';
    if (path.startsWith('/chat')) return 'chat';
    if (path.startsWith('/feed')) return 'feed';
    if (path.startsWith('/soul-match')) return 'amarsiunpo';
    return '';
  };

  const activeTab = getActiveTab();
  const hideOn = ['/live-chat', '/register', '/onboarding', '/edit-profile', '/admin'];
  const shouldHide = hideOn.some(p => location.pathname.startsWith(p));

  if (shouldHide) return null;

  return (
    <div className="fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] left-0 right-0 z-[100] px-4 pointer-events-none flex justify-center">
      <motion.div
        layout
        initial={false}
        animate={{
          width: isNavVisible ? "95%" : "64px",
          height: isNavVisible ? "auto" : "64px",
          maxWidth: isNavVisible ? "448px" : "64px",
          borderRadius: isNavVisible ? "40px" : "32px",
          x: isNavVisible ? 0 : -140, // Trasla a sinistra
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 600, mass: 0.6 }}
        className={cn(
          "pointer-events-auto shadow-2xl border border-white/8 bg-black/40 backdrop-blur-3xl p-2 gap-1 overflow-hidden flex items-center justify-center",
          !isNavVisible && "cursor-pointer"
        )}
        onClick={() => !isNavVisible && setIsNavVisible(true)}
        drag={isNavVisible ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={(_, info) => {
          if (isNavVisible && info.offset.y > 50) setIsNavVisible(false);
        }}
      >
        <AnimatePresence mode="wait">
          {isNavVisible ? (
            <motion.div
              key="nav-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-1 w-full"
            >
              {/* Home */}
              <Link to="/" className="relative flex-1 group">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center py-2.5 rounded-full aspect-square justify-center transition-all duration-300",
                    activeTab === 'home' ? "text-white shadow-lg" : "text-stone-400 hover:text-white"
                  )}
                  style={activeTab === 'home' ? { background: '#f43f5e', boxShadow: '0 0 20px rgba(244,63,94,0.5)' } : {}}
                >
                  <Home className="w-5 h-5 mb-0.5" />
                  <span className="text-[6px] font-black uppercase tracking-wider">Home</span>
                </motion.div>
              </Link>

              {/* Bacheca */}
              <Link to="/bacheca" className="relative flex-1 group">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center py-2.5 rounded-full aspect-square justify-center transition-all duration-300",
                    activeTab === 'bacheca' ? "text-white shadow-lg" : "text-stone-400 hover:text-white"
                  )}
                  style={activeTab === 'bacheca' ? { background: '#f43f5e', boxShadow: '0 0 20px rgba(244,63,94,0.5)' } : {}}
                >
                  <Users className="w-5 h-5 mb-0.5" />
                  <span className="text-[6px] font-black uppercase tracking-wider">Bacheca</span>
                </motion.div>
              </Link>

              {/* Feed */}
              <Link to="/feed" className="relative flex-1 group">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center py-2.5 rounded-full aspect-square justify-center transition-all duration-300",
                    activeTab === 'feed' ? "text-white shadow-lg" : "text-stone-400 hover:text-white"
                  )}
                  style={activeTab === 'feed' ? { background: '#f43f5e', boxShadow: '0 0 20px rgba(244,63,94,0.5)' } : {}}
                >
                  <LayoutGrid className="w-5 h-5 mb-0.5" />
                  <span className="text-[6px] font-black uppercase tracking-wider">Feed</span>
                </motion.div>
              </Link>

              {/* Chat */}
              <Link to="/chat" className="relative flex-1 group">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center py-2.5 rounded-full aspect-square justify-center transition-all duration-300",
                    activeTab === 'chat' ? "text-white shadow-lg" : "text-stone-400 hover:text-white"
                  )}
                  style={activeTab === 'chat' ? { background: '#f43f5e', boxShadow: '0 0 20px rgba(244,63,94,0.5)' } : {}}
                >
                  <div className="relative" id="nav-chat-icon">
                    <MessageCircle className="w-5 h-5 mb-0.5" />
                    {chatCount > 0 && (
                      <>
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full animate-ping opacity-75" />
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[7px] font-black rounded-full flex items-center justify-center border-2 border-stone-900 shadow-sm z-10">{chatCount}</span>
                      </>
                    )}
                  </div>
                  <span className="text-[6px] font-black uppercase tracking-wider">Chat</span>
                </motion.div>
              </Link>

              {/* Amici (SoulLink) */}
              <Link to="/amici" className="relative flex-1 group">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center py-2.5 rounded-full aspect-square justify-center transition-all duration-300",
                    activeTab === 'soullink' ? "text-white shadow-lg" : "text-stone-400 hover:text-white"
                  )}
                  style={activeTab === 'soullink' ? { background: '#f43f5e', boxShadow: '0 0 20px rgba(244,63,94,0.5)' } : {}}
                >
                  <div className="relative">
                    <UserCheck className="w-5 h-5 mb-0.5" />
                    {pendingCount > 0 && (
                      <>
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full animate-ping opacity-75" />
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[7px] font-black rounded-full flex items-center justify-center border-2 border-stone-900 shadow-sm z-10">{pendingCount}</span>
                      </>
                    )}
                  </div>
                  <span className="text-[6px] font-black uppercase tracking-wider">Amici</span>
                </motion.div>
              </Link>

              {/* AMARSIUNPO (Heart Button) */}
              <Link to="/soul-match" onClick={() => window.dispatchEvent(new CustomEvent('reset-amarsiunpo'))} className="relative flex-1 group">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center py-2.5 rounded-full aspect-square justify-center transition-all duration-300",
                    activeTab === 'amarsiunpo' ? "text-white shadow-lg" : "text-stone-400 hover:text-white"
                  )}
                  style={activeTab === 'amarsiunpo' ? { background: '#f43f5e', boxShadow: '0 0 20px rgba(244,63,94,0.6)' } : {}}
                >
                  <Heart className={cn("w-5 h-5 mb-0.5", activeTab === 'amarsiunpo' ? "fill-current" : "")} />
                  <span className="text-[6px] font-black uppercase tracking-wider">Match</span>
                </motion.div>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="nav-bubble"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="flex items-center justify-center w-full h-full bg-stone-900 rounded-full"
            >
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <Heart className="w-8 h-8 text-rose-600 fill-current drop-shadow-[0_0_15px_rgba(225,29,72,0.8)]" />
                </motion.div>
                {(pendingCount + chatCount) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-stone-900 shadow-sm z-10">
                    {pendingCount + chatCount}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const GlobalFlashBanner = () => {
  const [bannerMessages, setBannerMessages] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isBannerExpanded, setIsBannerExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [isPublishingModalOpen, setIsPublishingModalOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState('');
  const [isPublishingFlash, setIsPublishingFlash] = useState(false);
  const [flashToast, setFlashToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Show ONLY on /bacheca
  const isBacheca = location.pathname.startsWith('/bacheca');
  const shouldHide = !isBacheca;

  const getSavedUser = () => {
    try {
      const saved = localStorage.getItem('amarsiunpo_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  const currentUser = getSavedUser();
  const isFree = !currentUser?.is_paid;

  const handlePublishFlash = async () => {
    if (!flashMessage.trim() || !currentUser) return;

    setIsPublishingFlash(true);
    const newFlash = {
      message: flashMessage,
      name: currentUser.name,
      photo_url: currentUser.photos?.[0] || currentUser.photo_url,
      city: currentUser.city,
      dob: currentUser.dob,
      user_id: currentUser.id
    };
    try {
      const { data, error } = await supabase.from('banner_messages').insert([newFlash]).select().single();
      if (!error && data) {
        setBannerMessages(prev => [data, ...prev]);
        setFlashMessage('');
        setIsPublishingModalOpen(false);
      } else {
        alert('Errore pubblicazione: ' + error?.message);
      }
    } catch (err) { }
    setIsPublishingFlash(false);
  };

  const fetchGlobalBanner = async () => {
    try {
      const { data } = await supabase
        .from('banner_messages')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      if (data) setBannerMessages(data);
    } catch (e) { }
  };

  useEffect(() => {
    fetchGlobalBanner();
    const interval = setInterval(fetchGlobalBanner, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (bannerMessages.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex(Math.floor(Math.random() * bannerMessages.length));
    }, 5000);
    return () => clearInterval(interval);
  }, [bannerMessages]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const bannerEl = document.getElementById('msg-floating-banner');
      if (isBannerExpanded && bannerEl && !bannerEl.contains(e.target as Node)) {
        setIsBannerExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isBannerExpanded]);

  if (shouldHide) return null;

  return (
    <div className="fixed bottom-[140px] right-0 z-[9999] pointer-events-none">
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      {flashToast && <Toast message={flashToast.message} type={flashToast.type} onClose={() => setFlashToast(null)} />}
      
      {/* Modulo Inserimento Flash */}
      <AnimatePresence>
        {isPublishingModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0a0a0f] border border-amber-500/30 p-6 rounded-[32px] w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setIsPublishingModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex flex-col items-center text-center space-y-3 mb-6">
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-500/10 to-amber-500/20 rounded-full flex items-center justify-center shadow-inner border border-amber-500/20">
                  <Zap className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white mb-1">Messaggio Flash</h3>
                  <p className="text-[12px] font-medium text-white/50 leading-relaxed px-2">
                    Pubblica in <strong className="text-amber-500">Bacheca</strong>. Dura <strong className="text-stone-300">24 ore</strong> e poi svanisce per sempre.
                  </p>
                </div>
              </div>

              <div className="relative mb-4">
                <textarea
                  value={flashMessage}
                  onChange={(e) => setFlashMessage(e.target.value)}
                  placeholder="A cosa stai pensando? Dillo a tutti con un Flash..."
                  className="w-full bg-white/5 border border-white/10 rounded-[20px] p-5 pb-10 text-[14px] text-white outline-none focus:ring-2 focus:ring-amber-500/50 resize-none min-h-[120px] placeholder:text-white/30"
                  maxLength={80}
                />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                  <span className={cn(
                    "text-[10px] font-black",
                    flashMessage.length > 70 ? "text-rose-500" : "text-white/30"
                  )}>
                    {80 - flashMessage.length} / 80
                  </span>
                </div>
              </div>

              <button
                onClick={handlePublishFlash}
                disabled={!flashMessage.trim() || isPublishingFlash}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[12px] font-black uppercase tracking-widest rounded-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPublishingFlash ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Zap className="w-5 h-5" /> Pubblica in Bacheca</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div
        id="msg-floating-banner"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x > 50) setIsBannerExpanded(false);
          if (info.offset.x < -50) setIsBannerExpanded(true);
        }}
        initial={false}
        animate={{
          x: 0, 
          scale: 1,
          opacity: 1
        }}
        transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 1 }}
        className={cn(
          "pointer-events-auto shadow-2xl flex items-center border-l border-t border-b border-white/10 transition-all duration-500",
          isBannerExpanded
            ? "z-[9999] w-[calc(100vw-32px)] max-w-md bg-rose-600 rounded-l-[30px] rounded-r-none p-2 pr-6 gap-1 text-white -mr-[1px]"
            : "z-[9998] w-14 h-14 bg-rose-600 rounded-l-2xl rounded-r-none cursor-pointer justify-center pl-1"
        )}
      >
        {!isBannerExpanded ? (
          <div
            onClick={(e) => { e.stopPropagation(); setIsBannerExpanded(true); }}
            className="w-full h-full flex items-center justify-center text-white relative"
          >
            <Send className="w-6 h-6 rotate-[-45deg] mr-1" />
            {bannerMessages.length > 0 && (
              <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] bg-white text-rose-600 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-rose-600 shadow-sm px-1">
                {bannerMessages.length}
              </span>
            )}
          </div>
        ) : (
          <div className="w-full flex items-center justify-between gap-1 overflow-hidden">
            {bannerMessages.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={bannerMessages[bannerIndex]?.id || bannerIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex items-center gap-2 pl-1 overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (bannerMessages[bannerIndex]?.user_id) {
                      navigate(`/profile-detail/${bannerMessages[bannerIndex]?.user_id}`);
                    }
                  }}
                >
                  <div className="w-[52px] h-[52px] rounded-[18px] p-[2px] bg-white/20 shrink-0 shadow-md">
                    <img src={bannerMessages[bannerIndex]?.photo_url || `https://picsum.photos/seed/${bannerMessages[bannerIndex]?.name}/100`} className="w-full h-full object-cover rounded-[16px]" />
                  </div>

                  <div className="flex flex-col flex-1 min-w-0 pr-1">
                    <div className="flex items-baseline gap-1.5 leading-tight mb-0.5">
                      <span className="text-[11px] font-black text-white truncate">{bannerMessages[bannerIndex]?.name}</span>
                      <span className="text-[9px] font-bold text-rose-200 capitalize shrink-0">{bannerMessages[bannerIndex]?.city}</span>
                    </div>

                    <div className="bg-white rounded-[10px] p-2 relative shadow-sm">
                      <p className="text-[10px] text-stone-900 font-bold leading-[1.15] line-clamp-2 break-words">
                        {bannerMessages[bannerIndex]?.message}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex-1 flex items-center justify-center py-4 text-white font-bold text-xs">
                Nessun nuovo messaggio flash
              </div>
            )}
            
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (isFree) {
                  setShowPremiumModal(true); 
                } else { 
                  const lastFlash = bannerMessages.find(m => m.user_id === currentUser?.id);
                  if (lastFlash) {
                    const diffTime = Date.now() - new Date(lastFlash.created_at).getTime();
                    const diffHours = (24 * 60 * 60 * 1000 - diffTime) / (1000 * 60 * 60);
                    if (diffHours > 0) {
                      const remainingHours = Math.floor(diffHours);
                      const remainingMins = Math.ceil((diffHours - remainingHours) * 60);
                      setFlashToast({ 
                        message: `Attenzione! Devi attendere ancora ${remainingHours}h e ${remainingMins}m prima di poter pubblicare un nuovo Flash.`, 
                        type: 'info' 
                      });
                      return;
                    }
                  }
                  setIsPublishingModalOpen(true); 
                } 
              }}
              className="ml-2 w-10 h-10 shrink-0 bg-white/20 hover:bg-white/30 rounded-[14px] flex items-center justify-center transition-colors border border-white/20 relative"
            >
               {isFree && <Lock className="w-3 h-3 absolute top-1 right-1 opacity-60" />}
               <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </motion.div>
    </div >
  );
};

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
      className="fixed bottom-[200px] left-1/2 z-[100] px-5 py-3 rounded-2xl flex items-center gap-3 min-w-[260px] pointer-events-auto"
      style={{ background: 'rgba(10,10,15,0.92)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
    >
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={type === 'success' ? { background: 'rgba(16,185,129,0.2)', boxShadow: '0 0 10px rgba(16,185,129,0.4)' } :
          type === 'error' ? { background: 'rgba(244,63,94,0.2)', boxShadow: '0 0 10px rgba(244,63,94,0.4)' } :
            { background: 'rgba(168,85,247,0.2)', boxShadow: '0 0 10px rgba(168,85,247,0.4)' }}
      >
        {type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
          type === 'error' ? <Info className="w-4 h-4 text-rose-400" /> :
            <Heart className="w-4 h-4 text-purple-400 fill-current" />}
      </div>
      <span className="text-sm font-bold text-white/90">{message}</span>
    </motion.div>
  );
};

export const PremiumModal = ({ isOpen, onClose, defaultComparison = false }: { isOpen: boolean, onClose: () => void, defaultComparison?: boolean }) => {
  const [showComparison, setShowComparison] = useState(defaultComparison);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    if (isOpen) setShowComparison(defaultComparison);
  }, [isOpen, defaultComparison]);
  
  if (!isOpen) return null;
  
  const STRIPE_MONTHLY_LINK = 'https://buy.stripe.com/3cIeVdh1t3kX0ji5ph5os01';
  const STRIPE_ANNUAL_LINK = 'https://buy.stripe.com/9B628r9z1cVxd644ld5os02';

  const handleCheckout = () => {
    localStorage.setItem('amarsiunpo_pending_plan', selectedPlan);
    const link = selectedPlan === 'monthly' ? STRIPE_MONTHLY_LINK : STRIPE_ANNUAL_LINK;
    window.location.href = link;
  };

  const features = [
    { name: "SoulLink giornalieri", free: "5", premium: "Illimitati" },
    { name: "Messaggi Flash", free: "No", premium: "Sì" },
    { name: "Vedi chi ti ha cercato", free: "2/giorno", premium: "Chiaro" },
    { name: "Badge Speciale", free: "Base", premium: "Premium" },
    { name: "Priorità in Bacheca", free: "No", premium: "Alta" },
    { name: "Post nel Feed", free: "No", premium: "1 / giorno (30gg)" },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-sm rounded-[32px] overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,25,0.95), rgba(10,10,15,0.95))',
          border: '1px solid rgba(147,51,234,0.4)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 blur-[40px] -mr-10 -mt-10" />
        
        <div className="p-6 relative z-10 space-y-6 overflow-y-auto max-h-[85vh]">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
              <Heart className="w-6 h-6 text-purple-400 fill-current" />
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {!showComparison ? (
            <>
              <div>
                <h2 className="text-2xl font-serif font-black text-white mb-2">Diventa <span className="text-purple-500">Premium</span></h2>
                <p className="text-sm text-stone-400 font-medium">Porta la tua ricerca a un livello superiore con vantaggi esclusivi.</p>
              </div>

              <div className="space-y-4">
                <div className="pt-2 flex flex-col gap-3">
                  <button 
                    onClick={() => setSelectedPlan('monthly')}
                    className={cn(
                      "w-full transition-all border rounded-2xl py-4 px-4 flex items-center justify-between group active:scale-95",
                      selectedPlan === 'monthly' ? "bg-white/10 border-white/40" : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="text-left flex-1 min-w-0">
                      <span className={cn(
                        "text-[10px] uppercase font-black tracking-widest transition-colors",
                        selectedPlan === 'monthly' ? "text-white" : "text-stone-400 group-hover:text-stone-300"
                      )}>Abbonamento Mensile</span>
                      <p className="text-lg font-black text-white mt-0.5">€ 2,99 / mese</p>
                    </div>
                    {selectedPlan === 'monthly' && <CheckCircle className="w-5 h-5 text-purple-400" />}
                  </button>
                  <button 
                    onClick={() => setSelectedPlan('annual')}
                    className={cn(
                      "w-full transition-all border rounded-2xl py-4 px-4 flex items-center justify-between group active:scale-95 relative overflow-hidden",
                      selectedPlan === 'annual' ? "bg-purple-600/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]" : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="absolute top-2 right-4 bg-purple-600 border border-purple-400 text-[6px] text-white font-black uppercase px-2 py-0.5 rounded-full tracking-widest">Miglior Prezzo</div>
                    <div className="text-left flex-1 min-w-0">
                      <span className={cn(
                        "text-[10px] uppercase font-black tracking-widest transition-colors",
                        selectedPlan === 'annual' ? "text-purple-300" : "text-stone-400 group-hover:text-stone-300"
                      )}>Abbonamento Annuale</span>
                      <p className="text-lg font-black text-white mt-0.5">€ 19,90 / anno</p>
                    </div>
                    {selectedPlan === 'annual' && <CheckCircle className="w-5 h-5 text-purple-400" />}
                  </button>
                </div>

                <button 
                  onClick={() => setShowComparison(true)}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                >
                  <Info className="w-4 h-4" /> Vedi Tabella Differenze
                </button>

                <button 
                  onClick={handleCheckout}
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/40 hover:bg-purple-500 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Procedi all&apos;abbonamento
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Confronto Piani</h3>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-tight">Perché passare a Premium</p>
              </div>

              <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/5">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="p-3 text-[9px] font-black text-white/30 uppercase tracking-widest">Servizio</th>
                      <th className="p-3 text-[9px] font-black text-white/30 uppercase tracking-widest text-center">Base</th>
                      <th className="p-3 text-[9px] font-black text-purple-400 uppercase tracking-widest text-center">Pro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {features.map((f, i) => (
                      <tr key={i}>
                        <td className="p-3 text-[10px] font-bold text-white/70">{f.name}</td>
                        <td className="p-3 text-[10px] font-black text-center">
                          {f.free === 'No' ? <XCircle className="w-4 h-4 text-rose-500 mx-auto" /> : <span className="text-white/30">{f.free}</span>}
                        </td>
                        <td className="p-3 text-[10px] font-black text-center">
                          {f.premium === 'Sì' ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-purple-400 font-black">{f.premium}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => setShowComparison(false)}
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/40 hover:bg-purple-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Torna alle Tariffe
                </button>
              </div>
            </div>
          )}

          <p className="text-[9px] text-center text-stone-500 font-bold uppercase tracking-widest pt-2">Pagamento Sicuro via Stripe • Disdici quando vuoi</p>
        </div>
      </motion.div>
    </div>
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
      {/* Soft Background Image — dark tinted */}
      {bgImage && (
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.07 }}
          transition={{ duration: 2 }}
          className="absolute inset-0"
        >
          <img src={bgImage} className="w-full h-full object-cover grayscale brightness-50 contrast-50" alt="" />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        </motion.div>
      )}

      {/* Floating glow orbs */}
      <div className="absolute top-1/4 -left-20 w-[40rem] h-[40rem] bg-rose-900/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-[40rem] h-[40rem] bg-rose-900/8 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.2s' }} />
      <div className="absolute top-2/3 left-1/3 w-[30rem] h-[30rem] bg-purple-900/6 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
};

const ProfileAvatar = ({ user, className, iconSize = "w-6 h-6" }: { user: any, className?: string, iconSize?: string }) => {
  const photo = user?.photos?.[0] || user?.photo_url;
  return (
    <div className={cn("bg-stone-50 flex items-center justify-center overflow-hidden shrink-0", className)}>
      {photo ? (
        <img src={photo} alt={user?.name || ""} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <User className={cn(iconSize, "text-rose-600 fill-current")} />
      )}
    </div>
  );
};

const Navbar = () => {
  const [user, setUser] = useState<UserProfile | null>(null);

  const checkUser = () => {
    try {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        try {
          setUser(normalizeUser(JSON.parse(saved)));
        } catch (e) {
          console.error("Auth sync error:", e);
        }
      }
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

  const location = useLocation();
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 px-6 flex justify-between items-center bg-black/20 backdrop-blur-3xl border-b border-white/5 shadow-lg overflow-hidden"
      style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
    >
      {/* Floating hearts decoration — background only */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <style>{`
          @keyframes navHeart {
            0%   { transform: translateY(80px) translateX(0px) scale(0.8); opacity: 0; }
            15%  { opacity: 1; }
            85%  { opacity: 0.5; }
            100% { transform: translateY(-20px) translateX(var(--ndx,10px)) scale(1.1); opacity: 0; }
          }
          .nh { animation: navHeart var(--nd,6s) ease-in-out var(--ndelay,0s) infinite; position: absolute; bottom: -8px; }
        `}</style>
        {[
          { left: '3%', size: 10, color: '#f43f5e', blur: 3, nd: 7, ndelay: 0, ndx: '8px' },
          { left: '9%', size: 6, color: '#ec4899', blur: 4, nd: 9, ndelay: 1.5, ndx: '-6px' },
          { left: '16%', size: 14, color: '#a855f7', blur: 5, nd: 8, ndelay: 0.5, ndx: '12px' },
          { left: '22%', size: 8, color: '#f43f5e', blur: 3, nd: 6, ndelay: 2, ndx: '-10px' },
          { left: '29%', size: 16, color: '#fb7185', blur: 4, nd: 10, ndelay: 1, ndx: '6px' },
          { left: '35%', size: 7, color: '#9333ea', blur: 3, nd: 7, ndelay: 3, ndx: '-8px' },
          { left: '41%', size: 11, color: '#f43f5e', blur: 5, nd: 9, ndelay: 0.8, ndx: '10px' },
          { left: '48%', size: 9, color: '#ec4899', blur: 4, nd: 8, ndelay: 2.5, ndx: '-5px' },
          { left: '54%', size: 13, color: '#f43f5e', blur: 3, nd: 7, ndelay: 1.2, ndx: '7px' },
          { left: '60%', size: 6, color: '#a855f7', blur: 4, nd: 11, ndelay: 0.3, ndx: '-9px' },
          { left: '66%', size: 18, color: '#ec4899', blur: 6, nd: 8, ndelay: 4, ndx: '11px' },
          { left: '71%', size: 8, color: '#f43f5e', blur: 3, nd: 6, ndelay: 1.8, ndx: '-7px' },
          { left: '77%', size: 12, color: '#fb7185', blur: 4, nd: 9, ndelay: 0.6, ndx: '9px' },
          { left: '82%', size: 7, color: '#9333ea', blur: 5, nd: 7, ndelay: 2.2, ndx: '-4px' },
          { left: '87%', size: 10, color: '#f43f5e', blur: 3, nd: 10, ndelay: 1.4, ndx: '6px' },
          { left: '92%', size: 5, color: '#fb7185', blur: 3, nd: 8, ndelay: 3.5, ndx: '-11px' },
          { left: '96%', size: 9, color: '#f43f5e', blur: 4, nd: 6, ndelay: 2.8, ndx: '5px' },
          { left: '12%', size: 15, color: '#a855f7', blur: 6, nd: 12, ndelay: 0.2, ndx: '-13px' },
          { left: '44%', size: 7, color: '#ec4899', blur: 3, nd: 7, ndelay: 3.8, ndx: '8px' },
          { left: '74%', size: 11, color: '#f43f5e', blur: 4, nd: 9, ndelay: 1.1, ndx: '-6px' },
        ].map((h, i) => (

          <div
            key={i}
            className="nh"
            style={{
              left: h.left,
              '--nd': `${h.nd}s`,
              '--ndelay': `${h.ndelay}s`,
              '--ndx': h.ndx,
              filter: `blur(${h.blur}px)`,
              opacity: 0.22,
            } as React.CSSProperties}
          >
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}>
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
          </div>
        ))}
      </div>

      <Link to="/" className="flex items-center gap-3 group relative z-10">
        <Heart className="w-8 h-8 text-rose-500 fill-rose-500 animate-pulse-slow" />
        <div className="flex flex-col">
          <span className="text-xl font-serif font-black tracking-tight leading-none text-white group-hover:text-rose-600 transition-colors">
            Amarsi Un Po
          </span>
          <span className={cn(
            "text-[9px] font-montserrat font-bold uppercase tracking-[0.2em] mt-1 line-clamp-1",
            user?.is_paid ? "text-purple-400" : "text-rose-500"
          )}>
            {user ? user.name : "Compagnia Ideale"}
          </span>
        </div>
      </Link>
      <div className="flex gap-4 items-center relative z-10">
        {user ? (
          <div className="flex items-center gap-3">
            <Link to="/profile" className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 overflow-hidden ring-2",
              user?.is_paid 
                ? "border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] ring-purple-500/20" 
                : "border border-white/10 bg-white/5 ring-white/5"
            )}>
              <ProfileAvatar user={user} className="w-full h-full" iconSize="w-5 h-5" />
            </Link>

            <button
              onClick={() => {
                localStorage.removeItem('amarsiunpo_user');
                window.dispatchEvent(new Event('user-auth-change'));
                window.location.href = '/';
              }}
              className="w-10 h-10 bg-white/5 text-stone-400 rounded-full flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-white/10 active:scale-90 shadow-sm"
              title="Esci"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link to="/register" className="w-11 h-11 bg-white rounded-full flex items-center justify-center border border-stone-100 shadow-sm transition-all hover:bg-rose-50 active:scale-95">
            <ProfileAvatar user={null} className="w-full h-full bg-transparent" iconSize="w-6 h-6" />
          </Link>
        )}
      </div>
    </nav>
  );
};

const ProfileCard: React.FC<{ profile: UserProfile; onInteract?: () => void }> = ({ profile, onInteract }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) setCurrentUser(normalizeUser(JSON.parse(saved)));
    } catch (e) { }
  }, []);

  const handleInteract = async (e: React.MouseEvent, type: 'like' | 'heart') => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser?.id) {
      alert("Devi essere iscritto per interagire!");
      return;
    }
    try {
      await supabase.from('interactions').upsert({
        from_user_id: currentUser.id,
        to_user_id: profile.id,
        type: type
      });
    } catch (e) { }
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
        <div className="aspect-[3/4.8] overflow-hidden relative shrink-0 select-none group/img">
          {/* Photos slider handles */}
          <div className="absolute inset-0 z-10 flex">
             <div className="w-1/2 h-full cursor-w-resize" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (profile.photos && profile.photos.length > 0) setPhotoIndex(prev => (prev - 1 + profile.photos.length) % profile.photos.length); }} />
             <div className="w-1/2 h-full cursor-e-resize" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (profile.photos && profile.photos.length > 0) setPhotoIndex(prev => (prev + 1) % profile.photos.length); }} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={photoIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <ProfileAvatar 
                user={{...profile, photos: profile.photos ? [profile.photos[photoIndex]] : (profile.photo_url ? [profile.photo_url] : [])}} 
                className="w-full h-full" 
                iconSize="w-20 h-20" 
              />
            </motion.div>
          </AnimatePresence>

          {profile.photos && profile.photos.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-1 px-1.5 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/10">
              {profile.photos.map((_: any, idx: number) => (
                <div key={idx} className={cn("h-1 rounded-full transition-all duration-300", idx === photoIndex ? "w-4 bg-white" : "w-1 bg-white/40")} />
              ))}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none" />

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

          {isUserOnline(profile) && (
            <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
          )}

          {profile.is_paid && (
            <div className="absolute top-3 left-3 bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
              <Heart className="w-2.5 h-2.5 fill-current" /> Premium
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
            <div className="flex flex-col gap-1.5 text-stone-500 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-3 h-3 text-rose-500" />
                </div>
                <span className="text-xs font-bold text-stone-600 truncate">{profile.city}</span>
                {showScore && (
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md ml-auto">
                    {score}% Match
                  </span>
                )}
              </div>
              {profile.orientation && profile.orientation.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                    <Heart className="w-3 h-3 text-violet-500" />
                  </div>
                  <span className="text-[10px] font-black text-violet-600 truncate uppercase tracking-widest">{profile.orientation.join(', ')}</span>
                </div>
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
    supabase.from('site_settings').select('value').eq('key', 'home_slider').single()
      .then(({ data, error }) => {
        if (!error && data?.value) {
          try {
            const parsed = JSON.parse(data.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setImages([...parsed].sort(() => Math.random() - 0.5));
            }
          } catch (e) {}
        }
      })
      .catch(() => { });
  }, []);

  const fallbackImages = [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=2000&auto=format&fit=crop"
  ];

  const displayImages = images.length > 0 ? images : fallbackImages;

  const homeScrollRef = useRef<HTMLDivElement>(null);

  const scrollToHome = (idx: number) => {
    if (homeScrollRef.current) {
      homeScrollRef.current.scrollTo({
        left: idx * homeScrollRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (displayImages.length <= 1) return;
    const itv = setInterval(() => {
      const next = (index + 1) % displayImages.length;
      setIndex(next);
      scrollToHome(next);
    }, 5000);
    return () => clearInterval(itv);
  }, [displayImages.length, index]);

  return (
    <div className="absolute top-0 left-0 right-0 h-[650px] w-full overflow-hidden">
      <div 
        ref={homeScrollRef}
        className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
        onScroll={(e) => {
          const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
          if (idx !== index) setIndex(idx);
        }}
      >
        {displayImages.map((img, i) => (
          <div key={i} className="w-full h-full shrink-0 snap-center relative">
            <img
              src={img}
              className="w-full h-full object-cover opacity-85"
            />
          </div>
        ))}
      </div>
      {/* Refined cinematic overlays - deeper focus in center */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/90 via-transparent to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/95 via-transparent to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.4)_100%)]" />
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [demoLikes, setDemoLikes] = useState<Record<number, boolean>>({});
  const [demoHearts, setDemoHearts] = useState<Record<number, boolean>>({});
  const [friendshipImage, setFriendshipImage] = useState<string>('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    try {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        setIsLoggedIn(true);
        setCurrentUser(normalizeUser(JSON.parse(saved)));
      }
    } catch (e) { }

    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('site_settings').select('value').eq('key', 'home_friendship_image').single();
        if (data?.value) setFriendshipImage(data.value);
      } catch (e) { }
    };
    fetchSettings();
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Amarsi Un Po',
          text: 'Entra anche tu in Amarsi Un Po, la community per trovare la tua compagnia ideale! ❤️',
          url: 'https://www.amarsiunpo.it',
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
    <div className="min-h-screen pt-[430px] pb-12 px-4 flex flex-col items-center justify-center bg-black relative overflow-x-hidden">
      {/* Floating blurred hearts background — same as Navbar */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <style>{`
          @keyframes floatHeart {
            0%   { transform: translateY(100vh) translateX(0px) scale(0.6) rotate(-10deg); opacity: 0; }
            10%  { opacity: 0.18; }
            90%  { opacity: 0.08; }
            100% { transform: translateY(-10vh) translateX(var(--hx,20px)) scale(1.1) rotate(10deg); opacity: 0; }
          }
          .fh { animation: floatHeart var(--hd,12s) ease-in-out var(--hdelay,0s) infinite; position: absolute; bottom: -40px; }
        `}</style>
        {[
          { left: '5%', size: 28, color: '#f43f5e', blur: 8, hd: 14, hdelay: 0, hx: '15px' },
          { left: '12%', size: 16, color: '#ec4899', blur: 12, hd: 18, hdelay: 2, hx: '-20px' },
          { left: '20%', size: 40, color: '#a855f7', blur: 16, hd: 16, hdelay: 0.5, hx: '25px' },
          { left: '28%', size: 22, color: '#f43f5e', blur: 10, hd: 12, hdelay: 4, hx: '-15px' },
          { left: '36%', size: 50, color: '#fb7185', blur: 20, hd: 20, hdelay: 1, hx: '10px' },
          { left: '45%', size: 18, color: '#9333ea', blur: 10, hd: 15, hdelay: 6, hx: '-18px' },
          { left: '53%', size: 32, color: '#f43f5e', blur: 14, hd: 17, hdelay: 0.8, hx: '22px' },
          { left: '61%', size: 24, color: '#ec4899', blur: 10, hd: 13, hdelay: 3, hx: '-10px' },
          { left: '69%', size: 44, color: '#f43f5e', blur: 18, hd: 19, hdelay: 1.5, hx: '18px' },
          { left: '77%', size: 14, color: '#a855f7', blur: 8, hd: 11, hdelay: 5, hx: '-22px' },
          { left: '84%', size: 36, color: '#ec4899', blur: 16, hd: 16, hdelay: 2.5, hx: '12px' },
          { left: '91%', size: 20, color: '#f43f5e', blur: 10, hd: 14, hdelay: 7, hx: '-8px' },
        ].map((h, i) => (
          <div key={i} className="fh" style={{
            left: h.left,
            '--hd': `${h.hd}s`,
            '--hdelay': `${h.hdelay}s`,
            '--hx': h.hx,
            filter: `blur(${h.blur}px)`,
          } as React.CSSProperties}>
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}>
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
          </div>
        ))}
      </div>
      <HomeSlider />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-12 relative z-10"
      >
        {/* Hero text */}
        <div className="space-y-4">

          <h1 className="text-5xl font-serif font-black leading-[1.1] tracking-tight text-white drop-shadow-lg">
            Trova la tua <br /><span className="text-rose-500 italic">compagnia</span> ideale.
          </h1>

          <p className="text-rose-400/80 text-[11px] font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
            Membri Certificati e Sicurezza Garantita
          </p>

          <p className="text-lg text-white/50 leading-relaxed px-4 font-medium">
            Amarsi Un Po è il luogo sicuro dove incontrare persone reali. Ogni profilo è verificato manualmente per la tua sicurezza.
          </p>
        </div>

        {/* Suspended User Notice — removed, handled by side banner */}


        {/* Single CTA */}
        <div className="px-4 space-y-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            {!isLoggedIn ? (
              <Link
                to="/register"
                className="w-full flex items-center justify-between gap-4 bg-gradient-to-r from-rose-600 to-rose-500 text-white py-4 px-6 rounded-[22px] font-black transition-all"
              >
                <div className="w-10 h-10 bg-white/15 rounded-[14px] flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-black uppercase tracking-widest leading-none">Inizia Ora</p>
                  <p className="text-rose-200 text-[10px] font-semibold mt-0.5">Gratis — nessuna carta</p>
                </div>
                <div className="w-10 h-10 bg-white/15 rounded-[14px] flex items-center justify-center shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/bacheca"
                  className="w-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-rose-500 to-rose-600 text-white py-5 px-4 rounded-[22px] font-black shadow-lg shadow-rose-300/40 hover:shadow-rose-400/60 transition-all"
                >
                  <Users className="w-6 h-6" />
                  <span className="text-xs uppercase tracking-widest">Bacheca</span>
                </Link>
                <Link
                  to="/feed"
                  className="w-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-rose-500 to-rose-600 text-white py-5 px-4 rounded-[22px] font-black shadow-lg shadow-rose-300/40 hover:shadow-rose-400/60 transition-all"
                >
                  <LayoutGrid className="w-6 h-6" />
                  <span className="text-xs uppercase tracking-widest">Feed</span>
                </Link>
              </div>
            )}
          </motion.div>

          {!isLoggedIn && (
            <div className="flex justify-center mt-4">
              <button onClick={() => window.location.href = '/register'} className="flex items-center w-full max-w-[280px] justify-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 text-white/70 py-3 rounded-[16px] font-black text-[11px] hover:bg-white/10 hover:border-white/20 transition-all uppercase tracking-widest">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Continua con Google
              </button>
            </div>
          )}

        </div>

        {/* Feature cards — dark glass style */}
        <div className="space-y-3 px-1">
          <h2 className="text-left text-sm font-black text-white/30 uppercase tracking-widest px-1">Perché AMARSIUNPO</h2>
          {[
            {
              icon: UserPlus,
              title: "Iscrizione gratuita",
              desc: "Crea il tuo profilo in 2 minuti, nessuna carta richiesta",
              glowColor: 'rgba(244,63,94,0.15)',
              iconBg: 'rgba(244,63,94,0.15)',
              iconColor: "text-rose-400",
              borderColor: 'rgba(244,63,94,0.2)',
            },
            {
              icon: ShieldCheck,
              title: "Profili verificati",
              desc: "Ogni iscritto è verificato manualmente dal nostro team",
              glowColor: 'rgba(16,185,129,0.12)',
              iconBg: 'rgba(16,185,129,0.15)',
              iconColor: "text-emerald-400",
              borderColor: 'rgba(16,185,129,0.2)',
            },
            {
              icon: Sparkles,
              title: "AMARSIUNPO AI",
              desc: "Algoritmo di compatibilità che migliora con il tempo",
              glowColor: 'rgba(245,158,11,0.12)',
              iconBg: 'rgba(245,158,11,0.15)',
              iconColor: "text-amber-400",
              borderColor: 'rgba(245,158,11,0.2)',
            },
            {
              icon: MessageSquare,
              title: "Messaggi privati",
              desc: "Chatta in totale sicurezza con chi ti interessa",
              glowColor: 'rgba(99,102,241,0.12)',
              iconBg: 'rgba(99,102,241,0.15)',
              iconColor: "text-indigo-400",
              borderColor: 'rgba(99,102,241,0.2)',
            },
            {
              icon: Share2,
              title: "Condividi App",
              desc: "Invia AMARSIUNPO ai tuoi amici e invitali!",
              isSpecial: true,
              onClick: handleShare
            },
          ].map((f: any, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              onClick={f.onClick}
              className={cn(
                "rounded-[20px] p-4 flex items-center gap-4 transition-all backdrop-blur-xl",
                f.isSpecial
                  ? "bg-rose-600 border border-rose-500/60 shadow-2xl shadow-rose-900/40 active:scale-95 cursor-pointer"
                  : "border"
              )}
              style={!f.isSpecial ? {
                background: 'rgba(255,255,255,0.04)',
                borderColor: f.borderColor,
                boxShadow: `0 0 20px ${f.glowColor}`,
              } : {}}
            >
              <div className={cn('w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0', f.isSpecial && "bg-white/20")}
                style={!f.isSpecial ? { background: f.iconBg } : {}}>
                <f.icon className={cn('w-6 h-6', f.isSpecial ? "text-white" : f.iconColor)} />
              </div>
              <div className="text-left">
                <h3 className={cn("text-sm font-black", f.isSpecial ? "text-white" : "text-white/80")}>{f.title}</h3>
                <p className={cn("text-[11px] font-medium leading-snug mt-0.5", f.isSpecial ? "text-rose-100" : "text-white/35")}>{f.desc}</p>
              </div>
              {f.isSpecial && <ArrowRight className="w-4 h-4 text-white ml-auto" />}
            </motion.div>
          ))}

          {/* Purple Subscribe Button after Share */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => setShowPremiumModal(true)}
            className="rounded-[22px] p-5 flex items-center gap-4 bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-400/30 shadow-2xl shadow-purple-900/40 cursor-pointer active:scale-95 transition-all"
          >
            <div className="w-12 h-12 bg-white/20 rounded-[16px] flex items-center justify-center shrink-0 shadow-inner">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-sm font-black text-white">Abbonati Ora</h3>
              <p className="text-[10px] font-medium text-purple-100 leading-snug mt-0.5">Sblocca funzioni esclusive e chat illimitate!</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/50" />
          </motion.div>
        </div>

        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

        {/* ── FRIENDSHIP IMAGE (Smarginatura) ── */}
        {friendshipImage && (
          <div className="w-screen -mx-4 relative h-[300px] overflow-hidden my-8">
            <img src={friendshipImage} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="text-center px-8">
                  <h2 className="text-3xl font-black text-white drop-shadow-2xl">L'amicizia è l'anima della vita.</h2>
                  <p className="text-white/70 text-sm font-bold mt-2 italic">Incontra chi vibra alla tua stessa frequenza.</p>
               </div>
            </div>
          </div>
        )}

        {/* ── STEP TUTORIAL ── */}
        <div className="space-y-8 py-4">
          <div className="text-left space-y-1">
            <h2 className="text-2xl font-black text-white px-1">Come funziona AMARSIUNPO</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black px-1">La tua guida rapida al successo</p>
          </div>

          <div className="space-y-6 relative ml-4">
             {/* Vertical line connector */}
             <div className="absolute left-[20px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-rose-500 via-purple-500 to-indigo-500 opacity-20" />

             {[
               {
                 title: "1. Crea il tuo Destino",
                 desc: "Iscriviti e completa il tuo profilo. Carica le tue foto migliori e descrivi chi sei: la prima impressione conta!",
                 icon: UserPlus,
                 color: "bg-rose-500"
               },
               {
                 title: "2. Esplora la Community",
                 desc: "Visita la Bacheca per vedere i profili o il Feed per scoprire i post e i pensieri degli altri utenti.",
                 icon: LayoutGrid,
                 color: "bg-rose-600"
               },
               {
                 title: "3. La Magia del AMARSIUNPO",
                 desc: "Usa la funzione AMARSIUNPO per calcolare istantaneamente l'affinità tra te e gli altri utenti.",
                 icon: Sparkles,
                 color: "bg-purple-500"
               },
               {
                 title: "4. Stabilisci una Connessione",
                 desc: "Invia un SoulLink (richiesta di amicizia). Una volta accettata, potrete chattare liberamente!",
                 icon: Link2,
                 color: "bg-purple-600"
               },
               {
                 title: "5. Membri Certificati",
                 desc: "Cerca il badge di verifica: indica che il profilo è stato controllato manualmente dal nostro team.",
                 icon: ShieldCheck,
                 color: "bg-indigo-500"
               },
               {
                 title: "6. Esperienza Premium",
                 desc: "Accedi a visualizzazioni illimitate, priorità nei messaggi e badge esclusivi per distinguerti.",
                 icon: Crown,
                 color: "bg-indigo-600"
               }
             ].map((step, idx) => (
               <motion.div
                 key={idx}
                 initial={{ opacity: 0, x: -10 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: idx * 0.1 }}
                 className="flex gap-6 relative"
               >
                 <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-lg", step.color)}>
                   <step.icon className="w-5 h-5 text-white" />
                 </div>
                 <div className="text-left pt-1">
                   <h3 className="text-base font-black text-white">{step.title}</h3>
                   <p className="text-[12px] text-white/40 leading-relaxed mt-1 font-medium">{step.desc}</p>
                 </div>
               </motion.div>
             ))}
          </div>

          {/* Tutorial Final CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPremiumModal(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-sm shadow-[0_10px_30px_rgba(124,58,237,0.3)] mt-6 border border-purple-400/20"
          >
            Abbonati Ora & Inizia
          </motion.button>
        </div>
      </motion.div>

      {/* ── DECORATIVE BOTTOM ELEMENT ── */}
      <div className="pointer-events-none select-none w-full mt-16 pb-8 flex flex-col items-center gap-4 relative overflow-hidden">
        <div className="relative flex items-center justify-center">
          <Heart className="w-40 h-40 fill-current" style={{ color: 'rgba(244,63,94,0.06)', filter: 'blur(4px)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Heart className="w-20 h-20 fill-current" style={{ color: 'rgba(244,63,94,0.12)', filter: 'blur(2px)' }} />
          </div>
        </div>
        <svg viewBox="0 0 320 24" className="w-64" fill="none">
          <path d="M0 12 Q40 0 80 12 Q120 24 160 12 Q200 0 240 12 Q280 24 320 12" stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
        <p className="text-white/15 text-[9px] font-black uppercase tracking-[0.3em]">AMARSIUNPO &copy; 2025</p>
      </div>

      <AppFooter />
    </div>
  );
};


const LiveChatPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        setCurrentUser(normalizeUser(JSON.parse(saved)));
      } else {
        navigate('/register');
      }
    } catch (e) {
      navigate('/register');
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !id) return;
    const fetchData = async () => {
      setLoading(true);
      // Fetch profile
      const { data: prof } = await supabase.from('users').select('*').eq('id', id).single();
      if (prof) setProfile(prof);

      // Check friendship
      const { data: sl } = await supabase
        .from('soul_links')
        .select('id')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${currentUser.id})`)
        .eq('status', 'accepted')
        .maybeSingle();

      setIsFriend(!!sl);
      setLoading(false);
    };
    fetchData();
  }, [currentUser, id]);

  useEffect(() => {
    if (!profile || !currentUser) return;

    const fetchMsgs = async () => {
      // 1. Fetch live room messages
      const { data: liveMsgs } = await supabase
        .from('room_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      // 2. Fetch asynchronous chat requests (to display as messages)
      const { data: asyncMsgs } = await supabase
        .from('chat_requests')
        .select('*')
        .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${profile.id}),and(from_user_id.eq.${profile.id},to_user_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      const unified = [
        ...(liveMsgs || []).map(m => ({ ...m, type: 'live' })),
        ...(asyncMsgs || []).map(m => ({
          ...m,
          text: m.message,
          sender_id: m.from_user_id,
          receiver_id: m.to_user_id,
          type: 'async'
        }))
      ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setMessages(unified);
    };
    fetchMsgs();

    const roomChannel = supabase.channel('msgs_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages' }, (payload) => {
        const msg = payload.new;
        if ((msg.sender_id === currentUser.id && msg.receiver_id === profile.id) ||
          (msg.sender_id === profile.id && msg.receiver_id === currentUser.id)) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, { ...msg, type: 'live' }].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      })
      .subscribe();

    const asyncChannel = supabase.channel('msgs_async')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_requests' }, (payload) => {
        const msg = payload.new;
        if ((msg.from_user_id === currentUser.id && msg.to_user_id === profile.id) ||
          (msg.from_user_id === profile.id && msg.to_user_id === currentUser.id)) {
          setMessages(prev => {
            const mapped = { ...msg, text: msg.message, sender_id: msg.from_user_id, receiver_id: msg.to_user_id, type: 'async' };
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, mapped].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(asyncChannel);
    };
  }, [profile, currentUser]);

  // Mark chat as read when opened
  useEffect(() => {
    if (profile?.id && currentUser?.id) {
      try {
        const saved = localStorage.getItem('sm_read_chats');
        const read = saved ? JSON.parse(saved) : [];
        if (!read.includes(profile.id)) {
          const updated = [...new Set([...read, profile.id])];
          localStorage.setItem('sm_read_chats', JSON.stringify(updated));
          // Notification to other components (like BottomNav and ChatPage)
          window.dispatchEvent(new Event('chat-read-update'));
          window.dispatchEvent(new Event('user-auth-change'));
        }
      } catch (e) { }
    }
  }, [profile?.id, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !currentUser || !profile) return;
    const msgText = text;
    setText('');

    // Aggiornamento ottimistico
    const tempId = self.crypto.randomUUID();
    const optimisticMsg = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: profile.id,
      text: msgText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from('room_messages').insert([
      { id: tempId, sender_id: currentUser.id, receiver_id: profile.id, text: msgText }
    ]);

    if (error) {
      console.error("Errore chat live:", error);
      alert("Errore invio.");
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleClose = () => {
    navigate('/chat', { state: { activeTab: 'messaggi' } });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Sparkles className="w-8 h-8 text-rose-600 animate-pulse" /></div>;
  if (!profile || !currentUser) return null;

  if (isFriend === false) {
    return (
      <div className="min-h-screen bg-stone-50 pt-20 px-6 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-rose-100 rounded-[28px] flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-rose-600" />
        </div>
        <h2 className="text-xl font-serif font-black text-stone-900 mb-2">Accesso Riservato</h2>
        <p className="text-stone-500 text-sm mb-8 max-w-xs mx-auto">
          Puoi chattare solo con gli utenti che hanno accettato la tua richiesta di SoulLink.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-8 py-3 bg-rose-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all"
        >
          Torna indietro
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-20 pb-40 relative" style={{ background: '#0a0a0f' }}>
      {/* Floating hearts background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`
          @keyframes floatHeartLC {
            0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
            10%  { opacity: 0.6; }
            80%  { opacity: 0.3; }
            100% { transform: translateY(-100vh) rotate(15deg); opacity: 0; }
          }
          .fhlc { animation: floatHeartLC var(--dur,14s) ease-in-out var(--delay,0s) infinite; position: absolute; bottom: -5%; }
        `}</style>
        {[
          { left: '6%', size: 10, color: '#f43f5e', blur: 3, dur: 12, delay: 0 },
          { left: '20%', size: 7, color: '#a855f7', blur: 4, dur: 9, delay: 1.8 },
          { left: '40%', size: 14, color: '#ec4899', blur: 5, dur: 14, delay: 0.6 },
          { left: '60%', size: 8, color: '#f43f5e', blur: 2, dur: 11, delay: 2.8 },
          { left: '76%', size: 12, color: '#9333ea', blur: 4, dur: 13, delay: 1.2 },
          { left: '90%', size: 7, color: '#fb7185', blur: 3, dur: 10, delay: 3.8 },
        ].map((h, i) => (
          <div key={i} className="fhlc" style={{ left: h.left, '--dur': `${h.dur}s`, '--delay': `${h.delay}s`, filter: `blur(${h.blur}px)`, opacity: 0.12 } as React.CSSProperties}>
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" /></svg>
          </div>
        ))}
      </div>
      {/* Header */}
      <div className="sticky top-[64px] flex items-center gap-2 p-3 z-50 backdrop-blur-2xl" style={{ background: 'rgba(10,10,15,0.92)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors shrink-0">
          <ChevronRight className="w-6 h-6 rotate-180 text-white/70" />
        </button>
        <div
          className="flex items-center gap-3 flex-1 cursor-pointer active:opacity-70 transition-opacity"
          onClick={() => navigate(`/profile-detail/${profile.id}`)}
        >
          <ProfileAvatar
            user={profile}
            className="w-10 h-10 rounded-full"
            iconSize="w-5 h-5"
          />
          <div style={{ border: '2px solid #f43f5e', borderRadius: '50%', padding: 1, position: 'absolute', marginLeft: 0, width: 44, height: 44, boxShadow: '0 0 12px rgba(244,63,94,0.5)' }} />
          <div className="flex flex-col min-w-0 ml-2">
            <div className="font-black text-white text-[15px] leading-tight truncate">{profile.name}</div>
            {isUserOnline(profile) ? (
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> online
              </div>
            ) : (
              <div className="text-[10px] text-white/30 font-bold uppercase tracking-tight">disponibile</div>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 px-4 py-10 flex flex-col gap-4 relative z-10 overflow-x-hidden pt-24">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-4">
          {messages.map((m, idx) => {
            const isOwn = m.sender_id === currentUser.id;
            const prevMsg = messages[idx - 1];
            const isSameSender = prevMsg?.sender_id === m.sender_id;

            return (
              <div key={m.id} className={cn(
                "flex flex-col w-full",
                isOwn ? "items-end" : "items-start",
                !isSameSender && "mt-2"
              )}>
                <div className={cn(
                  "flex items-end gap-2 text-left w-full",
                  isOwn ? "flex-row-reverse" : "flex-row"
                )}>
                  {/* Avatar conditionally rendered */}
                  {!isSameSender ? (
                    <ProfileAvatar
                      user={isOwn ? currentUser : profile}
                      className="w-10 h-10 rounded-[14px] shrink-0 mb-1 border-2 border-white shadow-sm"
                      iconSize="w-5 h-5"
                    />
                  ) : (
                    <div className="w-10 shrink-0" />
                  )}

                  <div className={cn(
                    "px-4 py-2.5 text-[15px] font-medium shadow-md relative max-w-[70%] transition-all",
                    isOwn
                      ? "text-white rounded-[24px] rounded-br-sm"
                      : "rounded-[24px] rounded-bl-sm"
                  )}
                    style={isOwn
                      ? { background: '#f43f5e', boxShadow: '0 0 12px rgba(244,63,94,0.3)' }
                      : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }
                    }>
                    <div className="leading-relaxed whitespace-pre-wrap break-words">
                      {m.text.startsWith('[INTENT:') ? m.text.replace(/\[INTENT:.*?\] /, '') : m.text}
                    </div>
                    <div className={cn("text-[9px] font-black flex justify-end gap-1 mt-1.5 uppercase tracking-widest", isOwn ? "text-rose-200" : "text-stone-400")}>
                      {new Date(m.created_at).getHours()}:{String(new Date(m.created_at).getMinutes()).padStart(2, '0')}
                      {isOwn && <span className="text-rose-100 scale-125 ml-1">✓✓</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} className="pb-4" />
      </div>

      {/* Floating Input Layer */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-[120] pointer-events-none">
        <div className="flex gap-2 items-center pointer-events-auto">
          <div className="flex-1 bg-stone-900/95 backdrop-blur-2xl border border-white/10 rounded-[28px] p-1.5 shadow-2xl flex items-end min-h-[56px] transition-all">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(120, target.scrollHeight)}px`;
              }}
              className="flex-1 bg-transparent border-none text-white text-[15px] font-medium px-4 py-2.5 resize-none focus:outline-none focus:ring-0 placeholder:text-stone-500 max-h-[120px] leading-relaxed"
              rows={1}
              placeholder="Scrivi un messaggio..."
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-14 h-14 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-rose-900/40 active:scale-90 transition-all disabled:opacity-50 shrink-0"
            title="Invia"
          >
            <Send className="w-5 h-5 rotate-[-45deg] mr-0.5" />
          </button>
        </div>
      </div>

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
  const [soulLinkStatus, setSoulLinkStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected'>('none');
  const [soulLinkId, setSoulLinkId] = useState<string | null>(null);
  const [hasMatched, setHasMatched] = useState(false);
  const [matchScoreShared, setMatchScoreShared] = useState<number | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToImage = (idx: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: idx * scrollRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };


  const fetchInteractionState = async (currentUserId: string) => {
    const { data } = await supabase
      .from('interactions')
      .select('type, metadata')
      .eq('from_user_id', currentUserId)
      .eq('to_user_id', id);
    if (data) {
      setUserInteractions(data.map(i => i.type));
      const heartMatch = data.find(i => i.type === 'heart' && i.metadata?.match_score);
      if (heartMatch) {
        setHasMatched(true);
        setMatchScoreShared(heartMatch.metadata.match_score);
      }
    }
  };

  const handleReportUser = async () => {
    if (!currentUser || !profile) return;
    setIsSubmittingReport(true);
    try {
      const { error } = await supabase.from('reports').insert([{
        reporter_id: currentUser.id,
        reported_id: profile.id,
        reason: reportReason || 'Nessuna descrizione fornita',
        created_at: new Date().toISOString()
      }]);

      if (error) {
        throw new Error(error.message);
      }

      setToast({ message: 'Segnalazione inviata con successo.', type: 'success' });
    } catch (e) {
      console.error("Errore durante la segnalazione:", e);
      setToast({ message: 'Segnalazione inviata o in coda per approvazione.', type: 'success' });
    } finally {
      setIsReportModalOpen(false);
      setReportReason('');
      setIsSubmittingReport(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const init = async () => {
      let currentUserId: string | null = null;

      // 1. Get Current User and ensure real-time data from Supabase
      try {
        const saved = localStorage.getItem('amarsiunpo_user');
        if (saved) {
          const u = JSON.parse(saved);
          const { data, error } = await supabase.from('users').select('*').eq('id', u.id).single();
          if (data && !error) {
            const norm = normalizeUser(data);
            setCurrentUser(norm);
            currentUserId = norm.id;
          } else {
            const norm = normalizeUser(u);
            setCurrentUser(norm);
            currentUserId = norm.id;
          }
        }
      } catch (e) {
        console.error("ProfileDetail init user error:", e);
      }

      // 2. Fetch Profile Detail
      if (id) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (!isUUID) {
          setProfile(null);
          setLoading(false);
          return;
        }

        try {
          const { data: userProfile, error } = await supabase
            .from('users')
            .select(`
              *,
              interactions!to_user_id(type)
            `)
            .eq('id', id)
            .single();

          if (userProfile && !error) {
            const profileWithCounts = {
              ...userProfile,
              likes_count: (userProfile.interactions as any[] || []).filter(i => i.type === 'like').length,
              hearts_count: (userProfile.interactions as any[] || []).filter(i => i.type === 'heart').length
            };
            setProfile(normalizeUser(profileWithCounts));
          }
        } catch (e) {
          console.error("ProfileDetail fetch profile error:", e);
        }
        setLoading(false);
      }

      // 3. Fetch Status (Chat, Interactions, SoulLinks)
      if (currentUserId && id && currentUserId !== id) {
        try {
          // Chat Requests
          const { data: chatData } = await supabase
            .from('chat_requests')
            .select('status')
            .eq('from_user_id', currentUserId)
            .eq('to_user_id', id)
            .maybeSingle();
          if (chatData) setChatStatus(chatData.status);

          // Interactions (Likes/Hearts)
          fetchInteractionState(currentUserId);

          // SoulLinks (Friendships)
          const { data: slData } = await supabase
            .from('soul_links')
            .select('id, sender_id, receiver_id, status')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${currentUserId})`)
            .maybeSingle();

          if (slData) {
            setSoulLinkId(slData.id);
            if (slData.status === 'accepted') {
              setSoulLinkStatus('accepted');
            } else if (slData.status === 'pending') {
              setSoulLinkStatus(slData.sender_id === currentUserId ? 'pending_sent' : 'pending_received');
            } else {
              setSoulLinkStatus('rejected');
            }

            // Also check if the OTHER user sent a match heart to us
            const { data: incomingHeart } = await supabase
              .from('interactions')
              .select('metadata')
              .eq('from_user_id', id)
              .eq('to_user_id', currentUserId)
              .eq('type', 'heart')
              .maybeSingle();
            
            if (incomingHeart?.metadata?.match_score) {
              setHasMatched(true);
              setMatchScoreShared(incomingHeart.metadata.match_score);
            }
          } else {
            setSoulLinkStatus('none');
            setSoulLinkId(null);
          }
        } catch (e) {
          console.error("ProfileDetail status fetch error:", e);
        }
      }
    };

    init();
  }, [id]);

  const handleSendSoulLink = async () => {
    if (!currentUser?.id) {
      setToast({ message: 'Devi essere iscritto!', type: 'error' });
      return;
    }
    if (currentUser.id === id) return;

    if (!currentUser.is_paid) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('soul_links')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', currentUser.id)
        .gte('created_at', today.toISOString());

      if ((count || 0) >= 5) {
        setShowPremiumModal(true);
        return;
      }
    }

    const { data, error } = await supabase
      .from('soul_links')
      .insert([{ sender_id: currentUser.id, receiver_id: id }])
      .select()
      .single();

    if (!error && data) {
      setSoulLinkId(data.id);
      setSoulLinkStatus('pending_sent');
      setToast({ message: '✨ Richiesta inviata! Attendi la risposta.', type: 'success' });
    } else {
      setToast({ message: 'Errore nell\'invio della richiesta.', type: 'error' });
    }
  };

  const handleAcceptSoulLink = async () => {
    if (!soulLinkId || !currentUser?.id) return;

    if (!currentUser.is_paid) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('from_user_id', currentUser.id)
        .eq('type', 'soul_link_accept')
        .gte('created_at', today.toISOString());

      if ((count || 0) >= 2) {
        setShowPremiumModal(true);
        return;
      }
    }

    const { error } = await supabase
      .from('soul_links')
      .update({ status: 'accepted' })
      .eq('id', soulLinkId);

    if (!error) {
      // Record the acceptance interaction to track daily limit
      await supabase.from('interactions').insert([{
        from_user_id: currentUser.id,
        to_user_id: profile?.id,
        type: 'soul_link_accept'
      }]);

      setSoulLinkStatus('accepted');
      setToast({ message: '🎉 Ora siete amici!', type: 'success' });
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
      setToast({ message: 'Amicizia rimossa.', type: 'info' });
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
      const profileWithCounts = {
        ...updatedProfile,
        likes_count: (updatedProfile.interactions as any[] || []).filter(i => i.type === 'like').length,
        hearts_count: (updatedProfile.interactions as any[] || []).filter(i => i.type === 'heart').length
      };
      setProfile(normalizeUser(profileWithCounts));
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
    if (soulLinkStatus !== 'accepted') {
      setToast({ message: "La chat è riservata ai tuoi SoulLinks! Invia una richiesta di amicizia.", type: 'info' });
      return;
    }

    navigate(`/live-chat/${profile.id}`);
  };






  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}><Heart className="w-12 h-12 text-rose-500 fill-current" style={{ filter: 'drop-shadow(0 0 20px rgba(244,63,94,0.8))' }} /></motion.div></div>;
  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-6 text-center">
      <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
        <Info className="w-10 h-10 text-stone-300" />
      </div>
      <h2 className="text-xl font-serif font-black text-stone-900 mb-2">Profilo non trovato</h2>
      <p className="text-stone-500 text-sm mb-8 max-w-xs">Il profilo che stai cercando non esiste o è stato rimosso.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={() => navigate('/')} className="btn-primary py-4 flex items-center justify-center gap-2">
          <Home className="w-4 h-4" /> Torna alla Home
        </button>
      </div>
    </div>
  );

  const matchScore = calculateMatchScore(currentUser, profile);

  return (
    <div className="min-h-screen pt-16 pb-32 relative overflow-x-hidden" style={{ background: '#0a0a0f' }}>
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      {/* Floating hearts */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`
          @keyframes floatHeartPD { 0%{transform:translateY(0) rotate(0deg);opacity:0;} 10%{opacity:1;} 80%{opacity:0.4;} 100%{transform:translateY(-110vh) rotate(20deg);opacity:0;} }
          .fhpd { animation: floatHeartPD var(--dur,12s) ease-in-out var(--delay,0s) infinite; position:absolute; bottom:-10%; }
        `}</style>
        {[
          { left: '5%', size: 8, color: '#f43f5e', blur: 3, dur: 11, delay: 0 },
          { left: '22%', size: 5, color: '#a855f7', blur: 4, dur: 8, delay: 1.6 },
          { left: '42%', size: 12, color: '#ec4899', blur: 5, dur: 13, delay: 0.7 },
          { left: '65%', size: 7, color: '#f43f5e', blur: 2, dur: 10, delay: 2.3 },
          { left: '83%', size: 9, color: '#9333ea', blur: 4, dur: 12, delay: 1.1 },
        ].map((h, i) => (
          <div key={i} className="fhpd" style={{ left: h.left, '--dur': `${h.dur}s`, '--delay': `${h.delay}s`, filter: `blur(${h.blur}px)`, opacity: 0.15 } as React.CSSProperties}>
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" /></svg>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── HERO PHOTO ── */}
      <div className="relative w-full h-[75vh] min-h-[500px] overflow-hidden" style={{ background: '#0a0a0f' }}>
        <div 
          ref={scrollRef}
          className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
          onScroll={(e) => {
            const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
            if (idx !== heroIndex) setHeroIndex(idx);
          }}
        >
          {profile.photos && profile.photos.length > 0 ? (
            profile.photos.map((photo, pIdx) => (
              <div key={pIdx} className="w-full h-full flex-shrink-0 snap-center relative">
                <img
                  src={photo}
                  alt={`${profile.name} - ${pIdx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))
          ) : (
            <div className="w-full h-full flex-shrink-0 snap-center relative">
              <ProfileAvatar user={profile} className="w-full h-full" iconSize="w-32 h-32" />
            </div>
          )}
        </div>

        {/* Photo Indicators */}
        {(profile.photos && profile.photos.length > 1) && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 flex gap-1 z-30">
            {profile.photos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToImage(idx)}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  idx === heroIndex ? "w-6 bg-white/50" : "w-1.5 bg-white/15"
                )}
              />
            ))}
          </div>
        )}

        {/* CSS mask: photo fades naturally at bottom (Fixed above scrollable content) */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 70%, rgba(10,10,15,0.8) 90%, #0a0a0f 100%)'
        }} />

          {/* ── ONLINE / OFFLINE badge top-left ── */}
          <div className="absolute top-5 left-5 z-20">
            {isUserOnline(profile) ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md" style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(52,211,153,0.5)' }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <span className="w-2 h-2 rounded-full bg-stone-400" />
                <span className="text-[10px] font-black text-stone-300 uppercase tracking-wider">Offline</span>
              </div>
            )}
          </div>

          {/* ── LIKE + HEART stats bar (Relocated to top-right) ── */}
          <div className="absolute top-5 right-5 z-20 flex gap-2">
            <button
              onClick={() => handleInteract('like')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl backdrop-blur-xl transition-all active:scale-95 shadow-xl"
              style={{
                background: userInteractions.includes('like') ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)',
                border: userInteractions.includes('like') ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(255,255,255,0.15)',
                boxShadow: userInteractions.includes('like') ? '0 0 20px rgba(52,211,153,0.3)' : '0 10px 30px rgba(0,0,0,0.3)'
              }}
            >
              <ThumbsUp className={cn("w-4 h-4", userInteractions.includes('like') ? "text-emerald-400 fill-current" : "text-white/60")} />
              <span className={cn("text-xs font-black", userInteractions.includes('like') ? "text-emerald-300" : "text-white/70")}>{profile.likes_count || 0}</span>
            </button>
            <button
              onClick={() => handleInteract('heart')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl backdrop-blur-xl transition-all active:scale-95 shadow-xl"
              style={{
                background: userInteractions.includes('heart') ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.08)',
                border: userInteractions.includes('heart') ? '1px solid rgba(244,63,94,0.5)' : '1px solid rgba(255,255,255,0.15)',
                boxShadow: userInteractions.includes('heart') ? '0 0 20px rgba(244,63,94,0.3)' : '0 10px 30px rgba(0,0,0,0.3)'
              }}
            >
              <Heart className={cn("w-4 h-4", userInteractions.includes('heart') ? "text-rose-400 fill-current" : "text-white/60")} />
              <span className={cn("text-xs font-black", userInteractions.includes('heart') ? "text-rose-300" : "text-white/70")}>{profile.hearts_count || 0}</span>
            </button>
        </div>
      </div>

      <div className="relative z-10 -mt-20 px-5 pb-10">
        {/* Spacing to lower the name block as requested - Adjusted higher by 30px (150 -> 120) */}
        <div className="h-[70px]" />

        {/* Name / age / city block & Match Widget - Compact margin mb-2 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1">
            <h1 className="text-3xl font-montserrat font-black text-white leading-tight drop-shadow-lg">
              {profile.name}{profile.dob && calculateAge(profile.dob) > 0 ? <span className="font-light text-2xl text-white/60">, {calculateAge(profile.dob)}</span> : null}
            </h1>
            <p className="text-white/50 text-[11px] font-bold mt-1 uppercase tracking-widest">
              {profile.gender}{profile.orientation?.length ? ` • ${(profile.orientation as string[]).join(', ')}` : ''}
            </p>
            {profile.city && (
              <p className="flex items-center gap-1 text-white/40 text-xs font-semibold mt-1">
                <MapPin className="w-3 h-3 text-rose-400" />{profile.city}{profile.province ? `, ${profile.province}` : ''}
              </p>
            )}
            {!!profile.is_paid && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24' }}>
                <Sparkles className="w-3 h-3" /> Membro Premium
              </div>
            )}
          </div>

          {/* Match Widget Next to Name - Shown only after executing AMARSIUNPO (hasMatched) */}
          {currentUser && hasMatched && (matchScoreShared || matchScore) > 0 && (
             <div className="shrink-0 -mt-17 scale-[0.88] origin-top-right">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <style>{`
                    @keyframes pulseCircle {
                      0% { transform: scale(1); opacity: 0.15; }
                      50% { transform: scale(1.1); opacity: 0.25; }
                      100% { transform: scale(1); opacity: 0.15; }
                    }
                    @keyframes floatSmallH {
                      0% { transform: translate(0,0) scale(1); opacity: 0; }
                      50% { opacity: 0.8; }
                      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
                    }
                    @keyframes neonRotate {
                      0% { transform: rotate(0deg) scale(1.1); filter: hue-rotate(0deg) blur(15px); }
                      50% { transform: rotate(180deg) scale(1.25); filter: hue-rotate(45deg) blur(25px); }
                      100% { transform: rotate(360deg) scale(1.1); filter: hue-rotate(0deg) blur(15px); }
                    }
                    @keyframes twinkleStar {
                      0%, 100% { opacity: 0.2; transform: scale(0.5) translate(0,0); }
                      50% { opacity: 1; transform: scale(1.2) translate(var(--dx), var(--dy)); }
                    }
                    .neon-glow { animation: neonRotate 6s linear infinite; }
                    .pulse { animation: pulseCircle 3s ease-in-out infinite; }
                    .floating-h { animation: floatSmallH var(--dur) ease-out infinite; }
                    .twinkle-star { animation: twinkleStar var(--dur) ease-in-out infinite; }
                  `}</style>

                  {/* Neon Glow Layer behind everything */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-rose-500 via-purple-500 to-rose-400 rounded-full opacity-30 blur-2xl neon-glow" />

                  {/* Starry Mini Hearts background */}
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={`star-${i}`}
                      className="absolute twinkle-star pointer-events-none"
                      style={{
                        '--dx': `${(Math.random() - 0.5) * 60}px`,
                        '--dy': `${(Math.random() - 0.5) * 60}px`,
                        '--dur': `${2 + Math.random() * 3}s`,
                        top: `${20 + Math.random() * 60}%`,
                        left: `${20 + Math.random() * 60}%`,
                        color: i % 2 === 0 ? '#f43f5e' : '#ec4899',
                        opacity: 0.4
                      } as React.CSSProperties}
                    >
                      <Heart className="w-1.5 h-1.5 fill-current" />
                    </div>
                  ))}

                  {/* Outer Decorative Rings */}
                  <div className="absolute inset-0 rounded-full border border-rose-500/10 pulse" />
                  <div className="absolute inset-2 rounded-full border border-rose-500/20 pulse" style={{ animationDelay: '0.5s' }} />
                  
                  {/* Rising mini-hearts */}
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute floating-h"
                      style={{
                        '--tx': `${(i % 2 === 0 ? 1 : -1) * (15 + i * 5)}px`,
                        '--ty': `${-40 - i * 10}px`,
                        '--dur': `${2 + i * 0.5}s`,
                        left: '50%',
                        top: '50%',
                        color: i % 2 === 0 ? '#f43f5e' : '#ec4899',
                        filter: 'drop-shadow(0 0 5px currentColor)'
                      } as React.CSSProperties}
                    >
                      <Heart className="w-2 h-2 fill-current" />
                    </div>
                  ))}

                  {/* Main Widget Body */}
                  <div className="relative group/widget">
                    <div className="absolute inset-0 bg-rose-500 rounded-full blur-xl opacity-20 group-hover/widget:opacity-40 transition-opacity" />
                    <div className="relative w-24 h-24 bg-[#0a0a0f] rounded-full border-2 border-rose-500/40 flex flex-col items-center justify-center p-2 shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-transparent to-purple-500/20 animate-spin-slow opacity-50" />
                      <Heart className="w-8 h-8 text-rose-500 fill-current mb-0.5 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-xl font-black text-white tracking-tighter">{matchScore}%</span>
                        <span className="text-[6px] font-black text-rose-400 uppercase tracking-[0.2em] mt-0.5">Match</span>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
          )}
        </div>

        {/* Small spacer before buttons - reduced from h-10 to h-4 */}
        <div className="h-4" />

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={
              soulLinkStatus === 'none' ? handleSendSoulLink :
                soulLinkStatus === 'pending_received' ? handleAcceptSoulLink :
                  soulLinkStatus === 'accepted' ? handleRemoveSoulLink :
                    () => { }
            }
            className="w-full py-4 rounded-[22px] font-black text-sm uppercase tracking-widest text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            style={
              soulLinkStatus === 'accepted'
                ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }
                : soulLinkStatus === 'pending_sent'
                  ? { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', backdropFilter: 'blur(20px)' }
                  : soulLinkStatus === 'pending_received'
                    ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', backdropFilter: 'blur(20px)' }
                    : { background: 'linear-gradient(135deg, rgba(244,63,94,0.4), rgba(147,51,234,0.4))', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(244,63,94,0.2)' }
            }
          >
            {soulLinkStatus === 'accepted' ? <><UserCheck className="w-4 h-4" /> Siete Amici</> :
              soulLinkStatus === 'pending_sent' ? <><Users className="w-4 h-4" /> Richiesta Inviata</> :
                soulLinkStatus === 'pending_received' ? <><CheckCircle className="w-4 h-4" /> Accetta Amicizia</> :
                  <><UserPlus className="w-4 h-4" /> Richiesta di Amicizia</>}
          </button>

          <button
            onClick={handleInstantChat}
            className="w-full py-4 rounded-[22px] font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: soulLinkStatus === 'accepted' ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)',
              border: soulLinkStatus === 'accepted' ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <MessageCircle className={cn("w-4 h-4", soulLinkStatus === 'accepted' ? "text-emerald-400" : "text-white/40")} />
            Chatta Ora
          </button>
        </div>


      </div>


      {/* ── CONTENT ── */}
      <div className="mx-4 mt-4 space-y-4">

        {/* Bio */}
        {profile.description && (
          <div className="rounded-[24px] p-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-base font-montserrat font-black text-white mb-2">Bio</h2>
            <p className="text-white/60 leading-relaxed text-sm italic">"{profile.description}"</p>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest mb-1">Lavoro</p>
            <p className="text-sm font-semibold text-white/80 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-rose-400 shrink-0" />{profile.job || 'Privato'}
            </p>
          </div>
          <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest mb-1">Orientamento</p>
            <p className="text-sm font-semibold text-white/80 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-rose-400 shrink-0" />{profile.orientation}
            </p>
          </div>
        </div>

        {/* Interests */}
        {profile.hobbies && (
          <div className="rounded-[24px] p-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-base font-serif font-black text-white mb-3">Interessi</h2>
            {profile.hobbies && (
              <div className="flex flex-wrap gap-2">
                {profile.hobbies.split(',').map((h: string, i: number) => h.trim() && (
                  <span key={i} className="px-3 py-1.5 text-white/80 rounded-full text-xs font-semibold" style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.25)' }}>{h.trim()}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Looking for */}
        <div className="rounded-[24px] p-5" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
          <h2 className="text-base font-montserrat font-black text-white mb-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-rose-400" /> Cosa Cerca
          </h2>
          <p className="text-xs text-white/40 font-semibold mb-1">Preferenza: <span className="text-white/70">{(profile.looking_for_gender || []).join(', ')}</span></p>
          <p className="text-xs text-white/60 leading-relaxed">{profile.looking_for_other || 'In cerca di una connessione autentica e momenti speciali.'}</p>
        </div>

        {/* Gallery */}
        {profile.photos && profile.photos.length > 0 && (
          <div className="rounded-[24px] p-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-[18px]" style={{ background: 'rgba(244,63,94,0.15)' }}>
              <Camera className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 scrollbar-hide">
              {profile.photos.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setZoomedImage(url)}
                  className="w-[210px] h-[210px] shrink-0 snap-center rounded-[20px] overflow-hidden relative"
                  style={{ border: '1.5px solid rgba(244,63,94,0.3)' }}
                >
                  <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-1 mt-3">
              {profile.photos.map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-rose-500/30" />
              ))}
            </div>
          </div>
        )}

        {/* Feed Section Header */}
        {!loading && (
          <div className="rounded-[24px] p-5 mt-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-center w-12 h-12 rounded-[18px] mb-2" style={{ background: 'rgba(52,211,153,0.15)' }}>
              <LayoutGrid className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="pt-2">
          <FeedComponent userId={profile.id} isOwner={false} />
        </div>

        {/* ── REPORT USER BUTTON ── */}
        <div className="pt-8 pb-10">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-[24px] text-rose-500/60 font-black text-xs uppercase tracking-widest border border-rose-500/10 hover:bg-rose-500/5 transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            Segnala Utente
          </button>
        </div>
      </div>



      {/* ── REPORT MODAL ── */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-6 overflow-hidden relative"
              style={{ background: '#1a1a22', border: '1px solid rgba(244,63,94,0.3)' }}
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-rose-500/20">
                  <AlertTriangle className="w-7 h-7 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Segnala Utente</h3>
                <p className="text-white/40 text-xs leading-relaxed px-4">
                  Stai segnalando <span className="text-white/80">{profile.name}</span>. <br />
                  <strong className="text-rose-400">Attenzione:</strong> questa azione è definitiva e non può essere revocata.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Motivazione (Opzionale)</label>
                <textarea
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  placeholder="Descrivi brevemente il motivo della segnalazione..."
                  className="w-full bg-white/5 border border-white/10 rounded-[20px] p-4 text-white text-sm outline-none focus:border-rose-500/30 transition-all resize-none h-32 placeholder:text-white/20"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  disabled={isSubmittingReport}
                  onClick={handleReportUser}
                  className="w-full py-4 rounded-[22px] bg-rose-500 text-white font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmittingReport ? 'Invio in corso...' : 'Conferma Segnalazione'}
                </button>
                <button
                  disabled={isSubmittingReport}
                  onClick={() => { setIsReportModalOpen(false); setReportReason(''); }}
                  className="w-full py-4 rounded-[22px] bg-white/5 border border-white/10 text-white/50 font-black text-sm uppercase tracking-widest hover:text-white transition-all"
                >
                  Annulla
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── IMAGE ZOOM MODAL ── */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl cursor-zoom-out"
          >
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/20 z-50"
            >
              <X className="w-6 h-6" />
            </motion.button>
            <motion.img
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              src={zoomedImage}
              className="max-w-full max-h-[85vh] rounded-[32px] shadow-2xl object-contain"
              style={{ border: '2px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BachecaPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCity, setFilterCity] = useState<string>('Tutte');
  const [filterGender, setFilterGender] = useState<string>('Tutti');
  const [filterBodyType, setFilterBodyType] = useState<string>('Tutte');
  const [filterAge, setFilterAge] = useState<[number, number]>([18, 99]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showAMARSIUNPO, setShowAMARSIUNPO] = useState(false);
  const [amarsiunpoToast, setSoulmatchToast] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [sharedMatches, setSharedMatches] = useState<Record<string, number>>({});
  const bachecaScrollRef = useRef<HTMLDivElement>(null);

  const scrollToHero = (idx: number) => {
    if (bachecaScrollRef.current) {
      bachecaScrollRef.current.scrollTo({
        left: idx * bachecaScrollRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  const fetchFriends = async (userId: string) => {
    const { data } = await supabase
      .from('soul_links')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');
    if (data) {
      setFriends(data.map(sl => sl.sender_id === userId ? sl.receiver_id : sl.sender_id));
    }
  };

  const fetchSharedMatches = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('interactions')
        .select('from_user_id, to_user_id, metadata')
        .eq('type', 'heart')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

      if (data) {
        const map: Record<string, number> = {};
        data.forEach(i => {
          if (i.metadata?.match_score) {
            const otherId = i.from_user_id === userId ? i.to_user_id : i.from_user_id;
            map[otherId] = i.metadata.match_score;
          }
        });
        setSharedMatches(map);
      }
    } catch (e) { }
  };

  useEffect(() => {
    const saved = localStorage.getItem('amarsiunpo_unlocked_ids');
    if (saved) setUnlockedIds(JSON.parse(saved));
  }, [showAMARSIUNPO]);

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        const u = JSON.parse(saved);
        // Ensure we have REAL data from Supabase
        const { data: realUser } = await supabase.from('users').select('*').eq('id', u.id).single();
        if (realUser) {
          const norm = normalizeUser(realUser);
          setCurrentUser(norm);
          await Promise.all([fetchFriends(norm.id), fetchSharedMatches(norm.id)]);
        } else {
          setCurrentUser(normalizeUser(u));
          await Promise.all([fetchFriends(u.id), fetchSharedMatches(u.id)]);
        }
      }
    };
    init();
  }, []);

  const SM_COOLDOWN_KEY = 'amarsiunpo_last_used';
  const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h


  const getAMARSIUNPOCooldownRemaining = (): number => {
    const last = localStorage.getItem(SM_COOLDOWN_KEY);
    if (!last) return 0;
    const elapsed = Date.now() - parseInt(last);
    return Math.max(0, COOLDOWN_MS - elapsed);
  };

  const isAMARSIUNPOOnCooldown = () => getAMARSIUNPOCooldownRemaining() > 0;

  const [showAMARSIUNPOConfirm, setShowAMARSIUNPOConfirm] = useState(false);

  const formatCooldown = (): string => {
    const ms = getAMARSIUNPOCooldownRemaining();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const handleAMARSIUNPOPress = () => {
    if (isAMARSIUNPOOnCooldown()) {
      setSoulmatchToast(true);
      setTimeout(() => setSoulmatchToast(false), 4000);
      return;
    }
    setShowAMARSIUNPOConfirm(true);
  };

  const confirmAMARSIUNPO = () => {
    localStorage.setItem(SM_COOLDOWN_KEY, Date.now().toString());
    setShowAMARSIUNPOConfirm(false);
    setShowAMARSIUNPO(true);
  };

  const fetchProfiles = async () => {
    setLoading(true);
    // Exclusive Supabase fetch
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
            *,
            interactions!to_user_id(type)
          `);

      if (data && !error) {
        const processed = data.map(u => ({
          ...normalizeUser(u),
          likes_count: (u.interactions as any[] || []).filter(i => i.type === 'like').length,
          hearts_count: (u.interactions as any[] || []).filter(i => i.type === 'heart').length
        }));
        setProfiles(processed);
      }
    } catch (e) {
      console.error("Profiles fetching failed:", e);
    }
    setLoading(false);
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        const user = normalizeUser(JSON.parse(saved));
        setCurrentUser(user);
        fetchProfiles();
      } else {
        navigate('/register');
      }
    } catch (e) {
      navigate('/register');
    }

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

      // Check if we came from Feed to trigger AMARSIUNPO
      const params = new URLSearchParams(location.search);
      if (params.get('amarsiunpo')) {
        window.history.replaceState({}, '', window.location.pathname);
        handleAMARSIUNPOPress();
      }
    }
  }, [loading, profiles, location.search]);

  const genderOptions = ['Uomo', 'Donna', 'Non-binario', 'Transgender', 'Genderfluid', 'Queer', 'Altro'];
  const orientationOptions = ['Eterosessuale', 'Gay', 'Lesbica', 'Bisessuale', 'Pansessuale', 'Queer', 'Altro'];
  const cityOptions = useMemo(() => {
    const rawCities = profiles.map(p => p.city).filter(Boolean);
    const normalizedCities = rawCities.map(c => typeof c === 'string' ? c.trim().charAt(0).toUpperCase() + c.trim().slice(1).toLowerCase() : c);
    return ['Tutte', ...Array.from(new Set(normalizedCities))].sort();
  }, [profiles]);

  // ─── BASE compatible profiles: orientation + photo check + UI filters (no gender chip)
  const baseCompatibleProfiles = useMemo(() => profiles.filter(p => {
    // Exclude self, blocked, suspended
    if (currentUser && p.id === currentUser.id) return false;
    if (p.is_blocked || p.is_suspended) return false;

    // Ensure "real" users have at least one valid photo or a photo URL
    const hasPhoto = (p.photos && p.photos.length > 0 && p.photos[0]?.trim()) || (p.photo_url && p.photo_url.trim());
    if (!hasPhoto) return false;

    // ─── 1. Secondary UI filters (city, age, body type) ───
    const cityMatch = filterCity === 'Tutte' || (p.city && p.city.trim().toLowerCase() === filterCity.toLowerCase());
    const bodyTypeMatch = filterBodyType === 'Tutte' || p.body_type === filterBodyType;
    const age = p.dob ? calculateAge(p.dob) : null;
    const ageMatch = !age || (age >= filterAge[0] && age <= filterAge[1]);
    const nameMatch = !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!cityMatch || !ageMatch || !bodyTypeMatch || !nameMatch) return false;

    // ─── 2. Compatibility check (orientation + looking_for_gender)
    const getMacroArea = (gender: string) => {
      const g = gender?.toLowerCase() || '';
      if (['uomo', 'mascolino'].includes(g)) return 'M';
      if (['donna', 'femminile'].includes(g)) return 'F';
      if (['non-binario', 'genderfluid', 'queer', 'genderqueer', 'agender', 'bigender', 'pangender', 'neutrois', 'intersex', 'altro'].includes(g)) return 'NB';
      if (['transgender'].includes(g)) return 'TRANS';
      return 'NB'; // Default fallback
    };

    const viewer = normalizeUser(currentUser);
    const target = normalizeUser(p);
    if (!viewer || !target) return false;

    const macroV = getMacroArea(viewer.gender);
    const macroT = getMacroArea(target.gender);

    const isWildcard = (arr: string[]) => arr.some(v => ['tutti', 'tutte', 'entrambi', 'qualsiasi', 'tutti i generi'].includes(v));
    const targetGender = target.gender?.toLowerCase() || '';

    // A. PREFERENZE ESPLICITE DEL PROFILO (looking_for_gender) — massima priorità
    // Se l'utente ha impostato looking_for_gender nel suo profilo, quello è il suo CONSENSO ESPLICITO
    const profileWants = parseArrField(viewer.looking_for_gender).map((g: string) => g.toLowerCase());
    const hasProfileWants = profileWants.length > 0 && !isWildcard(profileWants);

    if (hasProfileWants) {
      // Se il target rientra nelle preferenze esplicite → ok, niente altri blocchi
      const targetAllowedByProfile = profileWants.includes(targetGender);
      if (!targetAllowedByProfile) return false;

      // Verifica reciprocità lato target (il target deve almeno potenzialmente essere aperto al viewer)
      const orisT = target.orientation || [];
      const checkOriTarget = (myMacro: string, myOris: string[], targetMacro: string) => {
        if (!myOris || myOris.length === 0) return true;
        if (myMacro === 'NB' || targetMacro === 'NB') return true;
        if (myOris.includes('Eterosessuale')) {
          return (myMacro === 'M' && targetMacro === 'F') || (myMacro === 'F' && targetMacro === 'M') || targetMacro === 'TRANS';
        }
        if (myOris.includes('Gay') || myOris.includes('Lesbica')) {
          return myMacro === targetMacro || targetMacro === 'TRANS' || targetMacro === 'NB';
        }
        return true;
      };
      const targetCompatible = checkOriTarget(macroT, orisT, macroV);
      if (!targetCompatible) return false;

      return true;
    }

    // B. FALLBACK: Inferenza da orientamento (quando looking_for_gender è vuoto)
    const checkOri = (myMacro: string, myOris: string[], targetMacro: string) => {
      if (!myOris || myOris.length === 0) return true;
      if (myMacro === 'NB' || targetMacro === 'NB') return true;
      if (myOris.includes('Eterosessuale')) {
        return (myMacro === 'M' && targetMacro === 'F') || (myMacro === 'F' && targetMacro === 'M') || targetMacro === 'TRANS';
      }
      if (myOris.includes('Gay') || myOris.includes('Lesbica')) {
        return myMacro === targetMacro || targetMacro === 'TRANS' || targetMacro === 'NB';
      }
      return true;
    };

    const orisV = viewer.orientation || [];
    const orisT = target.orientation || [];
    if (!checkOri(macroV, orisV, macroT)) return false;
    if (!checkOri(macroT, orisT, macroV)) return false;

    return true;

    return true;
  }), [profiles, currentUser, searchTerm, filterCity, filterAge, filterBodyType]);

  const availableGenderChips = useMemo(() => {
    const genders = baseCompatibleProfiles
      .map(p => p.gender)
      .filter(Boolean)
      .map(g => {
        const s = (g as string).trim();
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      });
    const unique = Array.from(new Set(genders)).sort();
    return unique.length >= 2 ? unique : [];
  }, [baseCompatibleProfiles]);

  // Final filtered list: apply gender chip on top of base
  const filteredProfiles = useMemo(() => {
    if (filterGender === 'Tutti') return baseCompatibleProfiles;
    return baseCompatibleProfiles.filter(p => {
      const g = (p.gender || '').trim().charAt(0).toUpperCase() + (p.gender || '').trim().slice(1).toLowerCase();
      return g === filterGender;
    });
  }, [baseCompatibleProfiles, filterGender]);

  // Quick reaction on profile cards (one per user)
  const [cardReactions, setCardReactions] = useState<Record<string, 'like' | 'heart' | null>>({});

  const handleQuickReaction = async (profileId: string, type: 'like' | 'heart', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser?.id) return;
    const existing = cardReactions[profileId];
    if (existing === type) return; // already reacted with this type
    setCardReactions(prev => ({ ...prev, [profileId]: type }));
    try {
      // Elimina prima la reazione precedente (like/heart)
      await supabase
        .from('interactions')
        .delete()
        .eq('from_user_id', currentUser.id)
        .eq('to_user_id', profileId);

      const { error } = await supabase
        .from('interactions')
        .insert([{
          from_user_id: currentUser.id,
          to_user_id: profileId,
          type: type
        }]);
      if (error) throw error;
    } catch (err) {
      console.error('Quick reaction error:', err);
    }
  };


  const [heroIndex, setHeroIndex] = useState(0);
  const heroProfiles = useMemo(() => {
    // Priorità agli utenti Premium (is_paid), poi ordinamento casuale
    return [...filteredProfiles].sort((a, b) => {
      if (a.is_paid && !b.is_paid) return -1;
      if (!a.is_paid && b.is_paid) return 1;
      return Math.random() - 0.5;
    }).slice(0, 10); // Aumentato a 10 per mostrare più suggerimenti
  }, [filteredProfiles]);

  // Reset index if profiles change to prevent out of bounds
  useEffect(() => {
    if (heroIndex >= heroProfiles.length) {
      setHeroIndex(0);
    }
  }, [heroProfiles.length]);

  // Auto-rotate hero slider
  useEffect(() => {
    if (heroProfiles.length < 2) return;
    const timer = setInterval(() => {
      const next = (heroIndex + 1) % heroProfiles.length;
      setHeroIndex(next);
      scrollToHero(next);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroProfiles.length, heroIndex]);

  const heroProfile = heroProfiles[heroIndex] || null;

  return (
    <div className="min-h-screen pt-16 pb-28 relative overflow-x-hidden" style={{ background: '#0a0a0f' }}>

      {/* ── FLOATING HEARTS BACKGROUND ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`
          @keyframes floatHeart {
            0%   { transform: translateY(0px) translateX(0px) rotate(0deg) scale(1); opacity: 0; }
            10%  { opacity: 1; }
            80%  { opacity: 0.6; }
            100% { transform: translateY(-110vh) translateX(var(--dx,0px)) rotate(var(--r,15deg)) scale(var(--s,1)); opacity: 0; }
          }
          .fh { animation: floatHeart var(--dur,12s) ease-in-out var(--delay,0s) infinite; position: absolute; bottom: -10%; }
        `}</style>
        {[
          { left: '8%', size: 18, color: '#f43f5e', blur: 2, dur: 14, delay: 0, dx: 30, r: '20deg', s: 1.2 },
          { left: '18%', size: 11, color: '#fb7185', blur: 3, dur: 11, delay: 2, dx: -20, r: '-15deg', s: 0.9 },
          { left: '30%', size: 24, color: '#9333ea', blur: 4, dur: 16, delay: 1, dx: 15, r: '10deg', s: 1.1 },
          { left: '42%', size: 14, color: '#f43f5e', blur: 2, dur: 13, delay: 3.5, dx: -35, r: '25deg', s: 1.0 },
          { left: '55%', size: 20, color: '#ec4899', blur: 3, dur: 15, delay: 0.5, dx: 20, r: '-20deg', s: 1.3 },
          { left: '65%', size: 10, color: '#a855f7', blur: 4, dur: 10, delay: 2.5, dx: -10, r: '30deg', s: 0.8 },
          { left: '75%', size: 26, color: '#f43f5e', blur: 5, dur: 18, delay: 1.5, dx: 25, r: '-10deg', s: 1.0 },
          { left: '85%', size: 15, color: '#fb7185', blur: 2, dur: 12, delay: 4, dx: -15, r: '15deg', s: 0.9 },
          { left: '22%', size: 22, color: '#ec4899', blur: 6, dur: 17, delay: 5, dx: 10, r: '-25deg', s: 1.2 },
          { left: '48%', size: 12, color: '#9333ea', blur: 3, dur: 9, delay: 6, dx: -25, r: '20deg', s: 0.7 },
          { left: '92%', size: 18, color: '#f43f5e', blur: 4, dur: 13, delay: 3, dx: -30, r: '-15deg', s: 1.1 },
          { left: '5%', size: 9, color: '#a855f7', blur: 2, dur: 11, delay: 7, dx: 20, r: '10deg', s: 0.8 },
        ].map((h, i) => (
          <div
            key={i}
            className="fh"
            style={{
              left: h.left,
              '--dur': `${h.dur}s`,
              '--delay': `${h.delay}s`,
              '--dx': `${h.dx}px`,
              '--r': h.r,
              '--s': h.s,
              filter: `blur(${h.blur}px)`,
              opacity: 0.3,
              transform: 'scale(1.1)'
            } as React.CSSProperties}
          >
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color} style={{ filter: `drop-shadow(0 0 15px ${h.color})` }}>
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
          </div>
        ))}
      </div>

      {/* ── DOCUMENT REJECTED BANNER (Bacheca) ── */}
      <SharedRejectedDocumentBanner currentUser={currentUser} />

      {/* ── HERO PHOTO SLIDER ── */}
      {!loading && heroProfiles.length > 0 && (
        <div className="relative w-full h-[85vh] min-h-[550px] overflow-hidden rounded-[40px]">
          <div 
            ref={bachecaScrollRef}
            className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
            onScroll={(e) => {
              const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
              if (idx !== heroIndex) setHeroIndex(idx);
            }}
          >
            {heroProfiles.map((p, i) => (
              <div key={p.id} className="w-full h-full shrink-0 snap-center relative">
                <img
                  src={(p.photos?.[0]) || p.photo_url || `https://picsum.photos/seed/${p.name}/600/800`}
                  className="w-full h-full object-cover object-top"
                />
                {/* Cinematic overlays */}
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(10,10,15,0.9) 100%)'
                }} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.6)_100%)] opacity-70" />

                {/* Clickable area to navigate */}
                <div
                  className="absolute inset-0 z-10 cursor-pointer"
                  onClick={() => navigate(`/profile-detail/${p.id}`)}
                />

                {/* Info block per slide */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 z-20 pointer-events-none">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-3xl font-montserrat font-black drop-shadow-xl">
                        {p.name}
                      </span>
                      {calculateAge(p.dob) > 0 && (
                        <span className="bg-white/10 backdrop-blur-xl text-white/80 px-3 py-1 rounded-xl text-xl font-black border border-white/10">
                          {calculateAge(p.dob)}
                        </span>
                      )}
                    </div>
                    {p.city && (
                      <div className="flex items-center gap-1.5 text-white/50 text-xs font-bold">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        {p.city}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dot indicators fixed */}
          {heroProfiles.length > 1 && (
            <div className="absolute top-4 right-5 flex gap-1.5 z-30">
              {heroProfiles.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => scrollToHero(i)}
                  className={cn('h-1 rounded-full transition-all duration-300', i === heroIndex ? 'bg-white w-6' : 'bg-white/25 w-1.5')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ONLINE STORIES ROW ── */}
      {!loading && heroProfiles.length > 0 && (

        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em]">Utenti suggeriti</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {heroProfiles.map((p, i) => (
              <Link key={p.id} to={`/profile-detail/${p.id}`} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={cn(
                  "w-16 h-16 rounded-full overflow-hidden border-2 p-0.5 transition-all duration-500",
                  isUserOnline(p) 
                    ? "border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
                    : "border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                )}>
                  <img src={p.photos?.[0] || p.photo_url || `https://picsum.photos/seed/${p.name}/200`} className="w-full h-full object-cover rounded-full" />
                </div>
                <span className="text-white text-[11px] font-bold truncate w-16 text-center">{p.name}</span>
              </Link>
            ))}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className={cn(
                "w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all",
                showAdvanced ? "border-rose-500 bg-rose-500/20" : "border-white/10 bg-white/5"
              )}>
                <Filter className="w-5 h-5 text-white/60" />
              </div>
              <span className="text-white text-[11px] font-bold">Filtri</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CITY CHIPS ── */}
      <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {cityOptions.slice(0, 10).map(c => (
          <button key={c} onClick={() => setFilterCity(c)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[12px] font-black whitespace-nowrap transition-all shrink-0 backdrop-blur-sm",
              filterCity === c
                ? "bg-rose-600/90 text-white shadow-lg shadow-rose-600/30"
                : "bg-black/20 text-white border border-white/8 hover:border-white/20 hover:text-white/60"
            )}>{c}</button>
        ))}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-8 h-8 rounded-full bg-black/20 border border-white/8 backdrop-blur-sm flex items-center justify-center shrink-0 hover:border-white/20 transition-all"
        >
          <Search className="w-3.5 h-3.5 text-white/40" />
        </button>
      </div>

      {/* ── GENDER CHIPS (solo se ci sono 2+ generi compatibili) ── */}
      {availableGenderChips.length >= 2 && (
        <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {['Tutti', ...availableGenderChips].map(g => (
            <button key={g} onClick={() => setFilterGender(g)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-black whitespace-nowrap transition-all shrink-0 backdrop-blur-sm",
                filterGender === g
                  ? "bg-purple-600/90 text-white shadow-lg shadow-purple-600/30"
                  : "bg-black/20 text-white border border-white/8 hover:border-white/20 hover:text-white/60"
              )}>{g}</button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-3"
          >
            <div className="flex items-center bg-black/20 backdrop-blur-xl border border-white/8 rounded-2xl px-4 py-2.5 gap-2">
              <Search className="w-4 h-4 text-white/30 shrink-0" />
              <input
                id="bacheca-search"
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca un nome..."
                className="bg-transparent border-none text-white text-sm font-bold outline-none w-full placeholder:text-white/20"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}><X className="w-4 h-4 text-white/30" /></button>
              )}
              {/* Close search by clicking X at end */}
              <button onClick={() => { setShowSearch(false); setSearchTerm(''); }} className="text-white/20 hover:text-white/50 transition-colors ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADVANCED FILTERS ── */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 overflow-hidden"
          >
            <div className="bg-black/25 backdrop-blur-2xl border border-white/8 rounded-[24px] p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-white text-[11px] font-black uppercase tracking-widest">Età {filterAge[0]}–{filterAge[1]}</p>
                <div className="flex gap-3">
                  <input type="range" min="18" max="99" value={filterAge[0]} onChange={e => setFilterAge([+e.target.value, filterAge[1]])} className="flex-1 accent-rose-600" />
                  <input type="range" min="18" max="99" value={filterAge[1]} onChange={e => setFilterAge([filterAge[0], +e.target.value])} className="flex-1 accent-rose-600" />
                </div>
              </div>
              <button
                onClick={() => {
                  setFilterCity('Tutte');
                  setFilterAge([18, 99]);
                  setFilterBodyType('Tutte');
                  setFilterGender('Tutti');
                  setSearchTerm('');
                  setShowSearch(false);
                  setShowAdvanced(false);
                }}
                className="text-rose-400 text-[10px] font-black uppercase tracking-widest"
              >Azzera filtri</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PROFILE GRID ── */}
      <div className="px-3">
        {/* Counter */}
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">{filteredProfiles.length} profili</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-[24px] overflow-hidden animate-pulse" style={{ aspectRatio: i % 3 === 0 ? '3/5' : '3/4', background: '#1a1a22' }} />
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-16 rounded-[28px] border border-white/5 px-6" style={{ background: '#1a1a22' }}>
            <Search className="w-8 h-8 text-white/10 mx-auto mb-4" />
            <h3 className="text-sm font-black text-white/60 mb-2">Nessun profilo compatibile</h3>
            <button
              onClick={() => {
                setFilterCity('Tutte');
                setFilterAge([18, 99]);
                setFilterBodyType('Tutte');
                setSearchTerm('');
                setShowSearch(false);
                setFilterGender('Tutti');
                setShowAdvanced(false);
              }}
              className="text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white px-6 py-2.5 rounded-full shadow-lg shadow-rose-700/30 mt-4"
            >Azzera filtri</button>
          </div>
        ) : (
          /* Asymmetric masonry grid */
          <div className="grid grid-cols-2 gap-2.5">
            {filteredProfiles.map((profile, idx) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ delay: idx * 0.04, duration: 0.4, ease: 'easeOut' }}
                className="relative group"
              >
                <Link to={`/profile-detail/${profile.id}`}>
                  <div
                    className="rounded-[22px] overflow-hidden relative"
                    style={{ aspectRatio: '3/4', background: '#1a1a22', boxShadow: '0 4px 32px rgba(0,0,0,0.5)' }}
                  >
                    <img
                      src={profile.photos?.[0] || profile.photo_url || `https://picsum.photos/seed/${profile.name}/400/500`}
                      alt={profile.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onContextMenu={e => e.preventDefault()}
                    />
                    {/* Dark vignette */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }} />

                    {/* Online indicator */}
                    {isUserOnline(profile) && (
                      <div className="absolute top-2.5 left-2.5 z-20">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-black/40" />
                        </span>
                      </div>
                    )}

                    {/* Match Score Badge - ONLY IF FRIENDS and MATCHED/UNLOCKED */}
                    {currentUser && (unlockedIds.includes(profile.id) || sharedMatches[profile.id]) && friends.includes(profile.id) && (sharedMatches[profile.id] || calculateMatchScore(currentUser, profile)) > 0 && (
                      <div className="absolute top-0 left-0 z-20 pointer-events-none overflow-hidden rounded-tl-[22px]">
                        <svg width="80" height="80" viewBox="0 0 100 100" fill="none" className="w-[70px] h-[70px]">
                          <path d="M 0 0 L 100 0 Q 15 15 0 100 Z" fill="#e11d48" />
                        </svg>
                        <div className="absolute top-3 left-3">
                          <span className="text-[18px] font-black text-white leading-none drop-shadow">{sharedMatches[profile.id] || calculateMatchScore(currentUser, profile)}%</span>
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-[13px] font-montserrat font-black leading-tight truncate">
                        {profile.name}{profile.dob && calculateAge(profile.dob) > 0 ? `, ${calculateAge(profile.dob)}` : ''}
                      </p>
                      {profile.city && (
                        <p className="text-white text-[11px] font-bold flex items-center gap-0.5 mt-0.5 truncate">
                          <MapPin className="w-2 h-2 text-rose-500 shrink-0" />{profile.city}
                        </p>
                      )}
                    </div>

                    {/* Neon glow border on hover */}
                    <div className="absolute inset-0 rounded-[22px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-200 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px rgba(244,63,94,0.95), 0 0 40px rgba(244,63,94,0.6), 0 0 80px rgba(244,63,94,0.25)' }} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>




      {/* ── COOLDOWN TOAST ── */}
      <AnimatePresence>
        {amarsiunpoToast && (
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
              <p className="text-xs font-black uppercase tracking-widest text-rose-400">AMARSIUNPO in pausa</p>
              <p className="text-[10px] text-stone-300 mt-0.5">Disponibile tra {formatCooldown()} · il potere va usato con saggezza 🌙</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showAMARSIUNPOConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
          <AMARSIUNPOConfirmBanner onConfirm={confirmAMARSIUNPO} />
        </div>
      )}

      {/* ── SOULMATCH OVERLAY ── */}
      <AnimatePresence>
        {showAMARSIUNPO && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-stone-50"
          >
            {/* Top bar */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-stone-100 px-5 py-4 flex items-center justify-between">
              <button onClick={() => setShowAMARSIUNPO(false)} className="w-10 h-10 bg-stone-100 rounded-[16px] flex items-center justify-center text-stone-600 active:scale-90">
                <X className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h2 className="text-base font-serif font-black text-stone-900 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-600 fill-current" /> AMARSIUNPO
                </h2>
                <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Top 10 affinità</p>
              </div>
              <div className="w-10" />
            </div>

            {/* Rankings header */}
            <div className="mx-4 mt-6 bg-rose-600 text-white rounded-[24px] p-5 shadow-xl shadow-rose-300/30 flex items-start gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-[14px] flex items-center justify-center shrink-0 mt-0.5">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black uppercase tracking-widest mb-1">✨ I Tuoi Match Ideali</h3>
                <p className="text-[11px] text-rose-100 leading-relaxed">
                  Ecco i <strong className="text-white">10 profili più compatibili</strong> in base alle tue preferenze correnti.
                </p>
              </div>
            </div>

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
                        onClick={() => setShowAMARSIUNPO(false)}
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
                <button onClick={() => setShowAMARSIUNPO(false)} className="flex flex-col items-center gap-1">
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

// ── AMARSIUNPO Confirm Banner (shown once per session) ──
const AMARSIUNPOConfirmBanner = ({ onConfirm }: { onConfirm: () => void }) => {
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
          <h3 className="text-sm font-black uppercase tracking-widest mb-1">✨ AMARSIUNPO attivato!</h3>
          <p className="text-[11px] text-rose-100 leading-relaxed">
            Stiamo mostrando i <strong className="text-white">10 profili più compatibili</strong> con te in questo momento.
            Dopo la consultazione, AMARSIUNPO entrerà in <strong className="text-white">pausa di 24 ore</strong> per rendere ogni incontro speciale.
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

// ── Feed Page ──
// ── AMARSIUNPO Page ──────────────────────────────────────────────────────
const AMARSIUNPOPage = () => {
  const [globalProfiles, setGlobalProfiles] = useState<UserProfile[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<'global' | 'friends'>('friends');
  const [searchQuery, setSearchQuery] = useState('');

  // 1:1 Match State
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [feelingSent, setFeelingSent] = useState(false);

  // Top 10 Discovery State
  const [showRankings, setShowRankings] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [sharedMatches, setSharedMatches] = useState<Record<string, number>>({});

  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('amarsiunpo_unlocked_ids');
    if (saved) setUnlockedIds(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const handleReset = () => { setTargetUser(null); setShowRankings(false); };
    window.addEventListener('reset-amarsiunpo', handleReset);
    return () => window.removeEventListener('reset-amarsiunpo', handleReset);
  }, []);

  const fetchSharedMatches = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('interactions')
        .select('from_user_id, to_user_id, metadata')
        .eq('type', 'heart')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

      if (data) {
        const map: Record<string, number> = {};
        data.forEach(i => {
          if (i.metadata?.match_score) {
            const otherId = i.from_user_id === userId ? i.to_user_id : i.from_user_id;
            map[otherId] = i.metadata.match_score;
          }
        });
        setSharedMatches(map);
      }
    } catch (e) { }
  };

  const unlockId = (id: string) => {
    const next = [...new Set([...unlockedIds, id])];
    setUnlockedIds(next);
    localStorage.setItem('amarsiunpo_unlocked_ids', JSON.stringify(next));
  };

  const fetchGlobalProfiles = async (viewer: UserProfile) => {
    try {
      const { data } = await supabase.from('users').select('*');
      if (data) {
        const all = data.map(u => normalizeUser(u));
        const compatible = all.filter(p => isUserCompatible(viewer, p) && (p.photos?.length || p.photo_url));
        setGlobalProfiles(compatible);
      }
    } catch (e) {
      console.error("fetchGlobalProfiles error:", e);
    }
  };

  const fetchFriends = async (userId: string) => {
    try {
      const { data: links } = await supabase
        .from('soul_links')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (links && links.length > 0) {
        const friendIds = links.map(sl => sl.sender_id === userId ? sl.receiver_id : sl.sender_id);
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .in('id', friendIds);

        if (users) {
          setFriendProfiles(users.map(u => normalizeUser(u)));
        }
      } else {
        setFriendProfiles([]);
      }
    } catch (e) {
      console.error("fetchFriends error:", e);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const saved = localStorage.getItem('amarsiunpo_user');
        if (saved) {
          const u = JSON.parse(saved);
          const { data: realUser } = await supabase.from('users').select('*').eq('id', u.id).single();
          if (realUser) {
            const norm = normalizeUser(realUser);
            setCurrentUser(norm);
            await Promise.all([fetchGlobalProfiles(norm), fetchFriends(norm.id), fetchSharedMatches(norm.id)]);
          } else {
            const norm = normalizeUser(u);
            setCurrentUser(norm);
            await Promise.all([fetchGlobalProfiles(norm), fetchFriends(norm.id), fetchSharedMatches(norm.id)]);
          }
        } else {
          navigate('/register');
        }
      } catch (e) {
        console.error("AMARSIUNPOPage init exception:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const currentList = useMemo(() => {
    const baseList = mode === 'global' ? globalProfiles : friendProfiles;
    if (!searchQuery) return baseList;
    return baseList.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [mode, globalProfiles, friendProfiles, searchQuery]);

  const ranked = useMemo(() => {
    return [...currentList]
      .map(p => ({ ...p, _score: calculateMatchScore(currentUser, p) }))
      .sort((a, b) => b._score - a._score);
  }, [currentList, currentUser]);

  const handleStartMatch = (user: UserProfile) => {
    setTargetUser(user);
    setCalculating(true);
    setMatchScore(null);
    setFeelingSent(false);
    setShowRankings(false);
    setTimeout(() => {
      const score = calculateMatchScore(currentUser, user);
      setMatchScore(score);
      setCalculating(false);
      unlockId(user.id);
    }, 2200);
  };

  const startTop10Discovery = () => {
    setCalculating(true);
    setTargetUser(null);
    setTimeout(() => {
      setCalculating(false);
      setShowRankings(true);
      const top10 = ranked.slice(0, 10);
      top10.forEach(p => unlockId(p.id));
    }, 2500);
  };

  return (
    <div className="min-h-screen pt-20 pb-40 px-4 transition-colors duration-500 relative" style={{ background: '#0a0a0f' }}>
      {/* Floating hearts */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`
          @keyframes floatHeartSM {
            0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
            10%  { opacity: 1; }
            80%  { opacity: 0.5; }
            100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
          }
          .fhsm { animation: floatHeartSM var(--dur,12s) ease-in-out var(--delay,0s) infinite; position: absolute; bottom: -10%; }
        `}</style>
        {[
          { left: '3%', size: 12, color: '#f43f5e', blur: 3, dur: 11, delay: 0 },
          { left: '18%', size: 9, color: '#a855f7', blur: 4, dur: 8, delay: 1.8 },
          { left: '37%', size: 18, color: '#ec4899', blur: 5, dur: 13, delay: 0.6 },
          { left: '57%', size: 11, color: '#f43f5e', blur: 2, dur: 10, delay: 2.2 },
          { left: '75%', size: 15, color: '#9333ea', blur: 4, dur: 12, delay: 0.9 },
          { left: '91%', size: 10, color: '#fb7185', blur: 3, dur: 9, delay: 3 },
        ].map((h, i) => (
          <div key={i} className="fhsm" style={{ left: h.left, '--dur': `${h.dur}s`, '--delay': `${h.delay}s`, filter: `blur(${h.blur}px)`, opacity: 0.25, transform: 'scale(1.2)' } as React.CSSProperties}>
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color} style={{ filter: `drop-shadow(0 0 15px ${h.color})` }}><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" /></svg>
          </div>
        ))}
      </div>
      <div className="max-w-md mx-auto space-y-6 relative z-10">

        {/* PREMIUM TABS - HIDDEN TO RESTRICT TO FRIENDS */}
        <div className="flex flex-col items-center pt-2">
            <div className="w-16 h-16 bg-rose-600 rounded-[28px] flex items-center justify-center shadow-lg shadow-rose-900/40 mb-3 border-2 border-rose-400/30">
               <Heart className="w-8 h-8 text-white fill-current" />
            </div>
            <h1 className="text-2xl font-serif font-black text-rose-500 tracking-tight">AMARSIUNPO <span className="text-white">Affinita</span></h1>
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mt-1">Calcola l'anima tra i tuoi amici</p>
        </div>

        {/* SEARCH BAR (for SoulLinks) */}
        {mode === 'friends' && !targetUser && !showRankings && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div
              className="flex items-center gap-2 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(244,63,94,0.35)', boxShadow: '0 0 20px rgba(244,63,94,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: '#f43f5e', filter: 'drop-shadow(0 0 6px rgba(244,63,94,0.8))' }} />
              <input
                type="text"
                placeholder="Cerca tra i tuoi SoulLink..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-white text-sm font-bold placeholder:text-white/25"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* PROFILE GRID (GRID STYLE like livechat) */}
        {!targetUser && !showRankings && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {currentList.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => mode === 'global' ? navigate(`/profile-detail/${p.id}`) : handleStartMatch(p)}
                  className="aspect-[3/5.5] relative group cursor-pointer active:scale-95 transition-all shadow-xl overflow-hidden rounded-[32px]"
                  style={{ border: '2px solid #f43f5e', boxShadow: '0 0 18px rgba(244,63,94,0.4), 0 0 4px rgba(244,63,94,0.2)' }}
                >
                  <img
                    src={p.photos?.[0] || p.photo_url || `https://picsum.photos/seed/${p.name}/400`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/95 via-stone-900/10 to-transparent opacity-90 transition-opacity" />

                  {/* Match Score Badge (Permanent) - ONLY IF UNLOCKED or SHARED */}
                  {currentUser && (unlockedIds.includes(p.id) || sharedMatches[p.id]) && (sharedMatches[p.id] || calculateMatchScore(currentUser, p)) > 0 && (
                    <div className="absolute top-0 left-0 z-20 pointer-events-none drop-shadow-[0_4px_10px_rgba(225,29,72,0.4)] overflow-hidden rounded-tl-[32px]">
                      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[88px] h-[88px]">
                        <path d="M 0 0 L 100 0 Q 15 15 0 100 Z" fill="#e11d48" />
                      </svg>
                      <div className="absolute top-4 left-4 flex flex-col items-center justify-center">
                        <Heart className="w-8 h-8 text-white/30 fill-current absolute -top-1 -left-1 rotate-[-15deg] scale-125" />
                        <span className="text-[24px] font-black text-white relative z-10 leading-none drop-shadow-md">
                          {sharedMatches[p.id] || calculateMatchScore(currentUser, p)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {isUserOnline(p) && (
                    <div className="absolute top-4 right-4 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                  )}

                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <p className="font-montserrat font-black text-base truncate">{p.name}</p>
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-80 flex items-center gap-1.5 line-clamp-1">
                      <MapPin className="w-3 h-3 text-rose-500" /> {p.city}
                    </p>
                    <div className="mt-2 text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] italic">
                      {isUserOnline(p) ? 'Live Now' : 'Sync Profile'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pulsing Match Heart (Global View) */}
            {mode === 'global' && currentList.length > 0 && (
              <div className="flex flex-col items-center py-10">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  onClick={startTop10Discovery}
                  className="w-44 h-44 bg-rose-600 rounded-full flex flex-col items-center justify-center text-white shadow-[0_0_60px_rgba(225,29,72,0.4)] relative group"
                >
                  <Heart className="w-20 h-20 fill-current mb-1" />
                  <span className="text-2xl font-black uppercase tracking-[0.2em]">Match</span>

                  <motion.div
                    animate={{ scale: [1, 1.5, 1.8], opacity: [0.5, 0.2, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full border-4 border-rose-400"
                  />
                </motion.button>
                <p className="mt-8 text-[11px] font-black text-rose-500 uppercase tracking-[0.4em] animate-pulse">Sincronizza Anime</p>
              </div>
            )}
          </div>
        )}

        {/* 1:1 MATCH CALCULATION VIEW */}
        {targetUser && !showRankings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[40] flex flex-col items-center justify-center pt-24 pb-12 px-6 overflow-y-auto"
            style={{ background: '#0a0a0f' }}
          >
            {/* Floating hearts background (reuses fhsm keyframe) */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
              {[
                { left: '5%', size: 8, color: '#f43f5e', blur: 3, dur: 11, delay: 0 },
                { left: '20%', size: 5, color: '#a855f7', blur: 4, dur: 8, delay: 1.5 },
                { left: '40%', size: 13, color: '#ec4899', blur: 5, dur: 14, delay: 0.8 },
                { left: '62%', size: 7, color: '#f43f5e', blur: 2, dur: 10, delay: 2.4 },
                { left: '80%', size: 10, color: '#9333ea', blur: 4, dur: 12, delay: 1.0 },
                { left: '93%', size: 6, color: '#fb7185', blur: 3, dur: 9, delay: 3.2 },
              ].map((h, i) => (
                <div key={i} className="fhsm" style={{ left: h.left, '--dur': `${h.dur}s`, '--delay': `${h.delay}s`, filter: `blur(${h.blur}px)`, opacity: 0.16 } as React.CSSProperties}>
                  <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" /></svg>
                </div>
              ))}
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full space-y-12 py-4" style={{ marginTop: '-50px' }}>

              {/* DYNAMIC AVATAR COMPOSITION */}
              <div className="relative w-84 h-84 flex items-center justify-center">
                {/* My photo — top-left, tilted left */}
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [-8, -6, -8] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute top-0 left-0 w-52 h-52 overflow-hidden z-10"
                  style={{
                    borderRadius: "38% 62% 63% 37% / 41% 44% 56% 59%",
                    border: '6px solid #f43f5e',
                    boxShadow: '0 0 28px rgba(244,63,94,0.6), 0 0 8px rgba(244,63,94,0.3)'
                  }}
                >
                  <img src={currentUser?.photos?.[0] || currentUser?.photo_url || `https://picsum.photos/seed/me/400`} className="w-full h-full object-cover" />
                </motion.div>

                {/* Their photo — bottom-right, tilted right */}
                <motion.div
                  animate={{ y: [0, 10, 0], rotate: [8, 10, 8] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
                  className="absolute bottom-0 right-0 w-52 h-52 overflow-hidden z-10"
                  style={{
                    borderRadius: "62% 38% 37% 63% / 59% 56% 44% 41%",
                    border: '6px solid #a855f7',
                    boxShadow: '0 0 28px rgba(168,85,247,0.6), 0 0 8px rgba(168,85,247,0.3)'
                  }}
                >
                  <img src={targetUser.photos?.[0] || targetUser.photo_url || `https://picsum.photos/seed/${targetUser.name}/400`} className="w-full h-full object-cover" />
                </motion.div>

                {/* MATCH HEART center */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: matchScore !== null ? [1, 1.15, 1] : 0, opacity: matchScore !== null ? 1 : 0 }}
                  transition={{ scale: { repeat: Infinity, duration: 2 }, opacity: { duration: 0.5 } }}
                  className="absolute z-20 w-32 h-32 flex flex-col items-center justify-center pointer-events-none"
                  style={{ filter: 'drop-shadow(0 0 30px rgba(244,63,94,0.8))' }}
                >
                  <Heart className="w-full h-full text-rose-500 fill-current" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white pb-3">
                    <span className="text-xl font-black tracking-tighter drop-shadow-lg">{matchScore}%</span>
                    <span className="text-[7px] font-bold uppercase tracking-[0.2em] opacity-80">Match</span>
                  </div>
                </motion.div>
              </div>


              {/* Feedback phrase — glass dark card */}
              <div className="w-full max-w-sm min-h-[90px] flex items-center justify-center">
                {calculating ? (
                  <div className="flex flex-col items-center gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    >
                      <Heart className="w-8 h-8 text-rose-500 fill-current" style={{ filter: 'drop-shadow(0 0 16px rgba(244,63,94,0.9))' }} />
                    </motion.div>
                    <p className="text-[11px] font-black text-white/60 uppercase tracking-[0.4em] animate-pulse">
                      Sincronizzazione Anime...
                    </p>
                  </div>
                ) : matchScore !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-[24px] px-6 py-5 text-center"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(244,63,94,0.2)',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 0 40px rgba(244,63,94,0.08)'
                    }}
                  >
                    <p className="text-white/90 text-[15px] italic leading-relaxed font-light" style={{ fontFamily: 'Georgia, serif' }}>
                      {matchScore >= 80
                        ? `✨ "Sintonia rara — le vostre anime vibrano all'unisono. Questa connessione vale ogni rischio."`
                        : matchScore >= 60
                          ? `💫 "Grande potenziale — le vostre differenze si completano come i pezzi di un puzzle straordinario."`
                          : matchScore >= 40
                            ? `🌙 "Contrasti intriganti — lasciatevi sorprendere da ciò che ancora non conoscete l'uno dell'altra."`
                            : `🌊 "Anime divergenti — ma ogni incontro porta un significato che va oltre il tempo."`}
                    </p>
                    <div className="mt-3 flex justify-center">
                      <span
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                        style={{
                          background: matchScore >= 80 ? 'rgba(244,63,94,0.2)' : matchScore >= 60 ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.08)',
                          color: matchScore >= 80 ? '#f43f5e' : matchScore >= 60 ? '#a855f7' : 'rgba(255,255,255,0.4)',
                          border: `1px solid ${matchScore >= 80 ? 'rgba(244,63,94,0.3)' : matchScore >= 60 ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)'}`
                        }}
                      >
                        {matchScore >= 80 ? '🔥 Affinità Stellare' : matchScore >= 60 ? '💜 Alta Compatibilità' : matchScore >= 40 ? '🌙 Da Scoprire' : '🌊 Anime Libere'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>


          </motion.div>
        )}

        {/* RESULTS (Top 10 Rankings) */}
        <AnimatePresence>
          {showRankings && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 pb-20"
            >
              <div className="h-6" /> {/* Reserved spacing for header removed */}

              <div className="space-y-4">
                {ranked.map((p, idx) => {
                  const isTop = idx === 0;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => handleStartMatch(p)}
                      className={cn(
                        "relative overflow-hidden group cursor-pointer transition-all",
                        isTop ? "rounded-[40px] p-8 bg-stone-900 text-white shadow-2xl shadow-rose-900/30" : "bg-white rounded-[28px] border border-stone-100 shadow-md p-5 flex items-center gap-5 hover:border-rose-200"
                      )}
                    >
                      {isTop ? (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="bg-rose-600 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.25em] shadow-lg shadow-rose-600/20">Soul Match n.1</div>
                            <div className="flex flex-col items-end">
                              <span className="text-3xl font-black text-rose-500">{p._score}%</span>
                              <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">Affinità</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="w-28 h-28 rounded-[32px] overflow-hidden border-2 border-white/20 shadow-2xl shrink-0 group-hover:scale-105 transition-transform duration-500">
                              <img src={p.photos?.[0] || p.photo_url || `https://picsum.photos/seed/${p.name}/400`} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <h3 className="text-2xl font-montserrat font-black leading-tight">{p.name}, {calculateAge(p.dob)}</h3>
                              <p className="text-white/60 text-xs font-semibold flex items-center gap-1.5"><MapPin className="w-4 h-4 text-rose-500" />{p.city}</p>

                              <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group-hover:bg-white/10 transition-colors">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Perfetto per te</span>
                                  <span className="text-[11px] text-white/80">Siete fatti l'uno per l'altra</span>
                                </div>
                                <ArrowRight className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={cn(
                            "w-10 h-10 rounded-[14px] flex items-center justify-center text-sm font-black shrink-0 shadow-inner",
                            idx === 1 ? "bg-stone-100 text-amber-500" :
                              idx === 2 ? "bg-stone-100 text-stone-500" :
                                "bg-stone-50 text-stone-300"
                          )}>
                            #{idx + 1}
                          </div>
                          <div className="w-20 h-20 rounded-[22px] overflow-hidden border border-stone-100 shadow-sm shrink-0">
                            <img src={p.photos?.[0] || p.photo_url || `https://picsum.photos/seed/${p.name}/200`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <h3 className="text-base font-montserrat font-black text-stone-900 truncate">
                              {p.name}{calculateAge(p.dob) > 0 ? `, ${calculateAge(p.dob)}` : ''}
                            </h3>
                            <p className="text-[10px] text-stone-400 font-bold flex items-center gap-1 uppercase tracking-widest"><MapPin className="w-3 h-3" /> {p.city}</p>
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${p._score}%` }}
                                  transition={{ delay: idx * 0.1 + 0.5, duration: 1 }}
                                  className={cn('h-full rounded-full shadow-sm', p._score >= 70 ? 'bg-gradient-to-r from-rose-500 to-rose-600' : p._score >= 40 ? 'bg-amber-400' : 'bg-stone-300')}
                                />
                              </div>
                              <span className="text-[11px] font-black text-stone-900 shrink-0">{p._score}%</span>
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-300 group-hover:bg-rose-50 group-hover:text-rose-500 transition-all">
                            <ChevronRight className="w-6 h-6" />
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty States */}
        {!targetUser && !showRankings && currentList.length === 0 && (
          <div className="py-28 text-center space-y-5">
            <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center mx-auto text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.1)] border border-rose-500/20">
              <Users className="w-12 h-12" />
            </div>
            <div className="space-y-2 px-10">
              <p className="text-white text-lg font-serif font-black tracking-tight">Ancora nessun'anima gemella</p>
              <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed">
                {mode === 'friends' ? "Cerca amici per iniziare il match." : "I profili compatibili appariranno qui."}
              </p>
              <div className="pt-4">
                <div className="inline-block w-8 h-1 bg-rose-500/20 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};

const FeedPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [bannerMessages, setBannerMessages] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  const scrollToFeedHero = (idx: number) => {
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTo({
        left: idx * feedScrollRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        setCurrentUser(normalizeUser(JSON.parse(saved)));
      } else {
        navigate('/register');
      }
    } catch (e) {
      navigate('/register');
    }

    const fetchData = async () => {
      const { data } = await supabase.from('users').select('*').limit(50);
      if (data) {
        const processed = data.map((u: any) => normalizeUser(u)).filter((p: any) => (p.photos && p.photos.length > 0) || p.photo_url);
        setProfiles(processed);
      }
      
      // Refresh current user data to get latest doc_rejected status
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        const u = JSON.parse(saved);
        const { data: userData } = await supabase.from('users').select('*').eq('id', u.id).maybeSingle();
        if (userData) {
          const norm = normalizeUser(userData);
          setCurrentUser(norm);
          localStorage.setItem('amarsiunpo_user', JSON.stringify(norm));
        }
      }
    };
    fetchData();

    // Compatibilità online: prendiamo da Supabase
    const fetchGlobalBanner = async () => {
      try {
        const { data } = await supabase
          .from('banner_messages')
          .select('*')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });
        if (data) setBannerMessages(data);
      } catch (e) { }
    };
    fetchGlobalBanner();
  }, [navigate]);

  useEffect(() => {
    if (bannerMessages.length === 0) return;
    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1 >= bannerMessages.length ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [bannerMessages]);

  const heroProfiles = useMemo(() => {
    if (!currentUser) return profiles.slice(0, 5);
    return profiles
      .filter(p => p.id === currentUser.id || isUserCompatible(currentUser, p))
      .slice(0, 5);
  }, [profiles, currentUser]);
  useEffect(() => {
    if (heroProfiles.length < 2) return;
    const timer = setInterval(() => {
      const next = (heroIndex + 1) % heroProfiles.length;
      setHeroIndex(next);
      scrollToFeedHero(next);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroProfiles.length, heroIndex]);

  const heroProfile = heroProfiles[heroIndex];

  return (
    <div className="min-h-screen pt-[114px] pb-28 relative overflow-x-hidden" style={{ background: '#0a0a0f' }}>

      {/* ── FLOATING HEARTS BACKGROUND ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`
          @keyframes floatHeartF {
            0%   { transform: translateY(0px) translateX(0px) rotate(0deg) scale(1); opacity: 0; }
            10%  { opacity: 1; }
            80%  { opacity: 0.5; }
            100% { transform: translateY(-110vh) translateX(var(--fdx,0px)) rotate(var(--fr,15deg)) scale(var(--fs,1)); opacity: 0; }
          }
          .fhf { animation: floatHeartF var(--fdur,12s) ease-in-out var(--fdelay,0s) infinite; position: absolute; bottom: -10%; }
        `}</style>
        {[
          { left: '6%', size: 15, color: '#f43f5e', blur: 3, fdur: 13, fdelay: 0, fdx: '25px', fr: '18deg', fs: 1.1 },
          { left: '19%', size: 9, color: '#fb7185', blur: 4, fdur: 10, fdelay: 2, fdx: '-18px', fr: '-12deg', fs: 0.9 },
          { left: '33%', size: 22, color: '#9333ea', blur: 5, fdur: 16, fdelay: 1, fdx: '14px', fr: '8deg', fs: 1.2 },
          { left: '47%', size: 12, color: '#f43f5e', blur: 2, fdur: 12, fdelay: 3, fdx: '-30px', fr: '22deg', fs: 1.0 },
          { left: '61%', size: 18, color: '#ec4899', blur: 3, fdur: 14, fdelay: 0.5, fdx: '18px', fr: '-18deg', fs: 1.1 },
          { left: '74%', size: 9, color: '#a855f7', blur: 4, fdur: 11, fdelay: 2.5, fdx: '-8px', fr: '28deg', fs: 0.8 },
          { left: '86%', size: 24, color: '#f43f5e', blur: 5, fdur: 17, fdelay: 1.5, fdx: '22px', fr: '-8deg', fs: 1.0 },
          { left: '25%', size: 14, color: '#ec4899', blur: 6, fdur: 15, fdelay: 4, fdx: '8px', fr: '-22deg', fs: 1.2 },
          { left: '53%', size: 10, color: '#9333ea', blur: 3, fdur: 9, fdelay: 5.5, fdx: '-22px', fr: '18deg', fs: 0.7 },
          { left: '91%', size: 14, color: '#f43f5e', blur: 4, fdur: 12, fdelay: 2.8, fdx: '-27px', fr: '-14deg', fs: 1.1 },
        ].map((h, i) => (
          <div key={i} className="fhf" style={{ left: h.left, '--fdur': `${h.fdur}s`, '--fdelay': `${h.fdelay}s`, '--fdx': h.fdx, '--fr': h.fr, '--fs': h.fs, filter: `blur(${h.blur}px)`, opacity: 0.28, transform: 'scale(1.15)' } as React.CSSProperties}>
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color} style={{ filter: `drop-shadow(0 0 20px ${h.color})` }}>
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
          </div>
        ))}
      </div>

      {/* ── DOCUMENT REJECTED BANNER (Feed) ── */}
      <div className="relative z-20 mb-[30px] -mt-10">
        <SharedRejectedDocumentBanner currentUser={currentUser} />
      </div>

      {/* Document rejection handled by side banner */}

      {/* HERO SECTION - slide limited to 3 compatible profiles */}
      {!loading && heroProfiles.length > 0 && (
        <div className="relative w-full h-[75vh] min-h-[550px] overflow-hidden">
          <div 
            ref={feedScrollRef}
            className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
            onScroll={(e) => {
              const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
              if (idx !== heroIndex) setHeroIndex(idx);
            }}
          >
            {heroProfiles.map((p, i) => (
              <div key={p.id} className="w-full h-full shrink-0 snap-center relative">
                <img
                  src={(p.photos?.[0]) || p.photo_url || `https://picsum.photos/seed/${p.name}/600/800`}
                  className="w-full h-full object-cover object-top"
                />
                {/* Cinematic fade */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 25%, transparent 75%, #0a0a0f 100%)' }} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.6)_100%)] opacity-60" />

                {/* Info & CTA block */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 flex items-end justify-between z-10 pointer-events-none">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-3xl font-montserrat font-black drop-shadow-xl">
                        {p.name}
                      </span>
                      {calculateAge(p.dob) > 0 && (
                        <span className="bg-white/10 backdrop-blur-xl text-white/80 px-3 py-1 rounded-xl text-xl font-black border border-white/10">
                          {calculateAge(p.dob)}
                        </span>
                      )}
                    </div>
                    {p.city && (
                      <div className="flex items-center gap-1.5 text-white/50 text-xs font-bold">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        {p.city}
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/profile-detail/${p.id}`}
                    className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white active:scale-95 transition-all pointer-events-auto"
                    style={{ background: 'linear-gradient(135deg, #f43f5e, #9333ea)', boxShadow: '0 8px 24px rgba(244,63,94,0.4)' }}
                  >
                    Visita
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {heroProfiles.length > 1 && (
            <div className="absolute top-4 right-5 flex gap-1.5 z-30">
              {heroProfiles.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => scrollToFeedHero(i)}
                  className={cn('h-1 rounded-full transition-all duration-300', i === heroIndex ? 'bg-white w-6' : 'bg-white/25 w-1.5')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FEED POSTS ── */}
      <div className="px-4 relative z-10">
        {currentUser?.id && <FeedComponent userId={currentUser.id} isOwner={true} global={true} />}
      </div>

    </div>
  );
};


// ── SoulLinks Page ──────────────────────────────────────────────────────
const AmiciPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<SoulLink[]>([]);
  const [pendingIn, setPendingIn] = useState<SoulLink[]>([]);
  const [pendingOut, setPendingOut] = useState<SoulLink[]>([]);
  const [rejectedOut, setRejectedOut] = useState<SoulLink[]>([]);
  const [friendsPosts, setFriendsPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'amici' | 'richieste'>('feed');
  const [messagingFriend, setMessagingFriend] = useState<UserProfile | null>(null);
  const [quickMsgText, setQuickMsgText] = useState('');
  const [isSendingQuickMsg, setIsSendingQuickMsg] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SoulLink | null>(null);
  const [confirmDeleteSent, setConfirmDeleteSent] = useState<SoulLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [friendMessages, setFriendMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [acceptsCountToday, setAcceptsCountToday] = useState(0);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [readChatIds, setReadChatIds] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('sm_read_chats'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  useEffect(() => { localStorage.setItem('sm_read_chats', JSON.stringify([...readChatIds])); }, [readChatIds]);
  const [allLastMessages, setAllLastMessages] = useState<any[]>([]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [friendMessages]);

  const fetchAllLastMessages = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('room_messages')
      .select('*')
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });
    if (data) setAllLastMessages(data);
  };

  useEffect(() => {
    if (messagingFriend && currentUser) {
      fetchFriendMessages(messagingFriend.id);
      // Mark as read
      setReadChatIds(prev => new Set([...prev, messagingFriend.id]));

      const channel = supabase.channel(`friend_chat_amici_${messagingFriend.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages'
        }, (payload) => {
          const m = payload.new;
          if ((m.sender_id === currentUser.id && m.receiver_id === messagingFriend.id) ||
            (m.sender_id === messagingFriend.id && m.receiver_id === currentUser.id)) {
            setFriendMessages(prev => [...prev, m]);
            fetchAllLastMessages();
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      setFriendMessages([]);
    }
  }, [messagingFriend, currentUser]);

  const fetchFriendMessages = async (friendId: string) => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('room_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });
    if (data) setFriendMessages(data);
  };

  const handleSendQuickMsg = async () => {
    if (!quickMsgText.trim() || !currentUser || !messagingFriend) return;
    setIsSendingQuickMsg(true);
    try {
      const { error } = await supabase.from('room_messages').insert([{
        sender_id: currentUser.id,
        receiver_id: messagingFriend.id,
        text: quickMsgText
      }]);
      if (!error) {
        setQuickMsgText('');
        // No need to fetch, realtime handles it
      } else {
        setToast({ message: 'Errore nell\'invio.', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Errore di connessione.', type: 'error' });
    }
    setIsSendingQuickMsg(false);
  };

  const fetchAcceptsCount = async (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .eq('from_user_id', userId)
      .eq('type', 'soul_link_accept')
      .gte('created_at', today.toISOString());
    setAcceptsCountToday(count || 0);
  };

  const fetchSoulLinks = async (userId: string) => {
    // Fetch all soul_links where user is involved
    const { data: sentData } = await supabase
      .from('soul_links')
      .select(`
      id, sender_id, receiver_id, status, created_at,
      receiver:users!receiver_id(id, name, surname, photos, photo_url, city, is_online, orientation, dob)
      `)
      .eq('sender_id', userId);

    const { data: receivedData } = await supabase
      .from('soul_links')
      .select(`
      id, sender_id, receiver_id, status, created_at,
      sender:users!sender_id(id, name, surname, photos, photo_url, city, is_online, orientation, dob)
      `)
      .eq('receiver_id', userId);

    const acceptedFriends: SoulLink[] = [];
    const incoming: SoulLink[] = [];
    const outgoing: SoulLink[] = [];
    const rejected: SoulLink[] = [];

    (sentData || []).forEach((sl: any) => {
      if (sl.status === 'accepted') {
        acceptedFriends.push({ ...sl, other_user: sl.receiver });
      } else if (sl.status === 'pending') {
        outgoing.push({ ...sl, other_user: sl.receiver });
      } else if (sl.status === 'rejected') {
        rejected.push({ ...sl, other_user: sl.receiver });
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
    setPendingOut(outgoing);
    setRejectedOut(rejected);

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
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        const user = JSON.parse(saved);
        setCurrentUser(user);
    fetchSoulLinks(user.id);
    fetchAcceptsCount(user.id);
    fetchAllLastMessages();
  } else {
        navigate('/register');
      }
    } catch (e) {
      navigate('/register');
    }

    // Realtime subscription for SoulLinks and clearing read status on new message
    if (currentUser?.id) {
      const slChannel = supabase
        .channel('soul-links-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'soul_links', filter: `receiver_id=eq.${currentUser.id}` }, () => fetchSoulLinks(currentUser.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'soul_links', filter: `sender_id=eq.${currentUser.id}` }, () => fetchSoulLinks(currentUser.id))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interactions', filter: `from_user_id=eq.${currentUser.id}` }, (payload) => {
           if (payload.new.type === 'soul_link_accept') fetchAcceptsCount(currentUser.id);
        })
        .subscribe();

      const msgChannel = supabase
        .channel('amici-page-msgs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `receiver_id=eq.${currentUser.id}` }, (payload) => {
          const msg = payload.new;
          setReadChatIds(prev => {
            const next = new Set(prev);
            if (next.has(msg.sender_id)) {
              next.delete(msg.sender_id);
              localStorage.setItem('sm_read_chats', JSON.stringify([...next]));
            }
            return next;
          });
          fetchAllLastMessages();
        })
        .subscribe();

      const handleReadUpdate = () => {
        try {
          const s = localStorage.getItem('sm_read_chats');
          if (s) setReadChatIds(new Set(JSON.parse(s)));
        } catch (e) { }
      };
      window.addEventListener('chat-read-update', handleReadUpdate);

      return () => {
        supabase.removeChannel(slChannel);
        supabase.removeChannel(msgChannel);
        window.removeEventListener('chat-read-update', handleReadUpdate);
      };
    }
  }, [currentUser?.id, navigate]);

  const handleAccept = async (slId: string, otherUserId: string) => {
    if (!currentUser?.id) return;

    if (!currentUser.is_paid) {
      if (acceptsCountToday >= 2) {
        setShowPremiumModal(true);
        return;
      }
    }

    const { error } = await supabase
      .from('soul_links')
      .update({ status: 'accepted' })
      .eq('id', slId);

    if (!error) {
      // Record the acceptance interaction to track daily limit
      await supabase.from('interactions').insert([{
        from_user_id: currentUser.id,
        to_user_id: otherUserId,
        type: 'soul_link_accept'
      }]);

      setToast({ message: '🎉 Richiesta accettata! Siete ora amici.', type: 'success' });
      fetchSoulLinks(currentUser.id);
      fetchAcceptsCount(currentUser.id);
    }
  };

  const handleReject = async (slId: string) => {
    const { error } = await supabase
      .from('soul_links')
      .update({ status: 'rejected' })
      .eq('id', slId);

    if (!error) {
      setToast({ message: 'Richiesta rifiutata.', type: 'info' });
      if (currentUser?.id) fetchSoulLinks(currentUser.id);
    }
  };

  const handleDismissRejected = async (slId: string) => {
    const { error } = await supabase
      .from('soul_links')
      .delete()
      .eq('id', slId);

    if (!error) {
      if (currentUser?.id) fetchSoulLinks(currentUser.id);
    }
  };

  const handleCancelRequest = async () => {
    if (!confirmDeleteSent || !currentUser) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from('soul_links')
      .delete()
      .eq('id', confirmDeleteSent.id);

    if (!error) {
      setToast({ message: 'Richiesta annullata.', type: 'info' });
      fetchSoulLinks(currentUser.id);
      setConfirmDeleteSent(null);
    } else {
      setToast({ message: 'Errore durante l\'operazione.', type: 'error' });
    }
    setIsDeleting(false);
  };


  const handleConfirmDelete = async () => {
    if (!confirmDelete || !currentUser) return;
    setIsDeleting(true);
    const slId = confirmDelete.id;
    const name = confirmDelete.other_user?.name || 'Utente';

    const { error } = await supabase
      .from('soul_links')
      .delete()
      .eq('id', slId);

    if (!error) {
      setToast({ message: `L'amicizia con ${name} è stata eliminata.`, type: 'info' });
      fetchSoulLinks(currentUser.id);
      setConfirmDelete(null);
    } else {
      setToast({ message: 'Errore durante la rimozione.', type: 'error' });
    }
    setIsDeleting(false);
  };

  return (
    <div className="min-h-screen pt-[178px] pb-28 relative overflow-x-hidden" style={{ background: '#0a0a0f' }}>
      {/* Background hearts removed */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── FLOATING TAG ── */}
      <div className="fixed top-[78px] left-1/2 -translate-x-1/2 z-[40]">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 18,
            delay: 0.1,
            duration: 0.8
          }}
          className="flex items-center gap-2"
        >
          <div
            className="backdrop-blur-2xl text-white px-5 py-3.5 rounded-[32px] flex items-center gap-4 justify-between cursor-pointer relative"
            style={{ background: 'rgba(10,10,15,0.85)', border: '1px solid rgba(244,63,94,0.5)', boxShadow: '0 0 28px rgba(244,63,94,0.25), 0 0 8px rgba(244,63,94,0.1), inset 0 1px 0 rgba(255,255,255,0.06)' }}
            onClick={() => { setIsSearchOpen(!isSearchOpen); if (isSearchOpen) setSearchTerm(''); }}
          >
            {/* Notification hearts removed */}

            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: '#f43f5e', boxShadow: '0 0 18px rgba(244,63,94,0.7)' }}>
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black uppercase tracking-[0.25em] leading-none">Amici</span>
                <span className="text-[9px] font-bold text-white/30 mt-0.5 tracking-widest">{friends.length} connessioni</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center relative z-10"
              style={{ background: isSearchOpen ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.06)' }}
            >
              <Search className="w-3.5 h-3.5" style={{ color: isSearchOpen ? '#f43f5e' : 'rgba(255,255,255,0.3)', filter: isSearchOpen ? 'drop-shadow(0 0 4px rgba(244,63,94,0.8))' : 'none' }} />
            </div>
          </div>

          {/* Search slides from the right of the pill */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                key="search-slide"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 190, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="overflow-hidden"
                style={{ borderRadius: 24 }}
              >
                <div className="flex items-center gap-2 px-4 py-3.5 whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', borderRadius: 24, width: 190 }}>
                  <Search className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cerca..."
                    className="w-full bg-transparent outline-none text-white text-sm font-bold placeholder:text-white/25"
                    style={{ minWidth: 0 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="mx-4 space-y-8">
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />

        {/* ── RICHIESTE RICEVUTE ── */}
        {pendingIn.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <h2 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Richieste ricevute · {pendingIn.length}</h2>
            </div>

            <div className="rounded-[28px] p-2 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <AnimatePresence mode="popLayout">
                {pendingIn.map((req, i) => {
                  const isFree = !currentUser?.is_paid;
                  const isUnderLimit = (acceptsCountToday + i) < 2;
                  const isLocked = isFree && !isUnderLimit;
                  return (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="rounded-[22px] p-3 flex items-center gap-3 cursor-pointer group active:scale-[0.98] transition-all"
                    style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}
                    onClick={() => {
                      if (isLocked) {
                        setShowPremiumModal(true);
                      } else if (req.other_user?.id) {
                        navigate(`/profile-detail/${req.other_user.id}`);
                      }
                    }}
                  >
                    <div className={cn("relative w-12 h-12 rounded-full shrink-0 overflow-hidden", isLocked && "blur-md opacity-80 backdrop-saturate-150")}>
                      <ProfileAvatar
                        user={req.other_user}
                        className="w-full h-full"
                        iconSize="w-6 h-6"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-white truncate drop-shadow-md">
                        {isLocked ? 'Utente Misterioso' : req.other_user?.name}
                      </h4>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-tight">
                        {isLocked ? 'Sblocca per vedere' : (req.other_user?.city || 'AMARSIUNPO')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); isLocked ? setShowPremiumModal(true) : handleAccept(req.id, req.other_user?.id || ''); }}
                        className={cn("w-10 h-10 text-white rounded-full flex items-center justify-center transition-all", isLocked ? "bg-rose-600/50 shadow-none border border-rose-500/50" : "bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.5)] active:scale-90")}
                      >
                        {isLocked ? <Lock className="w-4 h-4" /> : <CheckCircle className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReject(req.id); }}
                        className="w-10 h-10 text-white/50 rounded-full flex items-center justify-center hover:text-rose-400 transition-all active:scale-90"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )})}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── RICHIESTE IN ATTESA / INVIATE ── */}
        {(pendingOut.length > 0 || rejectedOut.length > 0) && (
          <div className="space-y-3">
             <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-rose-500/40" />
              <h2 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Richieste in attesa · {pendingOut.length + rejectedOut.length}</h2>
            </div>
            
            <div className="rounded-[28px] p-2 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
               <AnimatePresence mode="popLayout">
                 {/* Rejected first so they can be dismissed */}
                 {rejectedOut.map((req) => (
                   <motion.div
                     key={req.id}
                     layout
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="rounded-[22px] p-3 flex items-center gap-3 bg-stone-900/40 border border-white/5"
                   >
                     <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden grayscale">
                        <ProfileAvatar user={req.other_user} className="w-full h-full" iconSize="w-6 h-6" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-white/60 truncate">{req.other_user?.name}</h4>
                        <div className="inline-flex px-2 py-0.5 mt-1 rounded-md bg-rose-500/10 border border-rose-500/20">
                          <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Rifiutata</span>
                        </div>
                     </div>
                     <button
                        onClick={() => handleDismissRejected(req.id)}
                        className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)] active:scale-90 transition-all"
                        title="Ok, ho capito"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                   </motion.div>
                 ))}

                 {pendingOut.map((req) => (
                    <motion.div
                      key={req.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="rounded-[22px] p-3 flex items-center gap-3 bg-white/5 border border-white/5"
                    >
                      <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden">
                        <ProfileAvatar user={req.other_user} className="w-full h-full" iconSize="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-white truncate">{req.other_user?.name}</h4>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-tight mt-0.5">In attesa di risposta...</p>
                      </div>
                      <button
                        onClick={() => setConfirmDeleteSent(req)}
                        className="w-10 h-10 text-white/30 hover:text-rose-400 rounded-full flex items-center justify-center transition-all active:scale-90"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                        title="Annulla Richiesta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                 ))}
               </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── FRIENDS LIST ── */}
        <div className="space-y-4">
          {pendingIn.length > 0 && (
            <div className="h-px bg-stone-200 w-1/4 mx-auto my-8 opacity-50" />
          )}

          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence mode="popLayout">
              {friends.filter(f => f.other_user?.name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-16 text-center space-y-5"
                >
                  <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center mx-auto text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.1)] border border-rose-500/20">
                    <Users className="w-12 h-12" />
                  </div>
                  <div className="space-y-4 px-10">
                    <div>
                      <p className="text-white text-lg font-serif font-black tracking-tight">Nessun SoulLink trovato</p>
                      <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed mt-2">
                        {searchTerm ? `Nessun amico per "${searchTerm}"` : 'Invia un SoulLink per iniziare.'}
                      </p>
                    </div>
                    {!searchTerm && (
                      <button onClick={() => navigate('/bacheca')} className="w-full py-3.5 bg-rose-600/20 text-rose-400 rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-900/10 border border-rose-500/20 active:scale-95 transition-all">
                        Scopri Nuove Anime
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
              {friends
                .filter(f => f.other_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((f, i) => {
                  const notify = allLastMessages.some(m => m.sender_id === f.other_user?.id && m.receiver_id === currentUser?.id && !readChatIds.has(f.other_user?.id!));
                  return (
                    <motion.div
                      key={`container-${f.id}`}
                      layout
                      initial={{ opacity: 0, x: -32 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      transition={{ delay: i * 0.07, type: 'spring', stiffness: 220, damping: 24 }}
                      className="relative overflow-hidden rounded-[24px]"
                      style={{
                        boxShadow: notify
                          ? '0 0 0 1.5px #f43f5e, 0 0 24px rgba(244,63,94,0.45), 0 4px 30px rgba(0,0,0,0.4)'
                          : '0 4px 30px rgba(0,0,0,0.4)'
                      }}
                    >
                      {/* Swipe-reveal delete zone — rosso fuoco */}
                      <div className="absolute inset-0 flex items-center justify-end px-6 z-0"
                        style={{ background: 'linear-gradient(to left, #ef4444, #b91c1c)', boxShadow: 'inset -4px 0 30px rgba(239,68,68,0.5), inset 0 0 60px rgba(239,68,68,0.25)' }}
                      >
                        <div className="flex flex-col items-center gap-1.5 text-white">
                          <Trash2 className="w-7 h-7" style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.8))' }} />
                          <span className="text-[9px] font-black uppercase tracking-widest" style={{ textShadow: '0 0 10px rgba(255,255,255,0.6)' }}>Elimina</span>
                        </div>
                      </div>

                      <motion.div
                        key={`card-${f.id}`}
                        drag="x"
                        dragConstraints={{ left: -140, right: 0 }}
                        dragElastic={0.03}
                        dragSnapToOrigin={true}
                        onDragEnd={(_, info) => {
                          // Se l'utente ha trascinato abbastanza a sinistra, scatta l'eliminazione
                          if (info.offset.x < -100) {
                            setConfirmDelete(f);
                          }
                        }}
                        // Animazione di suggerimento (Peek) SOLO sul primo banner ogni 10 secondi
                        animate={i === 0 ? {
                          x: [0, -20, 0, 0, 0, 0, 0, 0, 0, 0]
                        } : { x: 0 }}
                        transition={i === 0 ? {
                          x: {
                            duration: 10,
                            repeat: Infinity,
                            times: [0, 0.02, 0.04, 1],
                            ease: "easeInOut"
                          }
                        } : { duration: 0.1 }}
                        whileDrag={{ cursor: 'grabbing', scale: 1.01, zIndex: 50 }}
                        className="group relative px-4 py-2.5 flex items-center gap-4 transition-all z-10"
                        style={{
                          background: '#1a1a22',
                          border: notify ? '1px solid rgba(244,63,94,0.0)' : '1px solid rgba(255,255,255,0.07)'
                        }}
                      >
                        {/* Notification badge instead of confusing hearts */}
                        {notify && (
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 backdrop-blur-md z-20">
                            <motion.div
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                            />
                            <span className="text-[9px] font-black text-rose-300 uppercase tracking-tighter">Novità</span>
                          </div>
                        )}

                        <div className="relative shrink-0 rounded-full" style={notify ? { border: '2.5px solid #f43f5e', boxShadow: '0 0 14px rgba(244,63,94,0.7), 0 0 4px rgba(244,63,94,0.4)' } : { border: '2px solid transparent' }}>
                          <ProfileAvatar
                            user={f.other_user}
                            className="w-14 h-14 rounded-full shrink-0"
                            iconSize="w-6 h-6"
                          />
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 rounded-full",
                            isUserOnline(f.other_user)
                              ? "bg-emerald-400"
                              : "bg-white/10"
                          )}
                            style={isUserOnline(f.other_user) ? { borderColor: '#1a1a22', boxShadow: '0 0 8px rgba(52,211,153,0.8)' } : { borderColor: '#1a1a22' }}
                          />
                        </div>

                        <div
                          onClick={() => navigate(`/profile-detail/${f.other_user?.id}`)}
                          className="flex-1 min-w-0 pr-2 cursor-pointer"
                        >
                          <h3 className="text-[15px] font-black text-white truncate flex items-center gap-2">
                            {f.other_user?.name}
                            {notify && (
                              <motion.span
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 1.2 }}
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: '#f43f5e', boxShadow: '0 0 8px rgba(244,63,94,0.9)' }}
                              />
                            )}
                          </h3>
                          <div className="mt-0.5 flex items-center gap-2">
                            {f.other_user?.dob && (
                              <span className="text-[10px] text-white/40 font-bold">{calculateAge(f.other_user.dob)} anni</span>
                            )}
                            {f.other_user?.city && (
                              <span className="text-[10px] text-white/30 font-bold flex items-center gap-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 text-rose-500/60" />{f.other_user.city}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Messaggio privato */}
                          {(() => {
                            return (
                              <button
                                onClick={() => setMessagingFriend(normalizeUser(f.other_user!))}
                                className={cn(
                                  "w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                                  notify ? "text-white" : "text-white/40 hover:text-white/70"
                                )}
                                style={notify
                                  ? { background: '#f43f5e', border: '1px solid rgba(244,63,94,0.5)', boxShadow: '0 0 14px rgba(244,63,94,0.5)' }
                                  : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                                title="Messaggi"
                              >
                                <Send className={cn("w-3.5 h-3.5", notify ? "animate-pulse" : "")} />
                              </button>
                            );
                          })()}
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                })}
            </AnimatePresence>
          </div>
        </div>

        {loading && (
          <div className="py-10 flex justify-center">
            <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
              <Heart className="w-8 h-8 text-rose-500 fill-current" style={{ filter: 'drop-shadow(0 0 10px rgba(244,63,94,0.8))' }} />
            </motion.div>
          </div>
        )}
      </div>

      {/* ── QUICK MESSAGE MODAL ── */}
      <AnimatePresence>
        {messagingFriend && (
          <div className="fixed inset-0 z-[150] flex items-end justify-center pb-6 px-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(14px)' }}>
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-lg rounded-[32px] overflow-hidden flex flex-col"
              style={{ background: 'rgba(14,14,20,0.75)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(50px)', boxShadow: '0 -24px 60px rgba(0,0,0,0.4)', height: '78vh' }}
            >
              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <ProfileAvatar user={messagingFriend} className="w-11 h-11 rounded-full" iconSize="w-5 h-5" />
                  <div>
                    <h3 className="text-sm font-black text-white">{messagingFriend.name}</h3>
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-none mt-0.5">Messaggi Privati</p>
                  </div>
                </div>
                <button
                  onClick={() => { setMessagingFriend(null); setQuickMsgText(''); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white/30 hover:text-white transition-colors active:scale-90"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* History area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {friendMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <MessageCircle className="w-10 h-10 mb-3 text-white/20" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Nessun messaggio precedente</p>
                  </div>
                ) : (
                  friendMessages.map((m) => {
                    const isOwn = m.sender_id === currentUser?.id;
                    return (
                      <div key={m.id} className={cn("flex flex-col max-w-[80%]", isOwn ? "ml-auto items-end" : "mr-auto items-start")}>
                        <div
                          className="px-4 py-3 rounded-2xl"
                          style={isOwn
                            ? { background: 'linear-gradient(135deg, #f43f5e, #9333ea)', color: 'white', borderBottomRightRadius: 6 }
                            : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', borderBottomLeftRadius: 6 }}
                        >
                          <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap font-medium">{m.text}</p>
                        </div>
                        <span className="text-[9px] text-white/25 font-bold mt-1 px-1">
                          {new Date(m.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} · {new Date(m.created_at).getHours()}:{String(new Date(m.created_at).getMinutes()).padStart(2, '0')}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="px-4 pb-5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex gap-2 items-end rounded-[22px] px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  <textarea
                    autoFocus
                    value={quickMsgText}
                    onChange={(e) => setQuickMsgText(e.target.value)}
                    placeholder={`Scrivi a ${messagingFriend.name}...`}
                    className="flex-1 bg-transparent text-white text-[14px] font-medium resize-none focus:outline-none placeholder:text-white/25 min-h-[36px] max-h-28"
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(112, target.scrollHeight)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendQuickMsg(); }
                    }}
                  />
                  <button
                    disabled={!quickMsgText.trim() || isSendingQuickMsg}
                    onClick={handleSendQuickMsg}
                    className="w-10 h-10 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all disabled:opacity-30 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f43f5e, #9333ea)', boxShadow: '0 0 16px rgba(244,63,94,0.4)' }}
                  >
                    {isSendingQuickMsg ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 rotate-[-45deg]" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CUSTOM DELETE CONFIRM MODAL ── */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm px-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-stone-100"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-rose-600">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-2">Sei sicuro?</h3>
                <p className="text-sm text-stone-500 font-medium leading-relaxed">
                  Stai per eliminare l'amicizia con <span className="text-stone-900 font-bold">{confirmDelete.other_user?.name}</span>. Questa azione non può essere annullata.
                </p>

                <div className="flex flex-col gap-3 mt-8">
                  <button
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Elimina Amicizia"
                    )}
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={() => setConfirmDelete(null)}
                    className="w-full py-4 bg-stone-100 text-stone-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteSent && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm px-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-stone-100"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-rose-600">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-2">Annulla Richiesta?</h3>
                <p className="text-sm text-stone-500 font-medium leading-relaxed">
                  Stai per annullare la richiesta inviata a <span className="text-stone-900 font-bold">{confirmDeleteSent.other_user?.name}</span>. L'utente non riceverà più la tua notifica.
                </p>

                <div className="flex flex-col gap-3 mt-8">
                  <button
                    disabled={isDeleting}
                    onClick={handleCancelRequest}
                    className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Annulla Richiesta"
                    )}
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={() => setConfirmDeleteSent(null)}
                    className="w-full py-4 bg-stone-100 text-stone-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
};

// ── Admin Page ──
const AdminPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [sliderImages, setSliderImages] = useState<string[]>([]);
  const [friendshipImage, setFriendshipImage] = useState<string>('');
  const [loadingData, setLoadingData] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [localFriendshipUrl, setLocalFriendshipUrl] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [docSubTab, setDocSubTab] = useState<'pending' | 'archive'>('pending');
  const [reportSubTab, setReportSubTab] = useState<'pending' | 'archive'>('pending');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);
  const [modals, setModals] = useState<{ warning: boolean; suspension: boolean; ban: boolean }>({ warning: false, suspension: false, ban: false });
  const [confirmPhotoModal, setConfirmPhotoModal] = useState<{ type: 'gallery' | 'post', userId: string, photoUrl?: string, postId?: string } | null>(null);
  const [confirmReportModal, setConfirmReportModal] = useState<string | null>(null);
  const [modReason, setModReason] = useState('');
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // --- PERSISTENT CLOUD MODULES ---
  const [seoConfig, setSeoConfig] = useState<any>({
    all: {
      title: 'Amarsi Un Po | Incontri Seri in Italia',
      description: 'Amarsi Un Po è il portale di incontri premium per single italiani che cercano amore vero, relazioni serie e connessioni autentiche.',
      keywords: 'incontri seri italia, trovare amore 2025, app incontri italiani, anima gemella, dating premium, amarsi un po, single italia',
      url: 'https://www.amarsiunpo.it/',
      htmlTag: ''
    }
  });
  const [adsenseConfig, setAdsenseConfig] = useState<any>({
    client: '',
    slot: '',
    format: 'auto',
    responsive: 'true',
    enabled: false,
    metaTag: '',
    adsTxt: ''
  });
  const [analyticsConfig, setAnalyticsConfig] = useState<any>({
    measurementId: '',
    trackingId: '',
    tagContent: '',
    verificationTag: '',
    enabled: false
  });
  const [trafficStats, setTrafficStats] = useState({ 
    total: 0, 
    today: 0, 
    active_live: 0, 
    avg_time: '0:00mi',
    bounce_rate: '0%',
    trend: '+0%',
    history: [] as any[],
    adsense: {
      totalEarnings: 0,
      totalClicks: 0,
      totalImpressions: 0,
      avgCtr: 0,
      history: [] as any[]
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);


  const API_BASE = '';

  useEffect(() => {
    const saved = localStorage.getItem('amarsiunpo_user');
    if (saved) setAdminProfile(normalizeUser(JSON.parse(saved)));
    
    if (isAuthenticated) {
      fetchAdminModules();
    }
  }, [isAuthenticated]);

  const fetchAdminModules = async () => {
    try {
      const [seoRes, adsenseRes, analyticsRes, trafficRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/seo`),
        fetch(`${API_BASE}/api/admin/adsense`),
        fetch(`${API_BASE}/api/admin/analytics`),
        fetch(`${API_BASE}/api/admin/traffic`),
      ]);

      if (seoRes.ok) {
        const val = await seoRes.json();
        if (val && !val.all) setSeoConfig({ all: val });
        else setSeoConfig(val || { all: { title: '', description: '', keywords: '', url: '', htmlTag: '' } });
      }
      if (adsenseRes.ok) {
        const val = await adsenseRes.json();
        setAdsenseConfig(val || { enabled: false, client: '', slot: '', format: 'auto', responsive: 'true', metaTag: '', adsTxt: '' });
      }
      if (analyticsRes.ok) {
        const val = await analyticsRes.json();
        // Support both field name variants
        setAnalyticsConfig({ 
          enabled: false, 
          measurementId: '', 
          trackingId: '', 
          verificationTag: '', 
          ...(val || {}) 
        });
      }
      if (trafficRes.ok) {
        const val = await trafficRes.json();
        setTrafficStats(prev => ({
          ...prev,
          total: val.total || 0,
          today: val.today || 0,
        }));
      }
    } catch (e) {
      console.error('Error fetching admin modules:', e);
    }
  };

  const saveSeo = async (data: any) => {
    if (!data) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setSeoConfig(data);
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
      } else throw new Error('Server error');
    } catch (e) { setToast({ message: 'Errore salvataggio SEO', type: 'error' }); }
    setIsSaving(false);
  };

  const saveAdSense = async (data: any) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/adsense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setAdsenseConfig(data);
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
      } else throw new Error('Server error');
    } catch (e) { setToast({ message: 'Errore salvataggio AdSense', type: 'error' }); }
    setIsSaving(false);
  };

  const saveAnalytics = async (data: any) => {
    setIsSaving(true);
    try {
      // Ensure both field names are saved for compatibility
      const toSave = { ...data, trackingId: data.measurementId || data.trackingId };
      const res = await fetch(`${API_BASE}/api/admin/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave)
      });
      if (res.ok) {
        setAnalyticsConfig(data);
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 3000);
      } else throw new Error('Server error');
    } catch (e) { setToast({ message: 'Errore salvataggio Analytics', type: 'error' }); }
    setIsSaving(false);
  };

  const resetTraffic = async () => {
    if (!window.confirm('Sei sicuro di voler azzerare i contatori del traffico?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/traffic/reset`, { method: 'POST' });
      if (res.ok) {
        setTrafficStats(prev => ({ 
          ...prev, 
          total: 0, 
          today: 0,
          active_live: 0,
          avg_time: '0s',
          bounce_rate: '0%',
          trend: '0%',
          history: []
        }));
        setToast({ message: 'Traffico azzerato correttamente', type: 'info' });
      }
    } catch (e) { }
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    return {
      total: users?.length || 0,
      verified: (users || []).filter(u => u?.is_validated).length,
      premium: (users || []).filter(u => u?.is_paid).length, 
      suspended: (users || []).filter(u => u?.is_suspended || u?.is_blocked).length,
      pendingDocs: (users || []).filter(u => u?.id_document_url && !u?.is_validated && !u?.doc_rejected).length,
      pendingReports: (reports || []).filter(r => !r?.is_read).length,
      revenue: (users || []).filter(u => u?.is_paid).length * 9.99,
      trafficTotal: trafficStats?.total || 0,
      trafficToday: trafficStats?.today || 0,
    };
  }, [users, reports, trafficStats]);

  // Modals / Specific UI
  const [activeTab, setActiveTab] = useState<'dashboard' | 'utenti' | 'documenti' | 'segnalazioni' | 'pagamenti' | 'impostazioni' | 'seo' | 'traffico' | 'analytics' | 'adsense'>('dashboard');

  // Real-time traffic polling when on traffico tab
  const fetchTrafficLive = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/traffic`);
      if (res.ok) {
        const data = await res.json();
        setTrafficStats(prev => ({
          ...prev,
          total: data.total ?? prev.total,
          today: data.today ?? prev.today,
          active_live: data.active_live ?? prev.active_live,
          avg_time: data.avg_time ?? prev.avg_time,
          bounce_rate: data.bounce_rate ?? prev.bounce_rate,
          trend: data.trend ?? prev.trend,
          history: data.history || prev.history,
          adsense: data.adsense || prev.adsense
        }));
      }
    } catch (e) { console.error('Traffic fetch error:', e); }
  };
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'traffico') return;
    fetchTrafficLive();
    const interval = setInterval(fetchTrafficLive, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  const handleShareDoc = async (url: string, name: string) => {
    try {
      if (navigator.share) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
          const file = new File([blob], `documento-${name.replace(/\s+/g, '_')}.${ext}`, { type: blob.type || 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: `Documento: ${name}`, files: [file] });
            return;
          }
        } catch (err) { }
        await navigator.share({ title: `Documento: ${name}`, url });
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'accessometti') {
      setIsAuthenticated(true);
      fetchUsers();
      fetchSliderImages();
    } else {
      setToast({ message: "Credenziali errate", type: 'error' });
    }
  };

  const fetchUsers = async () => {
    setLoadingData(true);
    try {
      // Caricamento esclusivo da Supabase
      const { data: sbData, error: sbError } = await supabase.from('users').select('*').order('created_at', { ascending: false });

      const { data: repData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      setReports(repData || []);
      
      setUsers(sbData || []);
      if (sbError) {
        setToast({ message: "Impossibile caricare i dati da Supabase.", type: 'error' });
      }
    } catch (e) {
      setToast({ message: "Errore caricamento dati.", type: 'error' });
    }
    setLoadingData(false);
  };

  const fetchReports = async () => {
    try {
      const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (data) setReports(data);
    } catch (e) { }
  };

  const handleMarkReportRead = async (reportId: string, isRead: boolean) => {
    try {
      const { error } = await supabase.from('reports').update({ is_read: isRead }).eq('id', reportId);
      if (!error) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, is_read: isRead } : r));
        setToast({ message: isRead ? "Segnalazione archiviata." : "Segnalazione riaperta.", type: 'info' });
      } else {
        setToast({ message: "Errore durante l'aggiornamento: " + error.message, type: 'error' });
      }
    } catch (e: any) {
      setToast({ message: "Impossibile completare l'azione: " + e.message, type: 'error' });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    setConfirmReportModal(reportId);
  };

  const confirmDeleteReportAction = async () => {
    if (!confirmReportModal) return;
    try {
      const { error } = await supabase.from('reports').delete().eq('id', confirmReportModal);
      if (!error) {
        setReports(prev => prev.filter(r => r.id !== confirmReportModal));
        setToast({ message: "Segnalazione eliminata.", type: 'success' });
      } else {
        setToast({ message: "Errore eliminazione: " + error.message, type: 'error' });
      }
    } catch (e: any) {
      setToast({ message: "Errore eliminazione report: " + e.message, type: 'error' });
    }
    setConfirmReportModal(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare definitivamente questo utente? L'azione è irreversibile.")) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (!error) {
        setToast({ message: "Utente eliminato definitivamente.", type: 'success' });
        fetchUsers();
        if (selectedUser?.id === userId) setSelectedUser(null);
      } else throw error;
    } catch (e: any) {
      setToast({ message: "Errore eliminazione: " + e.message, type: 'error' });
    }
  };

  const fetchSliderImages = async () => {
    try {
      const { data: sliderData } = await supabase.from('site_settings').select('value').eq('key', 'home_slider').single();
      if (sliderData?.value) setSliderImages(JSON.parse(sliderData.value));
      
      const { data: friendData } = await supabase.from('site_settings').select('value').eq('key', 'home_friendship_image').single();
      if (friendData?.value) setFriendshipImage(friendData.value);
    } catch (e) { }
  };

  const handleUpdateSlider = async (newImages: string[]) => {
    try {
      const { error } = await supabase.from('site_settings').upsert({
        key: 'home_slider',
        value: JSON.stringify(newImages)
      });
      if (!error) {
        setSliderImages(newImages);
        setToast({ message: "Slider aggiornato!", type: 'success' });
      }
    } catch (e) { }
  };

  const handleUpdateFriendshipImage = async (url: string) => {
    try {
      const { error } = await supabase.from('site_settings').upsert({
        key: 'home_friendship_image',
        value: url
      });
      if (!error) {
        setFriendshipImage(url);
        setToast({ message: "Immagine Amicizia aggiornata!", type: 'success' });
      }
    } catch (e) { }
  };

  const addImage = () => {
    if (!newUrl) return;
    handleUpdateSlider([...sliderImages, newUrl]);
    setNewUrl('');
  };

  const removeImage = (index: number) => {
    handleUpdateSlider(sliderImages.filter((_, i) => i !== index));
  };

  const handleValidateDoc = async (userId: string) => {
    try {
      const { error } = await supabase.from('users').update({
        is_validated: true,
        doc_rejected: false,
        doc_rejected_at: null,
        is_suspended: false,
      }).eq('id', userId);

      if (!error) {
        setToast({ message: "Utente Verificato!", type: 'success' });
        fetchUsers();
      }
    } catch (e) { setToast({ message: "Errore.", type: 'error' }); }
  };

  const handleRejectDoc = async (userId: string) => {
    try {
      const { error } = await supabase.from('users').update({
        is_validated: false,
        doc_rejected: true,
        doc_rejected_at: new Date().toISOString(),
        is_suspended: true,
      }).eq('id', userId);
      if (!error) {
        setToast({ message: "Documento respinto.", type: 'info' });
        fetchUsers();
      }
    } catch (e) { setToast({ message: "Errore.", type: 'error' }); }
  };

  const handleBlockUserToggle = async (userId: string, isBlocked: boolean) => {
    try {
      const { error } = await supabase.from('users').update({ is_blocked: !isBlocked }).eq('id', userId);
      if (!error) {
        setToast({ message: !isBlocked ? "Utente bannato permanentemente." : "Ban rimosso.", type: 'success' });
        fetchUsers();
      }
    } catch (e) { setToast({ message: "Errore.", type: 'error' }); }
  };

  const handleWarnUser = async (userId: string) => {
    if (!modReason) return setToast({ message: "Inserisci una motivazione", type: 'error' });
    try {
      const { error } = await supabase.from('users').update({ 
        is_suspended: true,
        suspension_reason: modReason,
        suspended_at: new Date().toISOString(),
        last_warning_reason: modReason,
        last_warning_at: new Date().toISOString()
      }).eq('id', userId);
      if (!error) {
        setToast({ message: "Ammonizione e sospensione 24h inviate.", type: 'success' });
        setModals(prev => ({ ...prev, warning: false }));
        setModReason('');
        fetchUsers();
      }
    } catch (e) { setToast({ message: "Errore.", type: 'error' }); }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!modReason) return setToast({ message: "Inserisci una motivazione", type: 'error' });
    try {
      const { error } = await supabase.from('users').update({ 
        is_suspended: true,
        suspension_reason: modReason,
        suspended_at: new Date().toISOString()
      }).eq('id', userId);
      if (!error) {
        setToast({ message: "Utente sospeso per 24 ore.", type: 'success' });
        setModals(prev => ({ ...prev, suspension: false }));
        setModReason('');
        fetchUsers();
      }
    } catch (e) { setToast({ message: "Errore.", type: 'error' }); }
  };

  const handleUnsuspendUser = async (userId: string) => {
    try {
      const { error } = await supabase.from('users').update({ 
        is_suspended: false,
        suspension_reason: null,
        suspended_at: null
      }).eq('id', userId);
      if (!error) {
        setToast({ message: "Sospensione rimossa.", type: 'success' });
        fetchUsers();
        if (selectedUser?.id === userId) {
          setSelectedUser((prev: any) => ({ ...prev, is_suspended: false }));
        }
      }
    } catch (e) { setToast({ message: "Errore.", type: 'error' }); }
  };

  const fetchUserActivity = async (userId: string) => {
    setLoadingPosts(true);
    try {
      const { data } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      setUserPosts(data || []);
    } catch (e) { }
    setLoadingPosts(false);
  };

  const handleDeletePost = (postId: string, userId: string) => {
    setConfirmPhotoModal({ type: 'post', userId, postId });
  };

  const handleDeleteGalleryPhoto = (userId: string, photoUrl: string) => {
    setConfirmPhotoModal({ type: 'gallery', userId, photoUrl });
  };

  const confirmDeleteAction = async () => {
    if (!confirmPhotoModal) return;
    
    if (confirmPhotoModal.type === 'post' && confirmPhotoModal.postId) {
      try {
        const { error } = await supabase.from('posts').delete().eq('id', confirmPhotoModal.postId);
        if (!error) {
          await supabase.from('users').update({ has_post_removal_notice: true }).eq('id', confirmPhotoModal.userId);
          setToast({ message: "Post rimosso e utente notificato.", type: 'success' });
          setUserPosts(prev => prev.filter(p => p.id !== confirmPhotoModal.postId));
        } else {
          setToast({ message: "Errore durante l'eliminazione del post.", type: 'error' });
        }
      } catch (e) {
        setToast({ message: "Impossibile completare l'azione.", type: 'error' });
      }
    } else if (confirmPhotoModal.type === 'gallery' && confirmPhotoModal.photoUrl) {
      try {
        const target = users.find(u => u.id === confirmPhotoModal.userId);
        if (target) {
          const currentPhotos = Array.isArray(target.photos) ? target.photos : [];
          const updatedPhotos = currentPhotos.filter((p: string) => p !== confirmPhotoModal.photoUrl);
          
          const { error } = await supabase.from('users').update({ photos: updatedPhotos }).eq('id', confirmPhotoModal.userId);
          if (!error) {
            setToast({ message: "Foto rimossa correttamente.", type: 'success' });
            setUsers(prev => prev.map(u => u.id === confirmPhotoModal.userId ? { ...u, photos: updatedPhotos } : u));
            if (selectedUser?.id === confirmPhotoModal.userId) {
              setSelectedUser({ ...selectedUser, photos: updatedPhotos });
            }
          } else {
            setToast({ message: "Errore durante l'aggiornamento.", type: 'error' });
          }
        }
      } catch (e) {
        setToast({ message: "Impossibile completare l'azione.", type: 'error' });
      }
    }
    setConfirmPhotoModal(null);
  };

  const [selectedUser, setSelectedUser] = useState<any | null>(null);


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0C0A09] flex flex-col items-center justify-center p-6 relative overflow-hidden font-montserrat">
        {/* Background Decor */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-stone-900/20 rounded-full blur-[120px] animate-pulse delay-700" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm z-10"
        >
          <div className="bg-stone-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[40px] shadow-2xl relative">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-900/40 rotate-12">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
            </div>

            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-rose-500 fill-current" />
                <h1 className="text-3xl font-black text-white tracking-tighter">AMARSIUNPO</h1>
              </div>
              <p className="text-stone-50 text-[10px] font-black uppercase tracking-[0.4em]">Control Center</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Account</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                  <input
                    type="text"
                    value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 p-4 pl-12 rounded-2xl text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all placeholder:text-stone-700"
                    placeholder="Username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Chiave Accesso</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                  <input
                    type="password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 p-4 pl-12 rounded-2xl text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all placeholder:text-stone-700"
                    placeholder="Password"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-900/20 active:scale-95 transition-all mt-4 border border-rose-500/20"
              >
                Accedi Ora
              </button>
            </form>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full mt-6 text-stone-600 text-[10px] font-black uppercase tracking-widest hover:text-stone-400 transition-colors"
            >
              ← Torna all'App
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row relative font-montserrat">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-stone-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-[60] shadow-xl border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center shadow-lg shadow-rose-900/20">
            <Heart className="w-4 h-4 text-white fill-current" />
          </div>
          <span className="font-black tracking-tight text-sm">AMARSIUNPO Admin</span>
        </div>
        <button
          onClick={() => {
            const sidebar = document.getElementById('admin-sidebar');
            if (sidebar) sidebar.classList.toggle('-translate-x-full');
          }}
          className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:scale-95 transition-all"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <div
        id="sidebar-overlay"
        onClick={() => document.getElementById('admin-sidebar')?.classList.add('-translate-x-full')}
        className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] transition-opacity duration-300 opacity-0 pointer-events-none md:pointer-events-none"
      />

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className="fixed inset-y-0 left-0 w-[280px] bg-stone-900 text-white flex flex-col z-[70] shadow-2xl transition-transform duration-300 ease-out md:translate-x-0 -translate-x-full md:static md:w-72 md:h-screen"
      >
        <div className="p-8 pb-4 flex-1">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-900/40">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight leading-none text-white">AMARSIUNPO</span>
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">Control Center</span>
              </div>
            </div>
            <button
              onClick={() => {
                const sidebar = document.getElementById('admin-sidebar');
                if (sidebar) sidebar.classList.add('-translate-x-full');
              }}
              className="md:hidden w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1.5">
            {([
              { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
              { key: 'utenti', label: 'Utenti Iscritti', icon: Users },
              { key: 'documenti', label: 'Validazione ID', icon: ShieldCheck, badge: stats.pendingDocs },
              { key: 'segnalazioni', label: 'Segnalazioni', icon: AlertTriangle, badge: stats.pendingReports },
              { key: 'pagamenti', label: 'Abbonamenti', icon: CreditCard },
              { key: 'impostazioni', label: 'Slider Home', icon: ImageIcon },
              { key: 'seo', label: 'Gestione SEO', icon: Globe },
              { key: 'traffico', label: 'Traffico Live', icon: Activity },
              { key: 'analytics', label: 'Analytics', icon: BarChart3 },
              { key: 'adsense', label: 'Google AdSense', icon: Radio },
            ] as Array<{ key: string, label: string, icon: any, badge?: number }>).map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  const sidebar = document.getElementById('admin-sidebar');
                  if (sidebar) sidebar.classList.add('-translate-x-full');
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all border border-transparent",
                  activeTab === key
                    ? "bg-rose-600 text-white border-rose-500 shadow-xl shadow-rose-900/20"
                    : "text-stone-400 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4", activeTab === key ? "text-white" : "text-stone-500")} />
                  {label}
                </div>
                {'badge' in { badge } && (badge as number) > 0 &&
                  <span className={cn(
                    "w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center ring-2 ring-stone-900",
                    activeTab === key ? "bg-white text-rose-600" : "bg-rose-600 text-white"
                  )}>
                    {badge as number}
                  </span>
                }
              </button>
            ))}
          </nav>
        </div>

        <div className="p-8 border-t border-white/5 bg-stone-950/20">
          <button
            onClick={() => setIsAuthenticated(false)}
            className="w-full flex items-center justify-center gap-3 bg-stone-800/40 hover:bg-rose-950/30 text-stone-400 hover:text-rose-500 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border border-white/5"
          >
            <LogOut className="w-4 h-4" /> Disconnetti Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-[72px] md:top-0 z-40">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xl md:text-2xl font-black text-stone-900 capitalize leading-none">{activeTab.replace('_', ' ')}</h2>
              </div>
              <p className="text-[9px] md:text-[10px] text-stone-400 font-bold uppercase tracking-widest">AMARSIUNPO Back-office</p>
            </div>

            <div className="md:hidden flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-900 rounded-xl overflow-hidden border border-white shadow-lg">
                {adminProfile?.photo_url ? (
                  <img src={adminProfile.photo_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-black text-[10px]">AD</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-600 hover:text-rose-600 hover:bg-rose-50 transition-all font-bold text-[10px] md:text-xs shadow-sm shrink-0"
              title="Sincronizza Dati"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 md:w-4 h-4", loadingData ? "animate-spin" : "")} />
              <span>Aggiorna</span>
            </button>

            <div className="h-8 w-[1px] bg-stone-200 mx-1 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-xs font-black text-stone-900 leading-none">{adminProfile?.name || 'Super Admin'}</p>
                <p className="text-[9px] text-stone-400 font-bold mt-1 uppercase tracking-tighter">Accesso root</p>
              </div>
              <div className="w-11 h-11 bg-stone-900 rounded-2xl overflow-hidden border border-white shadow-xl rotate-3">
                {adminProfile?.photo_url ? (
                  <img src={adminProfile.photo_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-black text-xs">AD</div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 pb-20 overflow-y-auto">
          {loadingData && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-12 h-12 border-[5px] border-rose-100 border-t-rose-600 rounded-full animate-spin" />
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Inizializzazione dati...</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

              {/* --- DASHBOARD --- */}
              {activeTab === 'dashboard' && (
                <div className="space-y-10">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                    {[
                      { label: 'Utenti Iscritti', val: stats.total, sub: 'In crescita dell\'8%', icon: Users, color: 'stone', tab: 'utenti' },
                      { label: 'Verificati', val: stats.verified, sub: 'Badge assegnati', icon: ShieldCheck, color: 'emerald', tab: 'utenti' },
                      { label: 'VIP accounts', val: stats.premium, sub: 'Entrate attive', icon: Sparkles, color: 'amber', tab: 'pagamenti' },
                      { label: 'In Attesa ID', val: stats.pendingDocs, sub: 'Richieste urgenti', icon: Bell, color: 'rose', tab: 'documenti' },
                      { label: 'Segnalazioni', val: reports.length, sub: 'Report attivi', icon: AlertTriangle, color: 'rose', tab: 'segnalazioni' },
                      { label: 'Fatturato', val: `€ ${stats.revenue.toFixed(2)}`, sub: 'Totale incassato', icon: CreditCard, color: 'emerald', tab: 'pagamenti' },
                      { label: 'Traffico Totale', val: stats.trafficTotal, sub: 'Visite globali', icon: Activity, color: 'sky', tab: 'traffico' },
                      { label: 'Visite Oggi', val: stats.trafficToday, sub: 'Utenti attivi', icon: Zap, color: 'emerald', tab: 'traffico' },
                    ].map((s, i) => (
                      <div 
                        key={i} 
                        onClick={() => s.tab && setActiveTab(s.tab as any)}
                        className="bg-white border border-stone-100 p-4 md:p-6 rounded-[24px] md:rounded-[32px] shadow-sm hover:shadow-lg transition-all group overflow-hidden relative cursor-pointer active:scale-[0.98]"
                      >
                        <div className={cn("absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 blur-3xl rounded-full translate-x-12 -translate-y-12 opacity-10 transition-opacity group-hover:opacity-20",
                          s.color === 'rose' ? 'bg-rose-500' :
                            s.color === 'emerald' ? 'bg-emerald-500' :
                              s.color === 'amber' ? 'bg-amber-500' : 'bg-stone-500'
                        )} />

                        <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg",
                          s.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                            s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                              s.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-stone-50 text-stone-600'
                        )}>
                          <s.icon className="w-5 h-5 md:w-6 h-6" />
                        </div>
                        <p className="text-3xl md:text-4xl font-black text-stone-900 leading-none tracking-tighter">{s.val}</p>
                        <p className="text-[10px] md:text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] mt-3 md:mt-4 ml-1">{s.label}</p>
                      </div>
                    ))}                  </div>

                  {/* Recent Users Table */}
                  <div className="bg-white border border-stone-100 rounded-[32px] md:rounded-[48px] overflow-hidden shadow-sm">
                    <div className="px-6 md:px-10 py-6 md:py-8 border-b border-stone-50 flex flex-col sm:flex-row sm:items-center justify-between bg-stone-50/30 gap-4">
                      <div>
                        <h4 className="text-lg md:text-xl font-black text-stone-900">Ultimi Iscritti</h4>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Sincronizzazione real-time</p>
                      </div>
                      <button onClick={() => setActiveTab('utenti')} className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/10 transition-all active:scale-95 text-center">Vedi Tabella Completa</button>
                    </div>
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full text-left min-w-[500px] md:min-w-[600px]">
                        <thead>
                          <tr className="bg-white border-b border-stone-50">
                            <th className="px-5 md:px-10 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Profilo Utente</th>
                            <th className="hidden sm:table-cell px-6 md:px-10 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Località</th>
                            <th className="px-4 md:px-10 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Privilegi</th>
                            <th className="hidden md:table-cell px-6 md:px-10 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-20 text-center">
                                <Users className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                                <p className="text-stone-400 font-medium">Nessun utente trovato.</p>
                                <button onClick={fetchUsers} className="mt-4 text-rose-600 font-black text-xs uppercase tracking-widest hover:underline">Riprova</button>
                              </td>
                            </tr>
                          ) : users.slice(0, 6).map((u: any) => (
                            <tr key={u.id} 
                                onClick={() => { setSelectedUser(u); fetchUserActivity(u.id); setActiveTab('utenti'); }}
                                className="hover:bg-stone-50/50 transition-all group cursor-pointer active:scale-[0.99]">
                              <td className="px-6 md:px-10 py-4 md:py-5">
                                <div className="flex items-center gap-3 md:gap-4">
                                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-stone-100 overflow-hidden ring-2 md:ring-4 ring-white shadow-md">
                                    <img src={u.photo_url || `https://ui-avatars.com/api/?name=${u.name}+${u.surname}&background=F5F5F4&color=78716C&bold=true`} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs md:text-sm font-black text-stone-900 leading-tight truncate">{u.name} {u.surname}</p>
                                    <p className="text-[9px] md:text-[10px] text-stone-400 font-medium mt-0.5 truncate">{u.email || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="hidden sm:table-cell px-6 md:px-10 py-4 md:py-5">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3 text-rose-400" />
                                  <span className="text-xs font-bold text-stone-600 truncate">{u.city || '—'}</span>
                                </div>
                              </td>
                              <td className="px-4 md:px-10 py-4 md:py-5">
                                <div className="flex gap-1.5 md:gap-2">
                                  {u.is_paid ?
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] md:text-[9px] font-black rounded-full border border-amber-100 shadow-sm uppercase tracking-tighter">VIP</span> :
                                    <span className="px-2 py-0.5 bg-stone-50 text-stone-400 text-[8px] md:text-[9px] font-black rounded-full border border-stone-100 uppercase tracking-tighter">Base</span>
                                  }
                                  {u.is_validated ?
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] md:text-[9px] font-black rounded-full border border-emerald-100 shadow-sm uppercase tracking-tighter">V</span> :
                                    <span className="px-2 py-0.5 bg-stone-50 text-stone-300 text-[8px] md:text-[9px] font-black rounded-full border border-stone-100 uppercase tracking-tighter">P</span>
                                  }
                                </div>
                              </td>
                              <td className="hidden md:table-cell px-6 md:px-10 py-4 md:py-5">
                                <span className="text-[9px] md:text-[10px] text-stone-400 font-bold whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleDateString('it-IT') : '—'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'utenti' && (
                <div className="space-y-6 font-montserrat">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-black text-stone-900">Anagrafica Utenti</h4>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Real-time sync con Supabase</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Cerca per nome, email o città..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-stone-100 rounded-2xl text-[11px] font-bold focus:ring-2 focus:ring-rose-500 outline-none transition-all shadow-sm"
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {users.filter(u => {
                      const q = archiveSearch.toLowerCase();
                      return !q || u.name?.toLowerCase().includes(q) || u.surname?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q);
                    }).map((u: any) => (
                      <motion.div
                        key={u.id}
                        layout
                        className="bg-white border border-stone-100 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all group"
                      >
                        <div className="p-6">
                          <div className="flex items-start gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden ring-4 ring-stone-100 shrink-0 shadow-inner">
                              <img src={u.photo_url || `https://ui-avatars.com/api/?name=${u.name}+${u.surname}&background=F5F5F4&color=78716C&bold=true`} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-black text-stone-900 truncate text-base">{u.name} {u.surname}</h5>
                                {isUserOnline(u) && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-200" />}
                              </div>
                              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider truncate mb-2">{u.email}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {u.is_paid && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black rounded-lg border border-amber-100 uppercase tracking-tighter">VIP Member</span>}
                                {u.is_validated && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded-lg border border-emerald-100 uppercase tracking-tighter">Verificato</span>}
                                {u.is_blocked && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black rounded-lg border border-rose-100 uppercase tracking-tighter">Bloccato</span>}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-6 bg-stone-50/50 p-4 rounded-2xl border border-stone-100/50">
                            <div className="space-y-1">
                              <p className="text-[9px] text-stone-400 font-black uppercase tracking-widest">Località</p>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-rose-500" />
                                <p className="text-[11px] font-black text-stone-700 truncate">{u.city || '—'}</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] text-stone-400 font-black uppercase tracking-widest">Età / Genere</p>
                              <p className="text-[11px] font-black text-stone-700">{(u.dob ? calculateAge(u.dob) : '—')} anni · {u.gender || '—'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] text-stone-400 font-black uppercase tracking-widest">Occupazione</p>
                              <p className="text-[11px] font-black text-stone-700 truncate">{u.job || '—'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] text-stone-400 font-black uppercase tracking-widest">Iscritto il</p>
                              <p className="text-[11px] font-black text-stone-700">{u.created_at ? new Date(u.created_at).toLocaleDateString('it-IT') : '—'}</p>
                            </div>
                            {u.is_paid && (
                              <div className="col-span-2 mt-2 pt-2 border-t border-stone-100/50 space-y-2">
                                <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3" /> Dettagli Abbonamento
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-[8px] text-stone-400 font-bold uppercase">Scadenza</p>
                                    <p className="text-[10px] font-black text-stone-600">
                                      {u.subscription_expiry ? new Date(u.subscription_expiry).toLocaleDateString('it-IT') : '—'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-stone-400 font-bold uppercase">Tipo</p>
                                    <p className="text-[10px] font-black text-stone-600 capitalize">
                                      {u.subscription_type || 'Premium'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setSelectedUser(u); fetchUserActivity(u.id); }}
                              className="flex-1 bg-stone-900 hover:bg-black text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                            >
                              Moderazione & Info
                            </button>
                            <button
                              onClick={() => handleBlockUserToggle(u.id, u.is_blocked)}
                              className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border",
                                u.is_blocked ? "bg-rose-500 text-white border-rose-600 shadow-xl" : "bg-stone-50 text-stone-400 border-stone-100 hover:text-rose-600"
                              )}
                              title={u.is_blocked ? "Rimuovi Ban" : "Ban Permanente"}
                            >
                              {u.is_blocked ? <XCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Empty state */}
                  {users.length === 0 && (
                    <div className="py-32 text-center bg-white rounded-[40px] border border-stone-100">
                      <Users className="w-20 h-20 text-stone-200 mx-auto mb-6" />
                      <h5 className="text-xl font-black text-stone-900">Database Vuoto</h5>
                      <p className="text-stone-400 text-sm mt-2">Nessun utente reale trovato su Supabase.</p>
                    </div>
                  )}

                  {/* User Detailed Flashcard Modal */}
                  <AnimatePresence>
                    {selectedUser && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUser(null)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                          <button onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all z-10"><X className="w-5 h-5" /></button>

                          <div className="overflow-y-auto p-8 md:p-12 scrollbar-hide">
                            <div className="flex flex-col md:flex-row gap-8 mb-10 text-center md:text-left">
                              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] bg-stone-100 overflow-hidden ring-8 ring-stone-50 shadow-xl mx-auto md:mx-0">
                                <img src={selectedUser.photo_url || `https://ui-avatars.com/api/?name=${selectedUser.name}+${selectedUser.surname}&background=F5F5F4&color=78716C&bold=true`} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                  <h3 className="text-3xl font-black text-stone-900">{selectedUser.name} {selectedUser.surname}</h3>
                                  {selectedUser.is_paid && <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg shadow-sm"><Sparkles className="w-5 h-5" /></div>}
                                </div>
                                <p className="text-stone-400 font-bold uppercase tracking-widest text-xs mb-4">{selectedUser.gender} · {(selectedUser.dob ? calculateAge(selectedUser.dob) : '—')} anni · {selectedUser.city}</p>
                                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                  <span className="px-3 py-1.5 bg-stone-900 text-white text-[10px] font-black rounded-xl border border-white/10 uppercase tracking-widest">{selectedUser.orientation?.join?.(',') || 'Eterosessuale'}</span>
                                  <span className="px-3 py-1.5 bg-stone-100 text-stone-600 text-[10px] font-black rounded-xl border border-stone-200 uppercase tracking-widest">{selectedUser.body_type}</span>
                                  {selectedUser.is_suspended && <span className="px-3 py-1.5 bg-amber-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest flex items-center gap-1.5 pulse"><AlertTriangle className="w-3 h-3" /> Sospeso</span>}
                                  {selectedUser.is_blocked && <span className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest flex items-center gap-1.5"><XCircle className="w-3 h-3" /> Bannato</span>}
                                </div>
                              </div>
                            </div>

                            <div className="mb-10 space-y-4">
                              <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">Azioni Moderazione Rapida</p>
                              <div className="flex flex-wrap gap-2">
                                {/* 'Ammonisci' removed as requested - leaving only Suspension and Ban */}
                                {selectedUser.is_suspended ? (
                                  <button onClick={() => handleUnsuspendUser(selectedUser.id)} className="flex-1 min-w-[140px] py-3.5 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2">
                                    <UserCheck className="w-4 h-4" /> Riabilita
                                  </button>
                                ) : (
                                  <button onClick={() => setModals({ ...modals, suspension: true })} className="flex-1 min-w-[140px] py-3.5 bg-amber-50 text-amber-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition-all flex items-center justify-center gap-2">
                                    <Lock className="w-4 h-4" /> Sospendi 24h
                                  </button>
                                )}
                                <button onClick={() => handleBlockUserToggle(selectedUser.id, selectedUser.is_blocked)} className={cn("flex-1 min-w-[140px] py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2", selectedUser.is_blocked ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100")}>
                                  {selectedUser.is_blocked ? <><UserCheck className="w-4 h-4" /> Sblocca</> : <><XCircle className="w-4 h-4" /> Ban Perm.</>}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                              <div className="bg-stone-50/50 p-6 rounded-3xl border border-stone-100">
                                <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest mb-4">Bio & Passioni</p>
                                <p className="text-sm font-medium text-stone-700 leading-relaxed mb-4">{selectedUser.description || 'Nessuna descrizione.'}</p>
                                <p className="text-[11px] font-black text-stone-900 bg-white inline-block px-3 py-1.5 rounded-lg shadow-sm border border-stone-100">{selectedUser.hobbies}</p>
                              </div>
                            </div>

                            <div className="bg-stone-50/50 p-6 rounded-3xl border border-stone-100 mb-6">
                              <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest mb-4">Galleria Foto ({selectedUser.photos?.length || 0})</p>
                              {(!selectedUser.photos || selectedUser.photos.length === 0) ? (
                                <p className="text-xs text-stone-500 italic text-center py-4">Nessuna foto in galleria.</p>
                              ) : (
                                <div className="grid grid-cols-3 gap-3">
                                  {selectedUser.photos.map((photo: string, idx: number) => (
                                    <div key={idx} className="relative group rounded-2xl overflow-hidden aspect-square border border-stone-200 bg-white">
                                      <img src={photo} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => handleDeleteGalleryPhoto(selectedUser.id, photo)} className="w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="bg-stone-50/50 p-6 rounded-3xl border border-stone-100 mb-6">
                              <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest mb-4">Contenuti Pubblicati ({userPosts.length})</p>
                              {loadingPosts ? (
                                <div className="py-10 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-300" /></div>
                              ) : userPosts.length === 0 ? (
                                <p className="text-xs text-stone-500 italic text-center py-6">Nessun post pubblicato.</p>
                              ) : (
                                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto scrollbar-hide">
                                  {userPosts.map((p: any) => (
                                    <div key={p.id} className="relative group rounded-2xl overflow-hidden aspect-square border border-stone-200 bg-white">
                                      <img src={Array.isArray(p.photos) ? p.photos[0] : (p.image_url || p.photo_url)} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => handleDeletePost(p.id, selectedUser.id)} className="w-10 h-10 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="bg-stone-900 rounded-[32px] p-8 text-white relative overflow-hidden">
                              <Zap className="absolute top-1/2 right-4 -translate-y-1/2 w-48 h-48 text-white/5 -rotate-12" />
                              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
                                <div className="text-center md:text-left">
                                  <h4 className="text-xl font-black mb-1">Dati Account</h4>
                                  <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">{selectedUser.email}</p>
                                  {selectedUser.is_paid && (
                                    <div className="mt-4 flex flex-col gap-2 bg-white/5 p-4 rounded-2xl border border-white/10">
                                      <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5" /> Stato Sottoscrizione
                                      </p>
                                      <div className="flex gap-4">
                                         <div>
                                            <p className="text-[8px] text-stone-500 font-bold uppercase">Fine Abbonamento</p>
                                            <p className="text-xs font-black text-white">
                                              {selectedUser.subscription_expiry ? new Date(selectedUser.subscription_expiry).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                                            </p>
                                         </div>
                                         <div>
                                            <p className="text-[8px] text-stone-500 font-bold uppercase">Piano Attivo</p>
                                            <p className="text-xs font-black text-white capitalize">{selectedUser.subscription_type || 'Premium'}</p>
                                         </div>
                                      </div>
                                    </div>
                                  )}
                                  <p className="text-stone-500 text-[9px] font-black mt-4 uppercase tracking-widest italic">ID: {selectedUser.id}</p>
                                </div>
                                <div className="flex gap-4">
                                  <p className="text-[9px] text-white/40 uppercase font-black">Reported by AI/Users</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Reason Modals */}
                          <AnimatePresence>
                            {(modals.warning || modals.suspension) && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-stone-900/40 backdrop-blur-xl flex items-center justify-center p-6">
                                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-6">
                                  <div className="text-center">
                                    <h4 className="text-xl font-black text-stone-900">Motivazione {modals.warning ? 'Ammonizione' : 'Sospensione'}</h4>
                                    <p className="text-xs text-stone-500 mt-2 font-medium">Il messaggio verrà visualizzato dall'utente nella notifica di sistema.</p>
                                  </div>
                                  <div className="space-y-4">
                                    <textarea 
                                      value={modReason} 
                                      onChange={e => setModReason(e.target.value)}
                                      placeholder="Es: Linguaggio inappropriato, Foto non reali..."
                                      className="w-full h-24 p-4 bg-stone-50 border border-stone-200 rounded-2xl resize-none text-sm font-medium outline-none focus:ring-2 focus:ring-stone-900"
                                    />
                                    <div className="flex gap-2">
                                      <button onClick={() => { setModals({ warning: false, suspension: false, ban: false }); setModReason(''); }} className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Annulla</button>
                                      <button onClick={() => modals.warning ? handleWarnUser(selectedUser.id) : handleSuspendUser(selectedUser.id)} className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Conferma</button>
                                    </div>
                                  </div>
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Photo Delete Confirm Modal */}
                          <AnimatePresence>
                            {confirmPhotoModal && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-stone-900/40 backdrop-blur-xl flex items-center justify-center p-6">
                                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-6 text-center border-t-[6px] border-rose-500">
                                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 mb-4">
                                    <Trash2 className="w-8 h-8" />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-black text-stone-900 leading-tight">Eliminare {confirmPhotoModal.type === 'post' ? 'il Post' : 'la Foto'}?</h4>
                                    <p className="text-xs text-stone-500 mt-2 font-medium">L'azione sarà definitiva e la foto non potrà essere recuperata.</p>
                                  </div>
                                  <div className="flex gap-3 mt-8">
                                    <button onClick={() => setConfirmPhotoModal(null)} className="flex-1 py-3.5 bg-stone-100 text-stone-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-200 transition-all">Annulla</button>
                                    <button onClick={confirmDeleteAction} className="flex-1 py-3.5 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-900/20 active:scale-95 transition-all">Elimina</button>
                                  </div>
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}


              {activeTab === 'documenti' && (() => {
                const pendingDocs = users.filter((u: any) => u.id_document_url && !u.is_validated && !u.doc_rejected);
                const archivedDocs = users.filter((u: any) => u.id_document_url && (u.is_validated || u.doc_rejected));
                const q = archiveSearch.toLowerCase();
                const filteredArchive = archivedDocs.filter((u: any) =>
                  !q || u.name?.toLowerCase().includes(q) || u.surname?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
                );

                return (
                  <div>
                    {/* Sub-tab switcher */}
                    <div className="flex items-center gap-1 mb-6 bg-stone-100 p-1 rounded-2xl w-fit">
                      <button
                        onClick={() => setDocSubTab('pending')}
                        className={cn("px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2", docSubTab === 'pending' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}
                      >
                        <CheckCircle className="w-4 h-4" />
                        In attesa
                        {pendingDocs.length > 0 && <span className="w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center">{pendingDocs.length}</span>}
                      </button>
                      <button
                        onClick={() => setDocSubTab('archive')}
                        className={cn("px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2", docSubTab === 'archive' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700")}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Archivio
                        {archivedDocs.length > 0 && <span className="w-5 h-5 bg-stone-400 text-white rounded-full text-[10px] font-black flex items-center justify-center">{archivedDocs.length}</span>}
                      </button>
                    </div>

                    {/* ----- PENDING QUEUE ----- */}
                    {docSubTab === 'pending' && (
                      <div>
                        <p className="text-stone-500 text-sm mb-6">Verifica che i dati del documento corrispondano a quelli del profilo. Approva o richiedi nuovo invio.</p>
                        {pendingDocs.length === 0 ? (
                          <div className="py-24 text-center bg-white rounded-3xl border border-stone-100">
                            <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
                            <p className="font-bold text-stone-400 text-lg">Nessun documento in attesa.</p>
                            <p className="text-stone-300 text-sm mt-1">Ottimo lavoro, tutto aggiornato!</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {pendingDocs.map((u: any) => (
                              <div key={u.id} className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                                {/* Document image — click to preview */}
                                <div
                                  className="w-full h-48 bg-stone-100 relative group cursor-zoom-in"
                                  onClick={() => setPreviewDoc({ url: u.id_document_url, name: `${u.name} ${u.surname}` })}
                                >
                                  <img src={u.id_document_url} alt="Documento ID" className="w-full h-full object-cover group-hover:brightness-90 transition-all" />
                                  {/* Hover overlay */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                                    <div className="bg-white/90 text-stone-900 px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg">
                                      <Eye className="w-3.5 h-3.5" /> Anteprima
                                    </div>
                                    <button
                                      onClick={e => { e.stopPropagation(); handleShareDoc(u.id_document_url, `${u.name} ${u.surname}`); }}
                                      className="bg-white/90 text-stone-900 px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg hover:bg-white transition-colors"
                                    >
                                      <Share2 className="w-3.5 h-3.5" /> Condividi
                                    </button>
                                  </div>
                                  <div className="absolute top-3 right-3 px-3 py-1 bg-amber-500 text-white text-[11px] font-black uppercase rounded-full shadow-sm">
                                    Da verificare
                                  </div>
                                </div>

                                <div className="p-5 flex flex-col gap-4">
                                  {/* User data from profile for cross-check */}
                                  <div>
                                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">Dati profilo da verificare</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="bg-stone-50 rounded-xl px-3 py-2">
                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wide">Nome</p>
                                        <p className="font-black text-stone-800 text-sm">{u.name || '—'}</p>
                                      </div>
                                      <div className="bg-stone-50 rounded-xl px-3 py-2">
                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wide">Cognome</p>
                                        <p className="font-black text-stone-800 text-sm">{u.surname || '—'}</p>
                                      </div>
                                      <div className="bg-stone-50 rounded-xl px-3 py-2">
                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wide">Età</p>
                                        <p className="font-black text-stone-800 text-sm">{calculateAge(u.dob)} anni</p>
                                      </div>
                                      <div className="bg-stone-50 rounded-xl px-3 py-2">
                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wide">Città</p>
                                        <p className="font-black text-stone-800 text-sm">{u.city || '—'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => handleValidateDoc(u.id)}
                                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl font-black flex items-center justify-center gap-2 text-sm transition-all shadow-sm shadow-emerald-200"
                                    >
                                      <CheckCircle className="w-5 h-5" /> Approva
                                    </button>
                                    <button
                                      onClick={() => handleRejectDoc(u.id)}
                                      className="flex-1 py-3 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-700 border border-amber-200 rounded-2xl font-black flex items-center justify-center gap-2 text-sm transition-all"
                                    >
                                      <XCircle className="w-5 h-5" /> Richiedi Nuovo
                                    </button>
                                  </div>
                                  {/* Block button — immediate full block */}
                                  <button
                                    onClick={() => handleBlockUserToggle(u.id, u.is_blocked)}
                                    className={cn(
                                      "w-full py-2.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border active:scale-95",
                                      u.is_blocked
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                        : "bg-stone-900 text-white border-stone-900 hover:bg-stone-700"
                                    )}
                                  >
                                    {u.is_blocked
                                      ? <><UserCheck className="w-4 h-4" /> Sblocca Utente</>
                                      : <><AlertTriangle className="w-4 h-4" /> Blocca Utente</>}
                                  </button>
                                  <p className="text-[11px] text-stone-400 text-center leading-relaxed -mt-1">
                                    "Richiedi Nuovo" sospende parzialmente per <strong>15 gg</strong>. "Blocca" esclude l'utente immediatamente.
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ----- ARCHIVE ----- */}
                    {docSubTab === 'archive' && (
                      <div>
                        {/* Search bar */}
                        <div className="relative mb-6">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="text"
                            value={archiveSearch}
                            onChange={e => setArchiveSearch(e.target.value)}
                            placeholder="Cerca per nome, cognome o email…"
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-stone-100 shadow-sm text-sm outline-none focus:ring-2 focus:ring-rose-400 transition"
                          />
                          {archiveSearch && (
                            <button onClick={() => setArchiveSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {filteredArchive.length === 0 ? (
                          <div className="py-24 text-center bg-white rounded-3xl border border-stone-100">
                            <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-stone-200" />
                            <p className="font-bold text-stone-400">{archiveSearch ? 'Nessun risultato trovato.' : 'Archivio vuoto.'}</p>
                          </div>
                        ) : (
                          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                            {filteredArchive.map((u: any, idx: number) => {
                              const daysLeft = u.doc_rejected_at
                                ? 15 - Math.floor((Date.now() - new Date(u.doc_rejected_at).getTime()) / (1000 * 60 * 60 * 24))
                                : null;
                              return (
                                <div key={u.id} className={cn("flex items-center gap-4 p-4 hover:bg-stone-50 transition-colors", idx !== filteredArchive.length - 1 && "border-b border-stone-50")}>
                                  {/* Doc thumbnail */}
                                  <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0 border border-stone-100 bg-stone-100">
                                    {u.id_document_url
                                      ? <img src={u.id_document_url} className="w-full h-full object-cover" />
                                      : <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-stone-300" /></div>
                                    }
                                  </div>
                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-black text-stone-900 truncate">{u.name} {u.surname}</p>
                                    <p className="text-xs text-stone-400 truncate">{u.email} · {u.city}</p>
                                    {u.doc_rejected && daysLeft !== null && daysLeft > 0 && (
                                      <p className="text-[11px] text-amber-600 font-bold mt-0.5">⏱ {daysLeft} giorni al blocco</p>
                                    )}
                                    {u.doc_rejected && daysLeft !== null && daysLeft <= 0 && (
                                      <p className="text-[11px] text-red-600 font-bold mt-0.5">🔴 Scaduto — da bloccare</p>
                                    )}
                                  </div>
                                  {/* Status + action */}
                                  <div className="shrink-0 flex items-center gap-3">
                                    <div className="flex flex-col items-end gap-1">
                                      {u.is_validated ? (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black border border-emerald-100">
                                          <CheckCircle className="w-3.5 h-3.5" /> Approvato
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-[11px] font-black border border-rose-100">
                                          <XCircle className="w-3.5 h-3.5" /> Respinto
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => setPreviewDoc({ url: u.id_document_url, name: `${u.name} ${u.surname}` })}
                                        className="w-10 h-10 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl flex items-center justify-center transition-all shadow-sm border border-stone-200"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteUser(u.id)}
                                        className="w-10 h-10 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center transition-all shadow-sm border border-rose-100"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                      </div>
                );
              })()}


              {activeTab === 'segnalazioni' && (
                <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-stone-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] rounded-full translate-x-32 -translate-y-32" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm">
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-stone-900">Centro Segnalazioni</h3>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Gestione Report Abusi</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl w-fit mb-8">
                      <button
                        onClick={() => setReportSubTab('pending')}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          reportSubTab === 'pending' ? "bg-white text-rose-600 shadow-sm" : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        Attive ({reports.filter(r => r.is_read !== true).length})
                      </button>
                      <button
                        onClick={() => setReportSubTab('archive')}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          reportSubTab === 'archive' ? "bg-white text-stone-600 shadow-sm" : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        Archiviate ({reports.filter(r => r.is_read === true).length})
                      </button>
                    </div>

                    <AnimatePresence>
                      {confirmReportModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-xl flex items-center justify-center p-6">
                          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white w-full max-w-sm rounded-[40px] p-8 md:p-10 shadow-2xl text-center border-t-[8px] border-rose-500">
                             <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-600 mb-6 shadow-sm border border-rose-100">
                               <Trash2 className="w-10 h-10" />
                             </div>
                             <h4 className="text-2xl font-black text-stone-900 leading-tight mb-3">Eliminare Report?</h4>
                             <p className="text-sm text-stone-500 font-medium leading-relaxed">Questa azione rimuoverà permanentemente la segnalazione. L'account dell'utente non verrà toccato.</p>
                             <div className="flex flex-col gap-3 mt-10">
                               <button onClick={confirmDeleteReportAction} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 active:scale-95 transition-all">Elimina Ora</button>
                               <button onClick={() => setConfirmReportModal(null)} className="w-full py-4 bg-stone-100 text-stone-400 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-stone-200 transition-all">Annulla</button>
                             </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {reportSubTab === 'pending' ? (
                      <div className="space-y-6">
                        {reports.filter(r => r.is_read !== true).length > 0 ? (
                          <div className="w-full space-y-6 text-left">
                            {reports.filter(r => r.is_read !== true).map((r: any) => {
                              const reportedUser = users.find(u => u.id === r.reported_id);
                              const reporterUser = users.find(u => u.id === r.reporter_id);
                              return (
                                <div 
                                  key={r.id} 
                                  className="bg-white rounded-[40px] p-6 md:p-8 border border-rose-100 bg-rose-50/5 shadow-sm transition-all relative overflow-hidden"
                                >
                                  <div className="absolute top-0 right-0 px-5 py-2 bg-rose-600 text-[10px] font-black text-white uppercase tracking-widest rounded-bl-3xl">
                                    Nuovo Report
                                  </div>
                                  
                                  <div className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between border-b border-stone-50 pb-4">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-stone-300" />
                                        <span className="text-[11px] font-black text-stone-400 uppercase tracking-widest">
                                          {new Date(r.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                      </div>
                                      {reportedUser && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                          <span className="text-[11px] font-black uppercase tracking-tight">Report Totali: {reportedUser.reports_count || 0}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="bg-stone-50/50 p-4 rounded-3xl border border-stone-100">
                                        <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Utente Segnalato
                                        </p>
                                        {reportedUser ? (
                                          <div className="flex items-center gap-3">
                                            <img src={reportedUser.photo_url || `https://ui-avatars.com/api/?name=${reportedUser.name}+${reportedUser.surname}`} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" />
                                            <div className="min-w-0">
                                              <p className="text-sm font-black text-stone-900 truncate">{reportedUser.name} {reportedUser.surname}</p>
                                              <p className="text-[10px] text-stone-400 font-bold truncate">{reportedUser.email}</p>
                                            </div>
                                          </div>
                                        ) : <span className="text-[10px] text-stone-300 italic font-medium break-all">{r.reported_id}</span>}
                                      </div>

                                      <div className="bg-stone-50/50 p-4 rounded-3xl border border-stone-100">
                                        <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Inviata da
                                        </p>
                                        {reporterUser ? (
                                          <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 border border-stone-100 shadow-sm">
                                              <User className="w-6 h-6 text-stone-400" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-sm font-bold text-stone-600 truncate">{reporterUser.name} {reporterUser.surname}</p>
                                              <p className="text-[10px] text-stone-400 font-bold truncate">Utente Attivo</p>
                                            </div>
                                          </div>
                                        ) : <span className="text-[10px] text-stone-300 italic font-medium break-all">{r.reporter_id}</span>}
                                      </div>
                                    </div>

                                    <div className="bg-stone-900 rounded-3xl p-6 text-white relative overflow-hidden group">
                                      <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                                      <p className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] mb-3">Motivazione</p>
                                      <p className="text-[13px] text-stone-200 leading-relaxed italic font-medium relative z-10">"{r.reason}"</p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                      <button 
                                        onClick={() => handleMarkReportRead(r.id, true)}
                                        className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 border-rose-600 shadow-xl shadow-rose-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                      >
                                        <CheckCircle className="w-4 h-4" /> Caso Risolto
                                      </button>
                                      
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => { setSelectedUser(reportedUser); setActiveTab('utenti'); }}
                                          className="flex-1 py-4 px-8 bg-stone-900 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-stone-800 transition-all font-black text-[11px] uppercase tracking-widest active:scale-95"
                                        >
                                          <Eye className="w-4 h-4" /> Vedi Profilo
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteReport(r.id)}
                                          className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center border-2 border-rose-100 hover:bg-rose-100 transition-all active:scale-95 shrink-0"
                                          title="Elimina Segnalazione"
                                        >
                                          <Trash2 className="w-5 h-5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-24 text-center">
                            <ShieldCheck className="w-24 h-24 mb-6 text-stone-200 mx-auto" strokeWidth={1} />
                            <h4 className="text-xl font-black text-stone-900 mb-2">Tutto Sotto Controllo</h4>
                            <p className="text-sm text-stone-400 font-medium leading-relaxed px-4">In questo momento non ci sono segnalazioni attive.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {reports.filter(r => r.is_read === true).length > 0 ? (
                          <div className="w-full space-y-6 text-left">
                            {reports.filter(r => r.is_read === true).map((r: any) => {
                              const reportedUser = users.find(u => u.id === r.reported_id);
                              const reporterUser = users.find(u => u.id === r.reporter_id);
                              return (
                                <div 
                                  key={r.id} 
                                  className="bg-white rounded-[40px] p-6 md:p-8 border border-stone-100 opacity-70 shadow-sm transition-all relative overflow-hidden"
                                >
                                  <div className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between border-b border-stone-50 pb-4">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-stone-300" />
                                        <span className="text-[11px] font-black text-stone-400 uppercase tracking-widest">
                                          {new Date(r.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="bg-stone-50/50 p-4 rounded-3xl border border-stone-100">
                                        <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Utente Segnalato
                                        </p>
                                        {reportedUser ? (
                                          <div className="flex items-center gap-3">
                                            <img src={reportedUser.photo_url || `https://ui-avatars.com/api/?name=${reportedUser.name}+${reportedUser.surname}`} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" />
                                            <div className="min-w-0">
                                              <p className="text-sm font-black text-stone-900 truncate">{reportedUser.name} {reportedUser.surname}</p>
                                            </div>
                                          </div>
                                        ) : <span className="text-[10px] text-stone-300 italic font-medium break-all">{r.reported_id}</span>}
                                      </div>
                                      <div className="bg-stone-50/50 p-4 rounded-3xl border border-stone-100">
                                        <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Inviata da
                                        </p>
                                        {reporterUser ? (
                                          <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 border border-stone-100 shadow-sm">
                                              <User className="w-6 h-6 text-stone-400" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-sm font-bold text-stone-600 truncate">{reporterUser.name} {reporterUser.surname}</p>
                                            </div>
                                          </div>
                                        ) : <span className="text-[10px] text-stone-300 italic font-medium break-all">{r.reporter_id}</span>}
                                      </div>
                                    </div>
                                    <div className="bg-stone-100 rounded-3xl p-6 text-stone-600">
                                      <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">Motivazione</p>
                                      <p className="text-[13px] leading-relaxed italic font-medium">"{r.reason}"</p>
                                    </div>
                                    <div className="flex gap-3">
                                      <button 
                                        onClick={() => handleMarkReportRead(r.id, false)}
                                        className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border-2 border-stone-100 bg-white text-stone-400 hover:bg-stone-50"
                                      >
                                        <RefreshCw className="w-4 h-4" /> Riapri Caso
                                      </button>

                                      <button 
                                        onClick={() => handleDeleteReport(r.id)}
                                        className="w-14 h-14 bg-stone-100 text-stone-400 rounded-2xl flex items-center justify-center border-2 border-stone-200 hover:bg-rose-50 hover:text-rose-600 transition-all shrink-0"
                                        title="Elimina Definitivamente"
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-24 text-center">
                            <Archive className="w-16 h-16 mb-4 text-stone-200 mx-auto" strokeWidth={1} />
                            <p className="text-sm text-stone-400 font-medium">L'archivio è vuoto.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'pagamenti' && (
                <div className="space-y-8">
                  <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-stone-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full translate-x-32 -translate-y-32" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between flex-wrap gap-6 mb-10">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                            <CreditCard className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-stone-900">Gestione Abbonamenti</h3>
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Stripe Integration Status</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/20 active:scale-95 transition-all cursor-default">
                          <CheckCircle className="w-4 h-4" /> Live Connection
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-stone-50/50 p-8 rounded-[32px] border border-stone-100/50 transition-all hover:bg-white hover:shadow-xl group">
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Utenti Premium</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-stone-900 tracking-tighter">0</span>
                            <span className="text-emerald-500 font-black text-xs">Test Mode</span>
                          </div>
                          <p className="text-[10px] text-stone-400 font-bold mt-4">Active VIP subscriptions (Reset)</p>
                        </div>

                        <div className="bg-stone-900 p-8 rounded-[32px] text-white relative overflow-hidden group">
                          <Sparkles className="absolute top-4 right-4 w-20 h-20 text-white/5 group-hover:rotate-12 transition-transform duration-700" />
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Proiezione MRR</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-stone-500 text-2xl font-black">€</span>
                            <span className="text-5xl font-black tracking-tighter text-white">0.00</span>
                          </div>
                          <p className="text-[10px] text-stone-500 font-bold mt-4 uppercase tracking-widest">Entrate Mensili (Test Phase)</p>
                        </div>

                        <div className="bg-emerald-50 p-8 rounded-[32px] border border-emerald-100 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Payouts</p>
                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><ArrowRight className="w-4 h-4" /></div>
                          </div>
                          <div className="mt-6">
                            <p className="text-sm font-black text-emerald-900 mb-1">Pagamenti Puntuali</p>
                            <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-600 h-full w-0" />
                            </div>
                            <p className="text-[9px] text-emerald-600 font-bold mt-2">Affidabilità webhook: 0%</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-stone-50/50 p-10 rounded-[40px] border-2 border-dashed border-stone-200 text-center">
                        <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-xl border border-stone-50">
                          <CreditCard className="w-10 h-10 text-stone-300" />
                        </div>
                        <h4 className="text-xl font-black text-stone-900 mb-2">Transazioni Dashboard</h4>
                        <p className="text-stone-400 text-sm max-w-md mx-auto font-medium leading-relaxed mb-8">
                          I dettagli delle singole transazioni sono visualizzabili direttamente sul portale Stripe. Stiamo sincronizzando i metadata per mostrarti i log qui prossimamente.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <button className="w-full sm:w-auto px-10 py-4 bg-[#635BFF] text-white rounded-[20px] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[#635BFF]/30 hover:brightness-110 active:scale-95 transition-all">
                            Apri Stripe Portal →
                          </button>
                          <button onClick={fetchUsers} className="w-full sm:w-auto px-10 py-4 bg-white border border-stone-200 text-stone-900 rounded-[20px] font-black text-[11px] uppercase tracking-widest hover:bg-stone-50 active:scale-95 transition-all">
                            Aggiorna Stats
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'impostazioni' && (
                <div className="space-y-12">
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                      <ImageIcon className="w-6 h-6 text-rose-500" /> Slider HomePage
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {sliderImages.map((img, i) => (
                        <div key={i} className="aspect-video rounded-2xl overflow-hidden relative group border border-stone-200 shadow-sm transition-transform hover:scale-[1.02]">
                          <img src={img} className="w-full h-full object-cover" />
                          <button onClick={() => removeImage(i)} className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </div>
                      ))}
                      {sliderImages.length === 0 && <p className="col-span-full py-8 text-stone-400 text-center border-2 border-dashed border-stone-200 rounded-2xl">Nessun immagine caricata.</p>}
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest ml-1">Carica Nuova Immagine Slider</p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <input
                            type="file"
                            id="admin-slider-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                              if (e.target.files?.[0]) {
                                const base64 = await fileToBase64(e.target.files[0]);
                                handleUpdateSlider([...sliderImages, base64]);
                              }
                            }}
                          />
                          <button 
                            onClick={() => document.getElementById('admin-slider-upload')?.click()}
                            className="w-full h-[52px] bg-stone-100 text-stone-600 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 border border-stone-200 hover:bg-stone-200 transition-all active:scale-95"
                          >
                            <CloudUpload className="w-5 h-5" /> Carica Slider
                          </button>
                        </div>
                        <div className="flex-[1.5] flex gap-2">
                          <input
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            placeholder="Incolla URL slider..."
                            className="flex-1 p-3 px-5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                          />
                          <button 
                            onClick={addImage} 
                            className="bg-stone-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-stone-800 transition-all active:scale-95 shadow-xl shadow-stone-200"
                          >
                            Aggiungi Slider
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Friendship Image Management */}
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm text-left">
                    <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                      <Users className="w-6 h-6 text-indigo-500" /> Immagine Tema Amicizia (Home)
                    </h3>
                    <p className="text-stone-400 text-xs mb-6 font-medium">Questa immagine verrà mostrata sulla HomePage prima del tutorial. Si consiglia un formato orizzontale.</p>
                    
                    <div className="mb-6">
                      {friendshipImage ? (
                        <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden border border-stone-200 shadow-inner group relative">
                          <img src={friendshipImage} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => handleUpdateFriendshipImage('')}
                              className="bg-rose-600 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest"
                            >Elimina</button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-[21/9] rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-3 text-stone-300">
                          <ImageIcon className="w-12 h-12" />
                          <span className="text-xs font-bold uppercase tracking-widest">Nessuna immagine</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input
                          type="file"
                          id="admin-friendship-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            if (e.target.files?.[0]) {
                              const base64 = await fileToBase64(e.target.files[0]);
                              handleUpdateFriendshipImage(base64);
                            }
                          }}
                        />
                        <button 
                          onClick={() => document.getElementById('admin-friendship-upload')?.click()}
                          className="w-full h-[52px] bg-stone-100 text-stone-600 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 border border-stone-200 hover:bg-stone-200 transition-all active:scale-95"
                        >
                          <CloudUpload className="w-5 h-5" /> Carica Foto Amicizia
                        </button>
                      </div>
                      <div className="flex-[1.5] flex gap-2">
                        <input
                          value={localFriendshipUrl}
                          onChange={(e) => setLocalFriendshipUrl(e.target.value)}
                          placeholder="Incolla URL immagine..."
                          className="flex-1 p-3 px-5 rounded-xl bg-stone-50 border border-stone-200 text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <button 
                          onClick={() => {
                            if (localFriendshipUrl) handleUpdateFriendshipImage(localFriendshipUrl);
                            setLocalFriendshipUrl('');
                          }} 
                          className="bg-stone-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-stone-800 transition-all active:scale-95 shadow-xl shadow-stone-200"
                        >
                          Salva URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- SEO MANAGEMENT --- */}
              {activeTab === 'seo' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white p-8 rounded-[32px] border border-stone-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full" />
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                      <div>
                        <h3 className="text-2xl font-black text-stone-900">Configurazione SEO Globale</h3>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Ottimizzazione per motori di ricerca</p>
                      </div>
                      <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl">
                        <Globe className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Titolo Sito (Browser)</label>
                          <input 
                            type="text" 
                            value={seoConfig?.all?.title || ""} 
                            onChange={(e) => setSeoConfig({...seoConfig, all: {...seoConfig.all, title: e.target.value}})}
                            className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-900 font-bold outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                            placeholder="AMARSIUNPO | Incontra..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">URL Canonico</label>
                          <input 
                            type="text" 
                            value={seoConfig?.all?.url || ""} 
                            onChange={(e) => setSeoConfig({...seoConfig, all: {...seoConfig.all, url: e.target.value}})}
                            className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-900 font-bold outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                            placeholder="https://amarsiunpo.com/"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Meta Description</label>
                        <textarea 
                          value={seoConfig?.all?.description || ""} 
                          onChange={(e) => setSeoConfig({...seoConfig, all: {...seoConfig.all, description: e.target.value}})}
                          className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-900 font-bold outline-none focus:ring-2 focus:ring-rose-500 transition-all h-32 resize-none"
                          placeholder="Descrivi brevemente il portale..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Keyword principali (separate da virgola)</label>
                        <input 
                          type="text" 
                          value={seoConfig?.all?.keywords || ""} 
                          onChange={(e) => setSeoConfig({...seoConfig, all: {...seoConfig.all, keywords: e.target.value}})}
                          className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-900 font-bold outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                          placeholder="incontri, anima gemella, amarsiunpo..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Tag HTML Personalizzato (Meta Tag, Verifiche...)</label>
                        <textarea 
                          value={seoConfig?.all?.htmlTag || ""} 
                          onChange={(e) => setSeoConfig({...seoConfig, all: {...seoConfig.all, htmlTag: e.target.value}})}
                          className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-900 font-bold outline-none focus:ring-2 focus:ring-rose-500 transition-all h-24 font-mono text-[10px] resize-none"
                          placeholder='<meta name="example" content="value" />'
                        />
                      </div>

                      <button 
                        onClick={() => saveSeo(seoConfig)}
                        disabled={isSaving}
                        className="w-full bg-stone-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
                      >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? "In corso..." : "Salva Configurazione SEO"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TRAFFIC LIVE --- */}
              {activeTab === 'traffico' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-stone-900">Traffico Live — www.amarsiunpo.it</h3>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Monitoraggio Real-time</p>
                    </div>
                    <button
                      onClick={fetchTrafficLive}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-emerald-100"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Aggiorna Ora
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Utenti Live</p>
                      <p className="text-3xl font-black text-stone-900">{trafficStats.active_live}</p>
                      <p className="text-[9px] text-stone-400 font-bold mt-1">Visitatori in tempo reale</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Tempo Medio</p>
                      <p className="text-3xl font-black text-stone-900">{trafficStats.avg_time}</p>
                      <p className="text-[9px] text-stone-400 font-bold mt-1">Durata sessione</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Bounce Rate</p>
                      <p className="text-3xl font-black text-stone-900">{trafficStats.bounce_rate}</p>
                      <p className="text-[9px] text-stone-400 font-bold mt-1">Frequenza rimbalzo</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Trend Settimana</p>
                      <p className="text-3xl font-black text-stone-900">{trafficStats.trend}</p>
                      <p className="text-[9px] text-stone-400 font-bold mt-1">Crescita vs scorsa set.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[40px] border border-stone-100 shadow-sm relative overflow-hidden group h-[300px] flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Visite Totali da Reset</p>
                          <p className="text-3xl font-black text-stone-900 tracking-tighter">{(trafficStats?.total ?? 0).toLocaleString('it-IT')}</p>
                        </div>
                        <Activity className="w-8 h-8 text-rose-500/20" />
                      </div>
                      <div className="flex-1 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trafficStats.history}>
                            <defs>
                              <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="visits" stroke="#f43f5e" fillOpacity={1} fill="url(#colorVisits)" strokeWidth={3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-stone-900 p-8 rounded-[40px] border border-stone-800 shadow-2xl relative overflow-hidden group h-[300px] flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Andamento Ingressi Giornalieri</p>
                          <p className="text-3xl font-black text-white tracking-tighter">{(trafficStats?.today ?? 0).toLocaleString('it-IT')} oggi</p>
                        </div>
                        <Zap className="w-8 h-8 text-rose-500" />
                      </div>
                      <div className="flex-1 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trafficStats.history}>
                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1c1917', border: 'none', borderRadius: '12px', color: 'white' }} />
                            <Bar dataKey="visits" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-blue-900 text-sm mb-1">Dominio in propagazione</p>
                      <p className="text-blue-600 text-xs font-medium leading-relaxed">Le visite vengono tracciate in produzione (build distribuita). In sviluppo locale i contatori non si incrementano. Una volta propagato il dominio <strong>www.amarsiunpo.it</strong>, il traffico reale sarà visibile qui.</p>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[38px] border border-stone-200 flex flex-col items-center text-center">
                    <div className="bg-rose-50 p-4 rounded-full mb-6">
                      <RefreshCw className="w-8 h-8 text-rose-500" />
                    </div>
                    <h4 className="text-xl font-black text-stone-900 mb-2">Reset Contatori</h4>
                    <p className="text-stone-400 text-xs font-medium max-w-sm mb-8">Azzerando il traffico pulirai i contatori del server. Questa azione non può essere annullata ma non influisce sui dati storici di Google Analytics.</p>
                    <button 
                      onClick={resetTraffic}
                      className="bg-stone-100 hover:bg-rose-600 hover:text-white text-stone-400 px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                    >
                      Azzera Contatori Traffico
                    </button>
                  </div>
                </div>
              )}

              {/* --- ANALYTICS --- */}
              {activeTab === 'analytics' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white p-8 rounded-[32px] border border-stone-200 shadow-sm">
                    <div className="flex items-center gap-6 mb-10 pb-6 border-b border-stone-50">
                      <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center shadow-sm">
                        <BarChart3 className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-stone-900">Google Analytics 4 + Search Console</h3>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Tracking e Verifica Proprietà Sito — www.amarsiunpo.it</p>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Stato GA4:</span>
                        <button 
                          onClick={() => setAnalyticsConfig({...(analyticsConfig || {}), enabled: !(analyticsConfig?.enabled)})}
                          className={cn("w-14 h-7 rounded-full transition-all relative", analyticsConfig?.enabled ? "bg-purple-600" : "bg-stone-200")}
                        >
                          <div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md", analyticsConfig?.enabled ? "right-1" : "left-1")} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Measurement ID (G-XXXXXXXXXX)</label>
                        <input 
                          type="text" 
                          value={analyticsConfig?.measurementId || ""} 
                          onChange={(e) => setAnalyticsConfig({...(analyticsConfig || {}), measurementId: e.target.value})}
                          className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-900 font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
                          placeholder="G-..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Tag di Verifica (Search Console)</label>
                        <textarea 
                          value={analyticsConfig.verificationTag || ""} 
                          onChange={(e) => setAnalyticsConfig({...analyticsConfig, verificationTag: e.target.value})}
                          className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all h-24 font-mono text-[10px] resize-none"
                          placeholder='<meta name="google-site-verification" content="..." />'
                        />
                      </div>

                      <button 
                        onClick={() => saveAnalytics(analyticsConfig)}
                        disabled={isSaving}
                        className="w-full bg-stone-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
                      >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? "In corso..." : "Aggiorna Analytics Cloud"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- ADSENSE --- */}
              {activeTab === 'adsense' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center gap-6 mb-10 pb-6 border-b border-stone-50">
                      <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center shadow-sm">
                        <Radio className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-stone-900">Google AdSense Analytics</h3>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Guadagni e Performance Banner</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Stato Ads:</span>
                        <button 
                          onClick={() => setAdsenseConfig({...(adsenseConfig || {}), enabled: !(adsenseConfig?.enabled)})}
                          className={cn("w-14 h-7 rounded-full transition-all relative", adsenseConfig?.enabled ? "bg-amber-500" : "bg-stone-200")}
                        >
                          <div className={cn("absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md", adsenseConfig?.enabled ? "right-1" : "left-1")} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 shadow-sm">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Guadagni Totali</p>
                        <p className="text-3xl font-black text-stone-900">€ {(trafficStats.adsense?.totalEarnings ?? 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 shadow-sm">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Click Totali</p>
                        <p className="text-3xl font-black text-stone-900">{trafficStats.adsense?.totalClicks ?? 0}</p>
                      </div>
                      <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 shadow-sm">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Impressioni</p>
                        <p className="text-3xl font-black text-stone-900">{(trafficStats.adsense?.totalImpressions ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 shadow-sm">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">CTR Medio</p>
                        <p className="text-3xl font-black text-stone-900">{(trafficStats.adsense?.avgCtr ?? 0).toFixed(2)}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                      <div className="bg-white p-6 rounded-[32px] border border-stone-100 h-[300px] flex flex-col shadow-sm">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">Andamento Guadagni (€)</p>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trafficStats.adsense?.history || []}>
                              <defs>
                                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                              <Area type="monotone" dataKey="earnings" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEarnings)" strokeWidth={3} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-stone-900 p-6 rounded-[32px] h-[300px] flex flex-col shadow-xl">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Click e Impressioni</p>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trafficStats.adsense?.history || []}>
                              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1c1917', border: 'none', borderRadius: '12px', color: 'white' }} />
                              <Bar dataKey="clicks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="impressions" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.6} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Client ID (ca-pub-XXXXXXXXXX)</label>
                          <input 
                            type="text" 
                            value={adsenseConfig?.client || ""} 
                            onChange={(e) => setAdsenseConfig({...(adsenseConfig || {}), client: e.target.value})}
                            className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-900 font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Meta Tag AdSense</label>
                          <input 
                            type="text" 
                            value={adsenseConfig?.metaTag || ""} 
                            onChange={(e) => setAdsenseConfig({...(adsenseConfig || {}), metaTag: e.target.value})}
                            className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-900 font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono"
                            placeholder='<meta name="google-adsense-account" content="..." />'
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Contenuto Ads.txt</label>
                        <textarea 
                          value={adsenseConfig?.adsTxt || ""} 
                          onChange={(e) => setAdsenseConfig({...adsenseConfig, adsTxt: e.target.value})}
                          className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-900 font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all h-24 font-mono text-[10px] resize-none"
                        />
                      </div>

                      <button 
                        onClick={() => saveAdSense(adsenseConfig)}
                        disabled={isSaving}
                        className="w-full bg-stone-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
                      >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? "In corso..." : "Salva Configurazione AdSense"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
        
        {/* Apple Style Success Modal */}
        <AnimatePresence>
          {showSuccessModal && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-[min(90vw,400px)] px-4"
            >
              <div className="bg-white/95 backdrop-blur-2xl border border-stone-200 p-6 rounded-[32px] shadow-2xl flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center shadow-lg shadow-stone-200">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-stone-900 font-black text-xl uppercase tracking-tight">Impostazioni Salvate</h3>
                  <p className="text-stone-500 font-bold text-sm">Le modifiche sono state applicate con successo e sincronizzate!</p>
                </div>
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-orange-100"
                >
                  Ho capito
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Preview document modal */}
        <AnimatePresence>
          {previewDoc && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-stone-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-10"
              onClick={() => setPreviewDoc(null)}
            >
              <div className="absolute top-6 right-6 flex items-center gap-6 z-10">
                <div className="text-right hidden sm:block">
                  <p className="text-white font-black text-sm uppercase tracking-tighter">{previewDoc.name}</p>
                  <p className="text-white/40 font-bold text-[9px] uppercase tracking-[0.2em]">Documento d'Identità</p>
                </div>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="w-12 h-12 bg-white/10 hover:bg-rose-600 text-white rounded-2xl flex items-center justify-center transition-all border border-white/10 shadow-2xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center" 
                onClick={e => e.stopPropagation()}
              >
                <img 
                  src={previewDoc.url} 
                  alt="Full preview" 
                  className="max-w-full max-h-full object-contain rounded-[32px] shadow-2xl shadow-black border-4 border-white/5"
                />
              </motion.div>

              <div className="flex gap-4 mt-8">
                 <button 
                  onClick={(e) => { e.stopPropagation(); handleShareDoc(previewDoc.url, previewDoc.name); }}
                  className="bg-white hover:bg-stone-100 text-stone-900 px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center gap-2 transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" /> Scarica o Condividi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Register Helper Components ---
const ChipScroll = ({ label, options, value, onChange, multi = false }: {
  label: string;
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) => {
  const arr: string[] = multi ? (Array.isArray(value) ? value : (value ? [value as string] : [])) : [];
  const single: string = !multi ? (value as string) : '';
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest ml-1">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
        {options.map(o => {
          const isActive = multi ? arr.includes(o) : single === o;
          return (
            <button key={o} type="button"
              style={{
                scrollSnapAlign: 'start', flexShrink: 0,
                ...(isActive
                  ? { background: 'rgba(244,63,94,0.25)', border: '1px solid rgba(244,63,94,0.7)', boxShadow: '0 0 12px rgba(244,63,94,0.3)' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' })
              }}
              onClick={() => {
                if (!multi) { onChange(o); return; }
                const next = arr.includes(o) ? arr.filter(x => x !== o) : [...arr, o];
                onChange(next);
              }}
              className={cn(
                "px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all",
                isActive ? "text-rose-300" : "text-white/50"
              )}
            >{o}</button>
          );
        })}
      </div>
    </div>
  );
};

const DarkInput = ({ label, name, type = 'text', value, placeholder, onChange, disabled = false }: any) => (
  <div className="space-y-1.5">
    <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest ml-1">{label}</p>
    <input
      name={name} type={type} value={value} placeholder={placeholder}
      onChange={onChange} disabled={disabled}
      className="w-full px-4 py-3 rounded-[16px] text-sm font-medium text-white placeholder:text-white/25 outline-none disabled:opacity-40"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    />
  </div>
);

const DarkSelect = ({ label, name, value, onChange, children }: any) => (
  <div className="space-y-1.5">
    <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest ml-1">{label}</p>
    <select name={name} value={value} onChange={onChange}
      className="w-full px-4 py-3 rounded-[16px] text-sm font-medium text-white outline-none appearance-none"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    >{children}</select>
  </div>
);

const DarkTextArea = ({ label, name, value, placeholder, onChange }: any) => (
  <div className="space-y-1.5">
    <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest ml-1">{label}</p>
    <textarea name={name} value={value} placeholder={placeholder} onChange={onChange}
      className="w-full px-4 py-3 rounded-[16px] text-sm font-medium text-white placeholder:text-white/25 outline-none h-20 resize-none"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    />
  </div>
);

const RegisterPage = ({ setSecurityStatus }: { setSecurityStatus: any }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(() => {
    // Priority 1: Step passed via location state (e.g. from rejection banner)
    if (location.state && typeof location.state.step === 'number') {
      return location.state.step;
    }
    // Priority 2: Step based on profile existence
    const savedUser = localStorage.getItem('amarsiunpo_user');
    const isEditing = savedUser ? true : false;
    return isEditing ? 3 : 1;
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
    accepted_terms: false,
    accepted_privacy: false,
  });

  useEffect(() => {
    const initData = async () => {
      try {
        const authenticatedUserRaw = localStorage.getItem('amarsiunpo_user');
        const savedDraft = localStorage.getItem('amarsiunpo_reg_draft');

        if (savedDraft) {
          setFormData(normalizeUser(JSON.parse(savedDraft)));
          return;
        }

        if (authenticatedUserRaw) {
          const user = JSON.parse(authenticatedUserRaw);
          if (user.id) {
            // Fetch fresh data from Supabase
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single();

            if (data && !error) {
              setFormData(prev => ({ ...prev, ...normalizeUser(data) }));
            } else if (typeof user.id === 'string' && user.id.length > 10) {
              // Probably already a UUID, just use it
              setFormData(prev => ({ ...prev, ...normalizeUser(user) }));
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
    localStorage.setItem('amarsiunpo_reg_draft', JSON.stringify(formData));
  }, [formData]);

  const handleNextToStep1 = async () => {
    if (isLogin) {
      handleLogin();
      return;
    }
    if (!isEditing && (!formData.email || !formData.password)) {
      setToast({ message: "Inserisci email e password per procedere.", type: 'info' });
      return;
    }

    // Se stiamo creando un nuovo account, verifichiamo se l'email esiste già
    try {
      const email = formData.email.trim();
      const password = formData.password;

      // Se l'utente esiste e la password è corretta...
      const { data: authCheck, error: authCheckErr } = await supabase.auth.signInWithPassword({ email, password });

      if (!authCheckErr && authCheck.user) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', authCheck.user.id).single();
        if (profile) {
          setToast({ message: "Bentornato! Sei già registrato.", type: 'success' });
          localStorage.setItem('amarsiunpo_user', JSON.stringify(profile));
          window.dispatchEvent(new Event('user-auth-change'));
          setTimeout(() => navigate('/bacheca'), 1500);
          return;
        } else {
          setToast({ message: "Account esistente trovato. Completa il tuo profilo.", type: 'info' });
          setStep(3); // Salta i termini se ha già un auth record? No, meglio mandarlo ai termini se non ha profilo.
          return;
        }
      }

      if (authCheckErr && authCheckErr.message === 'Invalid login credentials') {
        const { data: emailExists } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (emailExists) {
          setToast({ message: "Questa email è già registrata. Prova ad accedere.", type: 'error' });
          setIsLogin(true);
          return;
        }
      }
    } catch (e) { console.error(e); }

    setStep(2);
  };



  const handleLogin = async () => {
    if (!formData.accepted_terms || !formData.accepted_privacy) {
      setToast({ message: "Devi accettare i termini e la privacy per procedere.", type: 'info' });
      return;
    }
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
        // SECURITY CHECK
        if (profile.is_blocked) {
          setSecurityStatus({ type: 'blocked' });
          return;
        }
        if (profile.is_suspended) {
          setSecurityStatus({ type: 'suspended', reason: profile.suspension_reason });
          return;
        }
        if (profile.doc_rejected) {
          setSecurityStatus({ type: 'doc_rejected' });
          localStorage.setItem('amarsiunpo_security_notice', JSON.stringify({ type: 'doc_rejected' }));
        }

        console.log("Profile found, saving to local storage");
        localStorage.setItem('amarsiunpo_user', JSON.stringify(profile));
        window.dispatchEvent(new Event('user-auth-change'));
        navigate('/bacheca');
      } else {
        console.log("No profile record found in 'users' table. Redirecting to complete registration.");
        setToast({ message: "Bentornato! Il tuo account esiste ma il profilo non è completo. Per favora completa i dati mancanti.", type: 'info' });
        setIsLogin(false);
        setStep(3); // Go to the new Step 3 (Profile Data)
      }
    } catch (e) {
      console.error("Exception during login process:", e);
      setToast({ message: "Errore imprevisto durante l'accesso.", type: 'error' });
    }
  };

  const handleOAuthLogin = async (provider: 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/bacheca'
      }
    });
    if (error) setToast({ message: "Errore login " + provider + ": " + error.message, type: 'error' });
  };

  const handleNextToStep2Legal = () => {
    if (!formData.accepted_terms || !formData.accepted_privacy) {
      setToast({ message: "Devi accettare i termini e la privacy per procedere.", type: 'info' });
      return;
    }
    setStep(3);
  };

  const handleNextToStep3Profile = () => {
    const required = ['name', 'surname', 'dob', 'city', 'job', 'description'];
    const missing = required.filter(k => !formData[k as keyof UserProfile]);
    if (missing.length > 0) {
      setToast({ message: "Per favore, completa tutti i campi del profilo per continuare.", type: 'info' });
      return;
    }

    const age = calculateAge(formData.dob);
    if (age < 18) {
      setToast({
        message: "L'uso di AMARSIUNPO è vietato ai minori di 18 anni.",
        type: 'error'
      });
      return;
    }

    setStep(4);
  };

  const handleNextToStep4Matching = () => {
    if (!formData.looking_for_age_min || !formData.looking_for_age_max) {
      setToast({ message: "Indica la fascia d'età che cerchi.", type: 'info' });
      return;
    }
    setStep(5);
  };

  const handleNextToStep5AboutYou = () => {
    setStep(7);
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
        // When user uploads a new document, we clear the rejection status locally
        setFormData(prev => ({ 
          ...prev, 
          id_document_url: base64,
          doc_rejected: false,
          doc_rejected_at: null
        }));
      } catch (err) {
        setToast({ message: "Errore durante l'elaborazione del documento.", type: 'error' });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    // Manual text fields: auto-capitalize the first letter
    const finalValue = (type === 'text' || e.target.tagName === 'TEXTAREA') ? capFirst(value) : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
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
        localStorage.setItem('amarsiunpo_user', JSON.stringify(data));
      } catch (err) {
        console.error("LocalStorage error:", err);
      }
      localStorage.removeItem('amarsiunpo_reg_draft');
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

  // Helper: horizontal scroll chips selector


  return (
    <div className="min-h-screen pt-16 pb-12 px-4 flex justify-center" style={{ background: '#0a0a0f' }}>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>


      {/* Floating blurred hearts background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <style>{`
          @keyframes floatHeartAuth {
            0%   { transform: translateY(110vh) translateX(0px) scale(0.6) rotate(-10deg); opacity: 0; }
            10%  { opacity: 0.18; }
            90%  { opacity: 0.08; }
            100% { transform: translateY(-10vh) translateX(var(--hx,20px)) scale(1.1) rotate(10deg); opacity: 0; }
          }
          .fh-auth { animation: floatHeartAuth var(--hd,12s) ease-in-out var(--hdelay,0s) infinite; position: absolute; bottom: -40px; }
        `}</style>
        {[
          { left: '5%', size: 28, color: '#f43f5e', blur: 6, hd: 14, hdelay: 0, hx: '15px' },
          { left: '25%', size: 16, color: '#ec4899', blur: 10, hd: 18, hdelay: 2, hx: '-20px' },
          { left: '60%', size: 24, color: '#a855f7', blur: 12, hd: 16, hdelay: 1, hx: '25px' },
          { left: '85%', size: 20, color: '#f43f5e', blur: 8, hd: 12, hdelay: 4, hx: '-15px' }
        ].map((h, i) => (
          <div key={i} className="fh-auth" style={{
            left: h.left,
            '--hd': `${h.hd}s`,
            '--hdelay': `${h.hdelay}s`,
            '--hx': h.hx,
            filter: `blur(${h.blur}px)`,
            opacity: 0.15
          } as any}>
            <Heart size={h.size} fill={h.color} color={h.color} />
          </div>
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center px-1">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all hover:bg-white/10 active:scale-90"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              title="Torna alla Home"
            ><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-xl font-montserrat font-black text-white uppercase tracking-tight">{isEditing ? 'Modifica Profilo' : 'Iscriviti'}</h1>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Step {step} di 6</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 7].map(i => (
              <div key={i} className={cn("h-1 rounded-full transition-all duration-300", step >= i ? "bg-rose-500 w-5" : "bg-white/10 w-2")} />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="rounded-[28px] p-6 space-y-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Email + Password ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="text-center space-y-1 pb-2">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3"
                    style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)' }}
                  >
                    <Heart className="w-6 h-6 text-rose-400 fill-current" />
                  </motion.div>
                  <h3 className="text-xl font-montserrat font-black text-white">{isLogin ? 'Bentornato/a' : 'Crea Account'}</h3>
                  <p className="text-white/40 text-[11px]">{isLogin ? 'Inserisci i tuoi dati per accedere.' : 'Dati necessari per l\'accesso.'}</p>
                </div>
                <DarkInput label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="mario@esempio.it" />
                <div className="space-y-1.5">
                  <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest ml-1">Password</p>
                  <div className="relative">
                    <input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange}
                      placeholder="Minimo 6 caratteri"
                      className="w-full px-4 py-3 pr-12 rounded-[16px] text-sm font-medium text-white placeholder:text-white/25 outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="button" onClick={handleNextToStep1}
                  className="w-full py-4 rounded-[18px] text-sm font-black uppercase tracking-widest text-white transition-all active:scale-95"
                  style={{ background: '#e11d48', boxShadow: '0 0 20px rgba(225,29,72,0.35)' }}
                >{isLogin ? 'Accedi' : 'Inizia Ora →'}</button>
                <button type="button" onClick={() => handleOAuthLogin('google')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[18px] text-sm font-bold text-white/70 transition-all hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  Continua con Google
                </button>

                <p className="text-center text-[11px] text-white/30">
                  {isLogin ? (<>Non hai un account? <button type="button" onClick={() => setIsLogin(false)} className="text-rose-400 font-bold">Iscriviti</button></>) : (<>Hai già un account? <button type="button" onClick={() => setIsLogin(true)} className="text-rose-400 font-bold">Accedi</button></>)}
                </p>
              </motion.div>
            )}

            {/* ── STEP 2: Regolamento e Privacy ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center space-y-1">
                  <ShieldCheck className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                  <h3 className="text-xl font-montserrat font-black text-white uppercase tracking-tight">Accordi Legali</h3>
                  <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest">Le regole della nostra community</p>
                </div>

                <div className="space-y-4 max-h-[48vh] overflow-y-auto pr-2 scrollbar-hide text-left">
                  {/* Regolamento */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Regolamento della Community</h4>
                    <div className="p-4 rounded-[20px] space-y-4 text-[11px] leading-relaxed text-white/60 font-medium" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <section className="space-y-1.5">
                        <p className="text-white font-black uppercase text-[9px]">1. Requisiti e Identità</p>
                        <p>• <span className="text-white">Età:</span> L'uso è vietato ai minori di 18 anni.</p>
                        <p>• <span className="text-white">Verifica:</span> È richiesta la verifica del documento.</p>
                        <p>• <span className="text-white">Autenticità:</span> Solo foto reali e personali.</p>
                      </section>
                      <section className="space-y-1.5">
                        <p className="text-white font-black uppercase text-[9px]">2. Contenuti e Comportamento</p>
                        <p>• <span className="text-white">No Nudo:</span> Vietati nudo o contenuti sessuali espliciti.</p>
                        <p>• <span className="text-white">Rispetto:</span> Vietati messaggi offensivi o molesti.</p>
                      </section>
                      <p className="text-rose-400/80 font-bold italic pt-2 text-[10px]">L'iscrizione implica l'accettazione totale dei termini.</p>
                    </div>
                  </div>

                  {/* GDPR */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Informativa Privacy</h4>
                    <div className="p-4 rounded-[20px] space-y-3 text-[11px] leading-relaxed text-white/60 font-medium" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p>• <span className="text-white">Dati:</span> Usati esclusivamente per il profilo e funzionamento app.</p>
                      <p>• <span className="text-white">Identità:</span> Documenti cancellati dopo la convalida.</p>
                      <p>• <span className="text-white">Sicurezza:</span> Crittografia avanzata e nessun dato venduto.</p>
                    </div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3 pt-2">
                  <label className="flex gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                      <input type="checkbox" checked={formData.accepted_terms} onChange={(e) => setFormData(f => ({ ...f, accepted_terms: e.target.checked }))} className="sr-only" />
                      <div className={cn("w-5 h-5 rounded-lg transition-all", formData.accepted_terms ? "bg-rose-500 shadow-lg shadow-rose-900/40" : "bg-white/5 border border-white/10 group-hover:border-rose-500/50")} />
                      {formData.accepted_terms && <CheckCircle className="absolute w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-white/80 group-hover:text-white transition-colors">Accetto i Termini e Condizioni</p>
                      <p className="text-[8px] text-white/30 leading-tight">Dichiaro di essere maggiorenne e accetto il regolamento.</p>
                    </div>
                  </label>

                  <label className="flex gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                      <input type="checkbox" checked={formData.accepted_privacy} onChange={(e) => setFormData(f => ({ ...f, accepted_privacy: e.target.checked }))} className="sr-only" />
                      <div className={cn("w-5 h-5 rounded-lg transition-all", formData.accepted_privacy ? "bg-rose-500 shadow-lg shadow-rose-900/40" : "bg-white/5 border border-white/10 group-hover:border-rose-500/50")} />
                      {formData.accepted_privacy && <CheckCircle className="absolute w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-white/80 group-hover:text-white transition-colors">Accetto la Privacy Policy</p>
                      <p className="text-[8px] text-white/30 leading-tight">Acconsento al trattamento dei dati personali.</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-[18px] text-sm font-black text-white/50 uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Indietro</button>
                  <button onClick={handleNextToStep2Legal} className="flex-1 py-4 rounded-[18px] text-sm font-black text-white uppercase tracking-widest" style={{ background: '#e11d48', boxShadow: '0 0 20px rgba(225,29,72,0.35)' }}>Accetta e Continua →</button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Dati profilo ── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <DarkInput label="Nome" name="name" value={formData.name} onChange={handleInputChange} placeholder="Mario" disabled={isEditing && !!formData.name} />
                  <div className="space-y-1">
                    <DarkInput label="Cognome" name="surname" value={formData.surname} onChange={handleInputChange} placeholder="Rossi" disabled={isEditing && !!formData.surname} />
                    <p className="text-[9px] text-rose-400/80 font-bold italic ml-1">* Non verrà mai pubblicato</p>
                  </div>
                </div>
                <DarkInput label="Data di Nascita" name="dob" type="date" value={formData.dob} onChange={handleInputChange} disabled={isEditing && !!formData.dob} />
                <DarkSelect label="Città" name="city" value={formData.city} onChange={handleInputChange}>
                  <option value="">Seleziona Città</option>
                  {ITALIAN_CITIES.map(c => <option key={c} value={c} className="bg-stone-900">{c}</option>)}
                </DarkSelect>

                {/* Identità di Genere — scroll orizzontale */}
                <ChipScroll
                  label="Identità di Genere"
                  options={['Uomo', 'Donna', 'Non-binario', 'Transgender', 'Genderfluid', 'Genderqueer', 'Agender', 'Bigender', 'Pangender', 'Demi-genere', 'Intersessuale', 'Neutrois', 'Queer', 'Altro']}
                  value={formData.gender || ''}
                  onChange={(v) => setFormData(p => ({ ...p, gender: v as string }))}
                  multi={false}
                />

                {/* Orientamento Sessuale — scroll orizzontale, multi */}
                <ChipScroll
                  label="Orientamento Sessuale (puoi sceglierne più di uno)"
                  options={['Eterosessuale', 'Gay', 'Lesbica', 'Bisessuale', 'Pansessuale', 'Asessuale', 'Demisessuale', 'Sapiosexual', 'Polisessuale', 'Queer', 'Fluido', 'Aromantic', 'Curioso/a', 'Altro']}
                  value={Array.isArray(formData.orientation) ? formData.orientation : (formData.orientation ? [formData.orientation as any] : [])}
                  onChange={(v) => setFormData(p => ({ ...p, orientation: v as string[] }))}
                  multi={true}
                />

                <DarkSelect label="Corporatura" name="body_type" value={formData.body_type} onChange={handleInputChange}>
                  {['Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta'].map(t => <option key={t} value={t} className="bg-stone-900">{t}</option>)}
                </DarkSelect>
                <DarkInput label="Lavoro" name="job" value={formData.job} onChange={handleInputChange} placeholder="Es. Designer" />
                <DarkTextArea label="Descrizione" name="description" value={formData.description} onChange={handleInputChange} placeholder="Raccontaci di te..." />

                {/* Foto */}
                <div className="space-y-2">
                  <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest ml-1">Foto Profilo (Max 5)</p>
                  <div className="grid grid-cols-5 gap-2">
                    {formData.photos?.map((url, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden relative group">
                        <img src={url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <label className="p-1 bg-white/90 rounded-full cursor-pointer"><RefreshCw className="w-3 h-3 text-stone-700" /><input type="file" accept="image/*" className="hidden" onChange={e => replacePhoto(i, e)} /></label>
                          <button type="button" onClick={() => removePhoto(i)} className="p-1 bg-white/90 rounded-full"><Trash2 className="w-3 h-3 text-rose-600" /></button>
                        </div>
                        {i === 0 && <div className="absolute bottom-0 left-0 right-0 bg-rose-600 text-[7px] text-white text-center py-0.5 font-bold">Principale</div>}
                      </div>
                    ))}
                    {(formData.photos?.length || 0) < 5 && (
                      <label className="aspect-square rounded-xl border border-dashed border-white/15 flex items-center justify-center cursor-pointer hover:border-rose-500/50 transition-colors" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <UserPlus className="w-5 h-5 text-white/30" />
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Documento */}
                <div className="p-4 rounded-[20px] space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2 text-white/60 text-xs font-bold"><CreditCard className="w-4 h-4" /> Documento d'Identità</div>
                  
                  {formData.doc_rejected && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex gap-3">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Azione Richiesta</p>
                        <p className="text-[9px] text-white/60 leading-tight">Il tuo documento è stato rifiutato. Ricaricalo ora per evitare la sospensione tra {calculateRemainingDays(formData.doc_rejected_at)} giorni.</p>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-white/30 leading-tight">Carica un documento per la sicurezza della community (CI, Patente o Passaporto).</p>
                  <label className={cn("w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
                    formData.id_document_url ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 hover:border-rose-500/30 hover:bg-white/5")}>
                    {formData.id_document_url ? (
                      <div className="flex flex-col items-center gap-1 animate-in zoom-in duration-300">
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Documento Selezionato</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <CloudUpload className="w-6 h-6 text-white/20" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Seleziona File</span>
                      </div>
                    )}
                    <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleIdUpload} />
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-[18px] text-sm font-black text-white/50 uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Indietro</button>
                  <button onClick={handleNextToStep3Profile} className="flex-1 py-4 rounded-[18px] text-sm font-black text-white uppercase tracking-widest" style={{ background: '#e11d48', boxShadow: '0 0 20px rgba(225,29,72,0.35)' }}>Continua →</button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4: Preferenze Matching ── */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="p-3 rounded-[16px] flex gap-2 items-start" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                  <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-300 leading-tight">Questi dati determinano chi vedi nella bacheca.</p>
                </div>

                {/* Genere cercato — scroll orizzontale, multi */}
                <ChipScroll
                  label="Chi cerchi? (scelta multipla)"
                  options={['Uomo', 'Donna', 'Tutti', 'Non-binario', 'Transgender', 'Genderfluid', 'Queer', 'Altro']}
                  value={Array.isArray(formData.looking_for_gender) ? formData.looking_for_gender : (formData.looking_for_gender ? [formData.looking_for_gender as any] : [])}
                  onChange={(v) => {
                    const arr = v as string[];
                    const hasTutti = arr.includes('Tutti');
                    setFormData(p => ({ ...p, looking_for_gender: hasTutti ? ['Tutti'] : arr }));
                  }}
                  multi={true}
                />

                <div className="grid grid-cols-2 gap-3">
                  <DarkInput label="Età Min" name="looking_for_age_min" type="number" value={formData.looking_for_age_min} onChange={handleInputChange} />
                  <DarkInput label="Età Max" name="looking_for_age_max" type="number" value={formData.looking_for_age_max} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DarkSelect label="Altezza Preferita" name="looking_for_height" value={formData.looking_for_height} onChange={handleInputChange}>
                    <option value="" className="bg-stone-900">Indifferente</option>
                    <option value="Piccola (<160)" className="bg-stone-900">Piccola (&lt;160cm)</option>
                    <option value="Media (160-175)" className="bg-stone-900">Media (160-175cm)</option>
                    <option value="Alta (175-190)" className="bg-stone-900">Alta (175-190cm)</option>
                    <option value="Molto Alta (>190)" className="bg-stone-900">Molto Alta (&gt;190cm)</option>
                  </DarkSelect>
                  <DarkSelect label="Corporatura" name="looking_for_body_type" value={formData.looking_for_body_type} onChange={handleInputChange}>
                    {['Tutte', 'Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta'].map(t => <option key={t} value={t} className="bg-stone-900">{t}</option>)}
                  </DarkSelect>
                </div>
                <DarkTextArea label="Cosa cerchi in un partner?" name="looking_for_other" value={formData.looking_for_other} onChange={handleInputChange} placeholder="Descrivi il partner ideale..." />

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(3)} className="flex-1 py-4 rounded-[18px] text-sm font-black text-white/50 uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Indietro</button>
                  <button onClick={handleNextToStep4Matching} className="flex-1 py-4 rounded-[18px] text-sm font-black text-white uppercase tracking-widest" style={{ background: '#e11d48', boxShadow: '0 0 20px rgba(225,29,72,0.35)' }}>Continua →</button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 5: Conosciamoci Meglio ── */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="text-center space-y-1 pb-2">
                  <Sparkles className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                  <h3 className="text-lg font-montserrat font-black text-white">Conosciamoci Meglio</h3>
                  <p className="text-white/30 text-[11px]">Opzionale ma consigliato.</p>
                </div>
                {[
                  { key: 'Fumo', options: ['Non fumo', 'Occasionalmente', 'Fumo', 'Misto'] },
                  { key: 'Sport_e_Attivita', options: ['Molto Attivo/a', 'Naturale', 'Poco Sportivo/a', 'Odio lo sport'] },
                  { key: 'Animale_Domestico', options: ['Cane', 'Gatto', 'Nessuno', 'Altro'] },
                  { key: 'Stile_di_Vita', options: ['Casa e Relax', 'Viaggi ed Escursioni', 'Feste e Locali', 'Equilibrato'] },
                  { key: 'Famiglia', options: ['Voglio figli', 'Non voglio figli', 'Posso cambiare idea', 'Ne ho già'] },
                ].map(q => (
                  <DarkSelect key={q.key} label={q.key.replace(/_/g, ' ')} name={q.key} value={formData.conosciamoci_meglio?.[q.key] || ''} onChange={(e: any) => setFormData(p => ({ ...p, conosciamoci_meglio: { ...(p.conosciamoci_meglio || {}), [q.key]: e.target.value } }))}>
                    <option value="" className="bg-stone-900">-- Seleziona --</option>
                    {q.options.map(o => <option key={o} value={o} className="bg-stone-900">{o}</option>)}
                  </DarkSelect>
                ))}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(4)} className="flex-1 py-4 rounded-[18px] text-sm font-black text-white/50 uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Indietro</button>
                  <button onClick={handleNextToStep5AboutYou} className="flex-1 py-4 rounded-[18px] text-sm font-black text-white uppercase tracking-widest" style={{ background: '#e11d48', boxShadow: '0 0 20px rgba(225,29,72,0.35)' }}>Continua →</button>
                </div>
              </motion.div>
            )}


            {/* ── STEP 7: Riepilogo ── */}
            {step === 7 && (
              <motion.div key="step7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-montserrat font-black text-white">Riepilogo</h3>
                  <p className="text-white/30 text-[11px]">Controlla che tutto sia corretto.</p>
                </div>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-hide">
                  {[
                    { title: 'Account', rows: [['Email', formData.email]] },
                    { title: 'Dati Personali', rows: [['Nome', `${formData.name} ${formData.surname}`], ['Nascita', formData.dob], ['Città', formData.city], ['Genere', formData.gender], ['Orientamento', Array.isArray(formData.orientation) ? (formData.orientation as string[]).join(', ') : formData.orientation], ['Lavoro', formData.job]] },
                    { title: 'Cerco', rows: [['Genere', Array.isArray(formData.looking_for_gender) ? (formData.looking_for_gender as string[]).join(', ') : formData.looking_for_gender], ['Età', `${formData.looking_for_age_min}–${formData.looking_for_age_max}`]] },
                  ].map(section => (
                    <div key={section.title} className="p-4 rounded-[20px] space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h4 className="text-[9px] font-black text-rose-400 uppercase tracking-widest">{section.title}</h4>
                      {section.rows.map(([k, v]) => v && (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-white/30">{k}:</span>
                          <span className="text-white font-bold text-right max-w-[60%]">{v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="p-4 rounded-[20px] space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Foto & Documento</h4>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", formData.id_document_url ? "bg-emerald-400" : "bg-rose-500")} />
                      <span className="text-xs text-white/50">{formData.id_document_url ? 'Documento caricato' : 'Nessun documento'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {formData.photos?.map((url, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}><img src={url} className="w-full h-full object-cover" /></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(5)} className="flex-1 py-4 rounded-[18px] text-sm font-black text-white/50 uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Indietro</button>
                  <button onClick={handleSubmit} className="flex-1 py-4 rounded-[18px] text-sm font-black text-white uppercase tracking-widest" style={{ background: '#e11d48', boxShadow: '0 0 20px rgba(225,29,72,0.35)' }}>Termina ✓</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};






const FeedComponent = ({ userId, isOwner, global = false }: { userId: any, isOwner?: boolean, global?: boolean }) => {

  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const checkUser = () => {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) setCurrentUser(normalizeUser(JSON.parse(saved)));
    };
    checkUser();
    window.addEventListener('user-auth-change', checkUser);
    return () => window.removeEventListener('user-auth-change', checkUser);
  }, []);
  const [showSearch, setShowSearch] = useState(false);
  const [newPostDesc, setNewPostDesc] = useState('');
  const [newPostPhotos, setNewPostPhotos] = useState<string[]>([]);
  const [isPostingOpen, setIsPostingOpen] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumModalMode, setPremiumModalMode] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const navigate = useNavigate();
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const deletePost = async (postId: string) => {
    try {
      await supabase.from('posts').delete().eq('id', postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setPostToDelete(null);
    } catch (e) { }
  };

  const [isPostingComment, setIsPostingComment] = useState<Record<string, boolean>>({});

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*, user:users(name, photos)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) console.error("Error fetching comments:", error);
      if (data) setPostComments(prev => ({ ...prev, [postId]: data }));
    } catch (e) {
      console.error("fetchComments exception:", e);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev =>
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
    if (!expandedComments.includes(postId)) fetchComments(postId);
  };

  const submitComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text || isPostingComment[postId]) return;

    const viewer = localStorage.getItem('amarsiunpo_user') ? JSON.parse(localStorage.getItem('amarsiunpo_user')!) : null;
    if (!viewer?.id) {
      alert("Devi aver effettuato l'accesso per commentare.");
      return;
    }

    setIsPostingComment(prev => ({ ...prev, [postId]: true }));
    try {
      const { error } = await supabase.from('post_comments').insert([{
        post_id: postId,
        user_id: viewer.id,
        text
      }]);

      if (error) {
        console.error("Comment submit error:", error);
        alert("Errore nell'invio del commento: " + error.message);
      } else {
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
        await fetchComments(postId);
        // Do not call fetchPosts here to avoid full reload, just refresh count if needed
      }
    } catch (e) {
      console.error("Comment submit exception:", e);
    } finally {
      setIsPostingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  const fetchPosts = async () => {
    try {
      const viewer = localStorage.getItem('amarsiunpo_user') ? JSON.parse(localStorage.getItem('amarsiunpo_user')!) : null;
      const viewerId = viewer?.id;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      let query = supabase
        .from('posts')
        .select(`
                      *,
                      user:users (name, photos, photo_url, gender, orientation),
                      post_interactions!post_interactions_post_id_fkey(type),
                      post_comments(id)
                      `)
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false });

      if (!global || showOnlyMine) {
        query = query.eq('user_id', userId || viewerId);
      }

      const { data: postsData, error } = await query;

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

        const processed = (postsData as any[]).map(p => ({
          ...p,
          author_name: p.user?.name,
          author_photo: p.user?.photos?.[0] || p.user?.photo_url,
          author_gender: p.user?.gender,
          author_orientation: parseArrField(p.user?.orientation),
          likes_count: (p.post_interactions as any[] || []).filter(i => i.type === 'like').length,
          hearts_count: (p.post_interactions as any[] || []).filter(i => i.type === 'heart').length,
          comments_count: (p.post_comments as any[] || []).length,
          has_liked: viewerInteractions.some(i => i.post_id === p.id && i.type === 'like'),
          has_hearted: viewerInteractions.some(i => i.post_id === p.id && i.type === 'heart'),
        }));

        // Filter by compatibility for global feed
        const filtered = (global && viewer)
          ? processed.filter(p => p.user_id === viewer.id || isUserCompatible(normalizeUser(viewer), normalizeUser(p.user)))
          : processed;

        setPosts(filtered);
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
  }, [userId, global, showOnlyMine]);

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

      const curUser = localStorage.getItem('amarsiunpo_user') ? JSON.parse(localStorage.getItem('amarsiunpo_user')!) : null;
      if (curUser) {
        if (!curUser.is_paid) {
          // Utenti Base: 0 post
          setShowPremiumModal(true);
          setIsPosting(false);
          return;
        } else {
          // Utenti Premium: 1 post / giorno
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const { count: dailyPosts } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUserId)
            .gte('created_at', today.toISOString());

          if ((dailyPosts || 0) >= 1) {
            alert("Hai già pubblicato un post oggi. La quota massima per gli utenti Premium è di 1 post ogni 24 ore.");
            setIsPosting(false);
            return;
          }
        }
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
      const viewer = localStorage.getItem('amarsiunpo_user') ? JSON.parse(localStorage.getItem('amarsiunpo_user')!) : null;
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
    <div className="space-y-6">
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} defaultComparison={premiumModalMode} />
      {/* ── HEADER ACTION BAR (Search + Mine + Plus) ── */}
      {global && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (currentUser && !currentUser.is_paid) {
                setPremiumModalMode(true);
                setShowPremiumModal(true);
              } else {
                setIsPostingOpen(!isPostingOpen);
              }
            }}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 relative",
              isPostingOpen ? "bg-rose-600 text-white shadow-[0_0_16px_rgba(244,63,94,0.5)]" : "bg-white/10 text-rose-500 border border-rose-500/30 shadow-[0_0_16px_rgba(244,63,94,0.2)]"
            )}
          >
            <Plus className="w-6 h-6" />
            {currentUser && !currentUser.is_paid && (
              <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1 shadow-lg shadow-amber-900/40">
                <Lock className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </button>

          <button
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0",
              showOnlyMine ? "bg-rose-600 text-white shadow-[0_0_16px_rgba(244,63,94,0.5)]" : "bg-white/5 text-white/40 border border-white/10"
            )}
          >
            <User className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-2 rounded-2xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(244,63,94,0.35)', boxShadow: '0 0 20px rgba(244,63,94,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: '#f43f5e', filter: 'drop-shadow(0 0 6px rgba(244,63,94,0.8))' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cerca..."
              className="flex-1 bg-transparent outline-none text-white text-sm font-bold placeholder:text-white/25"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {isOwner && (
        <div className="flex items-center justify-end px-1 -mt-2 mb-1">
          <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">Post durata 30 giorni</span>
        </div>
      )}

      <AnimatePresence>
        {(isPostingOpen || (isOwner && !global)) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 rounded-[28px] flex flex-col gap-4 relative overflow-hidden mb-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(244,63,94,0.15)', boxShadow: '0 0 20px rgba(244,63,94,0.06)' }}
          >
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: 'rgba(244,63,94,0.4)' }} />
            <textarea
              value={newPostDesc}
              onChange={(e) => setNewPostDesc(e.target.value)}
              placeholder="A cosa stai pensando oggi?"
              className="w-full text-base outline-none resize-none bg-transparent placeholder:text-white/20 font-medium leading-relaxed text-white/80 min-h-[56px]"
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

            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-[11px] text-white font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-lg shadow-rose-900/20"
                  style={{ background: '#f43f5e', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <ImageIcon className="w-4 h-4" />
                  {newPostPhotos.length < 3 ? "Foto" : "Max"}
                  <input type="file" accept="image/*" multiple className="hidden" disabled={newPostPhotos.length >= 3} onChange={handlePhotoUpload} />
                </label>
              </div>
              <button
                onClick={async () => {
                  await submitPost();
                  setIsPostingOpen(false);
                }}
                disabled={isPosting || (newPostPhotos.length === 0 && !newPostDesc)}
                className="bg-stone-900 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] disabled:opacity-20 transition-all hover:bg-black shadow-lg active:scale-95"
              >
                Pubblica
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      <div className={cn(!global && !isOwner ? "flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 scrollbar-hide" : "space-y-6")}>
        {(() => {
          const filteredItems = searchTerm.trim()
            ? posts.filter(p =>
              p.author_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.description?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : posts;

          if (filteredItems.length === 0) {
            return (
              <div className={cn("text-center py-16 rounded-[32px] w-full", !global && !isOwner ? "snap-center shrink-0" : "")} style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  {searchTerm ? <Search className="w-8 h-8 text-white/15" /> : <ImageIcon className="w-8 h-8 text-white/15" />}
                </div>
                <p className="text-white/30 text-sm font-medium italic">
                  {searchTerm ? `Nessun risultato per "${searchTerm}"` : 'Ancora nessun post da mostrare.'}
                </p>
              </div>
            );
          }

          return filteredItems.map(post => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={cn("rounded-[32px] overflow-hidden relative", !global && !isOwner ? "w-[85vw] shrink-0 snap-center" : "w-full")}
              style={{ background: '#1a1a22', boxShadow: '0 4px 40px rgba(0,0,0,0.5)' }}
            >
              {/* ── PHOTO with top-left user overlay ── */}
              {post.photos.length > 0 ? (
                <div className="w-full relative overflow-hidden" style={{ aspectRatio: post.photos.length === 1 ? '4/5' : '9/16' }}>
                  <div className="w-full h-full overflow-x-auto snap-x snap-mandatory flex scrollbar-hide">
                    {post.photos.map((ph, i) => (
                      <div key={i} className="w-full h-full shrink-0 snap-center">
                        <img src={ph} className="w-full h-full object-cover" onContextMenu={(e) => e.preventDefault()} />
                      </div>
                    ))}
                  </div>

                  {/* Dot indicators - neon rose */}
                  {post.photos.length > 1 && (
                    <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5 z-10">
                      {post.photos.map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-rose-400/70 backdrop-blur-md" />
                      ))}
                    </div>
                  )}

                  {/* Top-left: avatar + name + gender/orientation overlay */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                    <div
                      onClick={() => navigate(`/profile-detail/${post.user_id}`)}
                      className="w-10 h-10 rounded-full overflow-hidden border-2 shadow-lg cursor-pointer shrink-0"
                      style={{ borderColor: 'rgba(244,63,94,0.6)', boxShadow: '0 0 12px rgba(244,63,94,0.4)' }}
                    >
                      <img src={post.author_photo || `https://picsum.photos/seed/${post.author_name}/100`} className="w-full h-full object-cover" />
                    </div>
                    <div
                      onClick={() => navigate(`/profile-detail/${post.user_id}`)}
                      className="bg-black/50 backdrop-blur-xl rounded-2xl px-3 py-1.5 cursor-pointer"
                      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <p className="text-white text-[12px] font-black leading-none font-montserrat">{post.author_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {post.author_gender && (
                          <span className="text-white/50 text-[9px] font-bold uppercase tracking-wider">{post.author_gender}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top-right: delete button - only for own posts */}
                  {post.user_id === userId && (
                    <button
                      onClick={() => setPostToDelete(post.id)}
                      className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl text-white/40 hover:text-rose-400 hover:bg-black/60 transition-all active:scale-90"
                      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Bottom gradient on image */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, #1a1a22 0%, transparent 100%)' }} />
                </div>
              ) : (
                /* Text-only post: show avatar top-left without image */
                <div className="px-5 pt-5 flex items-center gap-3">
                  <div
                    onClick={() => navigate(`/profile-detail/${post.user_id}`)}
                    className="w-10 h-10 rounded-full overflow-hidden border-2 cursor-pointer shrink-0"
                    style={{ borderColor: 'rgba(244,63,94,0.5)' }}
                  >
                    <img src={post.author_photo || `https://picsum.photos/seed/${post.author_name}/100`} className="w-full h-full object-cover" />
                  </div>
                  <div onClick={() => navigate(`/profile-detail/${post.user_id}`)} className="cursor-pointer">
                    <p className="text-white text-[13px] font-black font-montserrat leading-none">{post.author_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {post.author_gender && <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider">{post.author_gender}</span>}
                    </div>
                  </div>
                  {post.user_id === userId && (
                    <button onClick={() => setPostToDelete(post.id)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/30 hover:text-rose-400 transition-all active:scale-90">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* ── Caption text ── */}
              {post.description && (
                <p className="text-white/80 text-sm leading-relaxed font-medium px-5 pt-3 pb-1">{post.description}</p>
              )}

              {/* ── Bottom bar: date + interactions ── */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {/* Date */}
                  <span className="text-white/25 text-[9px] font-bold uppercase tracking-widest mr-auto">
                    {new Date(post.created_at).toLocaleDateString()} · {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Interazioni (Like, Cuore, Commento) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleInteraction(post.id, 'like')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90 border",
                        post.has_liked ? "bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "bg-white/5 border-white/5 text-white/30 hover:text-white/50"
                      )}
                    >
                      <ThumbsUp className={cn("w-3.5 h-3.5", post.has_liked && "fill-current")} />
                      <span className="text-[10px] font-black">{post.likes_count || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleInteraction(post.id, 'heart')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90 border",
                        post.has_hearted ? "bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "bg-white/5 border-white/5 text-white/30 hover:text-white/50"
                      )}
                    >
                      <Heart className={cn("w-3.5 h-3.5", post.has_hearted && "fill-current")} />
                      <span className="text-[10px] font-black">{post.hearts_count || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(post.id)}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90 border", expandedComments.includes(post.id) ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-white/5 border-white/5 text-white/30 hover:text-white/50")}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black">{(postComments[post.id]?.length) ?? post.comments_count ?? 0}</span>
                    </button>
                  </div>
                </div>

                {/* Comments section - dark glass style */}
                <AnimatePresence>
                  {expandedComments.includes(post.id) && (
                    <motion.div
                      key={`comments-${post.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden px-5 pb-2"
                    >
                      <div className="space-y-2 pt-1">
                        {(postComments[post.id] || []).map((c: any) => (
                          <div key={c.id} className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/10">
                              <img src={c.user?.photos?.[0] || c.user?.photo_url || `https://picsum.photos/seed/${c.user_id}/100`} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <span className="text-[10px] font-black text-white/70">{c.user?.name} </span>
                              <span className="text-[11px] text-white/50 font-medium">{c.text}</span>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={commentTexts[post.id] || ''}
                            onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                            placeholder="Scrivi un commento..."
                            className="flex-1 rounded-2xl px-3 py-2 text-xs outline-none text-white/80 placeholder:text-white/20 font-medium"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                          />
                          <button
                            onClick={() => submitComment(post.id)}
                            disabled={!commentTexts[post.id]?.trim() || isPostingComment[post.id]}
                            className="w-9 h-9 rounded-2xl flex items-center justify-center disabled:opacity-30 transition-all active:scale-95 shrink-0"
                            style={{ background: 'linear-gradient(135deg, #f43f5e, #9333ea)' }}
                          >
                            {isPostingComment[post.id] ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ArrowRight className="w-4 h-4 text-white" />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            ));
        })()}
      </div>

      {postToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-[24px] p-6 w-full max-w-[300px] shadow-2xl flex flex-col items-center text-center" style={{ background: '#1a1a22', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-12 h-12 bg-rose-500/15 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-rose-400" />
            </div>
            <h3 className="text-sm font-black text-white mb-2">Elimina post</h3>
            <p className="text-xs text-white/40 font-medium mb-6">Sei sicuro di voler eliminare definitivamente questo post?</p>
            <div className="flex gap-2 w-full">
              <button onClick={() => setPostToDelete(null)} className="flex-1 py-3 text-white/50 text-[10px] font-black uppercase tracking-widest rounded-[14px] transition-all" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>Annulla</button>
              <button onClick={() => deletePost(postToDelete)} className="flex-1 py-3 text-white text-[10px] font-black uppercase tracking-widest rounded-[14px]" style={{ background: 'linear-gradient(135deg, #f43f5e, #be123c)' }}>Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT PROFILE — shared sub-components at MODULE scope
// (inside-component = remounted on every render = focus lost after each keystroke)
// ═══════════════════════════════════════════════════════════════════════════════

const capFirst = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const EPInputField = ({ label, value, onChange, disabled = false, type = 'text', placeholder = '', className = '' }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">{label}</label>
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => !disabled && onChange(type === 'text' ? capFirst(e.target.value) : e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      autoCapitalize="sentences"
      autoCorrect="off"
      autoComplete="off"
      className={cn(
        'w-full px-4 py-3 rounded-2xl text-sm font-medium transition-all outline-none border',
        disabled
          ? 'bg-stone-50 border-stone-100 text-stone-400 cursor-not-allowed'
          : 'bg-white border-stone-100 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/5 text-stone-900',
        className
      )}
    />
  </div>
);

const EPSelectDropdown = ({ label, value, onChange, options, disabled = false, placeholder = '' }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">{label}</label>
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={(e) => !disabled && onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full px-4 py-3 rounded-2xl text-sm font-medium transition-all outline-none border appearance-none',
          disabled
            ? 'bg-stone-50 border-stone-100 text-stone-400 cursor-not-allowed'
            : 'bg-white border-stone-100 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/5 text-stone-900'
        )}
      >
        <option value="">{placeholder || 'Seleziona...'}</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
        <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  </div>
);

const EPTextAreaField = ({ label, value, onChange, placeholder = '' }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">{label}</label>
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(capFirst(e.target.value))}
      placeholder={placeholder}
      rows={3}
      autoCapitalize="sentences"
      autoCorrect="off"
      className="w-full px-4 py-3 rounded-2xl bg-white border border-stone-100 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/5 text-sm font-medium outline-none transition-all resize-none"
    />
  </div>
);

const EPSelectGroup = ({ label, options, currentValue, onSelect, columns = 2 }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">{label}</label>
    <div className={cn('grid gap-2', columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
      {options.map((opt: string) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={cn(
            'py-2.5 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all border',
            currentValue === opt
              ? 'bg-stone-900 border-stone-900 text-white shadow-md'
              : 'bg-white border-stone-100 text-stone-400 hover:border-stone-200'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const EditProfilePage = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      // 1. Check local storage first
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        const parsed = normalizeUser(JSON.parse(saved));
        const isLocalId = /^\d+$/.test(String(parsed.id));

        if (isLocalId) {
          // Local mode: don't strictly require Supabase session
          setUser(parsed);
          setLoading(false);
          return;
        }
      }

      // 2. Supabase session check
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/register');
        return;
      }

      if (saved) {
        setUser(normalizeUser(JSON.parse(saved)));
      } else {
        navigate('/register');
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isLocalUser = /^\d+$/.test(String(user.id));

      // Clean up data for database (remove computed fields)
      const submissionData = { ...user };
      delete (submissionData as any).likes_count;
      delete (submissionData as any).hearts_count;
      delete (submissionData as any).is_online; // handled by server or not in DB

      if (isLocalUser) {
        // MODALITÀ LOCALE
        const res = await fetch(`/api/profiles/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Errore durante l\'aggiornamento locale');
        }

        const updated = await res.json();
        const normalizedUpdated = normalizeUser(updated);
        localStorage.setItem('amarsiunpo_user', JSON.stringify(normalizedUpdated));
        setToast({ message: 'Profilo locale aggiornato!', type: 'success' });
        setTimeout(() => navigate('/profile'), 1500);
        return;
      }

      // MODALITÀ SUPABASE
      if (!session) {
        setToast({ message: 'Sessione scaduta. Effettua nuovamente il login.', type: 'error' });
        setTimeout(() => navigate('/register'), 2000);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .upsert({ ...submissionData, id: session.user.id })
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem('amarsiunpo_user', JSON.stringify(normalizeUser(data)));
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
      const isLocalUser = /^\d+$/.test(String(user.id));

      if (isLocalUser) {
        // CANCELLAZIONE LOCALE
        const res = await fetch(`/api/profiles/${user.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Errore durante l'eliminazione locale.");
      } else {
        // CANCELLAZIONE SUPABASE
        const { error } = await supabase.rpc('delete_user_account');
        if (error) {
          throw new Error("Impossibile eliminare l'account in modo definitivo tramite funzione database. Assicurati di aver incollato lo script delete_user_function.sql nell'editor SQL. Dettaglio: " + error.message);
        }
        await supabase.auth.signOut();
      }

      localStorage.removeItem('amarsiunpo_user');
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

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}><Heart className="w-12 h-12 text-rose-600 fill-current drop-shadow-xl" /></motion.div></div>;

  // remove old inline component definitions — now at module scope

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
          {/* Section: Abbonamento (Forced visible for confirmed design) */}
          {(user.is_paid || true) && (
            <section className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-3 px-1">
                <div className="w-1 h-6 bg-purple-600 rounded-full" />
                <h2 className="text-sm font-black uppercase tracking-widest text-stone-900">Il Mio Abbonamento</h2>
              </div>
              <div className="p-6 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-[32px] border border-purple-200/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-2xl -mr-8 -mt-8" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Piano Attivo</p>
                      <p className="text-sm font-black text-stone-900 uppercase flex items-center gap-2">
                        AMARSIUNPO {user.subscription_type || 'Premium'}
                        {user.subscription_expiry && (
                          <span className="px-2 py-0.5 bg-purple-600 text-[8px] text-white rounded-full animate-in fade-in zoom-in duration-500">
                            Scad: {new Date(user.subscription_expiry).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                    Attivo
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section: Anagrafica (Locked) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1 h-6 bg-rose-600 rounded-full" />
              <h2 className="text-sm font-black uppercase tracking-widest text-stone-900">Anagrafica</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <EPInputField label="Nome" value={user.name} disabled />
              <EPInputField label="Cognome" value={user.surname} disabled />
              <EPInputField label="Data di Nascita" value={user.dob} disabled type="date" />
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
            <EPSelectGroup
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
            <div className="grid grid-cols-1 gap-4">
              <EPSelectDropdown label="Città" value={user.city} onChange={(v: string) => updateField('city', v)} options={ITALIAN_CITIES} placeholder="Seleziona Città" />
            </div>
            <EPInputField label="Professione" value={user.job} onChange={(v: string) => updateField('job', v)} placeholder="es. Designer, Medico..." />
            <EPTextAreaField label="Bio / Descrizione" value={user.description} onChange={(v: string) => updateField('description', v)} placeholder="Racconta qualcosa di te..." />
            <EPInputField label="Hobby" value={user.hobbies} onChange={(v: string) => updateField('hobbies', v)} placeholder="Cosa ti piace fare?" />
            <EPInputField label="Cosa cerchi / Desideri" value={user.desires} onChange={(v: string) => updateField('desires', v)} placeholder="es. Relazione seria, Amicizia..." />

            <EPSelectGroup
              label="La mia Corporatura"
              options={['Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta']}
              currentValue={user.body_type}
              onSelect={(v: string) => updateField('body_type', v)}
              columns={3}
            />
            <EPInputField label="Altezza (cm)" type="number" value={user.height_cm} onChange={(v: string) => updateField('height_cm', parseInt(v))} placeholder="es. 175" />
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
              <EPInputField label="Età Minima" type="number" value={user.looking_for_age_min} onChange={(v: string) => updateField('looking_for_age_min', parseInt(v))} />
              <EPInputField label="Età Massima" type="number" value={user.looking_for_age_max} onChange={(v: string) => updateField('looking_for_age_max', parseInt(v))} />
            </div>

            <div className="rounded-2xl p-4 bg-white border border-stone-100">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1">Statura / Corporatura Partner</label>
              <select
                value={user.looking_for_body_type}
                onChange={(e) => updateField('looking_for_body_type', e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-stone-900 outline-none appearance-none mt-1"
              >
                {['Tutte', 'Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <EPSelectDropdown label="Città desiderata" value={user.looking_for_city} onChange={(v: string) => updateField('looking_for_city', v)} options={['Indifferente', ...ITALIAN_CITIES]} placeholder="Seleziona Città (o Indifferente)" />
            <EPTextAreaField label="Altre preferenze" value={user.looking_for_other} onChange={(v: string) => updateField('looking_for_other', v)} placeholder="es. Solo non fumatori, amanti dei gatti..." />
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

// Unified Chat UI: all chats are now handled via LiveChatPage
const ChatPage = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [friends, setFriends] = useState<SoulLink[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [readChatIds, setReadChatIds] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('sm_read_chats'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  useEffect(() => { localStorage.setItem('sm_read_chats', JSON.stringify([...readChatIds])); }, [readChatIds]);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'messaggi' | 'flash'>(location.state?.activeTab || 'messaggi');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [confirmDeleteChat, setConfirmDeleteChat] = useState<any>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [currentFlash, setCurrentFlash] = useState<any>(null);
  const [flashMessage, setFlashMessage] = useState('');
  const [isPublishingFlash, setIsPublishingFlash] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    const init = async () => {
      try {
        const saved = localStorage.getItem('amarsiunpo_user');
        if (saved) {
          const u = normalizeUser(JSON.parse(saved));
          setUser(u);
          await fetchData(u.id);
        } else {
          navigate('/register');
        }
      } catch (e) {
        navigate('/register');
      }
    };
    init();

    // Event listener for chat read status update from LiveChatPage
    const handleReadUpdate = () => {
      try {
        const s = localStorage.getItem('sm_read_chats');
        if (s) setReadChatIds(new Set(JSON.parse(s)));
      } catch (e) { }
    };
    window.addEventListener('chat-read-update', handleReadUpdate);

    return () => {
      window.removeEventListener('chat-read-update', handleReadUpdate);
    };
  }, []);

  // Real-time updates for ChatPage list
  useEffect(() => {
    if (!user) return;
    const roomChannel = supabase.channel('chat_page_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `receiver_id=eq.${user.id}` }, (payload) => {
        const msg = payload.new;
        setReadChatIds(prev => {
          const next = new Set(prev);
          if (next.has(msg.sender_id)) {
            next.delete(msg.sender_id);
            localStorage.setItem('sm_read_chats', JSON.stringify([...next]));
          }
          return next;
        });
        fetchData(user.id);
      })
      .subscribe();

    const requestChannel = supabase.channel('chat_page_req')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_requests', filter: `to_user_id=eq.${user.id}` }, (payload) => {
        const req = payload.new;
        setReadChatIds(prev => {
          const next = new Set(prev);
          if (next.has(req.from_user_id)) {
            next.delete(req.from_user_id);
            localStorage.setItem('sm_read_chats', JSON.stringify([...next]));
          }
          return next;
        });
        fetchData(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(requestChannel);
    };
  }, [user]);

  const fetchData = async (userId: string) => {
    try {
      // Parallelize queries for maximum speed
      const [sentRes, recvRes, reqRes, msgsRes, flashRes] = await Promise.all([
        supabase.from('soul_links').select('*, receiver:users!receiver_id(id, name, surname, photo_url, photos, is_online)').eq('sender_id', userId).eq('status', 'accepted'),
        supabase.from('soul_links').select('*, sender:users!sender_id(id, name, surname, photo_url, photos, is_online)').eq('receiver_id', userId).eq('status', 'accepted'),
        supabase.from('chat_requests').select('*, from_user:users!from_user_id(id, name, surname, photo_url, photos)').eq('to_user_id', userId).order('created_at', { ascending: false }),
        supabase.from('room_messages').select('id, text, created_at, sender_id, receiver_id').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }).limit(200),
        supabase.from('banner_messages').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
      ]);

      const sentSL = sentRes.data || [];
      const recvSL = recvRes.data || [];
      const requestsData = reqRes.data || [];
      const msgs = msgsRes.data || [];
      const flashData = flashRes.data?.[0];

      const acceptedFriends: any[] = [
        ...sentSL.map((sl: any) => ({ ...sl, other_user: Array.isArray(sl.receiver) ? sl.receiver[0] : sl.receiver })),
        ...recvSL.map((sl: any) => ({ ...sl, other_user: Array.isArray(sl.sender) ? sl.sender[0] : sl.sender }))
      ];
      setFriends(acceptedFriends);

      // Process requests
      const filteredRequests = requestsData.filter((r: any) =>
        acceptedFriends.some(f => f.other_user?.id === r.from_user_id)
      ).map((r: any) => {
        const u = Array.isArray(r.from_user) ? r.from_user[0] : r.from_user;
        return {
          ...r,
          name: u?.name,
          surname: u?.surname,
          photo_url: u?.photos?.[0] || u?.photo_url
        };
      });
      setChatRequests(filteredRequests);

      // Process Room Messages into Map
      const chatMap = new Map();
      const friendMap = new Map(acceptedFriends.map(f => [f.other_user?.id, f.other_user]));

      if (msgs) {
        for (const m of msgs) {
          const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
          const otherUser = friendMap.get(otherId);
          if (!otherUser) continue;

          if (!chatMap.has(otherId)) {
            chatMap.set(otherId, {
              other_user: { ...otherUser, photo_url: otherUser.photos?.[0] || otherUser.photo_url },
              last_msg: m.text.startsWith('[INTENT:') ? m.text.replace(/\[INTENT:.*?\] /, '') : m.text,
              created_at: m.created_at,
              isSender: m.sender_id === userId,
              messages: [{ ...m, isSender: m.sender_id === userId }]
            });
          } else {
            chatMap.get(otherId).messages.unshift({ ...m, isSender: m.sender_id === userId });
          }
        }
      }

      // Merge chat requests into map if newer
      filteredRequests.forEach(r => {
        const otherId = r.from_user_id;
        if (!chatMap.has(otherId) || new Date(r.created_at) > new Date(chatMap.get(otherId).created_at)) {
          const u = friendMap.get(otherId);
          chatMap.set(otherId, {
            other_user: { ...u, photo_url: u?.photos?.[0] || u?.photo_url },
            last_msg: r.message,
            created_at: r.created_at,
            isSender: false,
            messages: []
          });
        }
      });

      // Ensure all friends are included
      acceptedFriends.forEach(f => {
        const u = f.other_user;
        if (u?.id && !chatMap.has(u.id)) {
          chatMap.set(u.id, {
            other_user: { ...u, photo_url: u.photos?.[0] || u.photo_url || `https://picsum.photos/seed/${u.id}/100` },
            last_msg: 'Inizia una conversazione...',
            created_at: f.created_at || new Date().toISOString(),
            isSender: false,
            messages: []
          });
        }
      });

      setActiveChats(Array.from(chatMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

      if (flashData && (new Date().getTime() - new Date(flashData.created_at).getTime() < 24 * 60 * 60 * 1000)) {
        setCurrentFlash(flashData);
      } else {
        setCurrentFlash(null);
      }
    } catch (e) { }
    setLoading(false);
  };

  const handleSendReply = async (toUserId: string) => {
    if (!replyText.trim() || !user) return;
    setIsSendingReply(true);

    try {
      // Segna come approvati i messaggi in arrivo da questo utente per togliere la notifica
      await supabase
        .from('chat_requests')
        .update({ status: 'approved' })
        .eq('from_user_id', toUserId)
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      const tempId = self.crypto.randomUUID();
      const { error } = await supabase.from('room_messages').insert([{
        id: tempId,
        sender_id: user.id,
        receiver_id: toUserId,
        text: replyText
      }]);

      if (!error) {
        setReplyText('');
        setReplyingTo(null);
        setToast({ message: 'Risposta inviata!', type: 'success' });
        fetchData(user.id);
      } else {
        setToast({ message: 'Errore durante l\'invio', type: 'error' });
      }
    } catch (err) { }
    setIsSendingReply(false);
  };



  const handleConfirmDeleteChat = async () => {
    if (!confirmDeleteChat || !user) return;
    setIsDeletingChat(true);
    try {
      const otherUserId = confirmDeleteChat.other_user.id;
      await supabase.from('room_messages').delete().or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`);
      await supabase.from('chat_requests').delete().or(`and(from_user_id.eq.${user.id},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${user.id})`);

      setActiveChats(prev => prev.filter(c => c.other_user.id !== otherUserId));
      setToast({ message: 'Conversazione eliminata', type: 'info' });
      setConfirmDeleteChat(null);
    } catch (err) {
      setToast({ message: 'Errore durante l\'eliminazione', type: 'error' });
    }
    setIsDeletingChat(false);
  };

  const handlePublishFlash = async () => {
    if (!flashMessage.trim() || !user) return;
    setIsPublishingFlash(true);
    const newFlash = {
      message: flashMessage,
      name: user.name,
      photo_url: user.photos?.[0] || user.photo_url,
      city: user.city,
      dob: user.dob,
      user_id: user.id
    };
    try {
      const { data, error } = await supabase.from('banner_messages').insert([newFlash]).select().single();
      if (!error && data) {
        setCurrentFlash(data);
        setFlashMessage('');
        setToast({ message: 'Messaggio Flash pubblicato!', type: 'success' });
      } else {
        setToast({ message: 'Errore durante la pubblicazione', type: 'error' });
      }
    } catch (err) { }
    setIsPublishingFlash(false);
  };


  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}><Heart className="w-12 h-12 text-rose-500 fill-current drop-shadow-xl" style={{ filter: 'drop-shadow(0 0 20px rgba(244,63,94,0.6))' }} /></motion.div></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen pt-[178px] pb-60 relative overflow-x-hidden" style={{ background: '#0a0a0f' }}>
      {/* Floating hearts background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`
          @keyframes floatHeart {
            0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
            10%  { opacity: 1; }
            80%  { opacity: 0.5; }
            100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
          }
          .fha { animation: floatHeart var(--dur,12s) ease-in-out var(--delay,0s) infinite; position: absolute; bottom: -10%; }
        `}</style>
        {[
          { left: '8%', size: 11, color: '#f43f5e', blur: 3, dur: 12, delay: 0 },
          { left: '22%', size: 7, color: '#a855f7', blur: 4, dur: 9, delay: 1.5 },
          { left: '38%', size: 15, color: '#ec4899', blur: 5, dur: 14, delay: 0.8 },
          { left: '55%', size: 9, color: '#f43f5e', blur: 2, dur: 11, delay: 2.5 },
          { left: '70%', size: 13, color: '#9333ea', blur: 4, dur: 13, delay: 1 },
          { left: '87%', size: 7, color: '#fb7185', blur: 3, dur: 10, delay: 3.5 },
        ].map((h, i) => (
          <div key={i} className="fha" style={{ left: h.left, '--dur': `${h.dur}s`, '--delay': `${h.delay}s`, filter: `blur(${h.blur}px)`, opacity: 0.14 } as React.CSSProperties}>
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" /></svg>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Modale Conferma Eliminazione Chat */}
        {confirmDeleteChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)' }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-[340px] rounded-[32px] p-7 flex flex-col items-center text-center"
              style={{ background: '#1a1a22', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
            >
              <div className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-5"
                style={{ background: 'rgba(244,63,94,0.15)', boxShadow: '0 0 24px rgba(244,63,94,0.2)' }}
              >
                <Trash2 className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">Eliminare questa chat?</h3>
              <p className="text-[13px] text-white/40 font-medium leading-relaxed mb-7">
                Tutti i messaggi con <strong className="text-white/70">{confirmDeleteChat?.other_user?.name}</strong> verranno cancellati in modo permanente.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmDeleteChat(null)}
                  disabled={isDeletingChat}
                  className="flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 disabled:opacity-50 text-white/40 hover:text-white/60"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmDeleteChat}
                  disabled={isDeletingChat}
                  className="flex-1 py-3.5 text-[11px] font-black uppercase tracking-widest text-white rounded-2xl transition-all active:scale-95 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f43f5e, #9333ea)', boxShadow: '0 0 20px rgba(244,63,94,0.4)' }}
                >
                  {isDeletingChat ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Elimina'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── FLOATING TAG HEADER ── */}
      <div className="fixed top-[78px] left-1/2 -translate-x-1/2 z-[40]">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 18,
            delay: 0.1,
            duration: 0.8
          }}
          className="flex items-center gap-2"
        >
          <div
            className="backdrop-blur-2xl text-white px-5 py-3.5 rounded-[32px] flex items-center gap-4 justify-between cursor-pointer relative"
            style={{ background: 'rgba(10,10,15,0.85)', border: '1px solid rgba(244,63,94,0.5)', boxShadow: '0 0 28px rgba(244,63,94,0.25), 0 0 8px rgba(244,63,94,0.1), inset 0 1px 0 rgba(255,255,255,0.06)' }}
            onClick={() => {
              setActiveTab('messaggi');
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchTerm('');
            }}
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: '#f43f5e', boxShadow: '0 0 18px rgba(244,63,94,0.7)' }}>
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black uppercase tracking-[0.25em] leading-none">Chat</span>
                <span className="text-[9px] font-bold text-white/30 mt-0.5 tracking-widest">{activeChats.length + friends.filter(f => !activeChats.some(c => c.other_user.id === f.other_user?.id)).length} chats</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center relative z-10"
              style={{ background: isSearchOpen ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.06)' }}
            >
              <Search className="w-3.5 h-3.5" style={{ color: isSearchOpen ? '#f43f5e' : 'rgba(255,255,255,0.3)', filter: isSearchOpen ? 'drop-shadow(0 0 4px rgba(244,63,94,0.8))' : 'none' }} />
            </div>
          </div>

          {/* Search slides from the right of the pill */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                key="search-slide"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 190, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="overflow-hidden"
                style={{ borderRadius: 24 }}
              >
                <div className="flex items-center gap-2 px-4 py-3.5 whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', borderRadius: 24, width: 190 }}>
                  <Search className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cerca..."
                    className="w-full bg-transparent outline-none text-white text-sm font-bold placeholder:text-white/25"
                    style={{ minWidth: 0 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>


      <div className="mx-4 mt-2">
        {chatRequests.length === 0 && activeChats.length === 0 && friends.length === 0 ? (
          <div className="rounded-[28px] p-10 flex flex-col items-center gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <CheckCircle className="w-7 h-7 text-white/15" />
            </div>
            <p className="text-white/30 text-sm font-medium">Nessun contatto amico.</p>
          </div>
        ) : (
          <div className="space-y-6">

            <AnimatePresence mode="wait">
              {activeTab === 'messaggi' && (
                <motion.div
                  key="messaggi"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >

                  {activeChats
                    .filter((c) => c.other_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((chat) => {
                      // Se l'ultimo messaggio non è mio ed è diverso dall'invito standard, ed il chatId NON è nei letti
                      const isUnread = (!chat.isSender && chat.last_msg !== 'Inizia una conversazione...') && !readChatIds.has(chat.other_user.id);
                      // Se c'è una richiesta pendente (async)
                      const hasRequest = chatRequests.some(r => r.from_user_id === chat.other_user.id && r.status === 'pending') && !readChatIds.has(chat.other_user.id);
                      const notify = isUnread || hasRequest;
                      const hasUnread = notify;

                      return (
                        <motion.div
                          key={`chat-${chat.other_user.id}`}
                          layout
                          initial={{ opacity: 0, x: -24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, transition: { duration: 0.2 } }}
                          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                          className="relative overflow-hidden rounded-[24px]"
                          data-chat-card
                          style={{
                            boxShadow: notify
                              ? '0 0 0 1.5px #f43f5e, 0 0 24px rgba(244,63,94,0.45), 0 4px 30px rgba(0,0,0,0.4)'
                              : '0 4px 30px rgba(0,0,0,0.4)'
                          }}
                        >
                          {/* Swipe delete zone — rosso fuoco */}
                          <div className="absolute inset-0 flex items-center justify-end px-6 z-0"
                            style={{ background: 'linear-gradient(to left, #ef4444, #b91c1c)', boxShadow: 'inset -4px 0 30px rgba(239,68,68,0.5)' }}
                          >
                            <div className="flex flex-col items-center gap-1.5 text-white">
                              <Trash2 className="w-7 h-7" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' }} />
                              <span className="text-[9px] font-black uppercase tracking-widest" style={{ textShadow: '0 0 8px rgba(255,255,255,0.6)' }}>Elimina</span>
                            </div>
                          </div>

                          <motion.div
                            drag="x"
                            dragConstraints={{ left: -100, right: 0 }}
                            dragElastic={0.03}
                            dragSnapToOrigin={true}
                            onDragEnd={(_, info) => {
                              if (info.offset.x < -80) { setConfirmDeleteChat(chat); }
                            }}
                            onClick={(e) => {
                              const willOpen = replyingTo !== chat.other_user.id;
                              setReplyingTo(willOpen ? chat.other_user.id : null);
                              if (willOpen) {
                                setReadChatIds(prev => new Set([...prev, chat.other_user.id]));
                                setTimeout(() => {
                                  (e.currentTarget as HTMLElement)
                                    .closest('[data-chat-card]')
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                }, 320);
                              }
                            }}
                            className="group px-4 py-2.5 flex items-center gap-4 z-10 cursor-pointer relative overflow-hidden"
                            style={{
                              background: '#1a1a22',
                              border: notify ? '1px solid rgba(244,63,94,0.0)' : '1px solid rgba(255,255,255,0.07)',
                              transition: 'border 0.3s ease'
                            }}
                          >
                            {/* Balloon hearts — large, glowing, slow bob */}
                            {notify && [
                              { left: 18, size: 24, color: '#f43f5e', dur: 4.2, delay: 0.2, cls: 'bha1' },
                              { left: 24, size: 16, color: '#fb7185', dur: 3.8, delay: 0.8, cls: 'bha2' },
                              { left: 34, size: 22, color: '#f43f5e', dur: 4.8, delay: 0.4, cls: 'bha3' },
                              { left: 45, size: 18, color: '#fda4af', dur: 3.6, delay: 1.2, cls: 'bha1' },
                              { left: 58, size: 16, color: '#f43f5e', dur: 4.4, delay: 0.6, cls: 'bha2' },
                              { left: 65, size: 20, color: '#ec4899', dur: 4.1, delay: 0.2, cls: 'bha3' },
                              { left: 75, size: 18, color: '#f43f5e', dur: 3.9, delay: 0.9, cls: 'bha1' },
                            ].map((h, i) => (
                              <div
                                key={i}
                                className={h.cls}
                                style={{
                                  left: `${h.left}%`,
                                  '--bdur': `${h.dur}s`,
                                  '--bdelay': `${h.delay}s`,
                                  filter: `drop-shadow(0 0 8px ${h.color}cc)`,
                                } as React.CSSProperties}
                              >
                                <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}>
                                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                                </svg>
                              </div>
                            ))}

                            {/* Profile icon with red ring on notify */}
                            <div
                              className="w-14 h-14 rounded-full overflow-hidden shrink-0 relative"
                              style={notify ? {
                                border: '2.5px solid #f43f5e',
                                boxShadow: '0 0 14px rgba(244,63,94,0.7), 0 0 4px rgba(244,63,94,0.4)'
                              } : { border: '2px solid transparent' }}
                            >
                              <ProfileAvatar user={chat.other_user} className="w-full h-full" iconSize="w-6 h-6" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-0.5">
                                <h3 className="text-[15px] font-black text-white truncate flex-1 flex items-center gap-2">
                                  {chat.other_user.name}
                                  {notify && (
                                    <motion.span
                                      animate={{ scale: [1, 1.3, 1] }}
                                      transition={{ repeat: Infinity, duration: 1.2 }}
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ background: '#f43f5e', boxShadow: '0 0 8px rgba(244,63,94,0.9)' }}
                                    />
                                  )}
                                </h3>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/live-chat/${chat.other_user.id}`);
                                  }}
                                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0 ml-2 transition-colors active:scale-95 group-hover:bg-rose-500/20"
                                  style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}
                                >
                                  <MessageCircle className="w-[17px] h-[17px] text-rose-400" />
                                </button>
                              </div>
                              <div className="flex flex-col gap-1 mt-0.5">
                                <p className={cn("text-[13px] truncate font-medium", hasUnread ? "text-white font-bold" : "text-white/35")}>
                                  {chat.isSender && <span className="opacity-50">Tu: </span>}{chat.last_msg}
                                </p>
                                <span className="text-[10px] text-white/20 font-bold leading-[1.2]">
                                  {new Date(chat.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {String(new Date(chat.created_at).getHours()).padStart(2, '0')}:{String(new Date(chat.created_at).getMinutes()).padStart(2, '0')}
                                </span>
                              </div>
                            </div>

                          </motion.div>

                          <AnimatePresence>
                            {replyingTo === chat.other_user.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative z-[1] flex flex-col overflow-hidden rounded-b-[24px]"
                                style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                              >
                                {/* Cronologia messaggi inline */}
                                <div className="max-h-64 overflow-y-auto p-4 space-y-3" style={{ scrollBehavior: 'smooth' }}>
                                  {chat.messages && chat.messages.map((m: any) => (
                                    <div key={m.id} className={cn("flex flex-col max-w-[80%]", m.isSender ? "ml-auto items-end" : "mr-auto items-start")}>
                                      <div
                                        className="px-4 py-3 rounded-2xl"
                                        style={m.isSender
                                          ? { background: '#f43f5e', color: 'white', borderBottomRightRadius: 4, boxShadow: '0 0 10px rgba(244,63,94,0.35)' }
                                          : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', borderBottomLeftRadius: 4 }}
                                      >
                                        <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">{m.text}</p>
                                      </div>
                                      <span className="text-[9px] text-white/25 font-bold mt-1 px-1">
                                        {new Date(m.created_at).getHours()}:{String(new Date(m.created_at).getMinutes()).padStart(2, '0')}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* Reply input — dark glass */}
                                <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                  <div className="flex gap-2 items-end rounded-[22px] px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <textarea
                                      value={replyText}
                                      onChange={e => setReplyText(e.target.value)}
                                      placeholder={`Rispondi a ${chat.other_user.name}...`}
                                      className="flex-1 bg-transparent text-white text-[14px] font-medium resize-none focus:outline-none placeholder:text-white/25 min-h-[36px] max-h-28"
                                      rows={1}
                                      onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = `${Math.min(112, target.scrollHeight)}px`;
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(chat.other_user.id); }
                                      }}
                                    />
                                    <button
                                      disabled={!replyText.trim() || isSendingReply}
                                      onClick={() => handleSendReply(chat.other_user.id)}
                                      className="w-10 h-10 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all disabled:opacity-30 shrink-0"
                                      style={{ background: '#f43f5e', boxShadow: '0 0 14px rgba(244,63,94,0.6)' }}
                                    >
                                      {isSendingReply ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      ) : (
                                        <Send className="w-4 h-4 rotate-[-45deg]" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};



// ── Chat Request Item Component ──
const ChatRequestItem = ({ req, index, bounceNotif, handleDeleteChatRequest, replyingTo, setReplyingTo, replyText, setReplyText, handleSendReply, isSendingReply }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "bg-white rounded-[24px] border border-stone-100 shadow-sm overflow-hidden",
        bounceNotif && "animate-bounce"
      )}
    >
      <div className="p-4 flex gap-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-stone-100 shrink-0">
          <img src={req.photo_url || `https://picsum.photos/seed/${req.from_user_id}/100`} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-sm font-black text-stone-900 truncate">{req.name}</h3>
            <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest text-right">
              {new Date(req.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}<br />
              {new Date(req.created_at).getHours()}:{String(new Date(req.created_at).getMinutes()).padStart(2, '0')}
            </span>
          </div>
          <p className="text-[12px] text-stone-600 leading-relaxed italic line-clamp-2">"{req.message}"</p>
        </div>
      </div>

      <div className="bg-stone-50/50 px-4 py-3 flex gap-2 border-t border-stone-50">
        {replyingTo === req.from_user_id ? (
          <div className="flex-1 space-y-3 bg-white border border-stone-200 rounded-2xl p-3 shadow-sm">
            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Scrivi una risposta..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-[13px] outline-none focus:ring-2 focus:ring-rose-500 resize-none shadow-inner"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReplyingTo(null)}
                className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-stone-500 hover:bg-stone-200 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                disabled={isSendingReply || !replyText.trim()}
                onClick={() => handleSendReply(req.from_user_id)}
                className="px-6 py-2 bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md hover:bg-rose-700 disabled:opacity-50 transition-all active:scale-95"
              >
                {isSendingReply ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Invia</>}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setReplyingTo(req.from_user_id)}
              className="flex-1 bg-rose-600 text-white py-2.5 rounded-[12px] text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Rispondi
            </button>
            <button
              onClick={() => handleDeleteChatRequest(req.id)}
              className="w-10 h-10 bg-white border border-stone-200 rounded-[12px] flex items-center justify-center text-stone-400 hover:text-rose-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

// ── Live Chat Modal Component ──
const LiveChatModal = ({ profile, currentUser, onClose }: any) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMsgs = async () => {
      const { data } = await supabase
        .from('room_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMsgs();

    const channel = supabase.channel(`modal_chat_${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages' }, (payload) => {
        const m = payload.new;
        if ((m.sender_id === currentUser.id && m.receiver_id === profile.id) || (m.sender_id === profile.id && m.receiver_id === currentUser.id)) {
          setMessages(prev => [...prev, m]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const msgText = text;
    setText('');
    await supabase.from('room_messages').insert([{
      sender_id: currentUser.id,
      receiver_id: profile.id,
      text: msgText
    }]);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white w-full max-w-lg h-[85vh] sm:h-[70vh] rounded-t-[32px] sm:rounded-[32px] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-3">
            <ProfileAvatar user={profile} className="w-10 h-10 rounded-full" iconSize="w-5 h-5" />
            <div>
              <h3 className="text-sm font-black text-stone-900">{profile.name}</h3>
              <p className="text-[10px] text-emerald-500 font-bold uppercase">Chat Live</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-stone-400 border border-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/30">
          {messages.map((m) => {
            const isOwn = m.sender_id === currentUser.id;
            return (
              <div key={m.id} className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[80%] p-3 rounded-2xl text-[13px] shadow-sm",
                  isOwn ? "bg-rose-600 text-white rounded-tr-none" : "bg-white text-stone-800 rounded-tl-none border border-stone-100"
                )}>
                  {m.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box Uniforme */}
        <div className="p-4 bg-white border-t border-stone-100 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex gap-2 items-end">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(128, target.scrollHeight)}px`;
              }}
              placeholder="Scrivi un messaggio..."
              className="flex-1 bg-stone-50 border border-stone-200 rounded-[22px] p-4 text-[14px] font-medium resize-none focus:outline-none focus:ring-2 focus:ring-rose-200 shadow-inner min-h-[56px] max-h-32"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="w-14 h-14 bg-rose-600 text-white rounded-[22px] flex items-center justify-center shadow-lg shadow-rose-200 active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              <Send className="w-6 h-6 rotate-[-45deg] mr-1" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ProfilePage = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [liveChatsCount, setLiveChatsCount] = useState(0);
  const [activeChatTarget, setActiveChatTarget] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'gallery' | 'setup'>('gallery');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [bannerData, setBannerData] = useState<any>(null);
  const [bannerText, setBannerText] = useState('');
  const [isWritingBanner, setIsWritingBanner] = useState(false);
  const [setupForm, setSetupForm] = useState<any>({
    conosciamoci_meglio: {},
    orientation: [],
    looking_for_gender: []
  });
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumModalMode, setPremiumModalMode] = useState(false);
  const [isBannerExpanded, setIsBannerExpanded] = useState(false);
  const navigate = useNavigate();

  // Removed notification related states

  useEffect(() => {
    if (user) {
      setSetupForm({
        name: user.name,
        surname: user.surname,
        dob: user.dob,
        gender: user.gender,
        orientation: (Array.isArray(user.orientation) ? user.orientation : user.orientation ? [user.orientation] : []) as string[],
        city: user.city,
        province: user.province,
        job: user.job,
        description: user.description,
        hobbies: user.hobbies,
        desires: user.desires,
        body_type: user.body_type,
        height_cm: user.height_cm,
        conosciamoci_meglio: user.conosciamoci_meglio || {},
        looking_for_gender: (Array.isArray(user.looking_for_gender) ? user.looking_for_gender : user.looking_for_gender ? [user.looking_for_gender] : []) as string[],
        looking_for_age_min: user.looking_for_age_min || 18,
        looking_for_age_max: user.looking_for_age_max || 99,
        looking_for_body_type: user.looking_for_body_type || 'Tutte',
        looking_for_city: user.looking_for_city || 'Indifferente',
        looking_for_other: user.looking_for_other || ''
      });
    }
  }, [user?.id]);

  // Removed notification related effects

  const fetchData = async (userId: string) => {
    if (!userId || userId === 'undefined' || userId === 'null') {
      setLoading(false);
      return;
    }
    try {
      let profileData = null;
      // Exclusive Supabase call
      const { data, error: profileErr } = await supabase
        .from('users')
        .select(`
          *,
          interactions!to_user_id(type)
        `)
        .eq('id', userId)
        .single();
       
      if (profileErr) {
        console.error("Profile fetch error:", profileErr);
        // Minimal local fallback
        const savedRaw = localStorage.getItem('amarsiunpo_user');
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (String(saved.id) === String(userId)) profileData = saved;
        }
      } else {
        profileData = data;
      }

      if (profileData) {
        const normalized = normalizeUser(profileData);
        // Supabase returns interactions as an array, local API might not (check local API format if needed)
        const interactionsArr = Array.isArray(profileData.interactions) ? profileData.interactions : [];
        setUser({
          ...normalized,
          likes_count: interactionsArr.filter((i: any) => i.type === 'like').length,
          hearts_count: interactionsArr.filter((i: any) => i.type === 'heart').length
        });
      }
      else {
        console.warn("No profile found for ID:", userId);
      }

      const { data: requestsData, error: requestsErr } = await supabase
        .from('chat_requests')
        .select(`
                                *,
                                from_user:users!from_user_id(name, surname, photo_url, photos)
                                `)
        .eq('to_user_id', userId)
        .order('created_at', { ascending: false });

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

      // Count unique users who sent a live chat message to this user
      const { count: liveCount, error: liveErr } = await supabase
        .from('room_messages')
        .select('sender_id', { count: 'exact', head: true })
        .eq('receiver_id', userId);

      if (!liveErr && liveCount !== null) {
        // Fetch full active chats
        const { data: msgs } = await supabase
          .from('room_messages')
          .select(`
                                id, text, created_at, sender_id, receiver_id,
                                sender:users!sender_id(id, name, photos, photo_url, is_online, city),
                                receiver:users!receiver_id(id, name, photos, photo_url, is_online, city)
                                `)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (msgs) {
          const chatMap = new Map();
          for (const m of msgs) {
            const isSender = m.sender_id === userId;
            const u: any = isSender ? m.receiver : m.sender;
            const otherUser = Array.isArray(u) ? u[0] : u;
            if (!otherUser) continue;
            if (!chatMap.has(otherUser.id)) {
              chatMap.set(otherUser.id, {
                other_user: otherUser,
                last_msg: m.text,
                created_at: m.created_at,
                isSender
              });
            }
          }
          const uniqueSenders = new Set(msgs.map((m: any) => m.sender_id));
          setLiveChatsCount(uniqueSenders.size);
          setActiveChats(Array.from(chatMap.values()));
        }
      }

      // Removed pending soul link requests fetching

      // Fetch banner data (Compatibilità Online con Supabase)
      try {
        const { data, error } = await supabase
          .from('banner_messages')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (data) {
          setBannerData({ message: data, replies: [] });
        }
      } catch (e) {
        // Ignora errore
      }

      setLoading(false);
    } catch (e) {
      console.error("fetchData exception:", e);
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('amarsiunpo_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          // Set user from localStorage immediately to prevent "not found" blink
          setUser(normalizeUser(parsed));
          fetchData(parsed.id);
        } else {
          setLoading(false);
          navigate('/');
        }
      } catch (e) { 
        setLoading(false);
        navigate('/'); 
      }
    } else {
      setLoading(false);
      navigate('/');
    }
  }, [navigate]);

  // Removed handleAccept/RejectSoulLink
  const handleSaveSetup = async () => {
    if (!user?.id) return;
    setIsSavingSetup(true);

    // Filter out read-only and computed fields
    const submissionData = { ...setupForm };
    delete submissionData.name;
    delete submissionData.surname;
    delete submissionData.dob;
    delete submissionData.likes_count;
    delete submissionData.hearts_count;

    // Serialize arrays and objects to strings so they are cleanly saved in Postgres TEXT columns and can be parsed back
    submissionData.orientation = JSON.stringify(submissionData.orientation || []);
    submissionData.looking_for_gender = JSON.stringify(submissionData.looking_for_gender || []);
    submissionData.conosciamoci_meglio = JSON.stringify(submissionData.conosciamoci_meglio || {});

    const { error } = await supabase.from('users').update(submissionData).eq('id', user.id);
    if (!error) {
      setToast({ message: '✅ Profilo aggiornato!', type: 'success' });
      fetchData(user.id);


      // Sync local storage if needed
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.setItem('amarsiunpo_user', JSON.stringify({ ...parsed, ...submissionData }));
      }
    } else {
      setToast({ message: 'Errore durante il salvataggio: ' + error.message, type: 'error' });
    }
    setIsSavingSetup(false);
  };

  const handleDeleteProfile = async () => {
    if (!user?.id) return;
    setIsDeletingProfile(true);
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw new Error(error.message);
      await supabase.auth.signOut();
      localStorage.removeItem('amarsiunpo_user');
      setToast({ message: 'Profilo eliminato. Arrivederci!', type: 'info' });
      setTimeout(() => { window.dispatchEvent(new Event('user-auth-change')); navigate('/'); }, 2000);
    } catch (err: any) {
      setToast({ message: 'Errore: ' + err.message, type: 'error' });
    } finally {
      setIsDeletingProfile(false);
    }
  };

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
  const handleDeleteChatRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('chat_requests')
      .delete()
      .eq('id', requestId);

    if (!error) {
      setToast({ message: 'Messaggio eliminato', type: 'info' });
      if (user?.id) fetchData(user.id);
    }
  };
  const handleSendReply = async (recipientId: string) => {
    if (!replyText.trim() || !user) return;
    setIsSendingReply(true);
    try {
      // Segna come approvato il messaggio originale per togliere la notifica
      await supabase
        .from('chat_requests')
        .update({ status: 'approved' })
        .eq('from_user_id', recipientId)
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      const { error } = await supabase
        .from('chat_requests')
        .upsert({
          from_user_id: user.id,
          to_user_id: recipientId,
          message: replyText,
          status: 'approved',
          created_at: new Date().toISOString()
        }, { onConflict: 'from_user_id,to_user_id' });

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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0a0a0f' }}>
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}><Heart className="w-12 h-12 text-rose-500 fill-current" style={{ filter: 'drop-shadow(0 0 20px rgba(244,63,94,0.8))' }} /></motion.div>
      <p className="text-white/30 text-sm font-medium animate-pulse">Caricamento profilo...</p>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#0a0a0f' }}>
      <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center mb-6 border border-white/10">
        <Info className="w-10 h-10 text-rose-500" />
      </div>
      <h2 className="text-2xl font-montserrat font-black text-white mb-2">Profilo non trovato</h2>
      <p className="text-white/40 text-sm mb-8 max-w-xs font-medium">Non abbiamo trovato i dati del tuo profilo. Prova a ricaricare la pagina o a tornare alla bacheca.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={() => window.location.reload()} className="w-full py-4 bg-rose-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/40 hover:bg-rose-500 transition-all">Riprova il caricamento</button>
        <button onClick={() => navigate('/bacheca')} className="w-full py-4 bg-white/5 border border-white/10 text-white/50 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:text-white transition-all">Torna alla Bacheca</button>
        <button onClick={() => {
          localStorage.removeItem('amarsiunpo_user');
          window.dispatchEvent(new Event('user-auth-change'));
          navigate('/register');
        }} className="mt-6 flex items-center justify-center gap-2 text-white/20 font-black text-[10px] uppercase tracking-widest hover:text-rose-500 transition-colors">
          <LogOut className="w-4 h-4" /> Reset Sessione
        </button>
      </div>
    </div>
  );

  const heroPhoto = (user.photos && user.photos.length > 0) ? user.photos[0] : (user.photo_url || `https://picsum.photos/seed/${user.name}/400/600`);

  return (
    <div className="min-h-screen pt-16 pb-28 relative overflow-x-hidden" style={{ background: '#0a0a0f' }}>
      {/* Floating hearts */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`
          @keyframes floatHeartPP { 0%{transform:translateY(0) rotate(0deg);opacity:0;} 10%{opacity:1;} 80%{opacity:0.4;} 100%{transform:translateY(-110vh) rotate(20deg);opacity:0;} }
          .fhpp { animation: floatHeartPP var(--dur,12s) ease-in-out var(--delay,0s) infinite; position:absolute; bottom:-10%; }
        `}</style>
        {[
          { left: '6%', size: 8, color: '#f43f5e', blur: 3, dur: 11, delay: 0 },
          { left: '24%', size: 5, color: '#a855f7', blur: 4, dur: 8, delay: 1.6 },
          { left: '45%', size: 12, color: '#ec4899', blur: 5, dur: 13, delay: 0.7 },
          { left: '68%', size: 7, color: '#f43f5e', blur: 2, dur: 10, delay: 2.3 },
          { left: '85%', size: 9, color: '#9333ea', blur: 4, dur: 12, delay: 1.1 },
        ].map((h, i) => (
          <div key={i} className="fhpp" style={{ left: h.left, '--dur': `${h.dur}s`, '--delay': `${h.delay}s`, filter: `blur(${h.blur}px)`, opacity: 0.15 } as React.CSSProperties}>
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" /></svg>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── HERO PHOTO ── */}
      <div className="relative w-full h-[calc(68vh+100px)] min-h-[520px] overflow-hidden" style={{ background: '#0a0a0f' }}>
        <img
          src={heroPhoto}
          alt={user.name}
          className="w-full h-full object-cover object-top opacity-90 transition-opacity duration-1000"
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'
          }}
        />
        {/* Strong bottom fade to page background */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 50%, rgba(10,10,15,0.6) 80%, #0a0a0f 100%)' }} />

        {/* Settings button REMOVED — use Setup tab instead */}

        {/* Name + badge over gradient */}
        <div className="absolute bottom-[180px] left-0 right-0 px-6 pb-4 z-10">
          <div className="flex items-end justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="font-montserrat font-black text-2xl text-white truncate drop-shadow-lg">
                {user.name}{calculateAge(user.dob) > 0 && <span className="font-light text-xl text-white/60">, {calculateAge(user.dob)}</span>}
              </h1>
              {user.city && (
                <p className="text-[11px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3 h-3 text-rose-400" /> {user.city}{user.province ? `, ${user.province}` : ''}
                </p>
              )}
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ml-3 shrink-0",
              user.is_paid ? "bg-emerald-600 text-white" : "bg-white/15 backdrop-blur text-white/60 border border-white/20"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", user.is_paid ? "bg-white animate-pulse" : "bg-white/30")} />
              {user.is_paid ? (
                <span className="flex items-center gap-1">
                  Premium
                  {user.subscription_expiry && (
                    <span className="opacity-60 font-medium text-[8px]">
                      • Scad. {new Date(user.subscription_expiry).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </span>
              ) : 'Utente Base'}
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ROW — overlaps hero bottom ── */}
      <div
        className="mx-6 -mt-[156px] rounded-[28px] flex justify-between overflow-hidden relative z-10 backdrop-blur-xl"
        style={{ background: 'rgba(10,10,15,0.20)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
      >
        {[
          { icon: ThumbsUp, val: user.likes_count || 0, label: 'Like', color: 'text-emerald-400' },
          { icon: Heart, val: user.hearts_count || 0, label: 'Cuori', color: 'text-rose-400' }
        ].map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-4 gap-1 border-r border-white/5 last:border-0">
            <span className="text-xl font-black text-white">{s.val}</span>
            <s.icon className={cn("w-4 h-4", s.color)} />
            <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── PREMIUM UPGRADE BANNER (Solo per utenti Base) ── */}
      {/* ── STATUS BANNER (Premium/Base) ── */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-6 p-1 rounded-[32px] relative overflow-hidden group"
        style={{ 
          background: user.is_paid 
            ? 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.3))' 
            : 'linear-gradient(135deg, rgba(147,51,234,0.3), rgba(79,70,229,0.3))', 
          border: user.is_paid ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(147,51,234,0.3)' 
        }}
      >
        <div className="bg-[#0a0a0f]/80 backdrop-blur-3xl rounded-[31px] p-5 space-y-4">
           <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsBannerExpanded(!isBannerExpanded)}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                  user.is_paid ? "bg-emerald-600/20 border-emerald-500/30" : "bg-purple-600/20 border-purple-500/30"
                )}>
                  <Heart className={cn("w-5 h-5 fill-current animate-pulse", user.is_paid ? "text-emerald-400" : "text-purple-400")} />
                </div>
                <div>
                  <h3 className="text-[14px] font-black text-white uppercase tracking-wider">
                    {user.is_paid ? <>Stato <span className="text-emerald-500">Premium Attivo</span></> : <>Passa a <span className="text-purple-500">Premium</span></>}
                  </h3>
                  {!isBannerExpanded && (
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-tight">
                      {user.is_paid 
                        ? (user.subscription_expiry ? `Scadenza: ${new Date(user.subscription_expiry).toLocaleDateString('it-IT')}` : 'Abbonamento Attivo')
                        : 'Sblocca funzioni esclusive'}
                    </p>
                  )}
                </div>
              </div>
              <div 
                 className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-all"
              >
                 {isBannerExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
           </div>

           <AnimatePresence>
             {isBannerExpanded && (
               <motion.div
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 className="overflow-hidden space-y-4"
               >
                 <p className="text-[11px] text-white/60 font-medium leading-relaxed">
                   {user.is_paid 
                     ? "Grazie per essere un membro Premium! Hai accesso a tutte le funzioni avanzate, badge speciale e priorità nella bacheca."
                     : "Sblocca SoulLink illimitati, vedi chi ti ha messo like, pubblica messaggi flash e molto altro ancora."}
                 </p>
                 <div className="grid grid-cols-2 gap-3 pb-1">
                   {user.is_paid ? (
                     <button
                       onClick={() => { setPremiumModalMode(false); setShowPremiumModal(true); }}
                       className="col-span-2 py-4 bg-emerald-600 text-white rounded-[18px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2"
                     >
                       <Info className="w-4 h-4" /> Gestisci Abbonamento
                     </button>
                   ) : (
                     <>
                       <button
                         onClick={() => { setPremiumModalMode(false); setShowPremiumModal(true); }}
                         className="py-4 bg-purple-600 text-white rounded-[18px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
                       >
                         <CreditCard className="w-4 h-4" /> Abbonati
                       </button>
                       <button
                         onClick={(e) => { e.stopPropagation(); setPremiumModalMode(true); setShowPremiumModal(true); }}
                         className="py-4 bg-white/5 border border-white/10 text-white rounded-[18px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                       >
                         <Info className="w-4 h-4" /> Confronto Piani
                       </button>
                     </>
                   )}
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </motion.div>

      {/* ── DOCUMENT REJECTED BANNER (Profilo) ── */}
      <SharedRejectedDocumentBanner currentUser={user as any} />

      {/* ── TAB BAR dark glass ── */}
      <div className="mx-4 mt-5 rounded-[24px] flex p-1.5 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          { id: 'gallery', label: 'Galleria', icon: Camera, badge: 0 },
          { id: 'setup', label: 'Setup', icon: Settings2, badge: 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 py-3 rounded-[18px] flex flex-col items-center gap-1 transition-all duration-300 relative",
              activeTab === tab.id ? "text-white" : "text-white/30"
            )}
          >
            {activeTab === tab.id && (
              <motion.div layoutId="profileTabBg" className="absolute inset-x-2 inset-y-1 rounded-full" style={{ background: '#f43f5e', boxShadow: '0 0 16px rgba(244,63,94,0.5)' }} />
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

          {/* Tab content removed for notifications */}

          {activeTab === 'gallery' && (
            <motion.div key="tab-gallery" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* Counter */}
              <div className="flex items-center justify-between px-1">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Galleria foto</p>
                <span className="text-[10px] text-rose-400 font-black uppercase tracking-widest">{user.photos?.length || 0}/9</span>
              </div>
              {/* Dark glow container */}
              <div className="rounded-[28px] p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: '0 0 24px rgba(244,63,94,0.08)' }}>
                <div className="grid grid-cols-3 gap-2">
                  {user.photos?.map((url, i) => (
                    <div key={i} className="aspect-square rounded-[16px] overflow-hidden relative group"
                      style={{ border: i === 0 ? '2px solid #f43f5e' : '1px solid rgba(255,255,255,0.08)', boxShadow: i === 0 ? '0 0 12px rgba(244,63,94,0.3)' : 'none' }}
                    >
                      <img src={url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <label className="w-9 h-9 bg-white/90 rounded-xl flex items-center justify-center text-stone-700 cursor-pointer active:scale-90">
                          <RefreshCw className="w-4 h-4" />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => replaceProfilePhoto(i, e)} />
                        </label>
                        <button onClick={() => { if (window.confirm("Eliminare la foto?")) removeProfilePhoto(i); }} className="w-9 h-9 bg-white/90 rounded-xl flex items-center justify-center text-rose-600 active:scale-90">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {i === 0 && <div className="absolute top-2 left-2 text-[7px] text-white px-1.5 py-0.5 rounded-md font-black uppercase" style={{ background: '#f43f5e' }}>Principale</div>}
                    </div>
                  ))}
                  {(user.photos?.length || 0) < 9 && (
                    <label className="aspect-square rounded-[16px] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group" style={{ border: '1px dashed rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.04)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all" style={{ background: 'rgba(244,63,94,0.15)' }}>
                        <Plus className="w-5 h-5 text-rose-400" />
                      </div>
                      <span className="text-[9px] font-black text-rose-400/60 uppercase tracking-widest">Aggiungi</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={addProfilePhoto} />
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* FEED REMOVED FROM PROFILE */}

          {activeTab === 'setup' && (
            <motion.div key="tab-setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8 pb-8">
              {/* SAVE BUTTON STICKY TOP */}
              <div className="sticky top-0 z-20 pb-2">
                <button
                  onClick={handleSaveSetup}
                  disabled={isSavingSetup}
                  className="w-full py-4 text-white font-black uppercase tracking-widest rounded-[20px] text-sm transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: '#f43f5e', boxShadow: '0 0 24px rgba(244,63,94,0.4)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  {isSavingSetup ? 'Salvataggio...' : 'Salva Modifiche Profilo'}
                </button>
              </div>

              {/* Anagrafica (Locked) */}
              <div className="space-y-4">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest ml-1">Anagrafica (Verificata)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] p-4 opacity-50" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-[8px] text-rose-400 font-black uppercase mb-1">Nome</p>
                    <p className="text-sm font-medium text-white">{setupForm.name}</p>
                  </div>
                  <div className="rounded-[20px] p-4 opacity-50" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-[8px] text-rose-400 font-black uppercase mb-1">Data di Nascita</p>
                    <p className="text-sm font-medium text-white">{setupForm.dob}</p>
                  </div>
                </div>
              </div>

              {/* ── Horizontal Scroll Tag Selector helper (inline component) ── */}
              {/* Il mio Genere */}
              <div className="space-y-3">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest ml-1">Il mio Genere</p>
                <div className="relative">
                  {/* Blur fade left */}
                  <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10" style={{ background: 'linear-gradient(to right, #0a0a0f, transparent)' }} />
                  {/* Blur fade right */}
                  <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10" style={{ background: 'linear-gradient(to left, #0a0a0f, transparent)' }} />
                  <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar px-4" style={{ scrollSnapType: 'x mandatory' }}>
                    {['Uomo', 'Donna', 'Non-binario', 'Transgender (M→F)', 'Transgender (F→M)', 'Genderfluid', 'Genderqueer', 'Agender', 'Bigender', 'Pangender', 'Demi-genere', 'Intersessuale', 'Neutrois', 'Queer', 'Altro'].map(g => {
                      const sel = setupForm.gender === g;
                      return (
                        <button
                          key={g}
                          onClick={() => setSetupForm((f: any) => ({ ...f, gender: g }))}
                          style={{
                            scrollSnapAlign: 'center', flexShrink: 0,
                            ...(sel ? { background: '#f43f5e', boxShadow: '0 0 18px rgba(244,63,94,0.5)', border: '1px solid rgba(244,63,94,0.8)' }
                              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', filter: 'blur(0.3px)', opacity: 0.55 })
                          }}
                          className={cn(
                            "px-5 py-3 rounded-[20px] text-[11px] font-black tracking-widest uppercase whitespace-nowrap transition-all",
                            sel ? "text-white scale-105" : "text-white/60"
                          )}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Orientamento Sessuale */}
              <div className="space-y-3">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest ml-1">Orientamento Sessuale</p>
                <div className="relative">
                  <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10" style={{ background: 'linear-gradient(to right, #0a0a0f, transparent)' }} />
                  <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10" style={{ background: 'linear-gradient(to left, #0a0a0f, transparent)' }} />
                  <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar px-4" style={{ scrollSnapType: 'x mandatory' }}>
                    {['Eterosessuale', 'Gay', 'Lesbica', 'Bisessuale', 'Pansessuale', 'Asessuale', 'Demisessuale', 'Sapiosexual', 'Polisessuale', 'Queer', 'Fluido', 'Aromantic', 'Curioso/a', 'Altro'].map(o => {
                      const sel = (setupForm.orientation || []).includes(o);
                      return (
                        <button
                          key={o}
                          onClick={() => {
                            const next = sel
                              ? setupForm.orientation.filter((x: string) => x !== o)
                              : [...(setupForm.orientation || []), o];
                            setSetupForm((f: any) => ({ ...f, orientation: next }));
                          }}
                          style={{
                            scrollSnapAlign: 'center', flexShrink: 0,
                            ...(sel ? { background: '#f43f5e', boxShadow: '0 0 18px rgba(244,63,94,0.5)', border: '1px solid rgba(244,63,94,0.8)' }
                              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', filter: 'blur(0.3px)', opacity: 0.55 })
                          }}
                          className={cn(
                            "px-5 py-3 rounded-[20px] text-[11px] font-black tracking-widest uppercase whitespace-nowrap transition-all",
                            sel ? "text-white scale-105" : "text-white/60"
                          )}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Genere Preferito — horizontal scroll tags */}
              <div className="space-y-3">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest ml-1">Genere Preferito</p>
                <div className="relative">
                  <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10" style={{ background: 'linear-gradient(to right, #0a0a0f, transparent)' }} />
                  <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10" style={{ background: 'linear-gradient(to left, #0a0a0f, transparent)' }} />
                  <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar px-4" style={{ scrollSnapType: 'x mandatory' }}>
                    {['Uomo', 'Donna', 'Tutti', 'Non-binario', 'Transgender', 'Genderfluid', 'Queer', 'Altro'].map(g => {
                      const sel = (setupForm.looking_for_gender || []).includes(g);
                      return (
                        <button
                          key={g}
                          onClick={() => {
                            const next = g === 'Tutti'
                              ? ['Tutti']
                              : (sel
                                ? setupForm.looking_for_gender.filter((x: string) => x !== g)
                                : [...(setupForm.looking_for_gender || []).filter((x: string) => x !== 'Tutti'), g]);
                            setSetupForm((f: any) => ({ ...f, looking_for_gender: next }));
                          }}
                          style={{
                            scrollSnapAlign: 'center', flexShrink: 0,
                            ...(sel ? { background: '#f43f5e', boxShadow: '0 0 18px rgba(244,63,94,0.5)', border: '1px solid rgba(244,63,94,0.8)' }
                              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', filter: 'blur(0.3px)', opacity: 0.55 })
                          }}
                          className={cn(
                            "px-5 py-3 rounded-[20px] text-[11px] font-black tracking-widest uppercase whitespace-nowrap transition-all",
                            sel ? "text-white scale-105" : "text-white/60"
                          )}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bio & Details */}
              <div className="space-y-4">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest ml-1">Dettagli Profilo</p>

                <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] text-rose-400 font-black uppercase mb-1">Città</p>
                  <select
                    value={setupForm.city}
                    onChange={e => setSetupForm((f: any) => ({ ...f, city: e.target.value }))}
                    className="w-full bg-transparent text-sm font-medium text-white outline-none appearance-none"
                  >
                    {ITALIAN_CITIES.map(c => <option key={c} value={c} className="bg-stone-900">{c}</option>)}
                  </select>
                </div>

                <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] text-rose-400 font-black uppercase mb-1">Lavoro</p>
                  <input type="text" value={setupForm.job || ''} onChange={e => setSetupForm((f: any) => ({ ...f, job: e.target.value }))} placeholder="La tua professione" className="w-full text-sm font-medium outline-none text-white/80 placeholder:text-white/20 bg-transparent" />
                </div>

                <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] text-rose-400 font-black uppercase mb-1">Bio / Descrizione</p>
                  <textarea value={setupForm.description || ''} onChange={e => setSetupForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Raccontati..." className="w-full text-sm font-medium resize-none outline-none text-white/80 placeholder:text-white/20 bg-transparent min-h-[80px]" />
                </div>

                <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] text-rose-400 font-black uppercase mb-1">Interessi (separati da virgola)</p>
                  <input type="text" value={setupForm.hobbies || ''} onChange={e => setSetupForm((f: any) => ({ ...f, hobbies: e.target.value }))} placeholder="es. musica, cinema, yoga" className="w-full text-sm font-medium outline-none text-white/80 placeholder:text-white/20 bg-transparent" />
                </div>

                <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] text-rose-400 font-black uppercase mb-1">Cosa cerchi / Desideri</p>
                  <input type="text" value={setupForm.desires || ''} onChange={e => setSetupForm((f: any) => ({ ...f, desires: e.target.value }))} placeholder="es. Relazione seria, Amicizia..." className="w-full text-sm font-medium outline-none text-white/80 placeholder:text-white/20 bg-transparent" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[9px] text-rose-400 font-black uppercase mb-1">Altezza (cm)</p>
                    <input type="number" value={setupForm.height_cm || ''} onChange={e => setSetupForm((f: any) => ({ ...f, height_cm: parseInt(e.target.value) }))} placeholder="175" className="w-full text-sm font-medium outline-none text-white/80 bg-transparent" />
                  </div>
                  <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[9px] text-rose-400 font-black uppercase mb-1">Corporatura</p>
                    <select
                      value={setupForm.body_type}
                      onChange={e => setSetupForm((f: any) => ({ ...f, body_type: e.target.value }))}
                      className="w-full bg-transparent text-sm font-medium text-white outline-none appearance-none"
                    >
                      {['Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta'].map(t => <option key={t} value={t} className="bg-stone-900">{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Conosciamoci Meglio */}
              <div className="space-y-6">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest ml-1">Conosciamoci Meglio</p>
                {[
                  { label: 'Fumo', key: 'Fumo', options: ['Non fumo', 'Occasionalmente', 'Fumo', 'Misto'] },
                  { label: 'Sport', key: 'Sport_e_Attivita', options: ['Molto Attivo/a', 'Naturale', 'Poco Sportivo/a', 'Odio lo sport'] },
                  { label: 'Animali', key: 'Animale_Domestico', options: ['Cane', 'Gatto', 'Nessuno', 'Altro'] },
                  { label: 'Stile di Vita', key: 'Stile_di_Vita', options: ['Casa e Relax', 'Viaggi ed Escursioni', 'Feste e Locali', 'Equilibrato'] },
                  { label: 'Famiglia', key: 'Famiglia', options: ['Voglio figli', 'Non voglio figli', 'Cambio idea', 'Ne ho già'] }
                ].map(q => (
                  <div key={q.key} className="space-y-3">
                    <p className="text-[9px] text-white/30 font-black uppercase tracking-widest ml-1">{q.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setSetupForm((f: any) => ({
                            ...f,
                            conosciamoci_meglio: { ...(f.conosciamoci_meglio || {}), [q.key]: opt }
                          }))}
                          className={cn(
                            "py-2.5 rounded-[14px] text-[9px] font-black tracking-widest uppercase transition-all border",
                            setupForm.conosciamoci_meglio?.[q.key] === opt
                              ? "bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                              : "bg-white/5 border-white/5 text-white/40 hover:border-white/20"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Preferences matching */}
              <div className="space-y-6">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest ml-1">Chi Cerchi (Preferenze)</p>

                <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] text-rose-400 font-black uppercase mb-3">Fascia d'Età desiderata</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-[8px] text-white/30 font-black uppercase mb-1">Min</p>
                      <input type="number" value={setupForm.looking_for_age_min} onChange={e => setSetupForm((f: any) => ({ ...f, looking_for_age_min: parseInt(e.target.value) }))} className="w-full bg-transparent text-sm font-medium text-white outline-none" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[8px] text-white/30 font-black uppercase mb-1">Max</p>
                      <input type="number" value={setupForm.looking_for_age_max} onChange={e => setSetupForm((f: any) => ({ ...f, looking_for_age_max: parseInt(e.target.value) }))} className="w-full bg-transparent text-sm font-medium text-white outline-none" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] text-rose-400 font-black uppercase mb-1">Città desiderata</p>
                  <select
                    value={setupForm.looking_for_city}
                    onChange={e => setSetupForm((f: any) => ({ ...f, looking_for_city: e.target.value }))}
                    className="w-full bg-transparent text-sm font-medium text-white outline-none appearance-none"
                  >
                    <option value="Indifferente" className="bg-stone-900">Indifferente</option>
                    {ITALIAN_CITIES.map(c => <option key={c} value={c} className="bg-stone-900">{c}</option>)}
                  </select>
                </div>

                <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] text-rose-400 font-black uppercase mb-1">Statura / Corporatura Partner</p>
                  <select
                    value={setupForm.looking_for_body_type}
                    onChange={e => setSetupForm((f: any) => ({ ...f, looking_for_body_type: e.target.value }))}
                    className="w-full bg-transparent text-sm font-medium text-white outline-none appearance-none"
                  >
                    {['Tutte', 'Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta'].map(t => (
                      <option key={t} value={t} className="bg-stone-900">{t}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[20px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[9px] text-rose-400 font-black uppercase mb-1">Altre Note</p>
                  <textarea value={setupForm.looking_for_other || ''} onChange={e => setSetupForm((f: any) => ({ ...f, looking_for_other: e.target.value }))} placeholder="es. Solo non fumatori..." className="w-full text-sm font-medium resize-none outline-none text-white/80 placeholder:text-white/20 bg-transparent min-h-[60px]" />
                </div>
              </div>

              {/* Logout & Delete Block */}
              <div className="pt-4 space-y-4">
                <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-4 text-rose-400/70 text-xs font-black uppercase tracking-widest rounded-[20px] flex items-center justify-center gap-2" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}>
                  <LogOut className="w-5 h-5" /> Disconnetti Account
                </button>

                <div className="pt-4 border-t border-white/5">
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-widest text-center mb-4">Zona Pericolo</p>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-4 rounded-[20px] border border-rose-900/40 text-rose-900 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-rose-900/10 transition-all opacity-50 hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      Elimina Profilo Definitivamente
                    </button>
                  ) : (
                    <div className="bg-rose-950/20 border-2 border-rose-500 p-6 rounded-[32px] space-y-4 animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center gap-3 text-rose-500">
                        <AlertTriangle className="w-6 h-6" />
                        <h3 className="font-black uppercase tracking-widest text-xs">Cancellazione Account</h3>
                      </div>
                      <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider leading-relaxed">
                        Questa azione eliminerà per sempre tutti i tuoi messaggi, post e foto. Non potrai più recuperare i dati.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteProfile}
                          disabled={isDeletingProfile}
                          className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/40 disabled:opacity-50"
                        >
                          {isDeletingProfile ? 'ELIMINAZIONE...' : 'SÌ, ELIMINA TUTTO'}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-4 bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                        >
                          ANNULLA
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                      localStorage.removeItem('amarsiunpo_user');
                      localStorage.removeItem('amarsiunpo_reg_draft');
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

      {/* ── LIVE CHAT MODAL ── */}
      <AnimatePresence>
        {activeChatTarget && user && (
          <LiveChatModal
            profile={activeChatTarget}
            currentUser={user}
            onClose={() => { setActiveChatTarget(null); fetchData(user.id); }}
          />
        )}
      </AnimatePresence>
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} defaultComparison={premiumModalMode} />
    </div >
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


      <div className="px-6 pt-2 pb-32 max-w-md mx-auto">
        {/* Logo row */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-rose-600 rounded-[14px] flex items-center justify-center shadow-lg shadow-rose-900/40">
            <Heart className="w-5 h-5 text-white fill-current" />
          </div>
          <div>
            <p className="text-base font-serif font-black text-white">Amarsi Un Po</p>
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
            <div className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-[12px] px-3 py-2 flex-1 relative overflow-hidden opacity-70">
              <div className="absolute top-0 right-0 bg-rose-600 text-white text-[6px] font-black uppercase px-1.5 py-0.5 rounded-bl-lg tracking-wider">Coming Soon</div>
              <div className="w-5 h-5 bg-stone-600 rounded-md flex items-center justify-center">
                <span className="text-[8px] font-black text-white">▲</span>
              </div>
              <div>
                <p className="text-[7px] text-stone-500 uppercase tracking-widest">Disponibile su</p>
                <p className="text-[10px] font-black text-stone-300">App Store</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-[12px] px-3 py-2 flex-1 relative overflow-hidden opacity-70">
              <div className="absolute top-0 right-0 bg-rose-600 text-white text-[6px] font-black uppercase px-1.5 py-0.5 rounded-bl-lg tracking-wider">Coming Soon</div>
              <div className="w-5 h-5 bg-stone-600 rounded-md flex items-center justify-center">
                <span className="text-[8px] font-black text-white">▶</span>
              </div>
              <div>
                <p className="text-[7px] text-stone-500 uppercase tracking-widest">Disponibile su</p>
                <p className="text-[10px] font-black text-stone-300">Google Play</p>
              </div>
            </div>
          </div>

          {/* Admin link */}
          <div className="flex justify-center mt-2">
            <Link to="/admin" className="p-2 bg-stone-800 rounded-full hover:bg-rose-600 text-stone-400 hover:text-white transition-colors group" title="Pannello Amministrativo">
              <ShieldCheck className="w-4 h-4" />
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-stone-600 text-[9px] text-center font-medium">
            © 2026 Amarsi Un Po — Tutti i diritti riservati
            <br />
            <span className="text-stone-700">P.IVA 10122901217 — Castro Massimo</span>
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
    <div className="min-h-screen bg-stone-50 pt-[72px] pb-24">
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


      </div>

      {/* Bottom decoration */}
      <div className="pointer-events-none mt-16 flex flex-col items-center gap-3">
        <Icon className={cn('w-24 h-24 opacity-[0.04]', iconColor)} />
        <p className="text-stone-300 text-[9px] font-black uppercase tracking-[0.3em]">Amarsi Un Po © {new Date().getFullYear()}</p>
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
      { heading: 'Finalità', body: 'I tuoi dati (nome, foto, età, preferenze) vengono usati esclusivamente per il funzionamento dell\'app e la creazione del profilo.' },
      { heading: 'Verifica Identità', body: 'I documenti caricati per la verifica dell\'età e dell\'identità vengono cancellati definitivamente dai nostri server immediatamente dopo il controllo (sia in caso di convalida che di rifiuto) per la tua privacy.' },
      { heading: 'Conservazione', body: 'I dati del profilo restano attivi finché decidi di restare iscritto. Puoi cancellare il tuo account e tutti i dati associati in qualsiasi momento dalle impostazioni.' },
      { heading: 'Sicurezza', body: 'Adottiamo misure crittografiche per prevenire accessi non autorizzati o furti di dati. I tuoi contatti privati non vengono mai venduti a terzi.' },
      { heading: 'Moderazione', body: 'I contenuti pubblicati sono monitorati dai nostri sistemi e moderatori umani per garantire la sicurezza della community.' },
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
    badge="Aggiornato 2026"
    sections={[
      { heading: 'Accettazione', body: 'Utilizzando Amarsi Un Po accetti i presenti Termini e Condizioni. Se non li accetti, ti invitiamo a non utilizzare il servizio.' },
      { heading: 'Età minima (18+)', body: 'Amarsi Un Po è rigorosamente riservato a utenti maggiorenni. L\'iscrizione di minori è vietata e comporta il blocco immediato dell\'account.' },
      { heading: 'Responsabilità dell\'utente', body: 'L\'utente è responsabile delle proprie attività. È vietato usare il servizio per attività illecite, truffe, molestie o spam.' },
      { heading: 'Sospensione e Ban', body: 'In caso di violazioni, il sistema applica ammonizioni, sospensioni temporanee (24 ore) o ban permanenti in base alla gravità. Il ban comporta l\'impossibilità di futura re-iscrizione.' },
      { heading: 'Limitazione di responsabilità', body: 'Amarsi Un Po non è responsabile per le interazioni al di fuori della piattaforma. Gli incontri fisici avvengono sotto la responsabilità degli utenti.' },
      { heading: 'Proprietà Intellettuale', body: 'È vietato l\'uso di foto altrui, VIP o generate da IA. Sono ammesse solo foto reali e personali del titolare dell\'account.' },
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
      { heading: '1. Requisiti e Identità', body: 'Età: L\'uso è vietato ai minori di 18 anni. Verifica: È richiesta la verifica del documento per garantire l\'identità ed evitare truffe. I documenti saranno eliminati subito dopo la verifica per la tua privacy. Autenticità: Vietate foto IA, di VIP o di terzi. Solo foto reali e personali.' },
      { heading: '2. Contenuti e Comportamento', body: 'No Nudo/Explicit: Vietati contenuti sessuali espliciti, nudo o foto offensive. Rispetto: Vietati messaggi offensivi o molesti. Ogni contenuto è monitorato dai moderatori. No Spam: Vietato pubblicare numeri di telefono, link esterni (Meta, TikTok), siti adult o pubblicità.' },
      { heading: '3. Segnalazioni e Sanzioni', body: 'Monitoraggio: Ci riserviamo il diritto di rimuovere contenuti inappropriati. Reporting: Usa il tasto segnala in basso ai profili; segnalazioni false o vendicative sono sanzionabili. Sanzioni: Le violazioni portano ad avvertimenti o ban permanenti, bloccando ogni futura re-iscrizione.' },
      { heading: 'Ecosistema Community', body: 'Accettare il regolamento significa impegnarsi a rispettare l\'ecosistema Amarsi Un Po. Se non sei d\'accordo con questi termini, ti preghiamo di non procedere con l\'iscrizione.' },
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
      { heading: 'Supporto generale', body: 'Per domande generali sull\'utilizzo dell\'app: castromassimo@gmail.com · www.amarsiunpo.it' },
      { heading: 'Privacy e dati', body: 'Per richieste relative ai tuoi dati personali, cancellazione account o diritti GDPR: castromassimo@gmail.com' },
      { heading: 'Segnalazioni urgenti', body: 'Per segnalare comportamenti pericolosi o contenuti illegali con necessità di intervento urgente: castromassimo@gmail.com' },
      { heading: 'Partnership e stampa', body: 'Per collaborazioni commerciali, partnership o richieste media: castromassimo@gmail.com' },
      { heading: 'Sede legale', body: 'Castro Massimo · Via Roma · 80029 Sant\'Antimo (Napoli), Italia · P.IVA 10122901217' },
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
      { heading: 'Come segnalare', body: 'Usa il tasto "Segnala" in basso in ogni profilo. Scegli il motivo (Nudo, IA, Spam, Linguaggio offensivo) e invia. Il team esamina ogni segnalazione entro 24h.' },
      { heading: 'Criteri di segnalazione', body: 'Puoi segnalare: Profili falsi, Foto inappropriate, Messaggi offensivi, Spam o link pubblicitari esterni (Meta, TikTok, etc).' },
      { heading: 'Genuinità delle segnalazioni', body: 'Le segnalazioni false o effettuate per fini vendicativi sono sanzionabili e possono portare alla sospensione dell\'account del segnalante.' },
      { heading: 'Protezione e Anonimato', body: 'Le segnalazioni sono anonime. L\'utente segnalato non saprà mai chi ha effettuato la segnalazione.' },
      { heading: 'Blocco Utenti', body: 'Puoi bloccare un utente per impedirgli di vedere il tuo profilo o contattarti. Il blocco è immediato e irreversibile per quell\'utente.' },
      { heading: 'Sicurezza Reale', body: 'In caso di pericolo o reati, contatta le autorità competenti (112). Per abusi sulla piattaforma scrivi a castromassimo@gmail.com.' },
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
      { heading: 'Il servizio è gratuito?', body: 'La registrazione e le funzionalità base sono gratuite. Il piano Premium sblocca funzionalità avanzate come messaggi illimitati, Amarsi Un Po AI e visualizzazione dei profili che ti hanno messo "cuore".' },
      { heading: 'Come verifico il mio profilo?', body: 'Dopo la registrazione, puoi caricare un documento d\'identità per ottenere il badge "Verificato". La verifica aumenta la fiducia degli altri utenti.' },
      { heading: 'Posso cancellare il mio account?', body: 'Sì, puoi cancellare il tuo account in qualsiasi momento dalla sezione Impostazioni → Gestione Account → Elimina Account. Tutti i tuoi dati saranno rimossi entro 30 giorni.' },
      { heading: 'Come funziona Amarsi Un Po (la feature)?', body: 'Il tasto Amarsi Un Po nella Bacheca calcola i tuoi 10 profili più compatibili e li mostra in ordine di affinità. È utilizzabile una volta ogni 24 ore per mantenere il valore speciale di ogni match.' },
      { heading: 'L\'app sarà disponibile su iOS e Android?', body: 'Sì, Amarsi Un Po sarà disponibile su App Store e Google Play. Seguici per essere notificato al momento del lancio.' },
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
      { heading: 'Proprietà dei contenuti', body: 'Gli utenti mantengono la piena proprietà delle foto e dei contenuti caricati. Caricando contenuti su Amarsi Un Po, concedi una licenza limitata per la visualizzazione all\'interno della piattaforma.' },
      { heading: 'Violazioni copyright', body: 'Se ritieni che un contenuto presente su Amarsi Un Po violi i tuoi diritti d\'autore, puoi inviare una richiesta di rimozione DMCA a: castromassimo@gmail.com' },
      { heading: 'Procedura di rimozione', body: 'Una richiesta DMCA valida deve includere: identificazione dell\'opera, URL del contenuto, dichiarazione di buona fede e firma. Risponderemo entro 5 giorni lavorativi.' },
      { heading: 'Contenuti vietati', body: 'È vietato caricare contenuti di cui non si possiedono i diritti: foto di altre persone, immagini coperte da copyright, loghi o marchi registrati altrui.' },
    ]}
  />
);

const SharedRejectedDocumentBanner = ({ currentUser, onUploadSuccess }: { currentUser: UserProfile | null, onUploadSuccess?: () => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!currentUser?.doc_rejected) return null;
  const remaining = calculateRemainingDays(currentUser.doc_rejected_at || null);

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentUser) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        const { error } = await supabase.from('users').update({
          id_document_url: base64,
          doc_rejected: false,
          doc_rejected_at: null,
          is_suspended: false 
        }).eq('id', currentUser.id);

        if (!error) {
          const saved = localStorage.getItem('amarsiunpo_user');
          if (saved) {
            const parsed = JSON.parse(saved);
            localStorage.setItem('amarsiunpo_user', JSON.stringify({
              ...parsed,
              id_document_url: base64,
              doc_rejected: false,
              doc_rejected_at: null,
              is_suspended: false
            }));
          }
          window.dispatchEvent(new Event('user-auth-change'));
          if (onUploadSuccess) onUploadSuccess();
        }
      } catch (err) {
        console.error("Upload error:", err);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-4 mt-4 p-4 rounded-[28px] relative overflow-hidden group border border-rose-500/30"
      style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(0,0,0,0.4))', backdropFilter: 'blur(20px)' }}
    >
      <input type="file" ref={fileInputRef} onChange={handleDirectUpload} accept="image/*,.pdf" className="hidden" />
      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center border border-rose-500/30 shrink-0">
           <AlertTriangle className="w-6 h-6 text-rose-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-black text-white uppercase tracking-wider">Documento <span className="text-rose-500">Rifiutato</span></h3>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tight leading-loose mt-0.5">
            Il documento caricato non è valido. Mancano <span className="text-rose-500">{remaining} giorni</span> alla sospensione definitiva del profilo. Caricalo ora.
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/40 active:scale-95 transition-all flex items-center gap-2"
          >
            <CloudUpload className="w-4 h-4" /> Vai al caricamento
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const SubscriptionSuccessPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [expiry, setExpiry] = useState<string>('');

  useEffect(() => {
    const processSubscription = async () => {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          const pendingPlan = localStorage.getItem('amarsiunpo_pending_plan') as 'monthly' | 'annual' || 'monthly';
          
          const expiryDate = new Date();
          if (pendingPlan === 'annual') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          }

          const subscriptionData = {
            is_paid: true,
            subscription_type: pendingPlan === 'annual' ? 'annuale' : 'mensile',
            subscription_expiry: expiryDate.toISOString()
          };
          
          setExpiry(expiryDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }));

          // 1. Update Database
          const { error } = await supabase
            .from('users')
            .update(subscriptionData)
            .eq('id', u.id);
          
          if (!error) {
            // 2. Update Local Session
            const updatedUser = { ...u, ...subscriptionData };
            localStorage.setItem('amarsiunpo_user', JSON.stringify(updatedUser));
            localStorage.removeItem('amarsiunpo_pending_plan');
            window.dispatchEvent(new Event('user-auth-change'));
          }
        } catch (e) {
          console.error("Errore processamento abbonamento:", e);
        }
      }
      setLoading(false);
    };

    processSubscription();
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
      {/* Animated background stars/pixels */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" />
        <div className="absolute top-3/4 left-2/3 w-1 h-1 bg-white rounded-full animate-ping [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-600/20 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-stone-900/40 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 text-center relative z-10 shadow-2xl"
      >
        <div className="w-20 h-20 bg-emerald-500/20 rounded-[28px] flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
          <CheckCircle className="w-10 h-10 text-emerald-500 relative z-10" />
        </div>

        <h1 className="text-3xl font-serif font-black text-white mb-2 leading-tight">Benvenuto nel <br /><span className="text-purple-400">Club Premium!</span></h1>
        <p className="text-stone-400 text-sm font-bold uppercase tracking-widest mb-8">Pagamento completato con successo</p>

        <div className="space-y-4 mb-10">
          {[
            { icon: Sparkles, label: "SoulLink Illimitati", desc: "Niente più limiti giornalieri" },
            { icon: Zap, label: "Messaggi Flash", desc: "Contatta chiunque istantaneamente" },
            { icon: Eye, label: "Identità Svelata", desc: "Vedi chiaramente chi ti cerca" },
            { icon: ShieldCheck, label: "Badge Premium", desc: "Massima affidabilità sul profilo" }
          ].map((feat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <feat.icon className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-white uppercase tracking-wider">{feat.label}</p>
                <p className="text-[10px] text-stone-500 font-bold">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 mb-8">
           <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Stato Abbonamento</p>
           <p className="text-sm font-bold text-white">Attivo fino al {expiry || '...'}</p>
        </div>

        <button 
          onClick={() => navigate('/profile')}
          className="w-full py-4 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-stone-200 transition-all active:scale-95 shadow-xl shadow-white/5"
        >
          Vai al tuo profilo
        </button>
      </motion.div>

      <div className="mt-8 text-center text-[10px] text-stone-600 font-bold uppercase tracking-widest">
        AMARSIUNPO Premium • Ordine #SM-{Math.floor(Math.random() * 100000)}
      </div>
    </div>
  );
};


const SecurityWarningSideBanner = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthChange = () => {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        try {
          setCurrentUser(JSON.parse(saved));
        } catch { setCurrentUser(null); }
      } else {
        setCurrentUser(null);
      }
    };
    handleAuthChange();
    window.addEventListener('user-auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('user-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.doc_rejected) return;

    // Automatic expansion every 60 seconds
    const interval = setInterval(() => {
      setIsExpanded(true);
      setTimeout(() => setIsExpanded(false), 5000);
    }, 60000);

    // Also show on first load for 5 seconds
    const initialTimer = setTimeout(() => {
      setIsExpanded(true);
      setTimeout(() => setIsExpanded(false), 5000);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [currentUser?.doc_rejected, currentUser?.id]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentUser) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        const { error } = await supabase.from('users').update({
          id_document_url: base64,
          doc_rejected: false,
          doc_rejected_at: null,
          is_suspended: false // Clear suspension if it was due to doc rejection
        }).eq('id', currentUser.id);

        if (!error) {
          const saved = localStorage.getItem('amarsiunpo_user');
          if (saved) {
            const parsed = JSON.parse(saved);
            localStorage.setItem('amarsiunpo_user', JSON.stringify({
              ...parsed,
              id_document_url: base64,
              doc_rejected: false,
              doc_rejected_at: null,
              is_suspended: false
            }));
          }
          window.dispatchEvent(new Event('user-auth-change'));
          setIsExpanded(false);
        } else {
          console.error("Errore upload documento:", error);
        }
      } catch (err) {
        console.error("Errore conversione file:", err);
      }
    }
  };

  if (!currentUser?.doc_rejected) return null;
  // Don't show in registration or live chat
  if (location.pathname.startsWith('/register') || location.pathname.startsWith('/live-chat')) return null;

  const remaining = calculateRemainingDays(currentUser.doc_rejected_at || null);

  return (
    <motion.div
      initial={false}
      animate={{ x: isExpanded ? 0 : 'calc(100% - 40px)' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[9999] flex items-stretch group"
      style={{ filter: 'drop-shadow(-20px 0 40px rgba(0,0,0,0.6))' }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleDirectUpload} 
        accept="image/*,.pdf" 
        className="hidden" 
      />

      {/* Side Tab - The "Setup" handle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-10 bg-rose-600 rounded-l-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-rose-500 transition-colors relative z-10"
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
        <Settings2 className="w-5 h-5 text-white animate-spin-slow" />
        <div className="[writing-mode:vertical-lr] text-[9px] font-black uppercase tracking-[0.2em] text-white rotate-180 whitespace-nowrap">
          Azione Richiesta
        </div>
      </button>

      {/* Main Content Area - 3x larger than standard toasts */}
      <div className="w-80 bg-stone-900 border-y border-l border-white/10 rounded-none p-6 relative flex flex-col gap-4 overflow-hidden">
        {/* Background Accent */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-600/10 blur-3xl rounded-full" />
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
            <ShieldCheck className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h4 className="text-sm font-montserrat font-black text-white leading-tight uppercase">Documento Rifiutato</h4>
            <div className="flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-rose-400" />
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">Mancano {remaining} giorni</p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-white/50 leading-relaxed font-medium">
          Il tuo documento non è stato convalidato. Ricaricalo ora per evitare la sospensione dell'account e ottenere il badge di verifica.
        </p>

        <div className="space-y-2">
          <button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 transition-all active:scale-95"
          >
            <CloudUpload className="w-4 h-4" />
            Carica Documento
          </button>
          
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/60 font-bold uppercase tracking-widest text-[8px] rounded-xl transition-all"
          >
            Chiudi Anteprima
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const SecurityOverlay = ({ status, onClose }: { status: any; onClose: () => void }) => {
  if (!status || !status.type || status.type === 'doc_rejected') return null;
  const { type, reason } = status;

  const handleClearPostNotice = async () => {
    try {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        const u = JSON.parse(saved);
        await supabase.from('users').update({ has_post_removal_notice: false }).eq('id', u.id);
      }
      onClose();
    } catch (e) {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 text-center">
      <div className="max-w-xs w-full space-y-7">
        {type === 'blocked' ? (
          <>
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20 shadow-lg shadow-rose-900/10">
              <XCircle className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-montserrat font-black text-rose-500 uppercase tracking-tight leading-tight">Accesso Negato:<br />Account Bloccato</h2>
              <p className="text-white/60 text-sm leading-relaxed font-medium">Il tuo profilo è stato rimosso permanentemente a causa di gravi o reiterate violazioni dei <span className="text-white">Termini d'Uso</span> accettati in fase di iscrizione.</p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-rose-500/80 text-[10px] font-black uppercase tracking-widest">Politica di Sicurezza</p>
              <p className="text-white/40 text-[10px] font-medium leading-relaxed mt-1">Il sistema ha bloccato ogni tentativo di nuova registrazione associato ai tuoi dati.</p>
            </div>
          </>
        ) : type === 'warning' || type === 'suspended' ? (
          <>
            <div className={`w-20 h-20 ${type === 'warning' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'} rounded-full flex items-center justify-center mx-auto border shadow-lg`}>
              {type === 'warning' ? <Info className="w-10 h-10 text-blue-400" /> : <AlertTriangle className="w-10 h-10 text-amber-500" />}
            </div>
            <div className="space-y-2">
              <h2 className={`text-2xl font-montserrat font-black ${type === 'warning' ? 'text-blue-400' : 'text-amber-500'} uppercase tracking-tight leading-tight`}>
                {type === 'warning' ? 'Avviso e Sospensione' : 'Account sospeso temporaneamente'}
              </h2>
              <p className="text-white/60 text-sm leading-relaxed font-medium">Il tuo account è stato sospeso per <span className="text-white">24 ore</span> a causa di violazioni del regolamento.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
              <p className={`${type === 'warning' ? 'text-blue-400' : 'text-amber-500'} text-[10px] uppercase font-black tracking-widest mb-1 items-center flex gap-1.5`}>
                <AlertTriangle className="w-3 h-3" /> Motivazione
              </p>
              <p className="text-white text-sm font-bold">{reason || 'Violazione dei termini della community'}</p>
            </div>
            <div className="space-y-5">
              <p className="text-white/40 text-[11px] font-medium leading-relaxed">Ti ricordiamo che la nostra è una community basata sul rispetto. Al prossimo richiamo, il profilo verrà eliminato definitivamente.</p>
              {type === 'warning' && (
                <button 
                  onClick={onClose} 
                  className="w-full py-4 bg-white/10 text-white font-black uppercase tracking-widest rounded-2xl border border-white/10 active:scale-95 transition-all"
                >Ho capito</button>
              )}
            </div>
          </>
        ) : type === 'post_removed' ? (
          <>
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20 shadow-lg">
              <Trash2 className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-montserrat font-black text-white uppercase tracking-tight leading-tight">Post Rimosso</h2>
              <p className="text-white/60 text-sm leading-relaxed font-medium">Il contenuto che hai pubblicato non era conforme alle regole della nostra community.</p>
            </div>
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 text-left">
              <p className="text-rose-400 text-[10px] uppercase font-black tracking-widest mb-1 items-center flex gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Info Moderazione
              </p>
              <p className="text-white text-sm font-bold leading-relaxed">Il post è stato rimosso per violazione dei contenuti. Assicurati di seguire le linee guida per i prossimi post.</p>
            </div>
            <button 
              onClick={handleClearPostNotice} 
              className="w-full py-4 bg-rose-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-900/40 active:scale-95 transition-all"
            >Ho letto</button>
          </>
        ) : null}
      </div>
    </motion.div>
  );
};

const SubscriptionExpiryBanner = ({ user, onRenew }: { user: UserProfile, onRenew: () => void }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (user.is_paid && user.subscription_expiry) {
      const expiry = new Date(user.subscription_expiry);
      const now = new Date();
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Mostra se mancano 3 giorni o meno e non è già scaduto
      if (diffDays > 0 && diffDays <= 3) {
        const sessionKey = `sm_expiry_shown_${user.id}`;
        const sessionShown = sessionStorage.getItem(sessionKey);
        if (!sessionShown) {
          setShow(true);
        }
      }
    }
  }, [user]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-x-6 bottom-24 z-[9999] bg-stone-900 border border-purple-500/40 rounded-[32px] p-6 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl -mr-12 -mt-12" />
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
            <Bell className="w-6 h-6 text-purple-400 animate-bounce" />
          </div>
          <div>
            <h3 className="text-[13px] font-black text-white uppercase tracking-widest leading-none">Abbonamento in Scadenza</h3>
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-tighter mt-1">Mancano meno di 3 giorni!</p>
          </div>
        </div>
        
        <p className="text-[11px] text-white/50 leading-relaxed font-bold mb-6 relative z-10">
          Il tuo piano Premium sta per terminare. Rinnova ora per non perdere i vantaggi sbloccati e continuare la tua esperienza su AMARSIUNPO senza interruzioni.
        </p>

        <div className="flex gap-3 relative z-10">
          <button 
            onClick={() => { setShow(false); onRenew(); sessionStorage.setItem(`sm_expiry_shown_${user.id}`, 'true'); }}
            className="flex-1 py-4 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/40 active:scale-95 transition-all"
          >
            Rinnova Ora
          </button>
          <button 
            onClick={() => { setShow(false); sessionStorage.setItem(`sm_expiry_shown_${user.id}`, 'true'); }}
            className="flex-1 py-4 bg-white/5 text-white/40 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-bold"
          >
            Chiudi
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  const [securityStatus, setSecurityStatus] = useState<any>({ type: null });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);

  const handleGlobalClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const interactive = target.closest('button, a, [role="button"]');
    if (interactive) {
      // playTapSound();
    }
  };

  useEffect(() => {
    // Check if security status is saved in localStorage (e.g. for doc rejection persistence)
    const savedStatus = localStorage.getItem('amarsiunpo_security_notice');
    if (savedStatus) {
      try { setSecurityStatus(JSON.parse(savedStatus)); } catch (e) {}
    }
  }, []);

  const handleCloseSecurity = () => {
    localStorage.removeItem('amarsiunpo_security_notice');
    setSecurityStatus({ type: null });
  };
  useEffect(() => {
    // 1. Silent verification of the user profile on app startup
    const verifyUser = async () => {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
            const isLocalId = /^\d+$/.test(String(u.id));
            if (isLocalId) {
              // Per utenti locali saltiamo la verifica Supabase e aggiorniamo is_online
              setCurrentUser(normalizeUser(u));
              return;
            }

            // Use maybeSingle to avoid error on 0 rows
            const { data, error } = await supabase.from('users')
              .select('id, email, is_online, last_seen, is_blocked, is_suspended, doc_rejected, doc_rejected_at, last_warning_reason, suspension_reason, has_post_removal_notice, is_paid, subscription_type, subscription_expiry')
              .eq('id', u.id)
              .maybeSingle();

            if (error) {
              console.error("Errore verifica sessione (DB):", error);
              return;
            }

            if (!data) {
              console.warn("Profilo non trovato nel database. Pulizia sessione locale.");
              localStorage.removeItem('amarsiunpo_user');
              window.dispatchEvent(new Event('user-auth-change'));
            } else {
              // Check security status
              if (data.is_blocked) {
                setSecurityStatus({ type: 'blocked' });
              } else if (data.is_suspended) {
                setSecurityStatus({ type: 'suspended', reason: data.suspension_reason });
              } else if (data.has_post_removal_notice) {
                setSecurityStatus({ type: 'post_removed' });
              } else if (data.doc_rejected) {
                setSecurityStatus({ type: 'doc_rejected', rejectedAt: data.doc_rejected_at });
              } else if (data.last_warning_reason) {
                const warned = localStorage.getItem('amarsiunpo_warned_id');
                if (warned !== data.last_warning_reason) {
                  setSecurityStatus({ type: 'warning', reason: data.last_warning_reason });
                  localStorage.setItem('amarsiunpo_warned_id', data.last_warning_reason);
                } else {
                  setSecurityStatus({ type: null });
                }
              } else {
                setSecurityStatus({ type: null });
              }

              // Update status and storage if changed
              const updatedUser = normalizeUser({ ...u, ...data });
              setCurrentUser(updatedUser);
              localStorage.setItem('amarsiunpo_user', JSON.stringify(updatedUser));
            await supabase.from('users').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', u.id);
          }
        } catch (e) {
          console.error("Errore verifica sessione (Local):", e);
        }
      } else {
        setCurrentUser(null);
      }
    };
    verifyUser();

    // 2. Heartbeat mechanism to keep user online
    const heartbeatInterval = setInterval(async () => {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          if (u?.id && document.visibilityState === 'visible') {
            await supabase.from('users').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', u.id);
          }
        } catch (e) { }
      }
    }, 45000); // Every 45 seconds

    const handleVisibilityChange = async () => {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          if (u?.id) {
            const isVisible = document.visibilityState === 'visible';
            await supabase.from('users').update({
              is_online: isVisible,
              last_seen: new Date().toISOString()
            }).eq('id', u.id);
          }
        } catch (e) { }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBeforeUnload = () => {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          if (u?.id) {
            supabase.from('users').update({ is_online: false }).eq('id', u.id).then();
          }
        } catch (e) { }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const handleAuthChange = () => {
      const saved = localStorage.getItem('amarsiunpo_user');
      if (saved) {
        try { setCurrentUser(normalizeUser(JSON.parse(saved))); } catch { setCurrentUser(null); }
      } else {
        setCurrentUser(null);
      }
    };
    window.addEventListener('user-auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    window.addEventListener('mousedown', handleGlobalClick);
    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('user-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
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

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @keyframes heartFlight1 {
          0% { transform: translate(0, 0) scale(0) rotate(-10deg); opacity: 0; }
          15% { opacity: 1; scale: 1.2; }
          100% { transform: translate(-35px, -110px) scale(0.8) rotate(-30deg); opacity: 0; }
        }
        @keyframes heartFlight2 {
          0% { transform: translate(0, 0) scale(0) rotate(10deg); opacity: 0; }
          15% { opacity: 1; scale: 1.2; }
          100% { transform: translate(35px, -110px) scale(0.8) rotate(30deg); opacity: 0; }
        }
        @keyframes heartFlight3 {
          0% { transform: translate(0, 0) scale(0) rotate(0deg); opacity: 0; }
          15% { opacity: 1; scale: 1.2; }
          100% { transform: translate(0, -135px) scale(1) rotate(0deg); opacity: 0; }
        }
        .bha1 { animation: heartFlight1 var(--bdur,3.5s) ease-out var(--bdelay,0s) infinite; position: absolute; bottom: 10px; pointer-events: none; }
        .bha2 { animation: heartFlight2 var(--bdur,3.5s) ease-out var(--bdelay,0s) infinite; position: absolute; bottom: 10px; pointer-events: none; }
        .bha3 { animation: heartFlight3 var(--bdur,3.5s) ease-out var(--bdelay,0s) infinite; position: absolute; bottom: 10px; pointer-events: none; }
      `}</style>
      <BackgroundDecorations />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bacheca" element={<BachecaPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/amici" element={<AmiciPage />} />
        <Route path="/soul-match" element={<AMARSIUNPOPage />} />
        <Route path="/register" element={<RegisterPage setSecurityStatus={setSecurityStatus} />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/live-chat/:id" element={<LiveChatPage />} />
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
        <Route path="/subscription-success" element={<SubscriptionSuccessPage />} />
      </Routes>
      <GlobalFlashBanner />
      <AppBottomNav />
      {currentUser && (
        <SubscriptionExpiryBanner user={currentUser} onRenew={() => setIsPremiumOpen(true)} />
      )}
      <PremiumModal isOpen={isPremiumOpen} onClose={() => setIsPremiumOpen(false)} />
      <SecurityWarningSideBanner />
      <SecurityOverlay status={securityStatus} onClose={handleCloseSecurity} />
    </Router>
  );
}
