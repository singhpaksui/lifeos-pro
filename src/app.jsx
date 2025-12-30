import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, getDoc, query, orderBy 
} from 'firebase/firestore';
import { 
  Calendar, Layout, Target, Heart, BarChart3, Clock, Trash2, ChevronLeft, ChevronRight,
  Briefcase, Dumbbell, Utensils, Moon, Sun, Plus, Search, Send, Microscope, ListPlus, 
  TrendingUp, Activity, Users, Share2, Copy, Check, X, Phone, Settings, Zap, Languages, LogOut
} from 'lucide-react';

/**
 * MANDATORY: FIREBASE CONFIGURATION
 */
var manualFirebaseConfig = {
  apiKey: "AIzaSyBbJjQrikfNIftAmoVXaEcPDdgJuPb3Hh0",
  authDomain: "lyfeos-cc0be.firebaseapp.com",
  projectId: "lyfeos-cc0be",
  storageBucket: "lyfeos-cc0be.firebasestorage.app",
  messagingSenderId: "849608106926",
  appId: "1:849608106926:web:68dc438783d1c9f31bde3f",
  measurementId: "G-L2HPHMBV35"
};

function getAppConfig() {
  try {
    const envConfig = typeof window !== 'undefined' ? window.__firebase_config : undefined;
    if (envConfig) return JSON.parse(envConfig);
  } catch (e) {}
  return manualFirebaseConfig;
}

const appConfiguration = getAppConfig();
const app = initializeApp(appConfiguration);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = (typeof window !== 'undefined' && window.__app_id) ? window.__app_id : 'lifeos-pro-v1';

const TRANSLATIONS = {
  en: {
    planner: "Planner", gymProgress: "Gym Progress", workMetrics: "Work Metrics",
    gym: "GYM", work: "WORK", meal: "MEAL", rest: "REST", wake: "WAKE", other: "OTHER",
    save: "Save", cancel: "Cancel", delete: "Delete", addEx: "Add Exercise", addAct: "Add Activity",
    remarks: "Notes...", weight: "kg", reps: "reps", editEvent: "Update Slot", createEvent: "Schedule Time",
    logout: "Log Out", loading: "LifeOS Loading...", noData: "No data recorded yet."
  },
  zh: {
    planner: "日程規劃", gymProgress: "健身進度", workMetrics: "工作指標",
    gym: "健身", work: "工作", meal: "用餐", rest: "休息", wake: "起床", other: "其他",
    save: "保存", cancel: "取消", delete: "刪除", addEx: "新增動作", addAct: "新增活動",
    remarks: "備註...", weight: "公斤", reps: "次數", editEvent: "修改時段", createEvent: "安排行程",
    logout: "登出", loading: "載入中...", noData: "尚無記錄資料。"
  }
};

const EXERCISE_LIST = ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row", "Bicep Curl", "Tricep Pushdown"];
const WORK_CATS = [
  { id: 'call', label: 'Call', icon: <Phone size={14}/> },
  { id: 'search', label: 'Search', icon: <Search size={14}/> },
  { id: 'send', label: 'Send', icon: <Send size={14}/> },
  { id: 'research', label: 'Research', icon: <Microscope size={14}/> }
];
const SLOTS = Array.from({ length: 48 }, (_, i) => i * 0.5);

