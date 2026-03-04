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
  MessageCircle,
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
  Send,
  LogOut,
  ShieldCheck,
  Share2,
  AlertTriangle,
  Link2,
  UserCheck,
  XCircle,
  Lock,
  Zap,
  Globe
} from 'lucide-react';
import { cn, calculateAge, calculateMatchScore, fileToBase64, playTapSound, ITALIAN_CITIES } from './utils';
import { UserProfile, ChatRequest, Post, SoulLink } from './types';
import { supabase } from './supabase';

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

const normalizeUser = (u: any): any => ({
  ...u,
  orientation: parseArrField(u?.orientation),
  looking_for_gender: parseArrField(u?.looking_for_gender),
  photos: parseArrField(u?.photos),
  conosciamoci_meglio: (typeof u?.conosciamoci_meglio === 'string') ? JSON.parse(u.conosciamoci_meglio) : (u?.conosciamoci_meglio || {})
});

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
      const saved = localStorage.getItem('soulmatch_user');
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
      const saved = localStorage.getItem('soulmatch_user');
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
    if (path.startsWith('/soul-match')) return 'soulmatch';
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

              {/* SoulMatch (Heart Button) */}
              <Link to="/soul-match" onClick={() => window.dispatchEvent(new CustomEvent('reset-soulmatch'))} className="relative flex-1 group">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center py-2.5 rounded-full aspect-square justify-center transition-all duration-300",
                    activeTab === 'soulmatch' ? "text-white shadow-lg" : "text-stone-400 hover:text-white"
                  )}
                  style={activeTab === 'soulmatch' ? { background: '#f43f5e', boxShadow: '0 0 20px rgba(244,63,94,0.6)' } : {}}
                >
                  <Heart className={cn("w-5 h-5 mb-0.5", activeTab === 'soulmatch' ? "fill-current" : "")} />
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

  // Show ONLY on /bacheca
  const isBacheca = location.pathname.startsWith('/bacheca');
  const shouldHide = !isBacheca;

  const fetchGlobalBanner = async () => {
    try {
      const { data } = await supabase.from('banner_messages').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) setBannerMessages(data);
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
          x: 0, // Force 0 to stay strictly against the right screen edge
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
                  onClick={() => navigate(`/profile-detail/${bannerMessages[bannerIndex]?.user_id}`)}
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
      className="fixed bottom-[200px] left-1/2 z-[100] px-5 py-3 rounded-2xl flex items-center gap-3 min-w-[260px]"
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
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) setUser(normalizeUser(JSON.parse(saved)));
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
        <div className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform shrink-0 shadow-lg shadow-rose-900/40">
          <Heart className="text-white w-5 h-5 fill-current" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-serif font-black tracking-tight text-white leading-none">SoulMatch</span>
          <span className="text-[9px] font-montserrat font-bold text-rose-500 uppercase tracking-[0.2em] mt-1 line-clamp-1">
            {user ? user.name : "Compagnia Ideale"}
          </span>
        </div>
      </Link>
      <div className="flex gap-4 items-center relative z-10">
        {user ? (
          <div className="flex items-center gap-3">
            <Link to="/profile" className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 bg-white/5 transition-all hover:bg-white/10 active:scale-95 overflow-hidden ring-2 ring-white/5">
              <ProfileAvatar user={user} className="w-full h-full" iconSize="w-5 h-5" />
            </Link>

            <button
              onClick={() => {
                localStorage.removeItem('soulmatch_user');
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
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
        <div className="aspect-[3/4.8] overflow-hidden relative shrink-0">
          <ProfileAvatar user={profile} className="w-full h-full" iconSize="w-20 h-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

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
    fetch('/api/settings/home_slider')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setImages(data);
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

  useEffect(() => {
    if (displayImages.length <= 1) return;
    const itv = setInterval(() => {
      setIndex(prev => (prev + 1) % displayImages.length);
    }, 4000); // Slightly faster for mobile engagement
    return () => clearInterval(itv);
  }, [displayImages.length]);

  return (
    <div className="absolute top-0 left-0 right-0 h-[650px] w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={displayImages[index]}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.85, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.8 }}
          className="w-full h-full object-cover"
        />
      </AnimatePresence>
      {/* Multi-layer dark gradient fade - lightened top overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
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

  useEffect(() => {
    window.scrollTo(0, 0);
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        setIsLoggedIn(true);
        setCurrentUser(normalizeUser(JSON.parse(saved)));
      }
    } catch (e) { }
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
    <div className="min-h-screen pt-[580px] pb-12 px-4 flex flex-col items-center justify-center bg-black relative overflow-x-hidden">
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
            SoulMatch è il luogo sicuro dove incontrare persone reali. Ogni profilo è verificato manualmente per la tua sicurezza.
          </p>
        </div>

        {/* Suspended User Notice — persistent floating banner */}
        {isLoggedIn && currentUser?.doc_rejected && !currentUser?.is_validated && (() => {
          const rejectedAt = (currentUser as any).doc_rejected_at ? new Date((currentUser as any).doc_rejected_at) : null;
          const daysUsed = rejectedAt ? Math.floor((Date.now() - rejectedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          const daysLeft = Math.max(0, 15 - daysUsed);
          const expiryDate = rejectedAt ? new Date(rejectedAt.getTime() + 15 * 24 * 60 * 60 * 1000) : null;
          const expiryStr = expiryDate ? expiryDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'long' }) : '';

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mb-2 rounded-3xl overflow-hidden shadow-lg relative z-20"
            >
              {/* Progress bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-900/40">
                <div
                  className="h-full bg-rose-500 transition-all"
                  style={{ width: `${Math.min(100, (daysUsed / 15) * 100)}%` }}
                />
              </div>

              <div className="bg-white/5 backdrop-blur-2xl border border-rose-500/20 p-5 pt-6" style={{ boxShadow: '0 0 24px rgba(225,29,72,0.1)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-rose-500/20 rounded-2xl flex items-center justify-center shrink-0" style={{ boxShadow: '0 0 12px rgba(225,29,72,0.3)' }}>
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-black text-rose-300 text-base">Documento non valido</h4>
                      <span className={cn(
                        "text-[11px] font-black uppercase px-2.5 py-1 rounded-full border",
                        daysLeft <= 3
                          ? "bg-red-500/20 text-red-300 border-red-500/30"
                          : daysLeft <= 7
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      )}>
                        {daysLeft > 0 ? `${daysLeft} giorni rimasti` : 'Scaduto'}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 mt-1 leading-relaxed">
                      Il tuo documento è stato respinto. Il tuo account è in modalità di sola ricezione.
                      {expiryStr && <> Scade il <strong className="text-rose-400">{expiryStr}</strong>.</>}
                    </p>
                    <Link
                      to="/edit-profile"
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl uppercase tracking-widest transition-all shadow-sm shadow-rose-900/60"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> Carica Nuovo Documento
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}


        {/* Single CTA */}
        <div className="px-4 space-y-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            {!isLoggedIn ? (
              <Link
                to="/register"
                className="w-full flex items-center justify-between gap-4 bg-gradient-to-r from-rose-600 to-rose-500 text-white py-4 px-6 rounded-[22px] font-black shadow-xl shadow-rose-300/50 hover:shadow-rose-400/60 transition-all"
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
          <h2 className="text-left text-sm font-black text-white/30 uppercase tracking-widest px-1">Perché SoulMatch</h2>
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
              title: "SoulMatch AI",
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
              desc: "Invia SoulMatch ai tuoi amici e invitali!",
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
        </div>

        {/* ── DEMO BACHECA ── */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-1">
            <div className="text-left">
              <h2 className="text-xl font-montserrat font-black text-white">Anteprima Bacheca</h2>
              <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold">Demo interattiva — prova i tasti!</p>
            </div>
          </div>

          {/* Mock device frame — dark glass */}
          <div className="relative rounded-[32px] overflow-hidden border border-white/8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', boxShadow: '0 0 60px rgba(244,63,94,0.08)' }}>
            {/* Fake status bar */}
            <div className="bg-black/40 backdrop-blur-sm px-5 py-2 flex items-center justify-between border-b border-white/8">
              <span className="text-[10px] font-black text-white/40">SoulMatch</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center">
                  <Heart className="w-2 h-2 text-white fill-current" />
                </div>
                <span className="text-[10px] font-montserrat font-black text-rose-400">Bacheca</span>
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
                  className="relative group h-full"
                >
                  <div className="aspect-[3/5.5] overflow-hidden bg-stone-900 relative shadow-xl group-hover:shadow-2xl transition-all border border-white/8 rounded-[22px]">
                    <img
                      src={p.img}
                      className="w-full h-full object-cover opacity-80"
                      onContextMenu={e => e.preventDefault()}
                    />
                    {/* Strong dark fade from bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />

                    {/* Quick Feeling Button Demo */}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDemoHearts(prev => ({ ...prev, [p.id]: !prev[p.id] })); }}
                      className={cn(
                        "absolute top-3 right-3 z-30 p-2 backdrop-blur-lg rounded-xl transition-all shadow-lg active:scale-90 border",
                        demoHearts[p.id]
                          ? "bg-rose-600 border-rose-500 text-white"
                          : "bg-white/10 border-white/15 text-white"
                      )}
                    >
                      <Heart className={cn("w-4 h-4", demoHearts[p.id] ? "fill-current" : "")} />
                    </button>

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-[13px] font-serif font-black drop-shadow-md truncate leading-tight">
                        {p.name}<span className="text-white/60 font-sans text-[11px] font-bold">, {p.age}</span>
                      </p>
                      <p className="text-white/60 text-[9px] font-bold truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2 h-2" />{p.city}
                      </p>
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-600/30 backdrop-blur-md rounded-full border border-rose-500/30">
                        <Sparkles className="w-2 h-2 text-rose-300" />
                        <span className="text-rose-200 text-[8px] font-black">{p.match}% Match</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA overlay */}
            <div className="relative -mt-20 pt-20 pb-5 px-4 flex flex-col items-center gap-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 60%, transparent)' }}>
              <p className="text-xs text-white/40 font-semibold text-center">Accedi per vedere tutti i profili reali nella tua zona</p>
              <div
                className="bg-rose-600 text-white px-8 py-3 rounded-[16px] text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-900/60 active:scale-95 transition-all cursor-pointer"
                onClick={() => alert("Questa è un'anteprima dimostrativa. Iscriviti per accedere alla Bacheca reale!")}
              >
                {isLoggedIn ? "Apri Bacheca" : "Iscriviti Gratis"}
              </div>
            </div>
          </div>

          <p className="text-white/20 text-[9px] italic text-center">Profile demo a scopo illustrativo</p>
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
        <p className="text-white/15 text-[9px] font-black uppercase tracking-[0.3em]">SoulMatch &copy; 2025</p>
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
      const saved = localStorage.getItem('soulmatch_user');
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
    navigate('/chat', { state: { activeTab: 'live' } });
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
            {profile.is_online ? (
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
                    <div className="leading-relaxed whitespace-pre-wrap break-words">{m.text}</div>
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
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [soulLinkStatus, setSoulLinkStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected'>('none');
  const [soulLinkId, setSoulLinkId] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
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
      if (!id) return;

      // Safety: check if ID is UUID. Simulated IDs like "5" will fail in UUID columns.
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

        if (error) console.error("ProfileDetail fetch error:", error);

        if (userProfile && !error) {
          const profileWithCounts = {
            ...userProfile,
            likes_count: (userProfile.interactions as any[] || []).filter(i => i.type === 'like').length,
            hearts_count: (userProfile.interactions as any[] || []).filter(i => i.type === 'heart').length
          };
          setProfile(normalizeUser(profileWithCounts));
        }
        else {
          console.warn("No detail profile found for ID:", id);
        }
      } catch (e) {
        console.error("ProfileDetail fetch exception:", e);
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
      setToast({ message: '✨ Richiesta inviata! Attendi la risposta.', type: 'success' });
    } else {
      setToast({ message: 'Errore nell\'invio della richiesta.', type: 'error' });
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

    if (!profile?.is_online) {
      setToast({ message: `${profile?.name} è offline non puoi avviare una live in questo momento!`, type: 'info' });
      return;
    }
    navigate(`/live-chat/${profile.id}`);
  };

  const handleOpenMessageModal = () => {
    if (!currentUser?.id) {
      setToast({ message: "Devi essere iscritto!", type: 'error' });
      return;
    }
    // Allow opening modal for check, the limit check is in sendChatMessage
    setIsMessageModalOpen(true);
  };

  const sendChatMessage = async () => {
    if (!messageText.trim()) return;

    if (soulLinkStatus !== 'accepted') {
      setIsMessageModalOpen(false);
      setToast({ message: "Puoi inviare messaggi solo ai tuoi SoulLinks!", type: 'info' });
      return;
    }

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

    const textToSend = messageText;
    setMessageText('');
    // Close modal after setting state to avoid flickering
    setIsMessageModalOpen(false);

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

      {/* ── HERO PHOTO with bottom fade ── */}
      <div className="relative w-full h-[calc(65vh+100px)] min-h-[480px] overflow-hidden" style={{ background: '#0a0a0f' }}>
        <div className="w-full h-full relative" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const photosCount = (profile.photos && profile.photos.length > 0) ? profile.photos.length : 1;
          if (photosCount <= 1) return;
          if (x < rect.width / 2) {
            setHeroIndex(prev => (prev - 1 + photosCount) % photosCount);
          } else {
            setHeroIndex(prev => (prev + 1) % photosCount);
          }
        }}>
          {profile.photos && profile.photos.length > 0 ? (
            <img
              src={profile.photos[heroIndex]}
              alt={profile.name}
              className="w-full h-full object-cover transition-all duration-500"
              referrerPolicy="no-referrer"
            />
          ) : (
            <ProfileAvatar user={profile} className="w-full h-full" iconSize="w-32 h-32" />
          )}

          {/* Photo Indicators */}
          {(profile.photos && profile.photos.length > 1) && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-1 z-30">
              {profile.photos.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    idx === heroIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
                  )}
                />
              ))}
            </div>
          )}

          {/* CSS mask: photo fades naturally at bottom */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'linear-gradient(to bottom, transparent 30%, rgba(10,10,15,0.5) 65%, rgba(10,10,15,0.9) 85%, #0a0a0f 100%)'
          }} />

          {/* ── ONLINE / OFFLINE badge top-left ── */}
          <div className="absolute top-5 left-5 z-20">
            {profile.is_online ? (
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

          {/* Name / age / city overlaid on gradient */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
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

            {/* ── FRIEND REQUEST button ── */}
            <button
              onClick={
                soulLinkStatus === 'none' ? handleSendSoulLink :
                  soulLinkStatus === 'pending_received' ? handleAcceptSoulLink :
                    soulLinkStatus === 'accepted' ? handleRemoveSoulLink :
                      () => { }
              }
              className="mt-4 w-full py-3.5 rounded-[20px] font-black text-sm uppercase tracking-widest text-white transition-all active:scale-95 flex items-center justify-center gap-2"
              style={
                soulLinkStatus === 'accepted'
                  ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }
                  : soulLinkStatus === 'pending_sent'
                    ? { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', backdropFilter: 'blur(20px)' }
                    : soulLinkStatus === 'pending_received'
                      ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', backdropFilter: 'blur(20px)' }
                      : { background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)', backdropFilter: 'blur(20px)', boxShadow: '0 0 20px rgba(244,63,94,0.2)' }
              }
            >
              {soulLinkStatus === 'accepted' ? <><UserCheck className="w-4 h-4" /> Siete Amici</> :
                soulLinkStatus === 'pending_sent' ? <><Users className="w-4 h-4" /> Richiesta Inviata</> :
                  soulLinkStatus === 'pending_received' ? <><CheckCircle className="w-4 h-4" /> Accetta Amicizia</> :
                    <><UserPlus className="w-4 h-4" /> Richiesta di Amicizia</>}
            </button>

            {/* ── MESSAGE + CHAT pills ── */}
            <div className="mt-2 flex gap-2">
              {/* Scrivi messaggio — solo se SoulLink accettato */}
              <button
                onClick={handleOpenMessageModal}
                className="flex-1 py-3 rounded-[16px] font-black text-[11px] uppercase tracking-widest text-white transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <Send className="w-3.5 h-3.5 text-rose-400" /> Scrivi Messaggio
              </button>

              {/* Chatta — solo se online */}
              <button
                onClick={profile.is_online ? handleInstantChat : undefined}
                disabled={!profile.is_online}
                className={cn(
                  "flex-1 py-3 rounded-[16px] font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5",
                  profile.is_online ? "text-white" : "text-white/30 cursor-not-allowed"
                )}
                style={profile.is_online ? {
                  background: chatStatus === 'approved' ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)',
                  border: chatStatus === 'approved' ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.15)'
                } : {
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <MessageCircle className={cn("w-3.5 h-3.5", profile.is_online ? (chatStatus === 'approved' ? "text-emerald-400" : "text-blue-400") : "text-white/20")} />
                {profile.is_online
                  ? (chatStatus === 'approved' ? 'Chatta' : chatStatus === 'pending' ? 'Attendendo...' : 'Chatta')
                  : 'Offline'}
              </button>
            </div>
          </div>

          {/* ── MATCH CORNER WIDGET ── */}
          <div className="absolute bottom-0 right-0 z-0 pointer-events-none overflow-visible">
            <style>{`
              @keyframes orbitHeartB {
              0%   { transform: rotate(0deg) translateX(137px) rotate(0deg) scale(1); opacity:0.85; }
              50%  { transform: rotate(180deg) translateX(137px) rotate(-180deg) scale(1.2); opacity:1; }
              100% { transform: rotate(360deg) translateX(137px) rotate(-360deg) scale(1); opacity:0.85; }
            }
            @keyframes heartbeatB {
              0%   { transform: scale(1); }
              14%  { transform: scale(1.15); }
              28%  { transform: scale(1); }
              42%  { transform: scale(1.1); }
              70%  { transform: scale(1); }
              100% { transform: scale(1); }
            }
            .orbit-heart-b { animation: orbitHeartB var(--dur,4.3s) linear var(--delay,0s) infinite; position:absolute; top:50%; left:50%; margin:-12px; }
            .heart-beat-b   { animation: heartbeatB 1.4s ease-in-out infinite; transform-origin: center; }
          `}</style>

            {/* Concave corner SVG — 462px (Reduced by 30%) */}
            <svg width="462" height="462" viewBox="0 0 462 462" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M462 0 Q462 462 0 462 L462 462 Z" fill="url(#matchGradB)" />
              <path d="M462 0 Q462 462 0 462 L462 462 Z" fill="url(#matchFadeB)" />
              <defs>
                <radialGradient id="matchGradB" cx="100%" cy="100%" r="80%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                  <stop offset="55%" stopColor="#be123c" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="matchFadeB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0a0a0f" stopOpacity="0" />
                  <stop offset="75%" stopColor="#0a0a0f" stopOpacity="0" />
                  <stop offset="100%" stopColor="#0a0a0f" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>

            {/* Heart + score */}
            <div className="absolute inset-0 flex items-end justify-end pb-14 pr-14">
              {currentUser ? (
                <div className="relative flex items-center justify-center" style={{ width: 210, height: 210, transform: 'rotate(25deg) translateX(20px) translateY(-30px)' }}>
                  {/* Dynamic hearts count: slowed duration by another 10% */}
                  {Array.from({ length: Math.max(1, Math.min(10, Math.round(matchScore / 10))) }).map((_, i) => (
                    <div key={i} className="orbit-heart-b" style={{ '--dur': `${3.2 + i * 0.45}s`, '--delay': `${i * 0.45}s` } as React.CSSProperties}>
                      <svg width="21" height="21" viewBox="0 0 24 24" fill="#fda4af">
                        <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                      </svg>
                    </div>
                  ))}
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <svg width="168" height="168" viewBox="0 0 24 24" className="heart-beat-b" style={{ filter: 'drop-shadow(0 0 29px rgba(244,63,94,0.95))' }}>
                      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="#f43f5e" />
                    </svg>
                    <span className="absolute font-black leading-none" style={{ color: '#fff1f2', fontSize: '38px', top: '50%', transform: 'translateY(-50%)', textShadow: '0 4px 16px rgba(0,0,0,0.8)' }}>
                      {matchScore}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative flex items-center justify-center" style={{ width: 168, height: 168, transform: 'rotate(25deg) translateX(20px) translateY(-30px)' }}>
                  <svg width="147" height="147" viewBox="0 0 24 24" className="heart-beat-b" style={{ filter: 'drop-shadow(0 0 22px rgba(255,255,255,0.6))' }}>
                    <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="rgba(255,255,255,0.75)" />
                  </svg>
                </div>
              )}
            </div>
          </div>
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
            <div className="mb-3 flex items-center justify-center w-12 h-12 rounded-[18px]" style={{ background: 'rgba(244,63,94,0.15)' }}>
              <Camera className="w-5 h-5 text-rose-400" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {profile.photos.map((url, i) => (
                <div key={i} className="aspect-square rounded-[16px] overflow-hidden" style={{ border: '1px solid rgba(244,63,94,0.25)' }}>
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

      {/* ── MESSAGE MODAL ── */}
      <AnimatePresence>
        {isMessageModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => e.target === e.currentTarget && setIsMessageModalOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-t-[40px] p-8 shadow-2xl space-y-5"
              style={{ background: '#1a1a22', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '380px' }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[16px] overflow-hidden shrink-0" style={{ border: '2px solid rgba(244,63,94,0.5)' }}>
                  <img src={(profile.photos && profile.photos.length > 0) ? profile.photos[0] : (profile.photo_url || `https://picsum.photos/seed/${profile.name}/400/600`)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-lg font-montserrat font-black text-white">Scrivi a {profile.name}</h3>
                  {soulLinkStatus !== 'accepted' ? (
                    <p className="text-amber-400 text-[11px] font-bold mt-0.5">⚠️ Solo per SoulLinks — prima aggiungi come amico</p>
                  ) : (
                    <p className="text-white/40 text-xs font-montserrat">Il tuo messaggio arriverà a {profile.name}</p>
                  )}
                </div>
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Ciao! Mi piacerebbe conoscerti..."
                className="w-full h-28 p-4 rounded-2xl text-sm outline-none resize-none font-medium text-white/80 placeholder:text-white/20 font-montserrat"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(244,63,94,0.2)', fontFamily: 'Montserrat, sans-serif' }}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setIsMessageModalOpen(false)}
                  className="flex-1 py-4 rounded-[18px] text-xs font-black uppercase tracking-widest font-montserrat transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat, sans-serif' }}
                >Annulla</button>
                <button
                  onClick={sendChatMessage}
                  disabled={!messageText.trim()}
                  className="flex-1 text-white py-4 rounded-[18px] text-xs font-black uppercase tracking-widest disabled:opacity-40 active:scale-95 font-montserrat"
                  style={{ background: '#f43f5e', boxShadow: '0 0 20px rgba(244,63,94,0.4)', fontFamily: 'Montserrat, sans-serif' }}
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
  const location = useLocation();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCity, setFilterCity] = useState<string>('Tutte');
  const [filterBodyType, setFilterBodyType] = useState<string>('Tutte');
  const [filterAge, setFilterAge] = useState<[number, number]>([18, 99]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showSoulMatch, setShowSoulMatch] = useState(false);
  const [soulmatchToast, setSoulmatchToast] = useState(false);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('soulmatch_unlocked_ids');
    if (saved) setUnlockedIds(JSON.parse(saved));
  }, [showSoulMatch]); // Refresh when soulmatch overlay closes

  const SM_COOLDOWN_KEY = 'soulmatch_last_used';
  const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h


  const getSoulMatchCooldownRemaining = (): number => {
    const last = localStorage.getItem(SM_COOLDOWN_KEY);
    if (!last) return 0;
    const elapsed = Date.now() - parseInt(last);
    return Math.max(0, COOLDOWN_MS - elapsed);
  };

  const isSoulMatchOnCooldown = () => getSoulMatchCooldownRemaining() > 0;

  const [showSoulMatchConfirm, setShowSoulMatchConfirm] = useState(false);

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
    setShowSoulMatchConfirm(true);
  };

  const confirmSoulMatch = () => {
    localStorage.setItem(SM_COOLDOWN_KEY, Date.now().toString());
    setShowSoulMatchConfirm(false);
    setShowSoulMatch(true);
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      // Try local API first
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const data = await res.json();
        // Check array to prevent crash on HTML fallback
        if (Array.isArray(data)) {
          setProfiles(data);
          setLoading(false);
          return;
        }
      }
    } catch (e) { }

    // Fallback to Supabase se fallisce API Locale
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
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        const user = normalizeUser(JSON.parse(saved));
        setCurrentUser(user);
        setSelectedGenders((user.looking_for_gender || []).map((g: string) => g.toLowerCase()));
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

      // Check if we came from Feed to trigger SoulMatch
      const params = new URLSearchParams(location.search);
      if (params.get('soulmatch')) {
        window.history.replaceState({}, '', window.location.pathname);
        handleSoulMatchPress();
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

  const filteredProfiles = profiles.filter(p => {
    // Exclude self, blocked, suspended
    if (currentUser && p.id === currentUser.id) return false;
    if (p.is_blocked || p.is_suspended) return false;

    // Ensure "real" users have at least one photo or a photo URL
    const hasPhoto = (p.photos && p.photos.length > 0) || p.photo_url;
    if (!hasPhoto) return false;

    // ─── 1. Secondary UI filters (city, age, body type) ───
    const cityMatch = filterCity === 'Tutte' || (p.city && p.city.trim().toLowerCase() === filterCity.toLowerCase());
    const bodyTypeMatch = filterBodyType === 'Tutte' || p.body_type === filterBodyType;
    const age = p.dob ? calculateAge(p.dob) : null;
    const ageMatch = !age || (age >= filterAge[0] && age <= filterAge[1]);
    const nameMatch = !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!cityMatch || !ageMatch || !bodyTypeMatch || !nameMatch) return false;

    // ─── 2. Preference-based matching (Identità, Attrazione, Inclusione) ───
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

    const wantsV = selectedGenders.map((g: string) => g.toLowerCase());
    const isWildcard = (arr: string[]) => arr.some(v => ['tutti', 'tutte', 'entrambi', 'qualsiasi', 'tutti i generi'].includes(v));

    // A. GENDER MATCH (Cosa cerco IO)
    const targetGender = target.gender?.toLowerCase() || '';
    const viewerWantsTarget = wantsV.length === 0 || isWildcard(wantsV) || wantsV.includes(targetGender);
    if (!viewerWantsTarget) return false;

    // B. COMPATIBILITÀ ORIENTAMENTO (Più permissivo per la Bacheca)
    const checkOri = (myMacro: string, myOris: string[], targetMacro: string) => {
      if (myOris.length === 0) return true; // Se non specificato, aperto a tutto
      if (myMacro === 'NB' || targetMacro === 'NB') return true; // NB è jolly in bacheca discovery

      if (myOris.includes('Eterosessuale')) {
        return (myMacro === 'M' && targetMacro === 'F') || (myMacro === 'F' && targetMacro === 'M') || targetMacro === 'TRANS';
      }
      if (myOris.includes('Gay') || myOris.includes('Lesbica')) {
        return myMacro === targetMacro || targetMacro === 'TRANS' || targetMacro === 'NB';
      }
      // Bisessuale/Pansessuale/etc.
      return true;
    };

    const orisV = viewer.orientation || [];
    const vCompatibleWithT = checkOri(macroV, orisV, macroT);

    // In bacheca discovery, mostriamo chiunque il viewer possa gradire 
    // senza forzare la reciprocità stretta (che resta per il SoulMatch)
    if (!vCompatibleWithT) return false;

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
  const heroProfiles = filteredProfiles.slice(0, Math.min(5, filteredProfiles.length));

  // Auto-rotate hero slider
  useEffect(() => {
    if (heroProfiles.length < 2) return;
    const timer = setInterval(() => setHeroIndex(i => (i + 1) % heroProfiles.length), 4000);
    return () => clearInterval(timer);
  }, [heroProfiles.length]);

  const heroProfile = heroProfiles[heroIndex];

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
          { left: '8%', size: 14, color: '#f43f5e', blur: 2, dur: 14, delay: 0, dx: 30, r: '20deg', s: 1.2 },
          { left: '18%', size: 8, color: '#fb7185', blur: 3, dur: 11, delay: 2, dx: -20, r: '-15deg', s: 0.9 },
          { left: '30%', size: 20, color: '#9333ea', blur: 4, dur: 16, delay: 1, dx: 15, r: '10deg', s: 1.1 },
          { left: '42%', size: 10, color: '#f43f5e', blur: 2, dur: 13, delay: 3.5, dx: -35, r: '25deg', s: 1.0 },
          { left: '55%', size: 16, color: '#ec4899', blur: 3, dur: 15, delay: 0.5, dx: 20, r: '-20deg', s: 1.3 },
          { left: '65%', size: 7, color: '#a855f7', blur: 4, dur: 10, delay: 2.5, dx: -10, r: '30deg', s: 0.8 },
          { left: '75%', size: 22, color: '#f43f5e', blur: 5, dur: 18, delay: 1.5, dx: 25, r: '-10deg', s: 1.0 },
          { left: '85%', size: 11, color: '#fb7185', blur: 2, dur: 12, delay: 4, dx: -15, r: '15deg', s: 0.9 },
          { left: '22%', size: 18, color: '#ec4899', blur: 6, dur: 17, delay: 5, dx: 10, r: '-25deg', s: 1.2 },
          { left: '48%', size: 9, color: '#9333ea', blur: 3, dur: 9, delay: 6, dx: -25, r: '20deg', s: 0.7 },
          { left: '92%', size: 13, color: '#f43f5e', blur: 4, dur: 13, delay: 3, dx: -30, r: '-15deg', s: 1.1 },
          { left: '5%', size: 6, color: '#a855f7', blur: 2, dur: 11, delay: 7, dx: 20, r: '10deg', s: 0.8 },
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
              opacity: 0.18,
            } as React.CSSProperties}
          >
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}>
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
          </div>
        ))}
      </div>

      {/* ── HERO PHOTO SLIDER ── */}
      {!loading && heroProfile && (

        <div className="relative w-full h-[80vh] min-h-[500px] overflow-hidden">
          <AnimatePresence mode="sync">
            <motion.img
              key={heroProfile.id}
              src={(heroProfile.photos?.[0]) || heroProfile.photo_url || `https://picsum.photos/seed/${heroProfile.name}/600/800`}
              initial={{ opacity: 0, scale: 1.07 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          </AnimatePresence>
          {/* Dark cinematic gradient - strong fade into background */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0a0a0f 0%, #0a0a0f 5%, rgba(10,10,15,0.85) 35%, rgba(0,0,0,0.3) 65%, transparent 100%)' }} />

          {/* Info overlay — clickable to navigate to profile */}
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={() => navigate(`/profile-detail/${heroProfile.id}`)}
          />
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 z-20 pointer-events-none">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white text-3xl font-montserrat font-black drop-shadow-xl">
                  {heroProfile.name}
                </span>
                {calculateAge(heroProfile.dob) > 0 && (
                  <span className="bg-white/10 backdrop-blur-xl text-white/80 px-3 py-1 rounded-xl text-xl font-black border border-white/10">
                    {calculateAge(heroProfile.dob)}
                  </span>
                )}
              </div>
              {heroProfile.city && (
                <div className="flex items-center gap-1.5 text-white/50 text-xs font-bold">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  {heroProfile.city}
                </div>
              )}
            </div>
          </div>

          {/* Dot indicators */}
          {heroProfiles.length > 1 && (
            <div className="absolute top-4 right-5 flex gap-1.5 z-10">
              {heroProfiles.map((_, i) => (
                <button key={i} onClick={() => setHeroIndex(i)}
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
            <span className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em]">Online ora</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {heroProfiles.map((p, i) => (
              <Link key={p.id} to={`/profile-detail/${p.id}`} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-rose-500 p-0.5 bg-gradient-to-br from-rose-500 to-purple-600 shadow-lg shadow-rose-500/30">
                  <img src={p.photos?.[0] || p.photo_url || `https://picsum.photos/seed/${p.name}/200`} className="w-full h-full object-cover rounded-full" />
                </div>
                <span className="text-white/60 text-[9px] font-bold truncate w-16 text-center">{p.name}</span>
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
              <span className="text-white/40 text-[9px] font-bold">Filtri</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CITY CHIPS ── */}
      <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {cityOptions.slice(0, 10).map(c => (
          <button key={c} onClick={() => setFilterCity(c)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all shrink-0 backdrop-blur-sm",
              filterCity === c
                ? "bg-rose-600/90 text-white shadow-lg shadow-rose-600/30"
                : "bg-black/20 text-white/40 border border-white/8 hover:border-white/20 hover:text-white/60"
            )}>{c}</button>
        ))}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-8 h-8 rounded-full bg-black/20 border border-white/8 backdrop-blur-sm flex items-center justify-center shrink-0 hover:border-white/20 transition-all"
        >
          <Search className="w-3.5 h-3.5 text-white/40" />
        </button>
      </div>

      {/* Search input */}
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
                <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Genere Cercato</p>
                <div className="relative">
                  <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10" style={{ background: 'linear-gradient(to right, #0a0a0f, transparent)' }} />
                  <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10" style={{ background: 'linear-gradient(to left, #0a0a0f, transparent)' }} />
                  <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar px-2" style={{ scrollSnapType: 'x mandatory' }}>
                    {['Uomo', 'Donna', 'Non-binario', 'Transgender', 'Genderfluid', 'Queer'].map(g => {
                      const lower = g.toLowerCase();
                      const isA = selectedGenders.map(s => s.toLowerCase()).includes(lower);
                      return (
                        <button
                          key={g}
                          onClick={() => {
                            if (isA) setSelectedGenders(selectedGenders.filter(s => s.toLowerCase() !== lower));
                            else setSelectedGenders([...selectedGenders, g]);
                          }}
                          style={{
                            scrollSnapAlign: 'center', flexShrink: 0,
                            ...(isA ? { background: '#f43f5e', boxShadow: '0 0 15px rgba(244,63,94,0.4)', border: '1px solid rgba(244,63,94,0.6)' }
                              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', opacity: 0.6 })
                          }}
                          className={cn(
                            "px-5 py-2.5 rounded-[18px] text-[10px] font-black tracking-widest uppercase whitespace-nowrap transition-all",
                            isA ? "text-white scale-105" : "text-white/40"
                          )}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Età {filterAge[0]}–{filterAge[1]}</p>
                <div className="flex gap-3">
                  <input type="range" min="18" max="99" value={filterAge[0]} onChange={e => setFilterAge([+e.target.value, filterAge[1]])} className="flex-1 accent-rose-600" />
                  <input type="range" min="18" max="99" value={filterAge[1]} onChange={e => setFilterAge([filterAge[0], +e.target.value])} className="flex-1 accent-rose-600" />
                </div>
              </div>
              <button
                onClick={() => { setFilterCity('Tutte'); setFilterAge([18, 99]); setFilterBodyType('Tutte'); setSelectedGenders(['uomo', 'donna', 'non-binario', 'transgender']); setShowAdvanced(false); }}
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
              onClick={() => { setFilterCity('Tutte'); setFilterAge([18, 99]); setFilterBodyType('Tutte'); setShowAdvanced(false); }}
              className="text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white px-6 py-2.5 rounded-full shadow-lg shadow-rose-700/30 mt-4"
            >Azzera filtri</button>
          </div>
        ) : (
          /* Asymmetric masonry grid */
          <div className="columns-2 gap-2.5 space-y-0">
            {filteredProfiles.map((profile, idx) => {
              // Alternate tall/short for masonry feel
              const isTall = idx % 5 === 0 || idx % 5 === 3;
              return (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(244,63,94,0.35), 0 0 50px rgba(244,63,94,0.18), 0 0 90px rgba(147,51,234,0.1)' }}
                  whileTap={{ scale: 0.97, boxShadow: '0 0 30px rgba(244,63,94,0.5), 0 0 70px rgba(244,63,94,0.25)' }}
                  transition={{ delay: idx * 0.035, duration: 0.5, ease: 'easeOut' }}
                  className="break-inside-avoid mb-2.5 relative group"
                  style={{ transformOrigin: 'center center' }}
                >
                  <Link to={`/profile-detail/${profile.id}`}>
                    <div
                      className="rounded-[22px] overflow-hidden relative transition-shadow duration-300"
                      style={{ aspectRatio: isTall ? '3/5' : '3/4', background: '#1a1a22', boxShadow: '0 4px 32px rgba(0,0,0,0.5)' }}
                    >
                      <img
                        src={profile.photos?.[0] || profile.photo_url || `https://picsum.photos/seed/${profile.name}/400/500`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onContextMenu={e => e.preventDefault()}
                      />
                      {/* Dark vignette */}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }} />

                      {/* Online indicator */}
                      {profile.is_online && (
                        <div className="absolute top-2.5 left-2.5 z-20">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-black/40" />
                          </span>
                        </div>
                      )}


                      {/* Match Score Badge */}
                      {currentUser && unlockedIds.includes(profile.id) && (
                        <div className="absolute top-0 left-0 z-20 pointer-events-none overflow-hidden rounded-tl-[22px]">
                          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" className="w-[70px] h-[70px]">
                            <path d="M 0 0 L 100 0 Q 15 15 0 100 Z" fill="#e11d48" />
                          </svg>
                          <div className="absolute top-3 left-3">
                            <span className="text-[18px] font-black text-white leading-none drop-shadow">{calculateMatchScore(currentUser, profile)}%</span>
                          </div>
                        </div>
                      )}

                      {/* Info */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-[13px] font-montserrat font-black leading-tight truncate">
                          {profile.name}{profile.dob && calculateAge(profile.dob) > 0 ? `, ${calculateAge(profile.dob)}` : ''}
                        </p>
                        {profile.city && (
                          <p className="text-white/50 text-[9px] font-bold flex items-center gap-0.5 mt-0.5 truncate">
                            <MapPin className="w-2 h-2 text-rose-500 shrink-0" />{profile.city}
                          </p>
                        )}
                      </div>

                      {/* Neon glow border on hover/active - intense with outer back-glow */}
                      <div className="absolute inset-0 rounded-[22px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-200 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px rgba(244,63,94,0.95), 0 0 40px rgba(244,63,94,0.6), 0 0 80px rgba(244,63,94,0.25), 0 0 120px rgba(147,51,234,0.15)' }} />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
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

      {showSoulMatchConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
          <SoulMatchConfirmBanner onConfirm={confirmSoulMatch} />
        </div>
      )}

      {/* ── SOULMATCH OVERLAY ── */}
      <AnimatePresence>
        {showSoulMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-stone-50"
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

// ── Feed Page ──
// ── SoulMatch Page ──────────────────────────────────────────────────────
const SoulMatchPage = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<string[]>([]); // Friend IDs
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<'global' | 'friends'>('global');
  const [searchQuery, setSearchQuery] = useState('');

  // 1:1 Match State
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [feelingSent, setFeelingSent] = useState(false);

  // Top 10 Discovery State
  const [showRankings, setShowRankings] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('soulmatch_unlocked_ids');
    if (saved) setUnlockedIds(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const handleReset = () => setTargetUser(null);
    window.addEventListener('reset-soulmatch', handleReset);
    return () => window.removeEventListener('reset-soulmatch', handleReset);
  }, []);

  const unlockId = (id: string) => {
    const next = [...new Set([...unlockedIds, id])];
    setUnlockedIds(next);
    localStorage.setItem('soulmatch_unlocked_ids', JSON.stringify(next));
  };

  const navigate = useNavigate();

  const fetchProfiles = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) {
      setProfiles(data.map(u => normalizeUser(u)));
    }
  };

  const fetchFriends = async (userId: string) => {
    const { data } = await supabase
      .from('soul_links')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (data) {
      const ids = data.map(sl => sl.sender_id === userId ? sl.receiver_id : sl.sender_id);
      setFriends(ids);
    }
  };

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        const u = normalizeUser(JSON.parse(saved));
        setCurrentUser(u);
        await Promise.all([fetchProfiles(), fetchFriends(u.id)]);
      } else {
        navigate('/register');
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const genderFilter = (p: UserProfile) => {
    if (!currentUser) return false;
    const wantsV = (currentUser.looking_for_gender || []).map(g => g.toLowerCase());
    const isWildcard = (arr: string[]) => arr.some(v => ['tutti', 'tutte', 'entrambi', 'qualsiasi', 'tutti i generi'].includes(v));
    const targetGender = p.gender?.toLowerCase() || '';
    return wantsV.length === 0 || isWildcard(wantsV) || wantsV.includes(targetGender);
  };

  const currentList = profiles.filter(p => {
    if (p.id === currentUser?.id) return false;
    if (!p.photos?.length && !p.photo_url) return false;
    if (mode === 'friends' && !friends.includes(p.id)) return false;
    if (!genderFilter(p)) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const ranked = [...currentList]
    .map(p => ({ ...p, _score: calculateMatchScore(currentUser, p) }))
    .sort((a, b) => b._score - a._score);

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
      // Unlock all current results
      const allIds = currentList.map(p => p.id);
      const next = [...new Set([...unlockedIds, ...allIds])];
      setUnlockedIds(next);
      localStorage.setItem('soulmatch_unlocked_ids', JSON.stringify(next));
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
          { left: '3%', size: 9, color: '#f43f5e', blur: 3, dur: 11, delay: 0 },
          { left: '18%', size: 6, color: '#a855f7', blur: 4, dur: 8, delay: 1.8 },
          { left: '37%', size: 14, color: '#ec4899', blur: 5, dur: 13, delay: 0.6 },
          { left: '57%', size: 8, color: '#f43f5e', blur: 2, dur: 10, delay: 2.2 },
          { left: '75%', size: 11, color: '#9333ea', blur: 4, dur: 12, delay: 0.9 },
          { left: '91%', size: 7, color: '#fb7185', blur: 3, dur: 9, delay: 3 },
        ].map((h, i) => (
          <div key={i} className="fhsm" style={{ left: h.left, '--dur': `${h.dur}s`, '--delay': `${h.delay}s`, filter: `blur(${h.blur}px)`, opacity: 0.14 } as React.CSSProperties}>
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" /></svg>
          </div>
        ))}
      </div>
      <div className="max-w-md mx-auto space-y-6 relative z-10">

        {/* PREMIUM TABS */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center gap-3 pt-2"
        >
          {[
            { id: 'global', label: 'Globale', icon: Globe, count: profiles.length },
            { id: 'friends', label: 'SoulLinks', icon: Users, count: friends.length }
          ].map(tab => {
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setMode(tab.id as any); setTargetUser(null); setShowRankings(false); setSearchQuery(''); }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1.5 px-1 py-3.5 rounded-[28px] transition-all relative overflow-hidden",
                  isActive ? "text-white shadow-lg shadow-rose-500/30" : "text-white/30 hover:text-white/50"
                )}
                style={isActive ? { background: '#f43f5e', boxShadow: '0 0 22px rgba(244,63,94,0.55)' } : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <tab.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-stone-300")} />
                <div className="flex flex-col items-center">
                  <span className={cn("text-[8px] font-black uppercase tracking-wider leading-none text-center", isActive ? "text-white" : "text-stone-500")}>
                    {tab.label}
                  </span>
                  <span className={cn("text-[8px] font-black mt-1", isActive ? "text-white/40 tracking-wider" : "text-stone-400 tracking-wider")}>
                    {tab.count}
                  </span>
                </div>
              </button>
            );
          })}
        </motion.div>

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

                  {/* Match Score Badge (Permanent) - ONLY IF UNLOCKED */}
                  {currentUser && unlockedIds.includes(p.id) && (
                    <div className="absolute top-0 left-0 z-20 pointer-events-none drop-shadow-[0_4px_10px_rgba(225,29,72,0.4)] overflow-hidden rounded-tl-[32px]">
                      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[88px] h-[88px]">
                        <path d="M 0 0 L 100 0 Q 15 15 0 100 Z" fill="#e11d48" />
                      </svg>
                      <div className="absolute top-4 left-4 flex flex-col items-center justify-center">
                        <Heart className="w-8 h-8 text-white/30 fill-current absolute -top-1 -left-1 rotate-[-15deg] scale-125" />
                        <span className="text-[24px] font-black text-white relative z-10 leading-none drop-shadow-md">
                          {calculateMatchScore(currentUser, p)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {p.is_online && (
                    <div className="absolute top-4 right-4 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                  )}

                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <p className="font-montserrat font-black text-base truncate">{p.name}</p>
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-80 flex items-center gap-1.5 line-clamp-1">
                      <MapPin className="w-3 h-3 text-rose-500" /> {p.city}
                    </p>
                    <div className="mt-2 text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] italic">
                      {p.is_online ? 'Live Now' : 'Sync Profile'}
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

            {/* FLOATING HEART ANIMATION (RISING BALLOON) */}
            <AnimatePresence>
              {matchScore && !calculating && !feelingSent && (
                <motion.div
                  initial={{ top: "100vh", opacity: 0, x: 0 }}
                  animate={{ top: 120, opacity: 1, x: [0, 20, -20, 0] }}
                  exit={{ opacity: 0, scale: 2 }}
                  transition={{ top: { duration: 7, ease: "linear" }, opacity: { duration: 1 }, x: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
                  className="fixed right-32 z-[100] cursor-pointer"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await supabase.from('interactions').insert({
                      from_user_id: currentUser?.id,
                      to_user_id: targetUser.id,
                      type: 'heart',
                      metadata: { match_score: matchScore, source: 'soulmatch_floating' }
                    });
                    setFeelingSent(true);
                    alert(`✨ Soul Feeling inviato a ${targetUser.name}!`);
                  }}
                >
                  <div className="relative flex items-center justify-center group">
                    {/* 8 companion hearts orbiting */}
                    {[
                      { x: [-15, 15, -15], y: [0, -22, 0], w: 5, color: '#fb7185', op: 0.65, dur: 4.0, delay: 0 },
                      { x: [0, -18, 18, 0], y: [0, 26, -26, 0], w: 4, color: '#f43f5e', op: 0.50, dur: 5.2, delay: 0.5 },
                      { x: [0, -10, 10, 0], y: [0, 32, -32, 0], w: 6, color: '#fda4af', op: 0.40, dur: 3.2, delay: 1.0 },
                      { x: [0, 16, -16, 0], y: [-8, 20, -8, -8], w: 3, color: '#f43f5e', op: 0.70, dur: 6.0, delay: 0.2 },
                      { x: [-20, 20, -20], y: [0, -32, 0], w: 5, color: '#e879a0', op: 0.60, dur: 4.5, delay: 0.8 },
                      { x: [0, -12, 12, 0], y: [-12, 22, -12, -12], w: 7, color: '#fda4af', op: 0.30, dur: 2.6, delay: 1.3 },
                      { x: [0, 10, -10, 0], y: [0, 18, -18, 0], w: 4, color: '#f43f5e', op: 0.55, dur: 5.8, delay: 0.4 },
                      { x: [-10, 10, -10], y: [0, 28, -28, 0], w: 3, color: '#fb7185', op: 0.45, dur: 3.8, delay: 0.9 },
                    ].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ x: h.x, y: h.y }}
                        transition={{ duration: h.dur, repeat: Infinity, ease: 'easeInOut', delay: h.delay }}
                        className="absolute pointer-events-none"
                        style={{
                          top: `${20 + (i % 4) * 18}%`,
                          left: `${10 + (i % 5) * 18}%`,
                          opacity: h.op,
                          filter: `drop-shadow(0 0 4px ${h.color})`
                        }}
                      >
                        <Heart className={`w-${h.w} h-${h.w} fill-current`} style={{ color: h.color }} />
                      </motion.div>
                    ))}
                    <Heart className="w-20 h-20 text-rose-400 fill-current drop-shadow-[0_10px_40px_rgba(251,113,133,0.6)] group-hover:scale-110 transition-transform" />
                    <Send className="absolute w-7 h-7 text-white rotate-[-25deg] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
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
    };
    fetchData();

    // Compatibilità online: prendiamo da Supabase
    const fetchGlobalBanner = async () => {
      try {
        const { data } = await supabase.from('banner_messages').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) setBannerMessages(data);
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

  const heroProfiles = profiles.slice(0, Math.min(5, profiles.length));
  useEffect(() => {
    if (heroProfiles.length < 2) return;
    const timer = setInterval(() => setHeroIndex(i => (i + 1) % heroProfiles.length), 4000);
    return () => clearInterval(timer);
  }, [heroProfiles.length]);

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
          { left: '6%', size: 12, color: '#f43f5e', blur: 3, fdur: 13, fdelay: 0, fdx: '25px', fr: '18deg', fs: 1.1 },
          { left: '19%', size: 7, color: '#fb7185', blur: 4, fdur: 10, fdelay: 2, fdx: '-18px', fr: '-12deg', fs: 0.9 },
          { left: '33%', size: 18, color: '#9333ea', blur: 5, fdur: 16, fdelay: 1, fdx: '14px', fr: '8deg', fs: 1.2 },
          { left: '47%', size: 9, color: '#f43f5e', blur: 2, fdur: 12, fdelay: 3, fdx: '-30px', fr: '22deg', fs: 1.0 },
          { left: '61%', size: 15, color: '#ec4899', blur: 3, fdur: 14, fdelay: 0.5, fdx: '18px', fr: '-18deg', fs: 1.1 },
          { left: '74%', size: 6, color: '#a855f7', blur: 4, fdur: 11, fdelay: 2.5, fdx: '-8px', fr: '28deg', fs: 0.8 },
          { left: '86%', size: 20, color: '#f43f5e', blur: 5, fdur: 17, fdelay: 1.5, fdx: '22px', fr: '-8deg', fs: 1.0 },
          { left: '25%', size: 10, color: '#ec4899', blur: 6, fdur: 15, fdelay: 4, fdx: '8px', fr: '-22deg', fs: 1.2 },
          { left: '53%', size: 8, color: '#9333ea', blur: 3, fdur: 9, fdelay: 5.5, fdx: '-22px', fr: '18deg', fs: 0.7 },
          { left: '91%', size: 11, color: '#f43f5e', blur: 4, fdur: 12, fdelay: 2.8, fdx: '-27px', fr: '-14deg', fs: 1.1 },
        ].map((h, i) => (
          <div key={i} className="fhf" style={{ left: h.left, '--fdur': `${h.fdur}s`, '--fdelay': `${h.fdelay}s`, '--fdx': h.fdx, '--fr': h.fr, '--fs': h.fs, filter: `blur(${h.blur}px)`, opacity: 0.16 } as React.CSSProperties}>
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}>
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
            </svg>
          </div>
        ))}
      </div>

      {/* ── HERO SLIDER ── */}
      {!loading && heroProfile && (
        <div className="relative w-full h-[65vh] min-h-[380px] overflow-hidden mt-20">
          <AnimatePresence mode="sync">
            <motion.img
              key={heroProfile.id}
              src={(heroProfile.photos?.[0]) || heroProfile.photo_url || `https://picsum.photos/seed/${heroProfile.name}/600/800`}
              initial={{ opacity: 0, scale: 1.07 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          </AnimatePresence>
          {/* Cinematic fade matching Bacheca */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0a0a0f 0%, #0a0a0f 5%, rgba(10,10,15,0.85) 35%, rgba(0,0,0,0.3) 65%, transparent 100%)' }} />

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 flex items-end justify-between z-10">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white text-3xl font-montserrat font-black drop-shadow-xl">
                  {heroProfile.name}
                </span>
                {calculateAge(heroProfile.dob) > 0 && (
                  <span className="bg-white/10 backdrop-blur-xl text-white/80 px-3 py-1 rounded-xl text-xl font-black border border-white/10">
                    {calculateAge(heroProfile.dob)}
                  </span>
                )}
              </div>
              {heroProfile.city && (
                <div className="flex items-center gap-1.5 text-white/50 text-xs font-bold">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  {heroProfile.city}
                </div>
              )}
            </div>
            <Link
              to={`/profile-detail/${heroProfile.id}`}
              className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #f43f5e, #9333ea)', boxShadow: '0 8px 24px rgba(244,63,94,0.4)' }}
            >
              Visita
            </Link>
          </div>

          {heroProfiles.length > 1 && (
            <div className="absolute top-4 right-5 flex gap-1.5 z-10">
              {heroProfiles.map((_, i) => (
                <button key={i} onClick={() => setHeroIndex(i)}
                  className={cn('h-1 rounded-full transition-all duration-300', i === heroIndex ? 'bg-white w-6' : 'bg-white/25 w-1.5')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FEED POSTS ── */}
      <div className="px-4 relative z-10">
        {currentUser?.id && <FeedComponent userId={null} isOwner={false} global={true} />}
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
  const [friendsPosts, setFriendsPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'amici' | 'richieste'>('feed');
  const [messagingFriend, setMessagingFriend] = useState<UserProfile | null>(null);
  const [quickMsgText, setQuickMsgText] = useState('');
  const [isSendingQuickMsg, setIsSendingQuickMsg] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SoulLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [friendMessages, setFriendMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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
        fetchAllLastMessages();
      } else {
        navigate('/register');
      }
    } catch (e) {
      navigate('/register');
    }

    // Realtime subscription for SoulLinks
    if (currentUser?.id) {
      const channel = supabase
        .channel('soul-links-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'soul_links',
            filter: `receiver_id=eq.${currentUser.id}`
          },
          () => fetchSoulLinks(currentUser.id)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'soul_links',
            filter: `sender_id=eq.${currentUser.id}`
          },
          () => fetchSoulLinks(currentUser.id)
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [currentUser?.id, navigate]);

  const handleAccept = async (slId: string) => {
    const { error } = await supabase
      .from('soul_links')
      .update({ status: 'accepted' })
      .eq('id', slId);

    if (!error) {
      setToast({ message: '🎉 Richiesta accettata! Siete ora amici.', type: 'success' });
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
      {/* Floating hearts background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`.fha{animation:floatHeart var(--dur,12s) ease-in-out var(--delay,0s) infinite;position:absolute;bottom:-10%}`}</style>
        <style>{`
          @keyframes floatHeart {
            0%   { transform: translateY(0) translateX(0) rotate(0deg) scale(1); opacity: 0; }
            10%  { opacity: 1; }
            80%  { opacity: 0.5; }
            100% { transform: translateY(-110vh) rotate(15deg); opacity: 0; }
          }
          .fha { animation: floatHeart var(--dur,12s) ease-in-out var(--delay,0s) infinite; position: absolute; bottom: -10%; }
          @keyframes balloonHeart {
            0%   { transform: translateY(0px) rotate(-6deg) scale(1); opacity: 0; }
            8%   { opacity: 0.9; }
            75%  { opacity: 0.7; }
            100% { transform: translateY(-90px) rotate(8deg) scale(0.85); opacity: 0; }
          }
          .bha { animation: balloonHeart var(--bdur,5s) ease-in-out var(--bdelay,0s) infinite; position: absolute; bottom: 0px; pointer-events: none; z-index: 100; }
        `}</style>
        {[
          { left: '5%', size: 10, color: '#f43f5e', blur: 3, dur: 13, delay: 0 },
          { left: '18%', size: 7, color: '#a855f7', blur: 4, dur: 10, delay: 2 },
          { left: '33%', size: 16, color: '#ec4899', blur: 5, dur: 15, delay: 1 },
          { left: '50%', size: 8, color: '#f43f5e', blur: 2, dur: 11, delay: 3 },
          { left: '67%', size: 14, color: '#9333ea', blur: 4, dur: 14, delay: 0.5 },
          { left: '82%', size: 11, color: '#fb7185', blur: 3, dur: 12, delay: 2.5 },
          { left: '93%', size: 6, color: '#f43f5e', blur: 3, dur: 9, delay: 4 },
          { left: '25%', size: 13, color: '#ec4899', blur: 5, dur: 16, delay: 1.5 },
        ].map((h, i) => (
          <div key={i} className="fha" style={{ left: h.left, '--dur': `${h.dur}s`, '--delay': `${h.delay}s`, filter: `blur(${h.blur}px)`, opacity: 0.16 } as React.CSSProperties}>
            <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" /></svg>
          </div>
        ))}
      </div>
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
            {/* Notification Hearts */}
            {allLastMessages.some(m => m.receiver_id === currentUser?.id && !readChatIds.has(m.sender_id)) && [
              { left: 10, size: 14, color: '#f43f5e', dur: 4.2, delay: 0 },
              { left: 30, size: 10, color: '#fb7185', dur: 3.8, delay: 0.7 },
              { left: 50, size: 16, color: '#f43f5e', dur: 4.8, delay: 0.3 },
              { left: 70, size: 12, color: '#fda4af', dur: 3.6, delay: 1.1 },
              { left: 90, size: 10, color: '#f43f5e', dur: 4.4, delay: 0.5 },
            ].map((h, i) => (
              <div
                key={i}
                className="bha"
                style={{
                  left: `${h.left}%`,
                  '--bdur': `${h.dur}s`,
                  '--bdelay': `${h.delay}s`,
                  filter: `drop-shadow(0 0 6px ${h.color})`,
                } as React.CSSProperties}
              >
                <svg width={h.size} height={h.size} viewBox="0 0 24 24" fill={h.color}>
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                </svg>
              </div>
            ))}

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

        {/* ── NOTIFICATIONS / REQUESTS BOX ── */}
        {pendingIn.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <h2 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Richieste in attesa · {pendingIn.length}</h2>
            </div>

            <div className="rounded-[28px] p-2 space-y-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <AnimatePresence mode="popLayout">
                {pendingIn.map((req) => (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="rounded-[22px] p-3 flex items-center gap-3"
                    style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}
                  >
                    <ProfileAvatar
                      user={req.other_user}
                      className="w-12 h-12 rounded-full shrink-0"
                      iconSize="w-6 h-6"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-white truncate">{req.other_user?.name}</h4>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-tight">{req.other_user?.city || 'SoulMatch'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(req.id)}
                        className="w-10 h-10 text-white rounded-full flex items-center justify-center active:scale-90 transition-all"
                        style={{ background: 'rgba(16,185,129,0.9)', boxShadow: '0 0 16px rgba(16,185,129,0.5)' }}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="w-10 h-10 text-white/50 rounded-full flex items-center justify-center hover:text-rose-400 transition-all active:scale-90"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
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
                .map((f, i) => (
                  <motion.div
                    key={`container-${f.id}`}
                    layout
                    initial={{ opacity: 0, x: -32 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ delay: i * 0.07, type: 'spring', stiffness: 220, damping: 24 }}
                    className="relative overflow-hidden rounded-[24px]"
                    style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
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
                      className="group relative p-4 flex items-center gap-4 transition-all z-10"
                      style={{ background: '#1a1a22', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div className="relative shrink-0">
                        <ProfileAvatar
                          user={f.other_user}
                          className="w-14 h-14 rounded-full shrink-0"
                          iconSize="w-6 h-6"
                        />
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 rounded-full",
                          f.other_user?.is_online
                            ? "bg-emerald-400"
                            : "bg-white/10"
                        )}
                          style={f.other_user?.is_online ? { borderColor: '#1a1a22', boxShadow: '0 0 8px rgba(52,211,153,0.8)' } : { borderColor: '#1a1a22' }}
                        />
                      </div>

                      <div
                        onClick={() => navigate(`/profile-detail/${f.other_user?.id}`)}
                        className="flex-1 min-w-0 pr-2 cursor-pointer"
                      >
                        <h3 className="text-[15px] font-black text-white truncate">{f.other_user?.name}</h3>
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
                        {/* LiveChat */}
                        <button
                          onClick={() => {
                            if (f.other_user?.is_online) {
                              navigate(`/live-chat/${f.other_user?.id}`);
                            } else {
                              setToast({ message: `${f.other_user?.name} è offline!`, type: 'info' });
                            }
                          }}
                          className="w-9 h-9 text-white rounded-2xl flex items-center justify-center active:scale-90 transition-all"
                          style={f.other_user?.is_online
                            ? { background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)', boxShadow: '0 0 12px rgba(52,211,153,0.3)' }
                            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                          title="Chat Live"
                        >
                          <MessageCircle className={cn("w-4 h-4", f.other_user?.is_online ? "text-emerald-400" : "text-white/30")} />
                        </button>
                        {/* Messaggio privato */}
                        {(() => {
                          const hasUnread = allLastMessages.some(m => m.sender_id === f.other_user?.id && m.receiver_id === currentUser?.id && !readChatIds.has(f.other_user?.id!));
                          return (
                            <button
                              onClick={() => setMessagingFriend(normalizeUser(f.other_user!))}
                              className={cn(
                                "w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                                hasUnread ? "text-white" : "text-white/40 hover:text-white/70"
                              )}
                              style={hasUnread
                                ? { background: '#f43f5e', border: '1px solid rgba(244,63,94,0.5)', boxShadow: '0 0 14px rgba(244,63,94,0.5)' }
                                : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                              title="Messaggi"
                            >
                              <Send className={cn("w-3.5 h-3.5", hasUnread ? "animate-pulse" : "")} />
                            </button>
                          );
                        })()}
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
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
  const [loadingData, setLoadingData] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [docSubTab, setDocSubTab] = useState<'pending' | 'archive'>('pending');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);

  // Dashboard Stats
  const stats = useMemo(() => {
    return {
      total: users.length,
      verified: users.filter(u => u.is_validated).length,
      premium: users.filter(u => u.is_paid).length,
      suspended: users.filter(u => u.is_suspended || u.is_blocked).length,
      pendingDocs: users.filter(u => u.id_document_url && !u.is_validated && !u.doc_rejected).length,
    };
  }, [users]);

  // Modals / Specific UI
  const [activeTab, setActiveTab] = useState<'dashboard' | 'utenti' | 'documenti' | 'segnalazioni' | 'pagamenti' | 'impostazioni'>('dashboard');

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
      // 1. Prova a caricare da Supabase
      const { data: sbData, error: sbError } = await supabase.from('users').select('*').order('created_at', { ascending: false });

      // 2. Prova a caricare dall'API locale
      let localData = [];
      try {
        const res = await fetch('/api/profiles');
        if (res.ok) {
          const rawLocal = await res.json();
          if (Array.isArray(rawLocal)) {
            localData = rawLocal.map((u: any) => ({
              ...u,
              photo_url: u.photo_url || (u.photos && u.photos[0]) || null,
              created_at: u.created_at || new Date().toISOString()
            }));
          }
        }
      } catch (err) { console.log("Local API not available"); }

      // 3. Unione
      const combined = [...(sbData || [])];
      localData.forEach((lu: any) => {
        if (!combined.find(cu => cu.id === lu.id)) {
          combined.push(lu);
        }
      });

      setUsers(combined);
      if (sbError && combined.length === 0) {
        setToast({ message: "Sincronizzazione Supabase limitata. Uso dati locali.", type: 'info' });
      }
    } catch (e) {
      setToast({ message: "Errore caricamento dati.", type: 'error' });
    }
    setLoadingData(false);
  };

  const fetchSliderImages = async () => {
    try {
      const res = await fetch('/api/settings/home_slider');
      if (res.ok) setSliderImages(await res.json());
    } catch (e) { }
  };

  const handleUpdateSlider = async (newImages: string[]) => {
    try {
      const res = await fetch('/api/settings/home_slider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newImages })
      });
      if (res.ok) {
        setSliderImages(newImages);
        setToast({ message: "Slider aggiornato!", type: 'success' });
      }
    } catch (e) {
      setToast({ message: "Errore aggiornamento.", type: 'error' });
    }
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
        setToast({ message: !isBlocked ? "Utente bloccato." : "Utente sbloccato.", type: 'success' });
        fetchUsers();
      }
    } catch (e) { setToast({ message: "Errore.", type: 'error' }); }
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0C0A09] flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
                <h1 className="text-3xl font-serif font-black text-white tracking-tighter">SoulMatch</h1>
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
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-stone-900 text-white flex flex-col sticky top-0 md:h-screen z-50 shadow-2xl">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-900/40">
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-serif font-black tracking-tight leading-none text-white">SoulMatch</span>
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">Admin Dashboard</span>
            </div>
          </div>

          <nav className="space-y-1.5 ">
            {([
              { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
              { key: 'utenti', label: 'Utenti Iscritti', icon: Users },
              { key: 'documenti', label: 'Validazione ID', icon: ShieldCheck, badge: stats.pendingDocs },
              { key: 'segnalazioni', label: 'Segnalazioni', icon: AlertTriangle },
              { key: 'pagamenti', label: 'Abbonamenti', icon: CreditCard },
              { key: 'impostazioni', label: 'Slider Home', icon: ImageIcon },
            ] as Array<{ key: string, label: string, icon: any, badge?: number }>).map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all border border-transparent",
                  activeTab === key
                    ? "bg-white/10 text-white border-white/5 shadow-inner"
                    : "text-stone-400 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4", activeTab === key ? "text-rose-500" : "text-stone-500")} />
                  {label}
                </div>
                {'badge' in { badge } && (badge as number) > 0 && <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full ring-2 ring-stone-900">{badge as number}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5 bg-stone-950/20">
          <button
            onClick={() => setIsAuthenticated(false)}
            className="w-full flex items-center justify-center gap-3 bg-stone-800/50 hover:bg-rose-950/30 text-stone-400 hover:text-rose-500 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-white/5"
          >
            <LogOut className="w-4 h-4" /> Disconnetti
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-40">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-2xl font-serif font-black text-stone-900 capitalize leading-none">{activeTab.replace('_', ' ')}</h2>
            </div>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">SoulMatch Back-office v2.0</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-600 hover:text-rose-600 hover:bg-rose-50 transition-all font-bold text-xs shadow-sm"
              title="Sincronizza Dati"
            >
              <RefreshCw className={cn("w-4 h-4", loadingData ? "animate-spin" : "")} />
              <span className="hidden sm:inline">Aggiorna</span>
            </button>

            <div className="h-10 w-[1px] bg-stone-200 mx-1 hidden sm:block" />

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-stone-900 leading-none">Super Admin</p>
                <p className="text-[9px] text-stone-400 font-bold mt-1 uppercase tracking-tighter">Accesso root attivo</p>
              </div>
              <div className="w-11 h-11 bg-stone-900 rounded-2xl flex items-center justify-center text-white font-black text-xs border border-white shadow-xl rotate-3">AD</div>
            </div>
          </div>
        </header>

        <div className="p-8 pb-20 overflow-y-auto">
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
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Utenti Iscritti', val: stats.total, sub: 'In crescita dell\'8%', icon: Users, color: 'stone' },
                      { label: 'Verificati', val: stats.verified, sub: 'Badge assegnati', icon: ShieldCheck, color: 'emerald' },
                      { label: 'VIP accounts', val: stats.premium, sub: 'Entrate attive', icon: Sparkles, color: 'amber' },
                      { label: 'In Attesa ID', val: stats.pendingDocs, sub: 'Richieste urgenti', icon: Bell, color: 'rose' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white border border-stone-100 p-8 rounded-[40px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                        <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full translate-x-12 -translate-y-12 opacity-10 transition-opacity group-hover:opacity-20",
                          s.color === 'rose' ? 'bg-rose-500' :
                            s.color === 'emerald' ? 'bg-emerald-500' :
                              s.color === 'amber' ? 'bg-amber-500' : 'bg-stone-500'
                        )} />

                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
                          s.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                            s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                              s.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-stone-50 text-stone-600'
                        )}>
                          <s.icon className="w-6 h-6" />
                        </div>
                        <p className="text-4xl font-black text-stone-900 leading-none tracking-tighter">{s.val}</p>
                        <p className="text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] mt-4 ml-1">{s.label}</p>
                        <p className="text-[10px] text-stone-400 mt-2 ml-1 flex items-center gap-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full", s.color === 'emerald' ? 'bg-emerald-500' : 'bg-stone-300')} />
                          {s.sub}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Recent Users Table */}
                  <div className="bg-white border border-stone-100 rounded-[48px] overflow-hidden shadow-sm">
                    <div className="px-10 py-8 border-b border-stone-50 flex items-center justify-between bg-stone-50/30">
                      <div>
                        <h4 className="text-xl font-serif font-black text-stone-900">Ultimi Iscritti</h4>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Sincronizzazione real-time Supabase</p>
                      </div>
                      <button onClick={() => setActiveTab('utenti')} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/10 transition-all active:scale-95">Vedi Tabella Completa</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-white border-b border-stone-50">
                            <th className="px-10 py-5 text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Profilo Utente</th>
                            <th className="px-10 py-5 text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Località</th>
                            <th className="px-10 py-5 text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Privilegi</th>
                            <th className="px-10 py-5 text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Registrazione</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-10 py-20 text-center">
                                <Users className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                                <p className="text-stone-400 font-medium">Nessun utente trovato nel database.</p>
                                <button onClick={fetchUsers} className="mt-4 text-rose-600 font-black text-xs uppercase tracking-widest hover:underline">Riprova Sincronizzazione</button>
                              </td>
                            </tr>
                          ) : users.slice(0, 6).map((u: any) => (
                            <tr key={u.id} className="hover:bg-stone-50/50 transition-all group">
                              <td className="px-10 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-stone-100 overflow-hidden ring-4 ring-white shadow-md group-hover:scale-110 transition-transform">
                                    <img src={u.photo_url || `https://ui-avatars.com/api/?name=${u.name}+${u.surname}&background=F5F5F4&color=78716C&bold=true`} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-stone-900 leading-tight">{u.name} {u.surname}</p>
                                    <p className="text-[10px] text-stone-400 font-medium mt-0.5">{u.email || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-10 py-5">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3 text-rose-400" />
                                  <span className="text-xs font-bold text-stone-600">{u.city || 'Non specificata'}</span>
                                </div>
                              </td>
                              <td className="px-10 py-5">
                                <div className="flex gap-2">
                                  {u.is_paid ?
                                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-full border border-amber-100 shadow-sm uppercase tracking-tighter">VIP</span> :
                                    <span className="px-3 py-1 bg-stone-50 text-stone-400 text-[9px] font-black rounded-full border border-stone-100 uppercase tracking-tighter">Base</span>
                                  }
                                  {u.is_validated ?
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full border border-emerald-100 shadow-sm uppercase tracking-tighter">Verificato</span> :
                                    <span className="px-3 py-1 bg-stone-50 text-stone-300 text-[9px] font-black rounded-full border border-stone-100 uppercase tracking-tighter">Pending</span>
                                  }
                                </div>
                              </td>
                              <td className="px-10 py-5">
                                <span className="text-[10px] text-stone-400 font-bold">{u.created_at ? new Date(u.created_at).toLocaleDateString('it-IT') : '—'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
                                  <div className="shrink-0 flex flex-col items-end gap-2">
                                    {u.is_validated ? (
                                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black border border-emerald-100">
                                        <CheckCircle className="w-3.5 h-3.5" /> Approvato
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-[11px] font-black border border-rose-100">
                                        <XCircle className="w-3.5 h-3.5" /> Respinto
                                      </span>
                                    )}
                                    {/* Block toggle for rejected users */}
                                    {u.doc_rejected && (
                                      <button
                                        onClick={() => handleBlockUserToggle(u.id, u.is_blocked)}
                                        className={cn(
                                          "flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black border transition-all active:scale-95",
                                          u.is_blocked
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                            : "bg-stone-900 text-white border-stone-900 hover:bg-stone-700"
                                        )}
                                      >
                                        {u.is_blocked
                                          ? <><UserCheck className="w-3 h-3" /> Sblocca</>
                                          : <><AlertTriangle className="w-3 h-3" /> Blocca</>}
                                      </button>
                                    )}
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
                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                  <h3 className="text-2xl font-black mb-6">Gestione Segnalazioni</h3>
                  <div className="flex flex-col items-center justify-center py-24 text-stone-400">
                    <AlertTriangle className="w-16 h-16 mb-4 opacity-50" />
                    <p className="font-medium text-lg">Al momento la lista delle segnalazioni è vuota.</p>
                  </div>
                </div>
              )}

              {activeTab === 'pagamenti' && (
                <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black">Piano Premium - Stripe</h3>
                    <div className="px-4 py-2 bg-[#635BFF] text-white rounded-xl font-bold text-xs tracking-wide uppercase">Test Mode</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="border border-stone-100 bg-stone-50 p-6 rounded-2xl">
                      <p className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-widest">Utenti VIP</p>
                      <p className="text-4xl font-black text-stone-900">{users.filter((u: any) => u.is_paid).length}</p>
                    </div>
                    <div className="border border-stone-100 bg-stone-50 p-6 rounded-2xl">
                      <p className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-widest">MRR Stimato</p>
                      <p className="text-4xl font-black text-stone-900">€{(users.filter((u: any) => u.is_paid).length * 9.99).toFixed(2)}</p>
                    </div>
                    <div className="border border-stone-100 bg-emerald-50 p-6 rounded-2xl">
                      <p className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-widest">Status Webhook</p>
                      <p className="text-lg font-bold text-emerald-700 flex items-center gap-2 mt-2"><CheckCircle className="w-5 h-5" /> In Sincronia</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-4">Registro Transazioni</h4>
                    <div className="p-8 border-2 border-dashed border-stone-200 rounded-2xl text-center">
                      <p className="text-stone-500 text-sm font-medium">L'integrazione di Stripe con Supabase deve essere prima settata lato server. Appariranno qui non appena i webhook Stripe invieranno eventi di pagamento al DB.</p>
                      <button className="mt-4 px-6 py-2 bg-[#635BFF] text-white rounded-lg font-bold text-sm shadow-lg hover:bg-[#524BDB] transition-all">Apri Dashboard Stripe →</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'impostazioni' && (
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
                    {sliderImages.length === 0 && <p className="col-span-full py-8 text-stone-400 text-center border-2 border-dashed border-stone-200 rounded-2xl">Nessun URL caricato.</p>}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="URL immagine"
                      className="flex-1 p-3 rounded-xl bg-stone-50 border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button onClick={addImage} className="bg-stone-900 text-white px-6 py-3 rounded-xl font-black uppercase hover:bg-stone-800 transition-all">Aggiungi</button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

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

  useEffect(() => {
    const initData = async () => {
      try {
        const authenticatedUserRaw = localStorage.getItem('soulmatch_user');
        const savedDraft = localStorage.getItem('soulmatch_reg_draft');

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
        setToast({ message: "Bentornato! Il tuo account esiste ma il profilo non è completo. Per favora completa i dati mancanti.", type: 'info' });
        setIsLogin(false);
        setStep(2);
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
                    className="btn-primary w-full py-4 text-sm mt-2 font-black uppercase tracking-widest"
                  >
                    {isLogin ? 'Accedi' : 'Continua'}
                  </button>
                  <div className="mt-4 flex justify-center">
                    <button type="button" onClick={() => handleOAuthLogin('google')} className="flex items-center w-full justify-center gap-2 bg-white border border-stone-200 text-stone-700 py-4 rounded-xl font-black text-xs hover:border-stone-300 hover:bg-stone-50 transition-all transform active:scale-95 shadow-sm">
                      <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                      Continua con Google
                    </button>
                  </div>
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
                  <div className="grid grid-cols-2 gap-4">
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
                    <div /> {/* Spacer to keep it half width */}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5 w-full">
                      <label className="text-xs font-bold text-stone-700 ml-1">Città</label>
                      <select name="city" value={formData.city} onChange={handleInputChange} className="w-full p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-sm focus:ring-2 focus:ring-rose-500 outline-none appearance-none">
                        <option value="">Seleziona Città</option>
                        {ITALIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
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
                        <div key={i} className="aspect-square rounded-lg overflow-hidden relative group">
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
                          <UserPlus className="w-4 h-4" />
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
                      formData.id_document_url ? "border-emerald-200 bg-emerald-50" : "border-stone-200 hover:bg-stone-50"
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

const FeedComponent = ({ userId, isOwner, global = false }: { userId: any, isOwner?: boolean, global?: boolean }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [newPostDesc, setNewPostDesc] = useState('');
  const [newPostPhotos, setNewPostPhotos] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
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
        .select('*, user:users(name, photos, photo_url)')
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

    const viewer = localStorage.getItem('soulmatch_user') ? JSON.parse(localStorage.getItem('soulmatch_user')!) : null;
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
      const viewer = localStorage.getItem('soulmatch_user') ? JSON.parse(localStorage.getItem('soulmatch_user')!) : null;
      const viewerId = viewer?.id;

      let query = supabase
        .from('posts')
        .select(`
                    *,
                    user:users (name, photos, photo_url, gender, orientation),
                    post_interactions!post_interactions_post_id_fkey(type),
                    post_comments(id)
                    `)
        .order('created_at', { ascending: false });

      if (!global) {
        query = query.eq('user_id', userId);
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
    <div className="space-y-6">
      {isOwner && (
        <div className="flex items-center justify-end px-1">
          <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">durata 30 giorni</span>
        </div>
      )}

      {isOwner && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-[28px] flex flex-col gap-4 relative overflow-hidden"
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

          <div className="flex items-center justify-between border-t border-stone-50 pt-4 mt-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-[11px] text-white font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-lg shadow-rose-900/20"
                style={{ background: '#f43f5e', border: '1px solid rgba(255,255,255,0.1)' }}
              >
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

      {/* ── SEARCH BAR \u2500 sempre visibile ── */}
      {!isOwner && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(244,63,94,0.35)', boxShadow: '0 0 20px rgba(244,63,94,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: '#f43f5e', filter: 'drop-shadow(0 0 6px rgba(244,63,94,0.8))' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cerca nome o parole chiave..."
            className="flex-1 bg-transparent outline-none text-white text-sm font-bold placeholder:text-white/25"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}


      <div className="space-y-6">
        {(() => {
          const filtered = searchTerm.trim()
            ? posts.filter(p =>
              p.author_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.description?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : posts;
          return filtered.length === 0 ? (
            <div className="text-center py-16 rounded-[32px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                {searchTerm ? <Search className="w-8 h-8 text-white/15" /> : <ImageIcon className="w-8 h-8 text-white/15" />}
              </div>
              <p className="text-white/30 text-sm font-medium italic">
                {searchTerm ? `Nessun risultato per "${searchTerm}"` : 'Ancora nessun post da mostrare.'}
              </p>
            </div>
          ) : (
            filtered.map(post => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-[32px] overflow-hidden relative"
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

                    {/* Top-right: delete button */}
                    {isOwner && (
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
                    {isOwner && (
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

                    {/* Like */}
                    <button
                      onClick={() => toggleInteraction(post.id, 'like')}
                      className={cn("flex items-center gap-1.5 text-xs font-black transition-all active:scale-90", post.has_liked ? "text-blue-400" : "text-white/25 hover:text-blue-400")}
                    >
                      <div className={cn("w-8 h-8 rounded-2xl flex items-center justify-center transition-all", post.has_liked ? "bg-blue-500/20" : "bg-white/5")}>
                        <ThumbsUp className={cn("w-3.5 h-3.5", post.has_liked && "fill-current")} />
                      </div>
                      <span>{post.likes_count}</span>
                    </button>

                    {/* Heart */}
                    <button
                      onClick={() => toggleInteraction(post.id, 'heart')}
                      className={cn("flex items-center gap-1.5 text-xs font-black transition-all active:scale-90", post.has_hearted ? "text-rose-400" : "text-white/25 hover:text-rose-400")}
                    >
                      <div className={cn("w-8 h-8 rounded-2xl flex items-center justify-center transition-all", post.has_hearted ? "bg-rose-500/20" : "bg-white/5")}>
                        <Heart className={cn("w-3.5 h-3.5", post.has_hearted && "fill-current")} />
                      </div>
                      <span>{post.hearts_count}</span>
                    </button>

                    {/* Comments */}
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={cn("flex items-center gap-1.5 text-xs font-black transition-all active:scale-90", expandedComments.includes(post.id) ? "text-emerald-400" : "text-white/25 hover:text-emerald-400")}
                    >
                      <div className={cn("w-8 h-8 rounded-2xl flex items-center justify-center transition-all", expandedComments.includes(post.id) ? "bg-emerald-500/20" : "bg-white/5")}>
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <span>{(postComments[post.id]?.length) ?? post.comments_count ?? 0}</span>
                    </button>
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
                              <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 shrink-0">
                                <img src={c.user?.photos?.[0] || c.user?.photo_url || `https://picsum.photos/seed/${c.user_id}/100`} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <span className="text-[10px] font-black text-white/70">{c.user?.name} </span>
                                <span className="text-[11px] text-white/50">{c.text}</span>
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
                              className="flex-1 rounded-2xl px-3 py-2 text-xs outline-none text-white/80 placeholder:text-white/20"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                            <button
                              onClick={() => submitComment(post.id)}
                              disabled={!commentTexts[post.id]?.trim() || isPostingComment[post.id]}
                              className="w-9 h-9 rounded-2xl flex items-center justify-center disabled:opacity-30 transition-all active:scale-95"
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
            ))
          );
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
      const saved = localStorage.getItem('soulmatch_user');
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
        localStorage.setItem('soulmatch_user', JSON.stringify(normalizedUpdated));
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

      localStorage.setItem('soulmatch_user', JSON.stringify(normalizeUser(data)));
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

            <EPSelectGroup
              label="Statura Partner"
              options={['Tutte', 'Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta']}
              currentValue={user.looking_for_body_type}
              onSelect={(v: string) => updateField('looking_for_body_type', v)}
              columns={3}
            />

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
  const [activeTab, setActiveTab] = useState<'messaggi' | 'live' | 'flash'>(location.state?.activeTab || 'messaggi');
  const [confirmDeleteChat, setConfirmDeleteChat] = useState<any>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [currentFlash, setCurrentFlash] = useState<any>(null);
  const [flashMessage, setFlashMessage] = useState('');
  const [isPublishingFlash, setIsPublishingFlash] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    try {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        const u = normalizeUser(JSON.parse(saved));
        setUser(u);
        fetchData(u.id);
      } else {
        navigate('/register');
      }
    } catch (e) {
      navigate('/register');
    }
  }, []);

  const fetchData = async (userId: string) => {
    try {
      // 1. Fetch SoulLinks (Friends)
      const { data: sentSL } = await supabase
        .from('soul_links')
        .select('*, receiver:users!receiver_id(id, name, photos, photo_url, city, is_online)')
        .eq('sender_id', userId)
        .eq('status', 'accepted');

      const { data: recvSL } = await supabase
        .from('soul_links')
        .select('*, sender:users!sender_id(id, name, photos, photo_url, city, is_online)')
        .eq('receiver_id', userId)
        .eq('status', 'accepted');

      const acceptedFriends: SoulLink[] = [];
      (sentSL || []).forEach((sl: any) => acceptedFriends.push({ ...sl, other_user: sl.receiver }));
      (recvSL || []).forEach((sl: any) => acceptedFriends.push({ ...sl, other_user: sl.sender }));
      setFriends(acceptedFriends);

      // 2. Fetch richieste asincrone (chat_requests) - Only from friends
      const { data: requestsData } = await supabase
        .from('chat_requests')
        .select(`
                      *,
                      from_user:users!from_user_id(id, name, surname, photo_url, photos)
                      `)
        .eq('to_user_id', userId)
        .order('created_at', { ascending: false });

      if (requestsData) {
        // Filter those where from_user is an accepted friend
        const filteredRequests = requestsData.filter((r: any) =>
          acceptedFriends.some(f => f.other_user?.id === r.from_user_id)
        );

        const processedRequests = filteredRequests.map((r: any) => ({
          ...r,
          name: r.from_user?.name,
          surname: r.from_user?.surname,
          photo_url: r.from_user?.photos?.[0] || r.from_user?.photo_url
        }));
        setChatRequests(processedRequests);
      }

      // 3. Fetch chat in corso (room_messages)
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

          // Check if user is among accepted friends
          const isFriend = acceptedFriends.some(f => f.other_user?.id === otherUser.id);
          if (!isFriend) continue; // Only show chats with friends

          if (!chatMap.has(otherUser.id)) {
            chatMap.set(otherUser.id, {
              other_user: otherUser,
              last_msg: m.text,
              created_at: m.created_at,
              isSender,
              messages: [{ ...m, isSender }]
            });
          } else {
            chatMap.get(otherUser.id).messages.unshift({ ...m, isSender });
          }
        }

        // Also integrate requests into the same conversation list
        if (requestsData) {
          for (const r of requestsData) {
            const from_u = r.from_user;
            if (!from_u) continue;
            const isFriend = acceptedFriends.some(f => f.other_user?.id === from_u.id);
            if (!isFriend) continue;

            if (!chatMap.has(from_u.id) || new Date(r.created_at) > new Date(chatMap.get(from_u.id).created_at)) {
              chatMap.set(from_u.id, {
                other_user: { ...from_u, photo_url: from_u.photos?.[0] || from_u.photo_url },
                last_msg: r.message,
                created_at: r.created_at,
                isSender: false
              });
            }
          }
        }

        const sorted = Array.from(chatMap.values()).sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setActiveChats(sorted);
      }

      // 4. Fetch personal active flash banner
      const { data: flashData } = await supabase
        .from('banner_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (flashData) {
        if (new Date().getTime() - new Date(flashData.created_at).getTime() < 24 * 60 * 60 * 1000) {
          setCurrentFlash(flashData);
        } else {
          setCurrentFlash(null);
        }
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
    <div className="min-h-screen pt-16 pb-60 relative overflow-x-hidden" style={{ background: '#0a0a0f' }}>
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
          @keyframes balloonHeart {
            0%   { transform: translateY(0px) rotate(-6deg) scale(1); opacity: 0; }
            8%   { opacity: 0.9; }
            75%  { opacity: 0.7; }
            100% { transform: translateY(-90px) rotate(8deg) scale(0.85); opacity: 0; }
          }
          .bha { animation: balloonHeart var(--bdur,5s) ease-in-out var(--bdelay,0s) infinite; position: absolute; bottom: 0px; pointer-events: none; }
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
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15, duration: 0.8 }}
        className="flex justify-center gap-3 mx-4 mb-2 pt-2"
      >
        {[
          { id: 'messaggi', label: 'Messaggi', icon: MessageSquare, count: chatRequests.filter(r => r.status === 'pending').length },
          { id: 'live', label: 'LiveChat', icon: Users, count: friends.filter(f => f.other_user?.is_online).length },
          { id: 'flash', label: 'Flash', icon: Zap, count: currentFlash ? 1 : 0 }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          const isFlashWithContent = tab.id === 'flash' && currentFlash;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'messaggi' | 'live' | 'flash')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1.5 px-1 py-3 lg:px-4 lg:py-3.5 rounded-[28px] transition-all relative overflow-hidden",
                isActive
                  ? "text-white shadow-lg shadow-rose-500/30"
                  : "text-white/30 hover:text-white/50"
              )}
              style={isActive ? { background: '#f43f5e', boxShadow: '0 0 20px rgba(244,63,94,0.5)' } : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <tab.icon className={cn("w-5 h-5 lg:w-6 lg:h-6 shrink-0", isActive ? "text-white" : (isFlashWithContent ? "text-white" : "text-stone-300"))} />
              <div className="flex flex-col items-center">
                <span className={cn("text-[8px] lg:text-[11px] font-black uppercase tracking-wider lg:tracking-[0.2em] leading-none text-center", isActive ? "text-white" : (isFlashWithContent ? "text-white" : "text-stone-500"))}>
                  {tab.label}
                </span>
                <span className={cn("text-[8px] lg:text-[9px] font-black mt-1", isActive ? "text-white/40 tracking-wider lg:tracking-[0.2em]" : (isFlashWithContent ? "text-white/60" : "text-stone-400 tracking-wider lg:tracking-[0.2em]"))}>
                  {tab.count}
                </span>
              </div>
            </button>
          );
        })}
      </motion.div>


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

                  {/* Chat Attive e Messaggi (WhatsApp Style with swiping) */}
                  {activeChats.length > 0 && (
                    <div className="space-y-4 pt-2 pb-32">
                      {activeChats.map((chat) => {
                        const hasUnread = !chat.isSender && !readChatIds.has(chat.other_user.id);
                        const isOpen = replyingTo === chat.other_user.id;
                        const notify = hasUnread && !isOpen;
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
                              className="group p-4 flex items-center gap-4 z-10 cursor-pointer relative overflow-hidden"
                              style={{
                                background: '#1a1a22',
                                border: notify ? '1px solid rgba(244,63,94,0.0)' : '1px solid rgba(255,255,255,0.07)',
                                transition: 'border 0.3s ease'
                              }}
                            >
                              {/* Balloon hearts — large, glowing, slow bob */}
                              {notify && [
                                { left: 12, size: 18, color: '#f43f5e', dur: 4.2, delay: 0, bot: 8 },
                                { left: 30, size: 14, color: '#fb7185', dur: 3.8, delay: 0.7, bot: 14 },
                                { left: 50, size: 22, color: '#f43f5e', dur: 4.8, delay: 0.3, bot: 6 },
                                { left: 69, size: 16, color: '#fda4af', dur: 3.6, delay: 1.1, bot: 12 },
                                { left: 85, size: 14, color: '#f43f5e', dur: 4.4, delay: 0.55, bot: 10 },
                              ].map((h, i) => (
                                <div
                                  key={i}
                                  className="bha"
                                  style={{
                                    left: `${h.left}%`,
                                    bottom: h.bot,
                                    '--bdur': `${h.dur}s`,
                                    '--bdelay': `${h.delay}s`,
                                    filter: `drop-shadow(0 0 6px ${h.color}) drop-shadow(0 0 12px ${h.color}80)`,
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
                                  <span className="text-[9px] text-white/25 font-bold ml-2 text-right leading-[1.2]">
                                    {new Date(chat.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}<br />
                                    {new Date(chat.created_at).getHours()}:{String(new Date(chat.created_at).getMinutes()).padStart(2, '0')}
                                  </span>
                                </div>
                                <p className={cn("text-[13px] truncate font-medium", hasUnread ? "text-white font-bold" : "text-white/35")}>
                                  {chat.isSender ? 'Tu: ' : ''}{chat.last_msg}
                                </p>
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
                              )
                              }
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'live' && (
                <motion.div
                  key="live"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                  </div>

                  {friends.filter(f => f.other_user?.is_online).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="w-8 h-8 text-stone-300" />
                      </div>
                      <p className="text-stone-500 font-medium text-sm">Nessun amico online in questo momento.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 px-1">
                      {friends
                        .filter(f => f.other_user?.is_online)
                        .map(f => {
                          const unreadCount = chatRequests.filter(r => r.from_user_id === f.other_user?.id && r.status === 'pending').length;
                          const chat = activeChats.find(c => c.other_user.id === f.other_user?.id);
                          const time = chat ? new Date(chat.created_at).getTime() : 0;
                          return { f, unreadCount, time };
                        })
                        .sort((a, b) => {
                          if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
                          if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
                          return b.time - a.time;
                        })
                        .map(({ f, unreadCount }, i) => {
                          const pu = f.other_user;
                          return (
                            <motion.div
                              key={f.id}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 18 }}
                              onClick={() => {
                                if (pu?.is_online) {
                                  navigate(`/live-chat/${pu?.id}`);
                                } else {
                                  setToast({ message: `${pu?.name} è offline, non puoi avviare una live!`, type: 'info' });
                                }
                              }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              className="relative group cursor-pointer"
                            >
                              <div
                                className="aspect-[3/5.5] rounded-[28px] overflow-hidden bg-stone-900 relative shadow-xl group-hover:shadow-2xl transition-all duration-300"
                                style={{ border: '2px solid #f43f5e', boxShadow: '0 0 18px rgba(244,63,94,0.4), 0 0 4px rgba(244,63,94,0.2)' }}
                              >
                                <img
                                  src={pu?.photos?.[0] || pu?.photo_url || `https://picsum.photos/seed/${pu?.name}/400/500`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                  alt={pu?.name}
                                  onContextMenu={e => e.preventDefault()}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
                                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2"
                                    style={{ borderColor: '#0a0a0f', boxShadow: '0 0 8px rgba(52,211,153,0.8)' }}
                                  />
                                  {unreadCount > 0 && (
                                    <div
                                      className="w-6 h-6 text-white text-[10px] font-black rounded-full border-2 flex items-center justify-center animate-bounce"
                                      style={{ background: '#f43f5e', borderColor: '#0a0a0f', boxShadow: '0 0 10px rgba(244,63,94,0.8)' }}
                                    >
                                      {unreadCount}
                                    </div>
                                  )}
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                  <p className="text-white text-[13px] font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate mb-0.5">
                                    {pu?.name}{pu?.dob && calculateAge(pu.dob) > 0 ? `, ${calculateAge(pu.dob)}` : ''}
                                  </p>
                                  {pu?.city && (
                                    <p className="text-white/80 text-[10px] font-bold truncate flex items-center gap-1">
                                      <MapPin className="w-2.5 h-2.5" />{pu.city}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  )}
                </motion.div>
              )}
              {activeTab === 'flash' && (
                <motion.div
                  key="flash"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6 bg-white p-6 rounded-[28px] border border-stone-100 shadow-sm"
                >
                  <div className="flex flex-col items-center text-center space-y-3 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-tr from-amber-100 to-amber-200 rounded-full flex items-center justify-center shadow-inner">
                      <Zap className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-stone-900 mb-1">Messaggio Flash</h3>
                      <p className="text-[12px] font-medium text-stone-500 leading-relaxed px-2">
                        Pubblica un pensiero, una richiesta o un'idea in <strong className="text-amber-600">Bacheca</strong>. <br />
                        Dura solo <strong className="text-stone-800">24 ore</strong>, non è modificabile e poi svanisce per sempre. È visibile a tutti gli utenti dell'app!
                      </p>
                    </div>
                  </div>

                  {currentFlash ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-[24px] p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full blur-3xl opacity-30 -mr-16 -mt-16 pointer-events-none" />
                      <div className="flex justify-between items-center w-full mb-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-full shadow-sm">
                          <Zap className="w-4 h-4" /> Il tuo Flash attivo
                        </span>
                        <span className="text-[11px] font-bold text-amber-500 bg-amber-100/50 px-3 py-1.5 rounded-full border border-amber-200/50">
                          Scade: {new Date(new Date(currentFlash.created_at).getTime() + 24 * 60 * 60 * 1000).getHours()}:{String(new Date(new Date(currentFlash.created_at).getTime() + 24 * 60 * 60 * 1000).getMinutes()).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-[15px] font-black text-stone-800 leading-relaxed italic border-l-4 border-amber-300 pl-4 py-2 text-left w-full break-words">
                        "{currentFlash.message}"
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <textarea
                          value={flashMessage}
                          onChange={(e) => setFlashMessage(e.target.value)}
                          placeholder="A cosa stai pensando? Dillo a tutti con un Flash..."
                          className="w-full bg-stone-50 border border-stone-200 rounded-[20px] p-5 pb-12 text-[14px] text-stone-700 outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all resize-none min-h-[140px] shadow-inner font-medium"
                          maxLength={80}
                        />
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                          <span className={cn(
                            "text-[10px] font-black",
                            flashMessage.length > 70 ? "text-rose-500" : "text-stone-400"
                          )}>
                            {80 - flashMessage.length} / 80 caratteri
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handlePublishFlash}
                        disabled={!flashMessage.trim() || isPublishingFlash}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[12px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-200 hover:shadow-xl hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        {isPublishingFlash ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Zap className="w-5 h-5" /> Pubblica in Bacheca</>}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div >
        )}
      </div >

    </div >
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
  const [activeTab, setActiveTab] = useState<'notifications' | 'gallery' | 'feed' | 'setup'>('notifications');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [bannerData, setBannerData] = useState<any>(null);
  const [bannerText, setBannerText] = useState('');
  const [isWritingBanner, setIsWritingBanner] = useState(false);
  const [soulLinkRequests, setSoulLinkRequests] = useState<any[]>([]);
  const [setupForm, setSetupForm] = useState<any>({
    conosciamoci_meglio: {},
    orientation: [],
    looking_for_gender: []
  });
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const navigate = useNavigate();

  const [hasViewedNotifs, setHasViewedNotifs] = useState(false);
  const [bounceNotif, setBounceNotif] = useState(false);

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

  useEffect(() => {
    const bounceInterval = setInterval(() => {
      setBounceNotif(true);
      setTimeout(() => setBounceNotif(false), 600);
    }, 10000);
    return () => clearInterval(bounceInterval);
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      setHasViewedNotifs(true);
    }
  }, [activeTab]);

  const fetchData = async (userId: string) => {
    try {
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
        const normalized = normalizeUser(profileData);
        setUser({
          ...normalized,
          likes_count: (profileData.interactions as any[] || []).filter(i => i.type === 'like').length,
          hearts_count: (profileData.interactions as any[] || []).filter(i => i.type === 'heart').length
        });
      }
      else {
        console.warn("No profile found for ID:", userId);
        // Do not redirect immediately if it's a connection/schema issue
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

      // Fetch pending soul link requests (richieste di amicizia in entrata)
      const { data: soulLinksData } = await supabase
        .from('soul_links')
        .select(`
          id, status, created_at,
          requester:users!user_id(id, name, photos, photo_url, city, is_online, dob)
        `)
        .eq('friend_id', userId)
        .eq('status', 'pending');
      if (soulLinksData) setSoulLinkRequests(soulLinksData);

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
    const saved = localStorage.getItem('soulmatch_user');
    if (saved) {
      try {
        const parsed = normalizeUser(JSON.parse(saved));
        if (parsed?.id) fetchData(parsed.id);
        else navigate('/register');
      } catch (e) { navigate('/register'); }
    } else navigate('/register');
  }, [navigate]);

  // Accept/reject soul link requests
  const handleAcceptSoulLink = async (linkId: string) => {
    const { error } = await supabase.from('soul_links').update({ status: 'accepted' }).eq('id', linkId);
    if (!error) { setToast({ message: '🎉 Amicizia accettata!', type: 'success' }); if (user?.id) fetchData(user.id); }
  };
  const handleRejectSoulLink = async (linkId: string) => {
    const { error } = await supabase.from('soul_links').delete().eq('id', linkId);
    if (!error) { setToast({ message: 'Richiesta rifiutata.', type: 'info' }); if (user?.id) fetchData(user.id); }
  };
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
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.setItem('soulmatch_user', JSON.stringify({ ...parsed, ...submissionData }));
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
      localStorage.removeItem('soulmatch_user');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-6 text-center">
      <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
        <Info className="w-10 h-10 text-stone-300" />
      </div>
      <h2 className="text-xl font-serif font-black text-stone-900 mb-2">Profilo non trovato</h2>
      <p className="text-stone-500 text-sm mb-8 max-w-xs">Non è stato possibile caricare i dati del tuo profilo. Potrebbe esserci un problema di connessione o il database non è aggiornato.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={() => navigate('/register')} className="btn-primary py-4">Completa Registrazione</button>
        <button onClick={() => window.location.reload()} className="btn-secondary py-4">Riprova</button>
        <button onClick={() => {
          localStorage.removeItem('soulmatch_user');
          window.dispatchEvent(new Event('user-auth-change'));
          navigate('/');
        }} className="mt-4 flex items-center justify-center gap-2 text-stone-400 font-bold hover:text-rose-600 transition-colors">
          <LogOut className="w-4 h-4" /> Esci e ricomincia
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
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,15,0.4) 60%, rgba(10,10,15,0.8) 85%, #0a0a0f 100%)' }} />

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
              user.is_paid ? "bg-rose-600 text-white" : "bg-white/15 backdrop-blur text-white/60 border border-white/20"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", user.is_paid ? "bg-white animate-pulse" : "bg-white/30")} />
              {user.is_paid ? 'Premium' : 'Base'}
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

      {/* ── BANNER MANAGEMENT ── */}
      <div className="mx-4 mt-5 rounded-[24px] p-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-black text-white/80 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-rose-400" />
            Il tuo Banner Globale (24h)
          </h3>
        </div>

        {bannerData?.message ? (
          <div className="space-y-4">
            <div className="rounded-[16px] p-4 relative" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
              <p className="text-xs font-semibold text-white/80 italic pr-6 leading-relaxed">"{bannerData.message.message}"</p>
              <button onClick={async () => {
                await supabase.from('banner_messages').delete().eq('id', bannerData.message.id);
                setBannerData(null);
              }} className="absolute top-3 right-3 text-rose-400 hover:text-rose-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bannerData.replies && bannerData.replies.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="text-[9px] font-black uppercase text-stone-400 tracking-widest pl-1">Risposte ricevute agli interessati</h4>
                {bannerData.replies.map((r: any) => (
                  <div key={r.id} className="flex gap-3 bg-stone-50 p-3 rounded-[16px] border border-stone-100 items-center">
                    <img src={r.photo_url || `https://picsum.photos/seed/${r.name}/100`} className="w-8 h-8 rounded-full shadow-sm object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-stone-900">{r.name}</p>
                      <p className="text-[11px] text-stone-600 line-clamp-2 leading-tight">{r.reply_text}</p>
                    </div>
                    <button onClick={() => {
                      setReplyingTo(r.from_user_id);
                      setActiveTab('notifications'); // switch context to send DMs easily, or they can do it here via the same overlay. Setting state handled below.
                    }} className="w-8 h-8 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm shrink-0">
                      <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {isWritingBanner ? (
              <div className="space-y-2">
                <textarea
                  value={bannerText}
                  onChange={e => setBannerText(e.target.value)}
                  placeholder="Scrivi qui... es. Chi viene all'arena domani sera? Caffè?"
                  className="w-full rounded-[16px] p-4 text-[12px] font-medium resize-none focus:outline-none min-h-[80px] text-white/80 placeholder:text-white/20"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(244,63,94,0.25)' }}
                  maxLength={80}
                />
                <div className="flex gap-2">
                  <button onClick={async () => {
                    if (!bannerText.trim()) return;
                    setIsWritingBanner(false);
                    await supabase.from('banner_messages').delete().eq('user_id', user.id);
                    const newBanner = { user_id: user.id, message: bannerText, name: user.name, photo_url: user.photos?.[0] || user.photo_url, city: user.city, dob: user.dob };
                    const { data, error } = await supabase.from('banner_messages').insert([newBanner]).select().single();
                    setBannerText('');
                    if (!error && data) { setBannerData({ message: data, replies: [] }); setToast({ message: 'Messaggio flash pubblicato in bacheca!', type: 'success' }); }
                  }} className="flex-1 text-white py-2.5 rounded-[12px] text-[10px] font-black uppercase tracking-widest" style={{ background: '#f43f5e', boxShadow: '0 0 16px rgba(244,63,94,0.4)' }}>
                    Pubblica Flash
                  </button>
                  <button onClick={() => setIsWritingBanner(false)} className="px-4 py-2.5 rounded-[12px] text-[10px] font-black uppercase tracking-widest text-white/50" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setIsWritingBanner(true)} className="w-full rounded-[16px] p-5 flex flex-col items-center justify-center gap-2 transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}>
                <Plus className="w-5 h-5 text-rose-400" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Aggiungi messaggio in Bacheca</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── TAB BAR dark glass ── */}
      <div className="mx-4 mt-5 rounded-[24px] flex p-1.5 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          { id: 'notifications', label: 'Amici', icon: Bell, badge: hasViewedNotifs ? 0 : soulLinkRequests.length },
          { id: 'gallery', label: 'Galleria', icon: Camera, badge: 0 },
          { id: 'feed', label: 'Post', icon: ImageIcon, badge: 0 },
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

          {activeTab === 'notifications' && (
            <motion.div key="tab-notif" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {soulLinkRequests.length === 0 ? (
                <div className="rounded-[28px] p-10 flex flex-col items-center gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <CheckCircle className="w-8 h-8 text-white/15" />
                  </div>
                  <p className="text-white/30 text-sm font-bold">Nessuna richiesta di amicizia.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-rose-400 flex items-center gap-1.5 px-2">
                    <Users className="w-3.5 h-3.5" /> Richieste di Amicizia
                  </h4>
                  {soulLinkRequests.map((req: any) => {
                    const requester = req.requester;
                    if (!requester) return null;
                    const photo = requester.photos?.[0] || requester.photo_url;
                    return (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-[20px] p-4 flex items-center gap-4"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <div
                          className="w-14 h-14 rounded-[18px] overflow-hidden shrink-0"
                          style={{ border: '2px solid #f43f5e', boxShadow: '0 0 12px rgba(244,63,94,0.4)' }}
                          onClick={() => navigate(`/profile-detail/${requester.id}`)}
                        >
                          {photo
                            ? <img src={photo} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.15)' }}><Heart className="w-6 h-6 text-rose-400" /></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-black text-sm truncate">{requester.name}</p>
                          {requester.city && <p className="text-white/40 text-[11px] font-semibold truncate flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-400" />{requester.city}</p>}
                          <p className="text-white/30 text-[10px] mt-1">{new Date(req.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleAcceptSoulLink(req.id)}
                            className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white"
                            style={{ background: '#f43f5e', boxShadow: '0 0 12px rgba(244,63,94,0.5)' }}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRejectSoulLink(req.id)}
                            className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white/50"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

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

          {activeTab === 'feed' && (
            <motion.div key="tab-feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <FeedComponent userId={user.id} isOwner={true} />
            </motion.div>
          )}

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

                <div className="space-y-3">
                  <p className="text-[9px] text-white/30 font-black uppercase tracking-widest ml-1">Statura Partner</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['Tutte', 'Snella', 'Atletica', 'Normale', 'Curvy', 'Robusta'].map(t => (
                      <button
                        key={t}
                        onClick={() => setSetupForm((f: any) => ({ ...f, looking_for_body_type: t }))}
                        className={cn(
                          "py-2.5 rounded-[12px] text-[8px] font-black tracking-widest uppercase transition-all border",
                          setupForm.looking_for_body_type === t
                            ? "bg-stone-100 border-stone-100 text-stone-900 shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                            : "bg-white/5 border-white/5 text-white/40"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
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

          {/* Admin link */}
          <div className="flex justify-center mt-2">
            <Link to="/admin" className="p-2 bg-stone-800 rounded-full hover:bg-rose-600 text-stone-400 hover:text-white transition-colors group" title="Pannello Amministrativo">
              <ShieldCheck className="w-4 h-4" />
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-stone-600 text-[9px] text-center font-medium">
            © 2026 SoulMatch — Tutti i diritti riservati
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
    // 1. Silent verification of the user profile on app startup
    const verifyUser = async () => {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          if (u?.id) {
            // Use maybeSingle to avoid error on 0 rows
            const { data, error } = await supabase.from('users').select('id, is_online').eq('id', u.id).maybeSingle();

            if (error) {
              console.error("Errore verifica sessione (DB):", error);
              // Non puliamo in caso di errore di connessione/timeout
              return;
            }

            if (!data) {
              console.warn("Profilo non trovato nel database. Pulizia sessione locale.");
              localStorage.removeItem('soulmatch_user');
              window.dispatchEvent(new Event('user-auth-change'));
            } else {
              // Update status
              await supabase.from('users').update({ is_online: true }).eq('id', u.id);
            }
          }
        } catch (e) {
          console.error("Errore verifica sessione (Local):", e);
        }
      }
    };
    verifyUser();

    // 2. Heartbeat mechanism to keep user online
    const heartbeatInterval = setInterval(async () => {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          if (u?.id && document.visibilityState === 'visible') {
            await supabase.from('users').update({ is_online: true }).eq('id', u.id);
          }
        } catch (e) { }
      }
    }, 45000); // Every 45 seconds

    const handleVisibilityChange = async () => {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          if (u?.id) {
            const isVisible = document.visibilityState === 'visible';
            await supabase.from('users').update({
              is_online: isVisible
            }).eq('id', u.id);
          }
        } catch (e) { }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleBeforeUnload = () => {
      const saved = localStorage.getItem('soulmatch_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          if (u?.id) {
            // navigator.sendBeacon could be used here for more reliability if we had an endpoint
            // but for now we try a quick update
            supabase.from('users').update({ is_online: false }).eq('id', u.id).then();
          }
        } catch (e) { }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest('button, a, [role="button"]');
      if (interactive) {
        // playTapSound();
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
      `}</style>
      <BackgroundDecorations />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bacheca" element={<BachecaPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/amici" element={<AmiciPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/live-chat/:id" element={<LiveChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/soul-match" element={<SoulMatchPage />} />
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
      <GlobalFlashBanner />
      <AppBottomNav />
    </Router>
  );
}
