
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameStage, Language, Player, GameMode } from './types';
import TVView from './components/TVView';
import PhoneView from './components/PhoneView';
import * as gemini from './geminiService';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
  const [hostMessage, setHostMessage] = useState<string>('AJ & VJ ARE READY...');
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const [state, setState] = useState<GameState>({
    roomCode: roomCode, stage: GameStage.LOBBY, players: [], mode: GameMode.CONFIDENTLY_WRONG,
    language: Language.MIXED, round: 1, history: [], topicOptions: []
  });

  const lastActivityRef = useRef(Date.now());

  // Strict Sanitization to prevent circular structure errors in Firebase
  const sync = (updates: Partial<GameState>) => {
    if (!db || !roomCode) return;
    try {
      // Create a shallow copy and remove any potential problematic fields
      const cleanUpdates: any = {};
      Object.keys(updates).forEach(key => {
        const val = (updates as any)[key];
        if (val !== undefined && typeof val !== 'function') {
           cleanUpdates[key] = JSON.parse(JSON.stringify(val));
        }
      });
      updateDoc(doc(db, "games", roomCode), cleanUpdates).catch(err => {
        console.error("Firebase Sync Error:", err);
      });
    } catch (e) {
      console.error("Sanitization Error:", e);
    }
  };

  useEffect(() => {
    if (!roomCode || !db) return;
    const unsub = onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      if (snapshot.exists()) {
        const newState = snapshot.data() as GameState;
        setState(newState);
        if (viewMode === 'TV' && audioEnabled) {
          gemini.updateBGM(newState.stage);
        }
      }
    });
    return unsub;
  }, [roomCode, audioEnabled, viewMode]);

  useEffect(() => {
    if (viewMode !== 'TV' || !audioEnabled || state.stage !== GameStage.LOBBY) return;
    const interval = setInterval(() => {
      if ((Date.now() - lastActivityRef.current) > 25000) {
        gemini.generateLobbyIdleComment(state).then(msg => {
          setHostMessage(msg);
          gemini.speakText(msg, state.mode);
          lastActivityRef.current = Date.now();
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [viewMode, audioEnabled, state.stage, state.mode]);

  useEffect(() => {
    if (viewMode === 'TV' && !roomCode && db) {
      const code = Math.random().toString(36).substr(2, 4).toUpperCase();
      const initialState: GameState = {
        roomCode: code, stage: GameStage.LOBBY, players: [], mode: GameMode.CONFIDENTLY_WRONG,
        language: Language.MIXED, round: 1, history: [], topicOptions: []
      };
      setDoc(doc(db, "games", code), initialState).then(() => setRoomCode(code));
    }
  }, [viewMode, roomCode]);

  const handleStartShow = async () => {
    try {
      await gemini.initAudio();
      setAudioEnabled(true);
      gemini.updateBGM(state.stage);
      const intro = await gemini.generateIntro(state);
      setHostMessage(intro);
      await gemini.speakText(intro, state.mode);
      lastActivityRef.current = Date.now();
    } catch (e) {
      setAudioEnabled(true);
    }
  };

  const handleResetGame = async () => {
    if (!confirm("Stop & Restart game results? Players will stay joined.")) return;
    sync({
      stage: GameStage.LOBBY,
      round: 1,
      players: state.players.map(p => ({ ...p, score: 0, lastAnswer: '' })),
      topic: '',
      currentQuestion: undefined,
      topicOptions: [],
      topicPickerId: undefined
    });
    const msg = "AJ: Restarting the chaos! VJ: Don't mess up this time logic pieces.";
    setHostMessage(msg);
    gemini.speakText(msg, state.mode);
  };

  const handleStartTutorial = async () => {
    sync({ stage: GameStage.TUTORIAL });
    for (let i = 0; i < 5; i++) {
      const msg = gemini.getLocalTutorial(i);
      setHostMessage(msg);
      await gemini.speakText(msg, state.mode);
      await new Promise(r => setTimeout(r, 4500));
    }
    sync({ stage: GameStage.LOBBY });
  };

  const handleJoin = async (name: string, age: number, lang: Language) => {
    if (!db || !roomCode) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    await updateDoc(doc(db, "games", roomCode), { players: arrayUnion(newPlayer) });
    setPlayerId(id);
    localStorage.setItem('AJ_PLAYER_ID', id);
    const comment = await gemini.generateJoinComment(state, name);
    setHostMessage(comment);
    gemini.speakText(comment, state.mode);
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game select-none">
      {viewMode === 'TV' ? (
        <div className="h-full relative">
          <TVView state={state} hostMessage={hostMessage} iqData="" onReset={handleResetGame} />
          {!audioEnabled ? (
            <div className="fixed inset-0 bg-black/95 z-[1000] flex flex-col items-center justify-center p-20 text-center">
               <div className="w-48 h-48 bg-fuchsia-600 rounded-full flex items-center justify-center text-8xl mb-12 shadow-[0_0_120px_rgba(192,38,211,0.8)] border-4 border-white animate-pulse">🎤</div>
               <h1 className="text-[10rem] font-black italic uppercase leading-none mb-12 tracking-tighter text-white">MIND MASH</h1>
               <button onClick={handleStartShow} className="bg-white text-black px-32 py-10 rounded-[3rem] text-6xl font-black shadow-3xl hover:scale-110 active:scale-95 transition-all uppercase">ACTIVATE AJ & VJ</button>
            </div>
          ) : (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-[500]">
               {state.stage === GameStage.LOBBY && (
                  <>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => sync({ mode: state.mode === GameMode.CONFIDENTLY_WRONG ? GameMode.ACTUALLY_GENIUS : GameMode.CONFIDENTLY_WRONG })}
                        className={`px-10 py-4 rounded-full text-2xl font-black border-2 transition-all shadow-xl ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-600 border-white' : 'bg-fuchsia-600 border-white/20'}`}
                      >
                        MODE: {state.mode === GameMode.ACTUALLY_GENIUS ? 'ACTUALLY GENIUS' : 'CONFIDENTLY WRONG'}
                      </button>
                    </div>
                    <div className="flex gap-6">
                      <button onClick={handleStartTutorial} className="bg-indigo-600 px-12 py-6 rounded-full text-3xl font-black border-2 border-white/20 shadow-xl hover:bg-indigo-500 uppercase">RULES?</button>
                      {state.players.length > 0 && (
                        <button onClick={async () => {
                          sync({ stage: GameStage.LOADING });
                          const w = await gemini.generateWarmup(state);
                          sync({ stage: GameStage.WARMUP, warmupQuestion: w.question });
                          gemini.speakText(w.question, state.mode);
                        }} className="bg-fuchsia-600 px-20 py-8 rounded-full text-5xl font-black border-4 border-white shadow-3xl uppercase">START GAME</button>
                      )}
                    </div>
                  </>
               )}
            </div>
          )}
        </div>
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onSelectTopic={async (t) => {
          sync({ topic: t, stage: GameStage.LOADING });
          const q = await gemini.generateQuestion({ ...state, topic: t });
          sync({ currentQuestion: q, stage: GameStage.QUESTION, players: state.players.map(p => ({ ...p, lastAnswer: '' })) });
          gemini.speakText(q.textEn, state.mode);
        }} onSubmitAnswer={(a) => sync({ players: state.players.map(p => p.id === playerId ? { ...p, lastAnswer: a } : p) })} onClaimChallenge={()=>{}} onSendRebuttal={()=>{}} onReset={() => { localStorage.clear(); window.location.reload(); }} />
      )}
    </div>
  );
};

export default App;
