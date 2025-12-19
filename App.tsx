
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameStage, Language, Player, GameMode, Reaction } from './types';
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
  const [hostMessage, setHostMessage] = useState<string>('AJ & VJ ON-AIR WAITING...');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [urgency, setUrgency] = useState(0);
  const lastCommentTime = useRef(Date.now());
  
  const [state, setState] = useState<GameState>({
    roomCode: roomCode, stage: GameStage.LOBBY, players: [], mode: GameMode.CONFIDENTLY_WRONG,
    language: Language.MIXED, round: 1, history: [], topicOptions: [], reactions: []
  });

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

  useEffect(() => {
    if (!roomCode || !db) return;
    const unsub = onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      if (snapshot.exists()) {
        const newState = snapshot.data() as GameState;
        setState(newState);
        if (viewMode === 'TV' && audioEnabled) {
          gemini.updateBGM(newState.stage, urgency);
        }
      }
    });
    return unsub;
  }, [roomCode, audioEnabled, viewMode, urgency]);

  // Urgency Timer for Questions
  useEffect(() => {
    if (state.stage !== GameStage.QUESTION) { setUrgency(0); return; }
    const timer = setInterval(() => setUrgency(p => Math.min(p + 0.1, 5)), 2000);
    return () => clearInterval(timer);
  }, [state.stage]);

  // Auto Reveal Logic
  useEffect(() => {
    if (viewMode !== 'TV' || state.stage !== GameStage.QUESTION) return;
    const allAnswered = state.players.length > 0 && state.players.every(p => !!p.lastAnswer);
    if (allAnswered) {
      setTimeout(() => {
        sync({ stage: GameStage.REVEAL });
        handleScoring();
      }, 2000);
    }
  }, [state.players.map(p => p.lastAnswer).join(','), state.stage]);

  const handleScoring = async () => {
    let winner: Player | null = null;
    if (state.mode === GameMode.ACTUALLY_GENIUS) {
      winner = state.players.find(p => p.lastAnswer === (state.currentQuestion!.correctIndex + 1).toString()) || null;
    } else {
      winner = state.players[Math.floor(Math.random() * state.players.length)];
    }
    const roast = await gemini.generateReactiveComment(state, winner ? `Player ${winner.name} won the round!` : "No one won the round.");
    setHostMessage(roast);
    gemini.speakText(roast, state.mode);
  };

  const handleJoin = async (name: string, age: number, lang: Language) => {
    if (!db || !roomCode) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    await updateDoc(doc(db, "games", roomCode), { players: arrayUnion(newPlayer) });
    setPlayerId(id);
    localStorage.setItem('AJ_PLAYER_ID', id);
    const roast = await gemini.generateReactiveComment(state, `Player ${name} just joined.`);
    setHostMessage(roast);
    gemini.speakText(roast, state.mode);
  };

  const handleStartGame = async () => {
    if (state.players.length === 0) return;
    sync({ stage: GameStage.LOADING });
    const options = await gemini.generateTopicOptions(state);
    const pickerId = state.players[Math.floor(Math.random() * state.players.length)].id;
    sync({ stage: GameStage.TOPIC_SELECTION, topicOptions: options, topicPickerId: pickerId });
    const intro = "AJ: Let's start the MASH! VJ: Topic selection logic paru.";
    setHostMessage(intro);
    gemini.speakText(intro, state.mode);
  };

  const handleToggleMode = () => {
    const nextMode = state.mode === GameMode.CONFIDENTLY_WRONG ? GameMode.ACTUALLY_GENIUS : GameMode.CONFIDENTLY_WRONG;
    sync({ mode: nextMode });
    const roast = nextMode === GameMode.ACTUALLY_GENIUS ? "AJ: Mode changed to Genius! VJ: IQ search start pannu." : "AJ: Mokka Mode is ON! VJ: Logic dead forever.";
    setHostMessage(roast);
    gemini.speakText(roast, nextMode);
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game select-none">
      {viewMode === 'TV' ? (
        <div className="h-full relative">
          <TVView state={state} hostMessage={hostMessage} iqData="" onReset={() => sync({ stage: GameStage.LOBBY, players: state.players.map(p => ({...p, score: 0, lastAnswer: ''})) })} onStop={() => sync({ stage: GameStage.LOBBY })} />
          
          {/* CONSOLIDATED CONTROL BAR */}
          <div className="fixed bottom-0 left-0 w-full p-8 flex justify-center items-center gap-12 bg-gradient-to-t from-black to-transparent z-[900]">
            {!audioEnabled ? (
              <button onClick={async () => { await gemini.initAudio(); setAudioEnabled(true); gemini.updateBGM(state.stage); }} className="bg-white text-black px-16 py-6 rounded-full text-4xl font-black shadow-3xl hover:scale-105 active:scale-95 transition-all">ACTIVATE RADIO 🎙️</button>
            ) : (
              <div className="flex items-center gap-8">
                {state.stage === GameStage.LOBBY && (
                  <>
                    <button onClick={handleToggleMode} className={`px-10 py-4 rounded-full text-2xl font-black border-4 transition-all ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-600 border-white' : 'bg-blue-600 border-blue-400'}`}>
                      {state.mode === GameMode.ACTUALLY_GENIUS ? 'MODE: GENIUS 🧠' : 'MODE: MOKKA 🤡'}
                    </button>
                    <button onClick={handleStartGame} disabled={state.players.length === 0} className={`bg-fuchsia-600 px-24 py-8 rounded-full text-5xl font-black border-4 border-white shadow-3xl uppercase transition-all ${state.players.length === 0 ? 'opacity-20 scale-90' : 'hover:bg-fuchsia-500 hover:scale-105'}`}>
                      GO LIVE 🚀
                    </button>
                  </>
                )}
                {state.stage !== GameStage.LOBBY && (
                   <button onClick={() => sync({ stage: GameStage.LOBBY })} className="bg-red-600/30 px-12 py-4 rounded-full font-black uppercase text-xl border-2 border-red-500 hover:bg-red-600 transition-all">END SHOW</button>
                )}
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
