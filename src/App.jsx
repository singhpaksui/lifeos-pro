import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signInAnonymously, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';
import { 
  Calendar, Clock, Trash2, ChevronLeft, ChevronRight,
  Briefcase, Dumbbell, Utensils, Moon, Sun, Search, Send, Microscope, ListPlus, 
  TrendingUp, Activity, X, Phone, Languages, LogOut, MessageCircle, BarChart3, PieChart, FileText,
  Target, Trophy
} from 'lucide-react';

// --- CONFIGURATION ---
const manualFirebaseConfig = {
  apiKey: "AIzaSyBbJjQrikfNIftAmoVXaEcPDdgJuPb3Hh0",
  authDomain: "lyfeos-cc0be.firebaseapp.com",
  projectId: "lyfeos-cc0be",
  storageBucket: "lyfeos-cc0be.firebasestorage.app",
  messagingSenderId: "849608106926",
  appId: "1:849608106926:web:68dc438783d1c9f31bde3f",
  measurementId: "G-L2HPHMBV35"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : (manualFirebaseConfig.apiKey ? manualFirebaseConfig : {
      apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: ""
    });

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'lifeos-pro-v3';

const TRANSLATIONS = {
  en: {
    planner: "Planner", gymProgress: "Gym Progress", workDoc: "Activity Log", timeAnalytics: "Time Analytics",
    gym: "GYM", work: "WORK", jjp: "JJP", basketball: "B-BALL", meal: "MEAL", rest: "REST", wake: "WAKE", speech: "SPEECH", other: "OTHER",
    save: "Save", cancel: "Cancel", delete: "Delete", addEx: "Add Exercise", weight: "kg", reps: "reps",
    logout: "Log Out", loading: "Syncing LifeOS...", w_call: "Call", w_research: "Research", w_search: "Search", 
    w_send: "Send Out", w_other: "Others", remarks: "Remarks / Notes...", changeCat: "Change Category",
    clearSlot: "Clear Slot"
  },
  zh: {
    planner: "日程規劃", gymProgress: "健身進度", workDoc: "活動日誌", timeAnalytics: "時間分析",
    gym: "健身", work: "工作", jjp: "JJP", basketball: "籃球", meal: "用餐", rest: "休息", wake: "起床", speech: "語言治療", other: "其他",
    save: "保存", cancel: "取消", delete: "刪除", addEx: "新增動作", weight: "公斤", reps: "次數",
    logout: "登出", loading: "同步中...", w_call: "電話", w_research: "研究", w_search: "搜尋", 
    w_send: "發送", w_other: "其他", remarks: "備註 / 內容...", changeCat: "修改類別",
    clearSlot: "清空時段"
  }
};

const WORK_TYPES = [
  { id: 'CALL', label: 'w_call', icon: <Phone size={14}/> },
  { id: 'RESEARCH', label: 'w_research', icon: <Microscope size={14}/> },
  { id: 'SEARCH', label: 'w_search', icon: <Search size={14}/> },
  { id: 'SEND', label: 'w_send', icon: <Send size={14}/> },
  { id: 'OTHER_WORK', label: 'w_other', icon: <ListPlus size={14}/> }
];

const EXERCISE_LIST = [
  "Bench Press (barbell)", "Bench Press (dumbbell)", "Incline Bench Press (barbell)", 
  "Incline Bench Press (dumbbell)", "Iso-Lateral Incline Bench Press (machine)", "Chest Fly (machine)", 
  "Chest Fly (cable)", "Cable Cross-over (cable)", "Bicep Curls (dumbbell)", "Incline Curls (dumbbell)", 
  "Preacher Curl", "Bayesian Curl (cable)", "Tricep Extension (cable)", "Skull Crusher", 
  "Tricep Extension (overhead)", "Pull-ups", "Seated Row (machine)", "Iso-Lateral Row (machine)", 
  "Deadlift (barbell)", "Cable Pulldowns", "Overhead Press (dumbbell)", "Overhead Press (barbell)", 
  "Lateral Raises", "Reverse Fly (machine)", "Reverse Fly (cable)", "Squat (barbell)", 
  "Bulgarian Split Squat", "Hip Abductor", "Hip Adductor", "Hip Thrust"
];

const SLOTS = Array.from({ length: 48 }, (_, i) => i * 0.5);

export default function App() {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('planner');
  const [events, setEvents] = useState({});
  const [allWorkouts, setAllWorkouts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [selection, setSelection] = useState(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // Used for WORK, JJP, OTHER
  const [isGymModalOpen, setIsGymModalOpen] = useState(false);
  
  const [detailData, setDetailData] = useState({ type: 'WORK', subType: 'OTHER_WORK', remarks: '' });
  const [currentWorkout, setCurrentWorkout] = useState([]);
  
  const isDragging = useRef(false);
  const t = TRANSLATIONS[lang];

  const ACTIVITY_CONFIG = {
    WORK: { color: 'bg-orange-500', text: 'text-white', icon: <Briefcase size={14} />, label: t.work },
    JJP: { color: 'bg-purple-600', text: 'text-white', icon: <Target size={14} />, label: t.jjp },
    GYM: { color: 'bg-indigo-600', text: 'text-white', icon: <Dumbbell size={14} />, label: t.gym },
    BASKETBALL: { color: 'bg-amber-500', text: 'text-white', icon: <Trophy size={14} />, label: t.basketball },
    SPEECH: { color: 'bg-emerald-500', text: 'text-white', icon: <MessageCircle size={14} />, label: t.speech },
    MEAL: { color: 'bg-red-500', text: 'text-white', icon: <Utensils size={14} />, label: t.meal },
    REST: { color: 'bg-slate-700', text: 'text-white', icon: <Moon size={14} />, label: t.rest },
    WAKE: { color: 'bg-amber-100', text: 'text-amber-900', icon: <Sun size={14} />, label: t.wake },
    OTHER: { color: 'bg-slate-300', text: 'text-slate-800', icon: <Clock size={14} />, label: t.other }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token).catch(() => signInAnonymously(auth));
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const eventsPath = collection(db, 'artifacts', appId, 'users', user.uid, 'events');
    const unsubEvents = onSnapshot(eventsPath, (snap) => {
      const data = {};
      snap.forEach(d => data[d.id] = d.data());
      setEvents(data);
    }, (err) => console.error("Event Sync Error:", err));

    const workoutsPath = collection(db, 'artifacts', appId, 'users', user.uid, 'workouts');
    const unsubWorkouts = onSnapshot(workoutsPath, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setAllWorkouts(list.sort((a, b) => b.date.localeCompare(a.date)));
    }, (err) => console.error("Workout Sync Error:", err));

    return () => { unsubEvents(); unsubWorkouts(); };
  }, [user]);

  const getDayKey = (date) => date.toISOString().split('T')[0];

  const handleSlotAction = async (type, payload = null) => {
    if (!selection || !user) return;
    const { dayKey, slots } = selection;
    
    if (type === 'DELETE') {
      await Promise.all(slots.map(s => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', `${dayKey}-${s.toString().replace('.','_')}`))));
      setIsSlotModalOpen(false);
      setIsDetailModalOpen(false);
      setIsGymModalOpen(false);
      return;
    }

    // Modal Trigger Logic
    if ((type === 'WORK' || type === 'JJP' || type === 'OTHER') && !payload) {
      const existing = events[`${dayKey}-${slots[0].toString().replace('.','_')}`];
      setDetailData({ 
        type: type,
        subType: existing?.subType || 'OTHER_WORK', 
        remarks: existing?.remarks || '' 
      });
      setIsSlotModalOpen(false);
      setIsDetailModalOpen(true);
      return;
    }

    if (type === 'GYM' && !payload) {
      const snap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workouts', dayKey));
      setCurrentWorkout(snap.exists() ? snap.data().exercises : [{ name: EXERCISE_LIST[0], sets: [{ weight: '', reps: '' }] }]);
      setIsSlotModalOpen(false);
      setIsGymModalOpen(true);
      return;
    }

    // Saving Logic
    const baseData = { type, dayKey, timestamp: Date.now() };
    if (payload && typeof payload === 'object') {
      baseData.subType = payload.subType;
      baseData.remarks = payload.remarks;
    }

    await Promise.all(slots.map(slot => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', `${dayKey}-${slot.toString().replace('.','_')}`), {
      ...baseData, slot
    })));
    
    setIsSlotModalOpen(false);
    setIsDetailModalOpen(false);
  };

  const analytics = useMemo(() => {
    const totals = {};
    Object.values(events).forEach(ev => {
      totals[ev.type] = (totals[ev.type] || 0) + 0.5;
    });
    return totals;
  }, [events]);

  const weekRange = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  if (!user) return <div className="h-screen flex items-center justify-center bg-slate-50 font-black text-indigo-600 animate-pulse text-2xl tracking-tighter">{t.loading}</div>;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans select-none overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col shrink-0 hidden md:flex">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Activity size={24} /></div>
          <div>
            <h1 className="text-xl font-black tracking-tighter italic">LifeOS PRO</h1>
            <p className="text-[9px] font-bold text-slate-400">SECURE CLOUD STORAGE</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          <button onClick={() => setActiveTab('planner')} className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${activeTab === 'planner' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'}`}><Calendar size={18}/> <span className="font-bold">{t.planner}</span></button>
          <button onClick={() => setActiveTab('work-doc')} className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${activeTab === 'work-doc' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'}`}><FileText size={18}/> <span className="font-bold">{t.workDoc}</span></button>
          <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'}`}><PieChart size={18}/> <span className="font-bold">{t.timeAnalytics}</span></button>
          <button onClick={() => setActiveTab('gym-progress')} className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${activeTab === 'gym-progress' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'}`}><TrendingUp size={18}/> <span className="font-bold">{t.gymProgress}</span></button>
        </nav>
        <div className="pt-6 border-t space-y-2">
           <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')} className="w-full p-4 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-2"><Languages size={14}/> {lang === 'en' ? '中文' : 'English'}</button>
           <button onClick={() => signOut(auth)} className="w-full p-4 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 flex items-center justify-center gap-2"><LogOut size={14}/> {t.logout}</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-4 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-7); setSelectedDate(d); }} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20}/></button>
             <h2 className="text-sm md:text-lg font-black">{selectedDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW', { month: 'long', year: 'numeric' })}</h2>
             <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+7); setSelectedDate(d); }} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={20}/></button>
          </div>
          <div className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500">ID: {user.uid.slice(0,6)}...</div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {activeTab === 'planner' && (
            <div className="bg-white rounded-[24px] md:rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-8 border-b bg-slate-50/50 font-black uppercase text-[10px] text-slate-400">
                  <div className="p-4 border-r"></div>
                  {weekRange.map((date, i) => {
                    const dayKey = getDayKey(date);
                    const hasWorkout = allWorkouts.some(w => w.id === dayKey);
                    return (
                      <div key={i} className={`p-2 md:p-4 text-center border-r last:border-r-0 relative ${dayKey === getDayKey(new Date()) ? 'bg-indigo-50/50 text-indigo-600' : ''}`}>
                        <div className="text-[8px] md:text-[10px]">{date.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW', { weekday: 'short' })}</div>
                        <div className="text-sm md:text-xl text-slate-900">{date.getDate()}</div>
                        {hasWorkout && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-400 rounded-full" />}
                      </div>
                    );
                  })}
                </div>
                <div className="h-[calc(100vh-220px)] overflow-y-auto relative">
                  {SLOTS.map(slot => (
                    <div key={slot} className="grid grid-cols-8 border-b border-slate-50 min-h-[48px]">
                      <div className="p-2 text-right border-r text-[9px] font-bold text-slate-300 flex items-center justify-end">{slot % 1 === 0 ? `${Math.floor(slot)}:00` : ''}</div>
                      {weekRange.map((date, i) => {
                        const dayKey = getDayKey(date);
                        const event = events[`${dayKey}-${slot.toString().replace('.', '_')}`];
                        const config = event ? ACTIVITY_CONFIG[event.type] : null;
                        return (
                          <div key={i} 
                            onMouseDown={() => { isDragging.current = true; setSelection({ dayKey, slots: [slot] }); }}
                            onMouseEnter={() => { if (isDragging.current && selection?.dayKey === dayKey) setSelection(p => ({...p, slots: [...new Set([...p.slots, slot])]})); }}
                            onMouseUp={() => { if (isDragging.current) setIsSlotModalOpen(true); isDragging.current = false; }}
                            onClick={() => {
                              setSelection({ dayKey, slots: [slot] });
                              if (event?.type === 'GYM') handleSlotAction('GYM');
                              else if (['WORK', 'JJP', 'OTHER'].includes(event?.type)) handleSlotAction(event.type);
                              else setIsSlotModalOpen(true);
                            }}
                            className="p-0.5 border-r border-slate-50 last:border-r-0 cursor-crosshair relative group">
                            {config && (
                              <div className={`w-full h-full rounded-lg px-2 flex items-center gap-2 shadow-sm ${config.color} ${config.text} transition-all active:scale-95`}>
                                {config.icon} <span className="text-[10px] font-black uppercase hidden md:inline truncate">{config.label}</span>
                                {event.remarks && <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><FileText size={8} /></div>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
            </div>
          )}

          {activeTab === 'gym-progress' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {allWorkouts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[40px] border">
                  <Dumbbell size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold">No gym sessions logged yet.</p>
                </div>
              ) : (
                allWorkouts.map(workout => (
                  <div key={workout.id} className="bg-white p-6 rounded-[32px] border shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                      <h4 className="font-black text-indigo-600 uppercase tracking-tighter">{workout.id}</h4>
                      <button onClick={async () => await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workouts', workout.id))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {workout.exercises?.map((ex, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl">
                          <p className="font-black text-[11px] uppercase mb-2 text-slate-700">{ex.name}</p>
                          <div className="space-y-1">
                            {ex.sets?.filter(s => s.weight && s.reps).map((s, si) => (
                              <div key={si} className="flex justify-between text-[10px] font-bold text-slate-400">
                                <span>SET {si + 1}</span>
                                <span>{s.weight}kg × {s.reps}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="max-w-4xl mx-auto space-y-6">
               <h3 className="text-2xl font-black mb-8">Overall Time Distribution</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-8 rounded-[40px] border shadow-sm flex items-center justify-center">
                    <div className="relative w-48 h-48 rounded-full border-[16px] border-slate-100 flex items-center justify-center">
                       <PieChart size={48} className="text-indigo-600 opacity-20"/>
                       <div className="absolute inset-0 flex items-center justify-center flex-col">
                         <span className="text-3xl font-black text-slate-900">{Object.values(analytics).reduce((a,b)=>a+b, 0)}</span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase">Total Hrs</span>
                       </div>
                    </div>
                 </div>
                 <div className="space-y-4">
                   {Object.entries(ACTIVITY_CONFIG).map(([key, cfg]) => {
                     const hrs = analytics[key] || 0;
                     const total = Object.values(analytics).reduce((a,b)=>a+b, 0) || 1;
                     const pct = Math.round((hrs / total) * 100);
                     return (
                       <div key={key} className="bg-white p-4 rounded-2xl border flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center text-white`}>{cfg.icon}</div>
                         <div className="flex-1">
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-[10px] font-black uppercase tracking-wider">{cfg.label}</span>
                             <span className="text-xs font-bold">{hrs}h ({pct}%)</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div className={`h-full ${cfg.color}`} style={{ width: `${pct}%` }}></div>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'work-doc' && (
             <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {Object.values(events).filter(e => e.remarks).map((e, idx) => (
                 <div key={idx} className="bg-white p-6 rounded-3xl border shadow-sm">
                   <div className="flex items-center gap-2 mb-4">
                     <div className={`w-8 h-8 ${ACTIVITY_CONFIG[e.type]?.color} rounded-lg flex items-center justify-center text-white`}>
                       {ACTIVITY_CONFIG[e.type]?.icon}
                     </div>
                     <div>
                       <p className="text-[10px] font-black uppercase text-slate-400">{e.dayKey}</p>
                       <p className={`text-xs font-black uppercase ${ACTIVITY_CONFIG[e.type]?.text.replace('text-', 'text-')}`}>
                         {e.type} {e.subType ? `- ${t[WORK_TYPES.find(wt => wt.id === e.subType)?.label] || e.subType}` : ''}
                       </p>
                     </div>
                   </div>
                   <p className="text-sm text-slate-600 font-medium italic">"{e.remarks}"</p>
                 </div>
               ))}
             </div>
          )}
        </div>
      </main>

      {/* SLOT SELECTION MODAL */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl">
            <h3 className="text-xl font-black mb-8 text-center uppercase tracking-widest text-slate-400">Select Activity</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Object.entries(ACTIVITY_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => handleSlotAction(key)} className={`flex flex-col items-center gap-2 p-5 rounded-[28px] ${cfg.color} ${cfg.text} hover:scale-105 transition-all shadow-lg`}>
                   {cfg.icon} <span className="font-black text-[9px] uppercase tracking-widest">{cfg.label}</span>
                </button>
              ))}
            </div>
            
            <button onClick={() => handleSlotAction('DELETE')} className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px] hover:bg-red-100 transition-colors mb-2">
              <Trash2 size={14}/> {t.clearSlot}
            </button>
            <button onClick={() => setIsSlotModalOpen(false)} className="w-full py-4 bg-slate-100 rounded-2xl font-black text-slate-400 uppercase text-[10px] hover:bg-slate-200 transition-colors">{t.cancel}</button>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (WORK, JJP, OTHER) */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black uppercase tracking-wider">{ACTIVITY_CONFIG[detailData.type]?.label}</h3>
               <div className="flex gap-2">
                 <button onClick={() => setIsSlotModalOpen(true)} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl text-[10px] font-black uppercase">{t.changeCat}</button>
                 <button onClick={() => handleSlotAction('DELETE')} className="p-3 text-red-500 hover:bg-red-50 rounded-2xl"><Trash2 size={20}/></button>
               </div>
            </div>
            
            {/* Show Sub-types only for WORK */}
            {detailData.type === 'WORK' && (
              <div className="grid grid-cols-3 gap-2 mb-6">
                {WORK_TYPES.map(wt => (
                  <button key={wt.id} onClick={() => setDetailData({...detailData, subType: wt.id})} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${detailData.subType === wt.id ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                    {wt.icon} <span className="font-black text-[8px] uppercase">{t[wt.label]}</span>
                  </button>
                ))}
              </div>
            )}

            <textarea 
              value={detailData.remarks} 
              onChange={e => setDetailData({...detailData, remarks: e.target.value})}
              placeholder={t.remarks}
              className={`w-full h-32 p-4 bg-slate-50 rounded-2xl text-sm font-medium border-0 focus:ring-2 focus:ring-${detailData.type === 'WORK' ? 'orange' : detailData.type === 'JJP' ? 'purple' : 'slate'}-500 mb-6 resize-none`}
            />
            <div className="flex gap-3">
              <button onClick={() => setIsDetailModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-slate-400 uppercase text-[10px]">{t.cancel}</button>
              <button onClick={() => handleSlotAction(detailData.type, detailData)} className={`flex-[2] py-4 ${ACTIVITY_CONFIG[detailData.type]?.color} text-white rounded-2xl font-black shadow-lg uppercase text-[10px]`}>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED GYM MODAL */}
      {isGymModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-slate-50 rounded-[40px] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-white px-8 py-6 border-b flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black flex items-center gap-2"><Dumbbell className="text-indigo-600"/> {t.gymProgress}</h3>
                <button onClick={() => setIsSlotModalOpen(true)} className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase">{t.changeCat}</button>
              </div>
              <button onClick={() => setIsGymModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentWorkout.map((ex, exIdx) => (
                <div key={exIdx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative group">
                  <div className="flex justify-between items-center mb-4">
                    <select value={ex.name} onChange={e => { const u = [...currentWorkout]; u[exIdx].name = e.target.value; setCurrentWorkout(u); }} className="flex-1 font-black p-3 bg-slate-50 rounded-2xl text-sm border-0 focus:ring-2 focus:ring-indigo-600 outline-none">
                      {EXERCISE_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button onClick={() => setCurrentWorkout(currentWorkout.filter((_, i) => i !== exIdx))} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={18}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {ex.sets.map((s, sIdx) => (
                      <div key={sIdx} className="flex gap-1 bg-slate-50 p-3 rounded-2xl">
                        <input type="number" placeholder={t.weight} value={s.weight} onChange={e => { const u = [...currentWorkout]; u[exIdx].sets[sIdx].weight = e.target.value; setCurrentWorkout(u); }} className="w-1/2 bg-transparent text-center font-black text-indigo-600 outline-none" />
                        <span className="text-[10px] text-slate-300 flex items-center">kg</span>
                        <input type="number" placeholder={t.reps} value={s.reps} onChange={e => { const u = [...currentWorkout]; u[exIdx].sets[sIdx].reps = e.target.value; setCurrentWorkout(u); }} className="w-1/2 bg-transparent text-center font-black outline-none" />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { const u = [...currentWorkout]; u[exIdx].sets.push({weight:'', reps:''}); setCurrentWorkout(u); }} className="w-full py-3 bg-slate-50 rounded-2xl text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors">+ Add Set</button>
                </div>
              ))}
              <button onClick={() => setCurrentWorkout([...currentWorkout, {name: EXERCISE_LIST[0], sets: [{weight:'', reps:''}]}])} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black hover:bg-slate-100 uppercase text-[10px] transition-all">+ {t.addEx}</button>
            </div>
            <div className="p-6 bg-white border-t flex gap-4">
               <button onClick={() => handleSlotAction('DELETE')} className="p-5 text-red-500 bg-red-50 rounded-3xl"><Trash2/></button>
               <button onClick={async () => { 
                 await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workouts', selection.dayKey), { exercises: currentWorkout, date: selection.dayKey }); 
                 await handleSlotAction('GYM', true);
                 setIsGymModalOpen(false); 
               }} className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all uppercase tracking-widest">{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}