export default function App() {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('planner');
  const [events, setEvents] = useState({});
  const [allWorkouts, setAllWorkouts] = useState([]);
  const [allWorkSessions, setAllWorkSessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [selection, setSelection] = useState(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isGymModalOpen, setIsGymModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  
  const [currentWorkout, setCurrentWorkout] = useState([]);
  const [currentWorkSession, setCurrentWorkSession] = useState([]);
  
  const isDragging = useRef(false);
  const t = TRANSLATIONS[lang];

  const ACTIVITY_CONFIG = {
    GYM: { color: 'bg-indigo-600', text: 'text-white', icon: <Dumbbell size={14} />, label: t.gym },
    HH: { color: 'bg-orange-500', text: 'text-white', icon: <Briefcase size={14} />, label: t.work },
    MEAL: { color: 'bg-red-500', text: 'text-white', icon: <Utensils size={14} />, label: t.meal },
    REST: { color: 'bg-slate-700', text: 'text-white', icon: <Moon size={14} />, label: t.rest },
    WAKE: { color: 'bg-amber-100', text: 'text-amber-900', icon: <Sun size={14} />, label: t.wake },
    OTHER: { color: 'bg-slate-200', text: 'text-gray-600', icon: <Clock size={14} />, label: t.other }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = typeof window !== 'undefined' ? window.__initial_auth_token : undefined;
      if (token) {
        await signInWithCustomToken(auth, token).catch(() => signInAnonymously(auth));
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Listeners for Planner, Gym, and Work collections
  useEffect(() => {
    if (!user) return;
    
    const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'events'), (snap) => {
      const data = {};
      snap.forEach(d => data[d.id] = d.data());
      setEvents(data);
    });

    const unsubWorkouts = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'workouts'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      // Sort by date string descending
      setAllWorkouts(list.sort((a, b) => b.date.localeCompare(a.date)));
    });

    const unsubWork = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'work_sessions'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setAllWorkSessions(list.sort((a, b) => b.date.localeCompare(a.date)));
    });

    return () => { unsubEvents(); unsubWorkouts(); unsubWork(); };
  }, [user]);

  const getDayKey = (date) => date.toISOString().split('T')[0];

  const openDetailedModal = async (type, dayKey) => {
    if (!user) return;
    if (type === 'GYM') {
      setCurrentWorkout([{ name: EXERCISE_LIST[0], sets: [{ weight: '', reps: '' }] }]);
      setIsGymModalOpen(true);
      const snap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workouts', dayKey));
      if (snap.exists()) setCurrentWorkout(snap.data().exercises);
    } else if (type === 'HH') {
      setCurrentWorkSession([{ category: 'call', remarks: '' }]);
      setIsWorkModalOpen(true);
      const snap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'work_sessions', dayKey));
      if (snap.exists()) setCurrentWorkSession(snap.data().activities);
    }
  };

  const handleSlotAction = async (type) => {
    if (!selection || !user) return;
    const { dayKey, slots } = selection;
    setIsSlotModalOpen(false);

    if (type === 'DELETE') {
      const deletes = slots.map(s => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', `${dayKey}-${s.toString().replace('.','_')}`)));
      await Promise.all(deletes);
      return;
    }

    const updates = slots.map(slot => setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'events', `${dayKey}-${slot.toString().replace('.','_')}`), {
      type, slot, dayKey, timestamp: Date.now()
    }));
    await Promise.all(updates);
    
    if (type === 'GYM' || type === 'HH') {
      openDetailedModal(type, dayKey);
    }
  };

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
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col hidden lg:flex">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Layout size={24} /></div>
          <h1 className="text-xl font-black tracking-tighter">LifeOS</h1>
        </div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('planner')} className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${activeTab === 'planner' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'}`}><Calendar size={18}/> <span className="font-bold">{t.planner}</span></button>
          <button onClick={() => setActiveTab('gym-progress')} className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${activeTab === 'gym-progress' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'}`}><TrendingUp size={18}/> <span className="font-bold">{t.gymProgress}</span></button>
          <button onClick={() => setActiveTab('work-analytics')} className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${activeTab === 'work-analytics' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-100'}`}><Activity size={18}/> <span className="font-bold">{t.workMetrics}</span></button>
        </nav>
        <div className="pt-6 border-t space-y-2">
           <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')} className="w-full p-4 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-2"><Languages size={14}/> {lang === 'en' ? '中文' : 'English'}</button>
           <button onClick={() => signOut(auth)} className="w-full p-4 text-[10px] font-black uppercase text-slate-400 hover:text-red-500 flex items-center justify-center gap-2"><LogOut size={14}/> {t.logout}</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
             {activeTab === 'planner' && (
               <>
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-7); setSelectedDate(d); }} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20}/></button>
                <h2 className="text-lg font-black">{selectedDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+7); setSelectedDate(d); }} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={20}/></button>
               </>
             )}
             {activeTab !== 'planner' && <h2 className="text-lg font-black uppercase tracking-widest">{activeTab === 'gym-progress' ? t.gymProgress : t.workMetrics}</h2>}
          </div>
          <div className="text-xs font-black text-slate-400 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> ONLINE</div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {/* TAB: PLANNER */}
          {activeTab === 'planner' && (
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
               <div className="grid grid-cols-8 border-b bg-slate-50/30 font-black uppercase text-[10px] text-slate-400">
                 <div className="p-4 border-r"></div>
                 {weekRange.map((date, i) => (
                   <div key={i} className={`p-4 text-center border-r last:border-r-0 ${getDayKey(date) === getDayKey(new Date()) ? 'bg-indigo-50/50 text-indigo-600' : ''}`}>
                     <div>{date.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-TW', { weekday: 'short' })}</div>
                     <div className="text-xl text-slate-900">{date.getDate()}</div>
                   </div>
                 ))}
               </div>
               <div className="h-[calc(100vh-220px)] overflow-y-auto">
                 {SLOTS.map(slot => (
                   <div key={slot} className="grid grid-cols-8 border-b border-slate-50 min-h-[48px]">
                     <div className="p-2 text-right border-r text-[9px] font-bold text-slate-300 flex items-center justify-end">{slot % 1 === 0 ? `${Math.floor(slot)}:00` : ''}</div>
                     {weekRange.map((date, i) => {
                       const dayKey = getDayKey(date);
                       const eventId = `${dayKey}-${slot.toString().replace('.', '_')}`;
                       const event = events[eventId];
                       const config = event ? ACTIVITY_CONFIG[event.type] : null;
                       return (
                         <div key={i} 
                           onMouseDown={() => { isDragging.current = true; setSelection({ dayKey, slots: [slot] }); }}
                           onMouseEnter={() => { if (isDragging.current && selection?.dayKey === dayKey) setSelection(p => ({...p, slots: [...new Set([...p.slots, slot])]})); }}
                           onMouseUp={() => { if (isDragging.current) setIsSlotModalOpen(true); isDragging.current = false; }}
                           onClick={() => {
                              setSelection({ dayKey, slots: [slot] });
                              if (event?.type === 'GYM' || event?.type === 'HH') openDetailedModal(event.type, dayKey);
                              else setIsSlotModalOpen(true);
                           }}
                           className="p-0.5 border-r border-slate-50 last:border-r-0 cursor-crosshair relative">
                           {config && (
                             <div className={`w-full h-full rounded-lg px-2 flex items-center gap-2 shadow-sm ${config.color} ${config.text} transition-transform active:scale-95`}>
                               {config.icon} <span className="text-[10px] font-black uppercase truncate">{config.label}</span>
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

          {/* TAB: GYM PROGRESS */}
          {activeTab === 'gym-progress' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {allWorkouts.length === 0 && <div className="text-center py-20 text-slate-300 font-bold">{t.noData}</div>}
              {allWorkouts.map(wk => (
                <div key={wk.id} className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black flex items-center gap-3"><Dumbbell className="text-indigo-600"/> {wk.date}</h3>
                    <button onClick={() => { setSelection({dayKey: wk.date}); openDetailedModal('GYM', wk.date); }} className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">Edit Entry</button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {wk.exercises.map((ex, idx) => (
                      <div key={idx} className="bg-slate-50 p-5 rounded-2xl">
                        <p className="font-black text-slate-800 mb-2 uppercase text-xs tracking-widest">{ex.name}</p>
                        <div className="space-y-1">
                          {ex.sets.map((s, si) => (
                            <div key={si} className="flex justify-between text-sm font-bold text-slate-400">
                              <span>Set {si+1}</span>
                              <span className="text-indigo-600">{s.weight}kg × {s.reps} reps</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: WORK METRICS */}
          {activeTab === 'work-analytics' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {allWorkSessions.length === 0 && <div className="text-center py-20 text-slate-300 font-bold">{t.noData}</div>}
              {allWorkSessions.map(ws => (
                <div key={ws.id} className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black flex items-center gap-3"><Briefcase className="text-orange-500"/> {ws.date}</h3>
                    <button onClick={() => { setSelection({dayKey: ws.date}); openDetailedModal('HH', ws.date); }} className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-4 py-2 rounded-xl hover:bg-orange-100 transition-colors">Edit Entry</button>
                  </div>
                  <div className="space-y-4">
                    {ws.activities.map((act, idx) => (
                      <div key={idx} className="flex gap-4 items-start bg-slate-50 p-5 rounded-2xl">
                        <div className="bg-white p-3 rounded-xl shadow-sm text-orange-500">
                          {WORK_CATS.find(c => c.id === act.category)?.icon || <Activity size={14}/>}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-orange-500 mb-1">{act.category}</p>
                          <p className="text-sm font-bold text-slate-600 leading-relaxed">{act.remarks || 'No notes added.'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* SLOT TYPE MODAL */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black">{t.editEvent}</h3>
               <button onClick={() => handleSlotAction('DELETE')} className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors"><Trash2 size={20}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(ACTIVITY_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => handleSlotAction(key)} className={`flex flex-col items-center gap-2 p-5 rounded-[28px] ${cfg.color} ${cfg.text} hover:scale-105 active:scale-95 transition-all shadow-lg`}>
                   {cfg.icon} <span className="font-black text-[9px] uppercase tracking-widest">{cfg.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setIsSlotModalOpen(false)} className="w-full mt-6 py-4 bg-slate-100 rounded-2xl font-black text-slate-400 uppercase text-[10px] tracking-widest">{t.cancel}</button>
          </div>
        </div>
      )}

      {/* GYM DATA ENTRY MODAL */}
      {isGymModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-slate-50 rounded-[40px] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="bg-white px-8 py-6 border-b flex justify-between items-center">
              <h3 className="text-2xl font-black flex items-center gap-2"><Dumbbell className="text-indigo-600"/> {t.gymProgress}</h3>
              <button onClick={() => setIsGymModalOpen(false)}><X/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentWorkout.map((ex, exIdx) => (
                <div key={exIdx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <select value={ex.name} onChange={e => { const u = [...currentWorkout]; u[exIdx].name = e.target.value; setCurrentWorkout(u); }} className="flex-1 font-black p-3 bg-slate-50 rounded-2xl text-sm border-0 focus:ring-2 focus:ring-indigo-600">
                      {EXERCISE_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button onClick={() => setCurrentWorkout(currentWorkout.filter((_, i) => i !== exIdx))} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={18}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {ex.sets.map((s, sIdx) => (
                      <div key={sIdx} className="flex gap-1 bg-slate-50 p-3 rounded-2xl border border-transparent focus-within:border-indigo-100">
                        <input type="number" placeholder={t.weight} value={s.weight} onChange={e => { const u = [...currentWorkout]; u[exIdx].sets[sIdx].weight = e.target.value; setCurrentWorkout(u); }} className="w-1/2 bg-transparent text-center font-black text-indigo-600 outline-none" />
                        <span className="text-[10px] text-slate-300 flex items-center">kg</span>
                        <input type="number" placeholder={t.reps} value={s.reps} onChange={e => { const u = [...currentWorkout]; u[exIdx].sets[sIdx].reps = e.target.value; setCurrentWorkout(u); }} className="w-1/2 bg-transparent text-center font-black outline-none" />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { const u = [...currentWorkout]; u[exIdx].sets.push({weight:'', reps:''}); setCurrentWorkout(u); }} className="w-full py-3 bg-slate-50 rounded-2xl text-indigo-600 text-[10px] font-black uppercase tracking-widest">+ Add Set</button>
                </div>
              ))}
              <button onClick={() => setCurrentWorkout([...currentWorkout, {name: EXERCISE_LIST[0], sets: [{weight:'', reps:''}]}])} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black hover:bg-slate-100 transition-colors uppercase text-[10px] tracking-widest">+ {t.addEx}</button>
            </div>
            <div className="p-6 bg-white border-t">
               <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workouts', selection.dayKey), { exercises: currentWorkout, date: selection.dayKey }); setIsGymModalOpen(false); }} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all">{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* WORK DATA ENTRY MODAL */}
      {isWorkModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-slate-50 rounded-[40px] w-full max-w-2xl h-[75vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="bg-white px-8 py-6 border-b flex justify-between items-center">
              <h3 className="text-2xl font-black flex items-center gap-2"><Briefcase className="text-orange-500"/> {t.workMetrics}</h3>
              <button onClick={() => setIsWorkModalOpen(false)}><X/></button>
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {currentWorkSession.map((act, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      {WORK_CATS.map(cat => (
                        <button key={cat.id} onClick={() => { const u = [...currentWorkSession]; u[idx].category = cat.id; setCurrentWorkSession(u); }} className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase transition-all ${act.category === cat.id ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{cat.label}</button>
                      ))}
                    </div>
                    <button onClick={() => setCurrentWorkSession(currentWorkSession.filter((_, i) => i !== idx))} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                  <textarea placeholder={t.remarks} value={act.remarks} onChange={e => { const u = [...currentWorkSession]; u[idx].remarks = e.target.value; setCurrentWorkSession(u); }} className="w-full bg-slate-50 rounded-3xl p-5 text-sm font-bold border-0 focus:ring-2 focus:ring-orange-500 h-32 resize-none outline-none" />
                </div>
              ))}
              <button onClick={() => setCurrentWorkSession([...currentWorkSession, {category: 'call', remarks: ''}])} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black hover:bg-slate-100 transition-colors uppercase text-[10px] tracking-widest">+ {t.addAct}</button>
            </div>
            <div className="p-6 bg-white border-t">
              <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'work_sessions', selection.dayKey), { activities: currentWorkSession, date: selection.dayKey }); setIsWorkModalOpen(false); }} className="w-full py-5 bg-orange-500 text-white rounded-3xl font-black shadow-lg shadow-orange-100 active:scale-95 transition-all">{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}