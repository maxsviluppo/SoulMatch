
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle, XCircle, Sparkles, Zap, Eye, ShieldCheck, Settings2, Calendar, CloudUpload } from 'lucide-react';
import { supabase } from './supabase';
import { cn, fileToBase64 } from './utils';
import { UserProfile } from './types';

const calculateRemainingDays = (rejectedAt: string | null) => {
  if (!rejectedAt) return 15;
  const start = new Date(rejectedAt);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const remaining = 15 - diffDays;
  return remaining > 0 ? remaining : 0;
};

export const SubscriptionSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [expiry, setExpiry] = useState<string>('');

  useEffect(() => {
    const processSubscription = async () => {
      if (!sessionId || sessionId === '{CHECKOUT_SESSION_ID}') {
        setStatus('error');
        return;
      }

      const saved = localStorage.getItem('soulmatch_user');
      const pendingPlan = localStorage.getItem('soulmatch_pending_plan');

      if (saved && pendingPlan) {
        try {
          const u = JSON.parse(saved);
          const expiryDate = new Date();
          if (pendingPlan === 'annual') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          }

          const subscriptionData = {
            is_paid: true,
            subscription_type: pendingPlan,
            subscription_expiry: expiryDate.toISOString()
          };
          
          setExpiry(expiryDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }));

          const { error } = await supabase
            .from('users')
            .update(subscriptionData)
            .eq('id', u.id);
          
          if (!error) {
            const updatedUser = { ...u, ...subscriptionData };
            localStorage.setItem('soulmatch_user', JSON.stringify(updatedUser));
            localStorage.removeItem('soulmatch_pending_plan');
            localStorage.removeItem('soulmatch_is_free_bonus');
            window.dispatchEvent(new Event('user-auth-change'));
            setStatus('success');
          } else {
            setStatus('error');
          }
        } catch (e) {
          setStatus('error');
        }
      } else {
        const u = saved ? JSON.parse(saved) : null;
        if (u?.is_paid) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      }
    };
    processSubscription();
  }, [sessionId]);

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
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
        {status === 'loading' && (
          <div className="py-20 flex flex-col items-center gap-4">
            <RefreshCw className="w-10 h-10 text-purple-500 animate-spin" />
            <p className="text-stone-400 text-xs font-black uppercase tracking-widest">Verifica pagamento in corso...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-12 space-y-6">
            <div className="w-20 h-20 bg-rose-500/20 rounded-[28px] flex items-center justify-center mx-auto border border-rose-500/30">
              <XCircle className="w-10 h-10 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-black text-white mb-2">Accesso Negato</h1>
              <p className="text-stone-400 text-sm font-bold uppercase tracking-widest mb-8 leading-relaxed">
                Nessuna sessione di pagamento valida trovata o già elaborata.
              </p>
            </div>
            <button onClick={() => navigate('/bacheca')} className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
              Torna alla Bacheca
            </button>
          </div>
        )}

        {status === 'success' && (
          <>
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
                { icon: CloudUpload, label: "Creazione Post nel Feed", desc: "Condividi i tuoi momenti con la community" },
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
              Vai al Profilo e verifica status
            </button>
          </>
        )}
      </motion.div>

      <div className="mt-8 text-center text-[10px] text-stone-600 font-bold uppercase tracking-widest">
        SoulMatch Premium • Ordine #SM-{Math.floor(Math.random() * 100000)}
      </div>
    </div>
  );
};

export const SecurityWarningSideBanner = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthChange = () => {
      const saved = localStorage.getItem('soulmatch_user');
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

    const interval = setInterval(() => {
      setIsExpanded(true);
      setTimeout(() => setIsExpanded(false), 5000);
    }, 60000);

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
          is_suspended: false
        }).eq('id', currentUser.id);

        if (!error) {
          const saved = localStorage.getItem('soulmatch_user');
          if (saved) {
            const parsed = JSON.parse(saved);
            localStorage.setItem('soulmatch_user', JSON.stringify({
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

      <div className="w-80 bg-stone-900 border-y border-l border-white/10 rounded-none p-6 relative flex flex-col gap-4 overflow-hidden">
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
