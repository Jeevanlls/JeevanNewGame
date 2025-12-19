
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameStage, Language, Player, GameMode } from './types';
import TVView from './components/TVView';
import PhoneView from './components/PhoneView';
import * as gemini from './geminiService';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc, getDoc, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
  const [hostMessage, setHostMessage] = useState<string>('AJ is booting up... Get ready for Mind Mash.');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const prevPlayerCount = useRef(0);

  const [state, setState] = useState<GameState>({
    roomCode: roomCode, 
    stage: GameStage.LOBBY, 
    players: [], 
    mode: GameMode.CONFIDENTLY_WRONG,
    language: Language.MIXED, 
    round: 1, 
    history: [], 
    topicOptions: []
  });

  // Master Listener
  useEffect(() => {
    if (!roomCode || !db) return;
    setIsSyncing(true);
    const unsub = onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameState;
        setState(data);
        setIsSyncing(false);
        setError(null);
      } else if (viewMode === 'PHONE') {
        setError("Room not found. Check the code on TV.");
      }
    }, (err) => {
      setError("Cloud connection lost.");
    });
    return unsub;
  }, [roomCode, viewMode]);

  // AJ Reacts to Players Joining the Lobby
  useEffect(() => {
    if (viewMode === 'TV' && audioEnabled && state.stage === GameStage.LOBBY) {
      if (state.players.length > prevPlayerCount.current) {
        const lastPlayer = state.players[state.players.length - 1];
        gemini.generateJoinComment(state, lastPlayer.name).then(roast => {
          setHostMessage(roast);
          gemini.speakText(roast);
        });
      }
      prevPlayerCount.current = state.players.length;
    }
  }, [state.players.length, audioEnabled, viewMode]);

  // TV Initialization
  useEffect(() => {
    if (viewMode === 'TV' && !roomCode && db) {
      const code = Math.random().toString(36).substr(2, 4).toUpperCase();
      const initialState: GameState = {
        roomCode: code, 
        stage: GameStage.LOBBY, 
        players: [], 
        mode: GameMode.CONFIDENTLY_WRONG,
        language: Language.MIXED, 
        round: 1, 
        history: [], 
        topicOptions: []
      };
      setDoc(doc(db, "games", code), initialState).then(() => {
        setRoomCode(code);
        setState(initialState);
      });
    }
  }, [viewMode, roomCode]);

  const sync = async (updates: Partial<GameState>) => {
    if (!db || !roomCode) return;
    try {
      await updateDoc(doc(db, "games", roomCode), updates);
    } catch (e) { console.error("Cloud Sync Failed:", e); }
  };

  const handleStartShow = async () => {
    setAudioEnabled(true);
    const intro = await gemini.generateIntro(state);
    setHostMessage(intro);
    gemini.speakText(intro);
  };

  const handleJoin = async (name: string, age: number, lang: Language) => {
    if (!db || !roomCode) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    
    try {
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, "games", roomCode);
        const snap = await transaction.get(docRef);
        if (!snap.exists()) throw "Room Expired";
        const currentPlayers = snap.data().players || [];
        transaction.update(docRef, { players: [...currentPlayers, newPlayer] });
      });
      setPlayerId(id);
      localStorage.setItem('AJ_PLAYER_ID', id);
    } catch (e) { setError("Join failed. Is the room still active?"); }
  };

  const resetPhoneSession = () => {
    localStorage.removeItem('AJ_PLAYER_ID');
    setPlayerId('');
    setError(null);
    window.location.reload();
  };

  const startWarmup = async () => {
    await sync({ stage: GameStage.LOADING });
    const warmup = await gemini.generateWarmup(state);
    await sync({ stage: GameStage.WARMUP, warmupQuestion: warmup.question });
    if (audioEnabled) gemini.speakText(warmup.question);
  };

  const startTopicSelection = async () => {
    await sync({ stage: GameStage.LOADING });
    const master = state.players[Math.floor(Math.random() * state.players.length)];
    const options = await gemini.generateTopicOptions(state);
    await sync({ stage: GameStage.SELECTOR_REVEAL, topicPickerId: master.id, topicOptions: options });
    const msg = `${master.name}, pick a category. Don't embarrass yourself.`;
    setHostMessage(msg);
    if (audioEnabled) gemini.speakText(msg);
    setTimeout(() => sync({ stage: GameStage.TOPIC_SELECTION }), 2500);
  };

  const setTopic = async (topic: string) => {
    await sync({ topic, stage: GameStage.LOADING });
    const q = await gemini.generateQuestion({ ...state, topic });
    await sync({ 
      currentQuestion: q, stage: GameStage.QUESTION, 
      players: state.players.map(p => ({ ...p, lastAnswer: '' })),
      history: [...state.history, topic]
    });
    if (audioEnabled) gemini.speakText(q.textEn);
  };

  const revealRound = async () => {
    await sync({ stage: GameStage.LOADING });
    const roast = await gemini.generateRoast(state);
    setHostMessage(roast);
    await sync({ stage: GameStage.VOTING_RESULTS, hostRoast: roast });
    if (audioEnabled) gemini.speakText(roast);
  };

  const endRound = async () => {
    const correct = (state.currentQuestion?.correctIndex || 0) + 1;
    const updatedPlayers = state.players.map(p => {
      let pts = (parseInt(p.lastAnswer || '0') === correct) ? 100 : 0;
      return { ...p, score: p.score + pts };
    });
    await sync({ stage: GameStage.REVEAL, players: updatedPlayers, round: state.round + 1 });
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game">
      {viewMode === 'TV' ? (
        <div className="h-full relative">
          <TVView state={state} hostMessage={hostMessage} iqData="" />
          
          <div className="fixed top-4 right-4 flex gap-3 z-[200] items-center">
             {error && <div className="bg-red-600 px-4 py-1 rounded-full text-[10px] font-black uppercase shadow-lg">{error}</div>}
             <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`}></div>
                <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Cloud Live</span>
             </div>
          </div>

          {!audioEnabled ? (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center z-[500] p-10 text-center">
              <div className="w-32 h-32 bg-fuchsia-600 rounded-full flex items-center justify-center text-6xl mb-10 shadow-[0_0_60px_rgba(192,38,211,0.5)] animate-pulse">🎤</div>
              <h1 className="text-7xl font-black mb-10 italic tracking-tighter uppercase">WAKE UP AJ</h1>
              <button onClick={handleStartShow} className="bg-fuchsia-600 hover:bg-fuchsia-500 px-24 py-12 rounded-[3rem] text-5xl font-black shadow-2xl border-4 border-white transition-all transform hover:scale-105 active:scale-95">START THE SHOW</button>
            </div>
          ) : (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto z-[100]">
               {state.stage === GameStage.LOBBY && state.players.length >= 1 && (
                  <button onClick={startWarmup} className="bg-indigo-600 hover:bg-indigo-500 px-16 py-6 rounded-full text-3xl font-black shadow-2xl border-4 border-white/20 hover:scale-105 transition-all">LET'S GO</button>
               )}
               {state.stage === GameStage.WARMUP && <button onClick={startTopicSelection} className="bg-blue-600 px-12 py-5 rounded-full font-black uppercase shadow-xl hover:scale-105 transition-all">SELECT TOPIC</button>}
               {state.stage === GameStage.QUESTION && <button onClick={revealRound} className="bg-purple-600 px-12 py-5 rounded-full font-black uppercase shadow-xl hover:scale-105 transition-all">JUDGE ANSWERS</button>}
               {state.stage === GameStage.VOTING_RESULTS && <button onClick={endRound} className="bg-pink-600 px-12 py-5 rounded-full font-black uppercase shadow-xl hover:scale-105 transition-all">SCOREBOARD</button>}
               {state.stage === GameStage.REVEAL && <button onClick={startTopicSelection} className="bg-emerald-600 px-12 py-5 rounded-full font-black uppercase shadow-xl hover:scale-105 transition-all">NEXT ROUND</button>}
            </div>
          )}
        </div>
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onSelectTopic={setTopic} onSubmitAnswer={(a) => sync({ players: state.players.map(p => p.id === playerId ? { ...p, lastAnswer: a } : p) })} onClaimChallenge={()=>{}} onSendRebuttal={()=>{}} onReset={resetPhoneSession} />
      )}
    </div>
  );
};

export default App;
