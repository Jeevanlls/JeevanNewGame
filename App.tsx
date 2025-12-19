
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameStage, Language, Player, GameMode } from './types';
import TVView from './components/TVView';
import PhoneView from './components/PhoneView';
import * as gemini from './geminiService';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc, runTransaction, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
  const [hostMessage, setHostMessage] = useState<string>('MIND MASH: Loading Host...');
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const [state, setState] = useState<GameState>({
    roomCode: roomCode, stage: GameStage.LOBBY, players: [], mode: GameMode.CONFIDENTLY_WRONG,
    language: Language.MIXED, round: 1, history: [], topicOptions: []
  });

  const prevPlayerCount = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastActivityRef = useRef(Date.now());

  // Master Listener
  useEffect(() => {
    if (!roomCode || !db) return;
    const unsub = onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      if (snapshot.exists()) {
        setState(snapshot.data() as GameState);
      }
    });
    return unsub;
  }, [roomCode]);

  // AJ Idle Loop
  useEffect(() => {
    if (viewMode !== 'TV' || !audioEnabled || state.stage !== GameStage.LOBBY) return;
    const interval = setInterval(async () => {
      if (Date.now() - lastActivityRef.current > 15000) {
        const comment = await gemini.generateLobbyIdleComment(state);
        setHostMessage(comment);
        gemini.speakText(comment);
        lastActivityRef.current = Date.now();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [viewMode, audioEnabled, state.stage, state.players.length]);

  // AJ Roasts on Join
  useEffect(() => {
    if (viewMode === 'TV' && audioEnabled && state.stage === GameStage.LOBBY) {
      if (state.players.length > prevPlayerCount.current) {
        const lastPlayer = state.players[state.players.length - 1];
        gemini.generateJoinComment(state, lastPlayer.name, lastPlayer.age).then(msg => {
          setHostMessage(msg);
          gemini.speakText(msg);
          lastActivityRef.current = Date.now();
        });
      }
      prevPlayerCount.current = state.players.length;
    }
  }, [state.players.length, audioEnabled, viewMode, state.stage]);

  // TV Init
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

  const sync = async (updates: Partial<GameState>) => {
    if (!db || !roomCode) return;
    try { await updateDoc(doc(db, "games", roomCode), updates); } catch (e) {}
  };

  const handleStartShow = async () => {
    setHostMessage("AJ IS WAKING UP...");
    setAudioEnabled(true);
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    await audioCtxRef.current.resume();
    
    try {
      const intro = await gemini.generateIntro(state);
      setHostMessage(intro);
      gemini.speakText(intro);
      lastActivityRef.current = Date.now();
    } catch (e) {
      setHostMessage("Ready to Mash some Brains? Let's go!");
    }
  };

  const handleJoin = async (name: string, age: number, lang: Language) => {
    if (!db || !roomCode) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    try {
      await runTransaction(db, async (t) => {
        const docRef = doc(db, "games", roomCode);
        const snap = await t.get(docRef);
        if (snap.exists()) {
          const players = snap.data().players || [];
          t.update(docRef, { players: [...players, newPlayer] });
        }
      });
      setPlayerId(id);
      localStorage.setItem('AJ_PLAYER_ID', id);
    } catch (e) {
      // Fallback if transaction fails
      const docRef = doc(db, "games", roomCode);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const players = snap.data().players || [];
        await updateDoc(docRef, { players: [...players, newPlayer] });
        setPlayerId(id);
        localStorage.setItem('AJ_PLAYER_ID', id);
      }
    }
  };

  const startWarmup = async () => {
    setHostMessage("Hold on, let me look at you first...");
    gemini.speakText("Hold on, let me look at you first...");
    await sync({ stage: GameStage.LOADING });
    const warmup = await gemini.generateWarmup(state);
    await sync({ stage: GameStage.WARMUP, warmupQuestion: warmup.question });
    gemini.speakText(warmup.question);
  };

  const startTopicSelection = async () => {
    setHostMessage("Calculated your IQ... it didn't take long.");
    gemini.speakText("Calculated your IQ... it didn't take long.");
    await sync({ stage: GameStage.LOADING });
    const master = state.players[Math.floor(Math.random() * state.players.length)];
    const options = await gemini.generateTopicOptions(state);
    await sync({ stage: GameStage.SELECTOR_REVEAL, topicPickerId: master.id, topicOptions: options });
    const msg = `${master.name}, pick a category. Don't be a mokka.`;
    setHostMessage(msg);
    gemini.speakText(msg);
    setTimeout(() => sync({ stage: GameStage.TOPIC_SELECTION }), 2000);
  };

  const setTopic = async (topic: string) => {
    setHostMessage(`Topic is ${topic}? Seriously?`);
    gemini.speakText(`Topic is ${topic}? Seriously?`);
    await sync({ topic, stage: GameStage.LOADING });
    const q = await gemini.generateQuestion({ ...state, topic });
    await sync({ currentQuestion: q, stage: GameStage.QUESTION, players: state.players.map(p => ({ ...p, lastAnswer: '' })) });
    gemini.speakText(q.textEn);
  };

  const revealRound = async () => {
    setHostMessage("Checking for signs of intelligence...");
    gemini.speakText("Checking for signs of intelligence...");
    await sync({ stage: GameStage.LOADING });
    const roast = await gemini.generateRoast(state);
    setHostMessage(roast);
    await sync({ stage: GameStage.VOTING_RESULTS, hostRoast: roast });
    gemini.speakText(roast);
  };

  const endRound = async () => {
    const correct = (state.currentQuestion?.correctIndex || 0) + 1;
    const updatedPlayers = state.players.map(p => ({ ...p, score: p.score + (parseInt(p.lastAnswer || '0') === correct ? 100 : 0) }));
    await sync({ stage: GameStage.REVEAL, players: updatedPlayers, round: state.round + 1 });
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game select-none">
      {viewMode === 'TV' ? (
        <div className="h-full relative overflow-hidden">
          <TVView state={state} hostMessage={hostMessage} iqData="" />
          {!audioEnabled ? (
            <div className="fixed inset-0 bg-black z-[1000] flex flex-col items-center justify-center p-20 text-center">
               <div className="w-48 h-48 bg-fuchsia-600 rounded-full flex items-center justify-center text-8xl mb-12 shadow-[0_0_100px_rgba(192,38,211,0.7)] animate-bounce border-4 border-white">🎤</div>
               <h1 className="text-[10rem] font-black italic tracking-tighter uppercase leading-none mb-12 drop-shadow-3xl">MIND MASH</h1>
               <button onClick={handleStartShow} className="bg-white text-black px-24 py-10 rounded-[2rem] text-4xl font-black shadow-3xl hover:scale-110 active:scale-95 transition-all border-4 border-fuchsia-500">START SHOW</button>
            </div>
          ) : (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-4 z-[500]">
               {state.stage === GameStage.LOBBY && state.players.length > 0 && (
                  <button onClick={startWarmup} className="bg-fuchsia-600 px-16 py-6 rounded-full text-3xl font-black border-4 border-white shadow-3xl hover:bg-fuchsia-500 transition-all">START GAME</button>
               )}
               {state.stage === GameStage.WARMUP && <button onClick={startTopicSelection} className="bg-indigo-600 px-12 py-6 rounded-full font-black text-2xl shadow-xl border-2 border-white">TOPICS</button>}
               {state.stage === GameStage.QUESTION && <button onClick={revealRound} className="bg-amber-600 px-12 py-6 rounded-full font-black text-2xl shadow-xl border-2 border-white">JUDGE</button>}
               {state.stage === GameStage.VOTING_RESULTS && <button onClick={endRound} className="bg-emerald-600 px-12 py-6 rounded-full font-black text-2xl shadow-xl border-2 border-white">NEXT</button>}
               {state.stage === GameStage.REVEAL && <button onClick={startTopicSelection} className="bg-fuchsia-600 px-12 py-6 rounded-full font-black text-2xl shadow-xl border-2 border-white">CONTINUE</button>}
            </div>
          )}
        </div>
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onSelectTopic={setTopic} onSubmitAnswer={(a) => sync({ players: state.players.map(p => p.id === playerId ? { ...p, lastAnswer: a } : p) })} onClaimChallenge={()=>{}} onSendRebuttal={()=>{}} onReset={() => { localStorage.clear(); window.location.reload(); }} />
      )}
    </div>
  );
};

export default App;
