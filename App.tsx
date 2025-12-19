
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
  const [hostMessage, setHostMessage] = useState<string>('AJ is waking up...');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isWakingAJ, setIsWakingAJ] = useState(false);
  
  const [state, setState] = useState<GameState>({
    roomCode: roomCode, stage: GameStage.LOBBY, players: [], mode: GameMode.CONFIDENTLY_WRONG,
    language: Language.MIXED, round: 1, history: [], topicOptions: []
  });

  const prevPlayerCount = useRef(0);
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
      if (Date.now() - lastActivityRef.current > 25000) {
        const comment = await gemini.generateLobbyIdleComment(state);
        setHostMessage(comment);
        gemini.speakText(comment);
        lastActivityRef.current = Date.now();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [viewMode, audioEnabled, state.stage, state.players.length]);

  // AJ Arrival Roasts
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

  // TV Initialization
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
    if (isWakingAJ) return;
    setIsWakingAJ(true);
    setHostMessage("AJ IS STRETCHING...");
    
    try {
      await gemini.initAudio(); // Force unlock
      setAudioEnabled(true);
      
      const intro = await gemini.generateIntro(state);
      setHostMessage(intro);
      await gemini.speakText(intro);
      lastActivityRef.current = Date.now();
    } catch (e) {
      setHostMessage("AJ IS AWAKE! Ready to play.");
      setAudioEnabled(true);
    } finally {
      setIsWakingAJ(false);
    }
  };

  const handleJoin = async (name: string, age: number, lang: Language) => {
    if (!db || !roomCode) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    try {
      await updateDoc(doc(db, "games", roomCode), {
        players: arrayUnion(newPlayer)
      });
      setPlayerId(id);
      localStorage.setItem('AJ_PLAYER_ID', id);
    } catch (e) { alert("Room full or connection error!"); }
  };

  const sync = (updates: Partial<GameState>) => updateDoc(doc(db, "games", roomCode), updates);

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game select-none">
      {viewMode === 'TV' ? (
        <div className="h-full relative">
          <TVView state={state} hostMessage={hostMessage} iqData="" />
          
          {!audioEnabled ? (
            <div className="fixed inset-0 bg-black/90 z-[1000] flex flex-col items-center justify-center p-20 text-center backdrop-blur-md">
               <div className="w-48 h-48 bg-fuchsia-600 rounded-full flex items-center justify-center text-8xl mb-12 shadow-[0_0_120px_rgba(192,38,211,0.8)] border-4 border-white animate-pulse">🎤</div>
               <h1 className="text-[10rem] font-black italic uppercase leading-none mb-12 tracking-tighter">MIND MASH</h1>
               <button 
                onClick={handleStartShow} 
                className="bg-white text-black px-32 py-10 rounded-[3rem] text-6xl font-black shadow-3xl hover:scale-110 active:scale-95 transition-all border-8 border-fuchsia-600 ring-8 ring-fuchsia-500/20"
               >
                 {isWakingAJ ? 'WAKING AJ...' : 'ACTIVATE AJ'}
               </button>
            </div>
          ) : (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-6 z-[500]">
               {state.stage === GameStage.LOBBY && state.players.length > 0 && (
                  <button onClick={async () => {
                    setHostMessage("Hold on, let me look at you first...");
                    await gemini.speakText("Hold on, let me look at you first...");
                    sync({ stage: GameStage.LOADING });
                    const w = await gemini.generateWarmup(state);
                    sync({ stage: GameStage.WARMUP, warmupQuestion: w.question });
                    gemini.speakText(w.question);
                  }} className="bg-fuchsia-600 px-20 py-8 rounded-full text-5xl font-black border-4 border-white shadow-3xl">START</button>
               )}
               {state.stage === GameStage.WARMUP && <button onClick={async () => {
                  sync({ stage: GameStage.LOADING });
                  const m = state.players[Math.floor(Math.random() * state.players.length)];
                  const o = await gemini.generateTopicOptions(state);
                  sync({ stage: GameStage.SELECTOR_REVEAL, topicPickerId: m.id, topicOptions: o });
                  setTimeout(() => sync({ stage: GameStage.TOPIC_SELECTION }), 2000);
               }} className="bg-indigo-600 px-12 py-6 rounded-full font-black text-2xl shadow-xl">CONTINUE</button>}
            </div>
          )}
        </div>
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onSelectTopic={async (t) => {
          sync({ topic: t, stage: GameStage.LOADING });
          const q = await gemini.generateQuestion({ ...state, topic: t });
          sync({ currentQuestion: q, stage: GameStage.QUESTION, players: state.players.map(p => ({ ...p, lastAnswer: '' })) });
        }} onSubmitAnswer={(a) => sync({ players: state.players.map(p => p.id === playerId ? { ...p, lastAnswer: a } : p) })} onClaimChallenge={()=>{}} onSendRebuttal={()=>{}} onReset={() => { localStorage.clear(); window.location.reload(); }} />
      )}
    </div>
  );
};

export default App;
