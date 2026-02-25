const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace('© {new Date().getFullYear()} SoulMatch', '© 2026 SoulMatch');

app = app.replace(
    '</div>\n\n          {/* Copyright */}',
    `</div>\n\n          {/* Admin link */}\n          <div className="flex justify-center mt-2">\n            <Link to="/admin" className="p-2 bg-stone-800 rounded-full hover:bg-rose-600 text-stone-400 hover:text-white transition-colors group" title="Pannello Amministrativo">\n              <ShieldCheck className="w-4 h-4" />\n            </Link>\n          </div>\n\n          {/* Copyright */}`
);

const newAdmin = `// --- Admin Page ---
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
  
  // Modals / Specific UI
  const [activeTab, setActiveTab] = useState<'utenti' | 'documenti' | 'segnalazioni' | 'pagamenti' | 'impostazioni'>('utenti');

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
      const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true });
      if (data) setUsers(data);
    } catch (e) { }
    setLoadingData(false);
  };

  const fetchSliderImages = async () => {
    try {
      const res = await fetch('/api/settings/home_slider');
      if (res.ok) {
        setSliderImages(await res.json());
      }
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

  const handleValidateDoc = async (userId: string) => {
    try {
      const { error } = await supabase.from('users').update({ is_validated: true }).eq('id', userId);
      if (!error) {
        setToast({ message: "Documento validato per l'utente.", type: 'success' });
        fetchUsers();
      } else {
        throw error;
      }
    } catch (e) {
      setToast({ message: "Errore.", type: 'error' });
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const { error } = await supabase.from('users').update({ is_blocked: true }).eq('id', userId);
      if (!error) {
        setToast({ message: "Utente bloccato.", type: 'success' });
        fetchUsers();
      } else {
        throw error;
      }
    } catch (e) {
      setToast({ message: "Errore.", type: 'error' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-stone-100 relative z-10">
          <div className="flex justify-center mb-6">
             <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-900/40">
                <ShieldCheck className="w-8 h-8 text-white" />
             </div>
          </div>
          <h1 className="text-2xl font-serif font-black text-center text-stone-900 mb-6">Pannello di Amministrazione</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Username</label>
              <input 
                type="text" 
                value={username} onChange={e => setUsername(e.target.value)} 
                className="w-full p-4 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-rose-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Password</label>
              <input 
                type="password" 
                value={password} onChange={e => setPassword(e.target.value)} 
                className="w-full p-4 rounded-xl bg-stone-50 border border-stone-200 outline-none focus:ring-2 focus:ring-rose-500" 
              />
            </div>
            <button type="submit" className="w-full bg-stone-900 text-white p-4 rounded-xl font-black uppercase hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-600/30 transition-all">Accedi</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row pt-[72px]">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
      
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-r border-stone-200 shrink-0 p-6 flex flex-col h-auto md:min-h-[calc(100vh-72px)] relative z-10">
        <h2 className="text-xl font-serif font-black mb-8 flex items-center gap-2 text-stone-800">
          <ShieldCheck className="text-rose-600" /> Admin
        </h2>
        
        <nav className="flex flex-col gap-2">
          <button onClick={() => setActiveTab('utenti')} className={cn("text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3", activeTab === 'utenti' ? "bg-rose-50 text-rose-700" : "text-stone-500 hover:bg-stone-50")}>
            <Users className="w-5 h-5" /> Utenti Iscritti
          </button>
          <button onClick={() => setActiveTab('documenti')} className={cn("text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3", activeTab === 'documenti' ? "bg-rose-50 text-rose-700" : "text-stone-500 hover:bg-stone-50")}>
            <CheckCircle className="w-5 h-5" /> Documenti
          </button>
          <button onClick={() => setActiveTab('segnalazioni')} className={cn("text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3", activeTab === 'segnalazioni' ? "bg-rose-50 text-rose-700" : "text-stone-500 hover:bg-stone-50")}>
            <AlertTriangle className="w-5 h-5" /> Segnalazioni
          </button>
          <button onClick={() => setActiveTab('pagamenti')} className={cn("text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3", activeTab === 'pagamenti' ? "bg-rose-50 text-rose-700" : "text-stone-500 hover:bg-stone-50")}>
            <CreditCard className="w-5 h-5" /> Stripe & Paga.
          </button>
          <button onClick={() => setActiveTab('impostazioni')} className={cn("text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-3", activeTab === 'impostazioni' ? "bg-rose-50 text-rose-700" : "text-stone-500 hover:bg-stone-50")}>
            <Settings2 className="w-5 h-5" /> Slider Home
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 relative z-10">
        {loadingData ? (
           <div className="text-center text-stone-500 font-bold mt-20">Caricamento dati in corso...</div>
        ) : (
          <>
            {activeTab === 'utenti' && (
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-2xl font-black mb-6">Tutti gli iscritti ({users.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-stone-100 text-stone-400 text-xs uppercase tracking-widest">
                        <th className="pb-3 px-4">Nome</th>
                        <th className="pb-3 px-4">Email / Città</th>
                        <th className="pb-3 px-4">Genere</th>
                        <th className="pb-3 px-4">Stato</th>
                        <th className="pb-3 px-4">Piano</th>
                        <th className="pb-3 px-4 text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u: any) => (
                        <tr key={u.id} className="border-b last:border-0 border-stone-50 hover:bg-stone-50/50">
                          <td className="py-4 px-4 font-bold text-stone-800">{u.name} {u.surname}</td>
                          <td className="py-4 px-4 text-stone-600">{u.email || 'N/A'} <br/><span className="text-xs text-stone-400">{u.city}</span></td>
                          <td className="py-4 px-4 text-stone-600">{u.gender}</td>
                          <td className="py-4 px-4">
                            {u.is_blocked ? <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-bold">Bloccato</span> : <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">Attivo</span>}
                          </td>
                          <td className="py-4 px-4">
                            {u.is_paid ? <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-bold">VIP</span> : <span className="text-xs px-2 py-1 bg-stone-100 text-stone-500 rounded-full font-bold">Standard</span>}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button onClick={() => handleBlockUser(u.id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg" title="Sospendi Utente"><AlertTriangle className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'documenti' && (
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                <h3 className="text-2xl font-black mb-6">Validazione Documenti ID</h3>
                <p className="text-stone-500 mb-6">Qui puoi controllare e certificare l'identità inviata all'app.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.filter(u => u.id_document_url && !u.is_validated).map((u: any) => (
                    <div key={u.id} className="border border-stone-200 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden group">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                           {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover rounded-full" /> : <User className="w-5 h-5 text-stone-400" />}
                         </div>
                         <div>
                            <p className="font-bold text-stone-800">{u.name} {u.surname}</p>
                            <p className="text-xs text-stone-500">Età: {calculateAge(u.dob)}</p>
                         </div>
                      </div>
                      <div className="w-full h-40 bg-stone-100 rounded-xl overflow-hidden relative border border-stone-200">
                         <img src={u.id_document_url} alt="ID Document" className="w-full h-full object-cover" />
                      </div>
                      <button onClick={() => handleValidateDoc(u.id)} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Approva Identità
                      </button>
                    </div>
                  ))}
                  {users.filter(u => u.id_document_url && !u.is_validated).length === 0 && (
                    <div className="col-span-full py-16 text-center">
                       <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-emerald-500/50" />
                       <p className="font-medium text-stone-400">Nessun documento in coda. Bel lavoro!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                     <p className="text-lg font-bold text-emerald-700 flex items-center gap-2 mt-2"><CheckCircle className="w-5 h-5"/> In Sincronia</p>
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
          </>
        )}
      </div>
    </div>
  );
}`;

const startIndex = app.indexOf('// --- Admin Page ---');
let endIndex = app.indexOf('const RegisterPage = () => {');
if (startIndex !== -1 && endIndex !== -1) {
    app = app.substring(0, startIndex) + newAdmin + "\n\n" + app.substring(endIndex);
}

fs.writeFileSync('src/App.tsx', app);
