
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
    language: Language.MIXED, round: 1, history: [], topicOptions: [], reactions: [], isPaused: false
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
    } catch (e) { console.error("Sync Fail:", e); }
  };

  useEffect(() => {
    if (!roomCode || !db) return;
    const unsub = onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      if (snapshot.exists()) {
        const newState = snapshot.data() as GameState;
        setState(newState);
        if (viewMode === 'TV' && audioEnabled) {
          gemini.updateBGM(newState.stage, urgency, newState.isPaused);
        }
      }
    });
    return unsub;
  }, [roomCode, audioEnabled, viewMode, urgency]);

  // Urgency Timer for dynamic music
  useEffect(() => {
    if (state.stage !== GameStage.QUESTION || state.isPaused) { setUrgency(0); return; }
    const timer = setInterval(() => setUrgency(p => Math.min(p + 0.1, 5)), 2000);
    return () => clearInterval(timer);
  }, [state.stage, state.isPaused]);

  // AI Active Spectator - Spontaneous roasts
  useEffect(() => {
    if (viewMode !== 'TV' || !audioEnabled || state.isPaused) return;
    const interval = setInterval(async () => {
      const now = Date.now();
      if (now - lastCommentTime.current < 20000) return;

      let event = '';
      if (state.stage === GameStage.LOBBY && state.players.length === 0) event = "Lobby is empty, AJ is getting angry.";
      if (state.stage === GameStage.QUESTION) {
        const slow = state.players.filter(p => !p.lastAnswer);
        if (slow.length > 0) event = `${slow[0].name} is a logic piece, too slow!`;
      }

      if (event) {
        const roast = await gemini.generateReactiveComment(state, event);
        setHostMessage(roast);
        gemini.speakText(roast, state.mode);
        lastCommentTime.current = now;
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [state.stage, state.players.length, audioEnabled, state.isPaused]);

  // Auto-Reveal Logic
  useEffect(() => {
    if (viewMode !== 'TV' || state.stage !== GameStage.QUESTION || state.isPaused) return;
    const allAnswered = state.players.length > 0 && state.players.every(p => !!p.lastAnswer);
    if (allAnswered) {
      setTimeout(() => {
        sync({ stage: GameStage.REVEAL });
        handleRoundEnd();
      }, 2000);
    }
  }, [state.players.map(p => p.lastAnswer).join(','), state.stage, state.isPaused]);

  const handleRoundEnd = async () => {
    let winner: Player | null = null;
    if (state.mode === GameMode.ACTUALLY_GENIUS) {
      winner = state.players.find(p => p.lastAnswer === (state.currentQuestion!.correctIndex + 1).toString()) || null;
    } else {
      winner = state.players[Math.floor(Math.random() * state.players.length)];
    }

    const comment = await gemini.generateReactiveComment(state, winner ? `${winner.name} wins round, logic piece level 100.` : "Everyone failed, total mokka.");
    setHostMessage(comment);
    gemini.speakText(comment, state.mode);
    
    if (winner) {
      const updated = state.players.map(p => p.id === winner?.id ? { ...p, score: p.score + 100 } : p);
      sync({ players: updated });
    }
    setTimeout(() => {
      if (!state.isPaused) sync({ stage: GameStage.LOBBY, currentQuestion: undefined, topic: '' });
    }, 12000);
  };

  const handleJoin = async (name: string, age: number, lang: Language) => {
    if (!db || !roomCode) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    await updateDoc(doc(db, "games", roomCode), { players: arrayUnion(newPlayer) });
    setPlayerId(id);
    localStorage.setItem('AJ_PLAYER_ID', id);
    const roast = await gemini.generateReactiveComment(state, `New victim ${name} joined.`);
    setHostMessage(roast);
    gemini.speakText(roast, state.mode);
  };

  const handleStartGame = async () => {
    if (state.players.length === 0) {
      const msg = "AJ: Dei players enga da? VJ: No players, no show.";
      setHostMessage(msg);
      gemini.speakText(msg, state.mode);
      return;
    }
    sync({ stage: GameStage.LOADING, isPaused: false });
    const options = await gemini.generateTopicOptions(state);
    const pickerId = state.players[Math.floor(Math.random() * state.players.length)].id;
    sync({ stage: GameStage.TOPIC_SELECTION, topicOptions: options, topicPickerId: pickerId });
    const msg = "AJ: Choose your path da! VJ: Mixed logic coming.";
    setHostMessage(msg);
    gemini.speakText(msg, state.mode);
  };

  const togglePause = () => {
    const nextPause = !state.isPaused;
    sync({ isPaused: nextPause });
    const msg = nextPause ? "AJ: WAIT WAIT! Commercial break! VJ: Logic on hold." : "AJ: WE ARE BACK! VJ: Stop sleeping, play da.";
    setHostMessage(msg);
    gemini.speakText(msg, state.mode);
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game select-none">
      {viewMode === 'TV' ? (
        <div className="h-full relative">
          <TVView state={state} hostMessage={hostMessage} iqData="" onReset={() => sync({ stage: GameStage.LOBBY, players: state.players.map(p => ({...p, score: 0, lastAnswer: ''})), isPaused: false })} onStop={() => sync({ stage: GameStage.LOBBY, isPaused: false })} />
          
          <div className="fixed bottom-0 left-0 w-full p-8 flex justify-center items-center gap-6 bg-gradient-to-t from-black to-transparent z-[999]">
            {!audioEnabled ? (
              <button onClick={async () => { await gemini.initAudio(); setAudioEnabled(true); gemini.updateBGM(state.stage); }} className="bg-white text-black px-16 py-6 rounded-full text-4xl font-black shadow-3xl hover:scale-105 active:scale-95 transition-all">ACTIVATE RADIO 🎙️</button>
            ) : (
              <div className="flex items-center gap-6">
                {state.stage === GameStage.LOBBY && (
                  <div className="flex gap-4">
                    <button onClick={() => sync({ mode: state.mode === GameMode.CONFIDENTLY_WRONG ? GameMode.ACTUALLY_GENIUS : GameMode.CONFIDENTLY_WRONG })} className={`px-8 py-3 rounded-full text-xl font-black border-4 ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-600 border-white shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-blue-600 border-blue-400'}`}>
                      {state.mode === GameMode.ACTUALLY_GENIUS ? 'GENIUS MODE' : 'MOKKA MODE'}
                    </button>
                    <button onClick={handleStartGame} disabled={state.players.length === 0} className={`bg-fuchsia-600 px-16 py-6 rounded-full text-4xl font-black border-4 border-white shadow-3xl uppercase transition-all ${state.players.length === 0 ? 'opacity-20 scale-90' : 'hover:bg-fuchsia-500 hover:scale-105'}`}>
                      GO LIVE 🚀
                    </button>
                  </div>
                )}
                {state.stage !== GameStage.LOBBY && (
                  <div className="flex gap-4">
                    <button onClick={togglePause} className={`px-10 py-4 rounded-full font-black uppercase text-xl border-4 transition-all ${state.isPaused ? 'bg-amber-500 border-white shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-white/10 border-white/20'}`}>
                      {state.isPaused ? 'RESUME ▶️' : 'PAUSE ⏸️'}
                    </button>
                    <button onClick={() => sync({ stage: GameStage.LOBBY, isPaused: false })} className="bg-red-600 px-10 py-4 rounded-full font-black uppercase text-xl border-4 border-white shadow-lg hover:bg-red-500">STOP ⏹️</button>
                  </div>
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
