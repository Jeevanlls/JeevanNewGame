
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameStage, Language, Player, GameMode } from './types';
import TVView from './components/TVView';
import PhoneView from './components/PhoneView';
import * as gemini from './geminiService';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const App: React.FC = () => {
  const [viewMode] = useState<'TV' | 'PHONE'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('room') ? 'PHONE' : 'TV';
  });
  
  const [roomCode, setRoomCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.toUpperCase() || '';
  });

  const [playerId, setPlayerId] = useState<string>(() => localStorage.getItem('AJ_PLAYER_ID') || '');
  const [hostMessage, setHostMessage] = useState<string>('AJ & VJ ON-AIR WAITING...');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [urgency, setUrgency] = useState(0);
  const lastCommentTime = useRef(Date.now());
  const lastCommentText = useRef('');
  
  const [state, setState] = useState<GameState>({
    roomCode: roomCode, stage: GameStage.LOBBY, players: [], mode: GameMode.CONFIDENTLY_WRONG,
    language: Language.MIXED, round: 1, history: [], topicOptions: [], reactions: [], isPaused: false
  });

  // 1. TV ROOM INITIALIZATION
  useEffect(() => {
    if (viewMode === 'TV' && !roomCode && db) {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      console.log("Creating new radio frequency:", code);
      setRoomCode(code);
      const initialState: GameState = {
        roomCode: code,
        stage: GameStage.LOBBY,
        players: [],
        mode: GameMode.CONFIDENTLY_WRONG,
        language: Language.MIXED,
        round: 1,
        history: [],
        topicOptions: [],
        reactions: [],
        isPaused: false
      };
      setDoc(doc(db, "games", code), initialState).then(() => {
        console.log("Radio frequency live on cloud.");
      });
    }
  }, [viewMode, db]);

  // 2. REAL-TIME CLOUD SYNC
  useEffect(() => {
    if (!roomCode || !db) return;
    const unsub = onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      if (snapshot.exists()) {
        const newState = snapshot.data() as GameState;
        setState(newState);
        if (viewMode === 'TV' && audioEnabled) {
          gemini.updateBGM(newState.stage, urgency, newState.isPaused);
        }
      } else if (viewMode === 'PHONE') {
        console.warn("Room vanished!");
      }
    });
    return unsub;
  }, [roomCode, audioEnabled, viewMode, urgency]);

  const sync = (updates: Partial<GameState>) => {
    if (!db || !roomCode) return;
    try {
      const cleanUpdates: any = {};
      Object.keys(updates).forEach(key => {
        const val = (updates as any)[key];
        if (val !== undefined && typeof val !== 'function') {
           cleanUpdates[key] = JSON.parse(JSON.stringify(val));
        }
      });
      updateDoc(doc(db, "games", roomCode), cleanUpdates);
    } catch (e) { console.error("Sync Error:", e); }
  };

  // 3. AI BANTER ENGINE (REPETITION FIXED)
  useEffect(() => {
    if (viewMode !== 'TV' || !audioEnabled || state.isPaused) return;
    const interval = setInterval(async () => {
      const now = Date.now();
      if (now - lastCommentTime.current < 30000) return; // Cooldown increased

      let trigger = '';
      if (state.stage === GameStage.LOBBY) {
        trigger = state.players.length === 0 ? "Empty lobby, AJ is angry." : "Waiting for players to start.";
      } else if (state.stage === GameStage.QUESTION) {
        const slow = state.players.filter(p => !p.lastAnswer);
        if (slow.length > 0) trigger = `${slow[0].name} is a logic piece, sleeping.`;
      }

      if (trigger) {
        const roast = await gemini.generateReactiveComment(state, trigger);
        if (roast && roast !== lastCommentText.current) {
          setHostMessage(roast);
          gemini.speakText(roast, state.mode);
          lastCommentText.current = roast;
          lastCommentTime.current = now;
        }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [state.stage, state.players.length, audioEnabled, state.isPaused]);

  // 4. PLAYER JOINING
  const handleJoin = async (name: string, age: number, lang: Language) => {
    if (!db || !roomCode) return;
    const roomRef = doc(db, "games", roomCode);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) {
      alert("Frequency not found! AJ might have ended the show.");
      window.location.reload();
      return;
    }
    
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    await updateDoc(roomRef, { players: arrayUnion(newPlayer) });
    setPlayerId(id);
    localStorage.setItem('AJ_PLAYER_ID', id);

    const roast = await gemini.generateReactiveComment(state, `New victim ${name} joined.`);
    setHostMessage(roast);
    gemini.speakText(roast, state.mode);
  };

  const handleStartGame = async () => {
    if (state.players.length === 0) {
      const m = "AJ: Players enga da? VJ: Room is empty, start panna mudiyathu.";
      setHostMessage(m); gemini.speakText(m); return;
    }
    sync({ stage: GameStage.LOADING, isPaused: false });
    const options = await gemini.generateTopicOptions(state);
    const pickerId = state.players[Math.floor(Math.random() * state.players.length)].id;
    sync({ stage: GameStage.TOPIC_SELECTION, topicOptions: options, topicPickerId: pickerId });
    const msg = "AJ: Select battle da! VJ: Mixed logic coming.";
    setHostMessage(msg); gemini.speakText(msg);
  };

  const togglePause = () => {
    const nextPause = !state.isPaused;
    sync({ isPaused: nextPause });
    const msg = nextPause ? "AJ: Break-u! VJ: Logic on hold." : "AJ: WE ARE BACK! VJ: Play da.";
    setHostMessage(msg); gemini.speakText(msg);
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game select-none">
      {viewMode === 'TV' ? (
        <div className="h-full relative">
          <TVView state={state} hostMessage={hostMessage} iqData="" onReset={() => sync({ stage: GameStage.LOBBY, players: state.players.map(p => ({...p, score: 0, lastAnswer: ''})), isPaused: false, currentQuestion: undefined, topic: '' })} onStop={() => sync({ stage: GameStage.LOBBY, isPaused: false, currentQuestion: undefined, topic: '' })} />
          
          <div className="fixed bottom-0 left-0 w-full p-10 flex justify-center items-center gap-6 bg-gradient-to-t from-black via-black/80 to-transparent z-[999]">
            {!audioEnabled ? (
              <button onClick={async () => { await gemini.initAudio(); setAudioEnabled(true); gemini.updateBGM(state.stage); }} className="bg-white text-black px-20 py-8 rounded-full text-5xl font-black shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-105 transition-all animate-pulse">START ON-AIR 🎙️</button>
            ) : (
              <div className="flex items-center gap-6">
                {state.stage === GameStage.LOBBY && (
                  <div className="flex gap-4">
                    <button onClick={() => sync({ mode: state.mode === GameMode.CONFIDENTLY_WRONG ? GameMode.ACTUALLY_GENIUS : GameMode.CONFIDENTLY_WRONG })} className={`px-10 py-5 rounded-full text-2xl font-black border-4 ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-600 border-white' : 'bg-blue-600 border-blue-400'}`}>
                      {state.mode === GameMode.ACTUALLY_GENIUS ? 'GENIUS MODE' : 'MOKKA MODE'}
                    </button>
                    <button onClick={handleStartGame} disabled={state.players.length === 0} className={`bg-fuchsia-600 px-24 py-8 rounded-full text-5xl font-black border-4 border-white shadow-3xl uppercase transition-all ${state.players.length === 0 ? 'opacity-20 scale-90' : 'hover:bg-fuchsia-500 hover:scale-105'}`}>
                      GO LIVE 🚀
                    </button>
                  </div>
                )}
                {state.stage !== GameStage.LOBBY && (
                  <div className="flex gap-4">
                    <button onClick={togglePause} className={`px-12 py-6 rounded-full font-black uppercase text-2xl border-4 transition-all ${state.isPaused ? 'bg-amber-500 border-white' : 'bg-white/10 border-white/20'}`}>
                      {state.isPaused ? 'RESUME ▶️' : 'PAUSE ⏸️'}
                    </button>
                  </div>
                )}
                <button onClick={() => { if(confirm("End the show?")) sync({ stage: GameStage.LOBBY, isPaused: false, currentQuestion: undefined, topic: '', players: state.players.map(p=>({...p, score: 0, lastAnswer: ''})) }) }} className="bg-red-600 px-12 py-6 rounded-full font-black uppercase text-2xl border-4 border-white shadow-lg hover:bg-red-500">STOP ⏹️</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onSelectTopic={async (t) => {
          sync({ topic: t, stage: GameStage.LOADING });
          const q = await gemini.generateQuestion({ ...state, topic: t });
          sync({ currentQuestion: q, stage: GameStage.QUESTION, players: state.players.map(p => ({ ...p, lastAnswer: '' })) });
        }} onSubmitAnswer={(a) => sync({ players: state.players.map(p => p.id === playerId ? { ...p, lastAnswer: a } : p) })} onRoast={async () => {
          const roast = await gemini.generateReactiveComment(state, `Roast request from ${state.players.find(p=>p.id===playerId)?.name}`);
          setHostMessage(roast);
          gemini.speakText(roast, state.mode);
        }} onReaction={(e) => updateDoc(doc(db, "games", roomCode), { reactions: arrayUnion({ id: Math.random().toString(), emoji: e, x: Math.random() * 80 + 10 }) })} onReset={() => { localStorage.clear(); window.location.reload(); }} />
      )}
    </div>
  );
};

export default App;
