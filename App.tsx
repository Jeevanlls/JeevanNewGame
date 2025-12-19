
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
  const [hostMessage, setHostMessage] = useState<string>('AJ & VJ ARE READY...');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [urgency, setUrgency] = useState(0);
  
  const [state, setState] = useState<GameState>({
    roomCode: roomCode, stage: GameStage.LOBBY, players: [], mode: GameMode.CONFIDENTLY_WRONG,
    language: Language.MIXED, round: 1, history: [], topicOptions: [], reactions: []
  });

  const lastActivityRef = useRef(Date.now());

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
          gemini.updateBGM(newState.stage, urgency);
        }
      }
    });
    return unsub;
  }, [roomCode, audioEnabled, viewMode, urgency]);

  // Urgency Timer
  useEffect(() => {
    if (state.stage !== GameStage.QUESTION) {
      setUrgency(0);
      return;
    }
    const timer = setInterval(() => {
      setUrgency(prev => Math.min(prev + 0.1, 5));
    }, 2000);
    return () => clearInterval(timer);
  }, [state.stage]);

  // Automatic Reactions Cleanup
  useEffect(() => {
    if (viewMode !== 'TV' || !state.reactions?.length) return;
    const timeout = setTimeout(() => {
      sync({ reactions: [] });
    }, 3000);
    return () => clearTimeout(timeout);
  }, [state.reactions?.length]);

  const handleRoastTrigger = async () => {
    const caller = state.players.find(p => p.id === playerId);
    if (!caller) return;
    const roast = await gemini.generateDynamicRoast(state, caller.name);
    setHostMessage(roast);
    gemini.speakText(roast, state.mode);
  };

  const handleSendReaction = (emoji: string) => {
    if (!roomCode) return;
    const reaction: Reaction = { id: Math.random().toString(), emoji, x: Math.random() * 80 + 10 };
    updateDoc(doc(db, "games", roomCode), { reactions: arrayUnion(reaction) });
  };

  // Stage automation logic
  useEffect(() => {
    if (viewMode !== 'TV' || !audioEnabled) return;

    if (state.stage === GameStage.WARMUP) {
      setTimeout(() => {
        const picker = state.players[Math.floor(Math.random() * state.players.length)];
        gemini.generateTopicOptions(state).then(options => {
          sync({ stage: GameStage.TOPIC_SELECTION, topicOptions: options, topicPickerId: picker.id });
          const msg = `AJ: ${picker.name} is picking! VJ: Logic choice paru.`;
          setHostMessage(msg);
          gemini.speakText(msg, state.mode);
        });
      }, 8000);
    }

    if (state.stage === GameStage.QUESTION) {
      const allAnswered = state.players.every(p => !!p.lastAnswer);
      if (allAnswered && state.players.length > 0) {
        sync({ stage: GameStage.REVEAL });
        handleRevealLogic();
      }
    }
  }, [state.stage, state.players.map(p => p.lastAnswer).join(','), audioEnabled]);

  const handleRevealLogic = async () => {
    let winner: Player | null = null;
    if (state.mode === GameMode.ACTUALLY_GENIUS && state.currentQuestion) {
      winner = state.players.find(p => p.lastAnswer === (state.currentQuestion!.correctIndex + 1).toString()) || null;
    } else {
      winner = state.players[Math.floor(Math.random() * state.players.length)];
    }

    const comment = await gemini.generateRevealCommentary(state, winner);
    setHostMessage(comment);
    gemini.speakText(comment, state.mode);

    if (winner) {
      const updatedPlayers = state.players.map(p => p.id === winner?.id ? { ...p, score: p.score + 100 } : p);
      sync({ players: updatedPlayers });
    }
    setTimeout(() => sync({ stage: GameStage.LOBBY, currentQuestion: undefined, topic: '' }), 15000);
  };

  const handleStartShow = async () => {
    try {
      await gemini.initAudio();
      setAudioEnabled(true);
      gemini.updateBGM(state.stage);
      const intro = await gemini.generateIntro(state);
      setHostMessage(intro);
      await gemini.speakText(intro, state.mode);
      lastActivityRef.current = Date.now();
    } catch (e) { setAudioEnabled(true); }
  };

  const handleResetGame = async () => {
    if (!confirm("Reset scores? Players stay joined.")) return;
    sync({ stage: GameStage.LOBBY, round: 1, players: state.players.map(p => ({ ...p, score: 0, lastAnswer: '' })), topic: '', currentQuestion: undefined, topicOptions: [], topicPickerId: undefined });
    const msg = "AJ: Restarting logic! VJ: Scores gaali, let's start fresh.";
    setHostMessage(msg);
    gemini.speakText(msg, state.mode);
  };

  const handleStopGame = () => {
    sync({ stage: GameStage.LOBBY, currentQuestion: undefined, topic: '' });
    const msg = "AJ: Game STOPPED! VJ: Boring logic-u.";
    setHostMessage(msg);
    gemini.speakText(msg, state.mode);
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
          <TVView state={state} hostMessage={hostMessage} iqData="" onReset={handleResetGame} onStop={handleStopGame} />
          {!audioEnabled ? (
            <div className="fixed inset-0 bg-black/95 z-[1000] flex flex-col items-center justify-center p-20 text-center">
               <div className="w-48 h-48 bg-fuchsia-600 rounded-full flex items-center justify-center text-8xl mb-12 shadow-[0_0_120px_rgba(192,38,211,0.8)] border-4 border-white animate-pulse">🎤</div>
               <h1 className="text-[10rem] font-black italic uppercase leading-none mb-12 tracking-tighter text-white">MIND MASH</h1>
               <button onClick={handleStartShow} className="bg-white text-black px-32 py-10 rounded-[3rem] text-6xl font-black shadow-3xl hover:scale-110 active:scale-95 transition-all uppercase">ACTIVATE AJ & VJ</button>
            </div>
          ) : (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-[500]">
               {state.stage === GameStage.LOBBY && (
                  <div className="flex flex-col items-center gap-6">
                    <button onClick={() => sync({ mode: state.mode === GameMode.CONFIDENTLY_WRONG ? GameMode.ACTUALLY_GENIUS : GameMode.CONFIDENTLY_WRONG })}
                      className={`px-10 py-4 rounded-full text-2xl font-black border-2 transition-all shadow-xl ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-600 border-white' : 'bg-fuchsia-600 border-white/20'}`}>
                      MODE: {state.mode === GameMode.ACTUALLY_GENIUS ? 'ACTUALLY GENIUS' : 'CONFIDENTLY WRONG'}
                    </button>
                    <div className="flex gap-6">
                      <button onClick={handleResetGame} className="bg-white/10 px-8 py-4 rounded-full text-xl font-black border border-white/10 uppercase">RESET ALL</button>
                      {state.players.length > 0 && (
                        <button onClick={async () => {
                          sync({ stage: GameStage.LOADING });
                          const w = await gemini.generateWarmup(state);
                          sync({ stage: GameStage.WARMUP, warmupQuestion: w.question });
                          gemini.speakText(w.question, state.mode);
                        }} className="bg-fuchsia-600 px-20 py-8 rounded-full text-5xl font-black border-4 border-white shadow-3xl uppercase">START GAME</button>
                      )}
                    </div>
                  </div>
               )}
            </div>
          )}
        </div>
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onRoast={handleRoastTrigger} onReaction={handleSendReaction} onSelectTopic={async (t) => {
          sync({ topic: t, stage: GameStage.LOADING });
          const q = await gemini.generateQuestion({ ...state, topic: t });
          sync({ currentQuestion: q, stage: GameStage.QUESTION, players: state.players.map(p => ({ ...p, lastAnswer: '' })) });
          const msg = `AJ: Question logic paru! VJ: Answer seekram pannunga.`;
          setHostMessage(msg);
          gemini.speakText(msg, state.mode);
        }} onSubmitAnswer={(a) => sync({ players: state.players.map(p => p.id === playerId ? { ...p, lastAnswer: a } : p) })} onReset={() => { localStorage.clear(); window.location.reload(); }} />
      )}
    </div>
  );
};

export default App;
