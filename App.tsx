import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameStage, Language, Player, GameMode } from './types';
import TVView from './components/TVView';
import PhoneView from './components/PhoneView';
import * as gemini from './geminiService';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";

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
  const [hostMessage, setHostMessage] = useState<string>('Welcome to MIND MASH. AJ is currently calculating your IQ... it shouldn\'t take long.');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
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

  // BroadcastChannel for cross-tab communication fallback
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(`mind-mash-${roomCode || 'global'}`);
    channelRef.current.onmessage = (event) => {
      // Only update state from channel if we are in offline/local sync mode
      if (isOffline) {
        setState(event.data);
      }
    };
    return () => channelRef.current?.close();
  }, [roomCode, isOffline]);

  const localSync = (newState: GameState) => {
    setState(newState);
    channelRef.current?.postMessage(newState);
  };

  useEffect(() => {
    if (!roomCode || !db) {
      if (!db && roomCode) setIsOffline(true);
      return;
    }

    const unsub = onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      if (snapshot.exists()) {
        setState(snapshot.data() as GameState);
        setIsOffline(false);
      }
    }, (error) => {
      console.error("Firestore Error, switching to local sync:", error);
      setIsOffline(true);
      setHostMessage("Cloud sync lost. AJ is now running on emergency backup batteries. (Local mode active)");
    });
    return unsub;
  }, [roomCode]);

  useEffect(() => {
    if (viewMode === 'TV' && !roomCode) {
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
      
      if (db) {
        setDoc(doc(db, "games", code), initialState).catch(() => setIsOffline(true));
      } else {
        setIsOffline(true);
      }
      setRoomCode(code);
      setState(initialState);
    }
  }, [viewMode, roomCode]);

  const sync = async (updates: Partial<GameState>) => {
    const newState = { ...state, ...updates };
    if (!isOffline && db && roomCode) {
      try {
        await updateDoc(doc(db, "games", roomCode), updates);
      } catch (e) {
        console.error("Sync failed, fallback to local:", e);
        setIsOffline(true);
        localSync(newState);
      }
    } else {
      localSync(newState);
    }
  };

  const toggleMode = () => {
    const newMode = state.mode === GameMode.CONFIDENTLY_WRONG ? GameMode.ACTUALLY_GENIUS : GameMode.CONFIDENTLY_WRONG;
    sync({ mode: newMode });
    const msg = newMode === GameMode.ACTUALLY_GENIUS 
      ? "Switching to ACTUALLY GENIUS. This is for the nerds. Real General Knowledge only." 
      : "Chaos mode: CONFIDENTLY WRONG. Throw your textbooks away, we want the funniest answers!";
    setHostMessage(msg);
    if (audioEnabled) gemini.speakText(msg);
  };

  const handleJoin = async (name: string, age: number, lang: Language) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    
    const players = [...state.players, newPlayer];
    await sync({ players });
    
    setPlayerId(id);
    localStorage.setItem('AJ_PLAYER_ID', id);
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
    const msg = `${master.name}, AJ has chosen you to pick the topic. Don't bore us.`;
    setHostMessage(msg);
    if (audioEnabled) gemini.speakText(msg);
    setTimeout(() => sync({ stage: GameStage.TOPIC_SELECTION }), 4000);
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

  const handleRebuttal = async () => {
    const response = await gemini.generateRoast(state, true);
    setHostMessage(response);
    sync({ hostRoast: response });
    if (audioEnabled) gemini.speakText(response);
  };

  const endRound = async () => {
    const correct = state.currentQuestion?.correctIndex;
    const updatedPlayers = state.players.map(p => {
      let pts = (parseInt(p.lastAnswer || '0') === correct) ? 100 : 0;
      if (pts > 0 && p.id === state.topicPickerId) pts += 50;
      return { ...p, score: p.score + pts };
    });
    await sync({ stage: GameStage.REVEAL, players: updatedPlayers });
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game selection:bg-fuchsia-500/30">
      {viewMode === 'TV' ? (
        <div className="h-full relative">
          <TVView state={state} hostMessage={hostMessage} iqData="" />
          
          {isOffline && (
            <div className="fixed top-4 right-4 bg-red-600/20 border border-red-600/50 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-red-400 z-[200] animate-pulse">
              Local Mode (No Cloud)
            </div>
          )}

          <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-[50]">
            {!audioEnabled && (
              <button 
                onClick={() => { setAudioEnabled(true); gemini.speakText("AJ is alive. Systems nominal. Prepare for Mind Mash."); }} 
                className="pointer-events-auto bg-fuchsia-600 hover:bg-fuchsia-500 px-16 py-8 rounded-[3rem] text-4xl font-black shadow-[0_0_50px_rgba(192,38,211,0.5)] animate-bounce border-4 border-white transition-all transform hover:scale-110 active:scale-95"
              >
                WAKE UP AJ
              </button>
            )}
            {audioEnabled && state.stage === GameStage.LOBBY && state.players.length >= 1 && (
              <button 
                onClick={startWarmup} 
                className="pointer-events-auto mt-[70vh] bg-indigo-600 hover:bg-indigo-500 px-16 py-6 rounded-full text-3xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all border-4 border-white/20"
              >
                START THE SHOW
              </button>
            )}
          </div>

          {audioEnabled && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto z-[100] animate-in slide-in-from-bottom-5">
               {state.stage === GameStage.LOBBY && (
                 <button 
                   onClick={toggleMode} 
                   className={`px-12 py-5 rounded-full font-black uppercase border-4 shadow-2xl transition-all flex flex-col items-center ${
                     state.mode === GameMode.CONFIDENTLY_WRONG 
                       ? 'bg-fuchsia-600 border-fuchsia-400 text-white' 
                       : 'bg-emerald-600 border-emerald-400 text-white'
                   }`}
                 >
                   <span className="text-xs opacity-70 tracking-[0.2em] mb-1">CURRENT MODE</span>
                   <span className="text-xl">{state.mode === GameMode.CONFIDENTLY_WRONG ? 'CONFIDENTLY WRONG' : 'ACTUALLY GENIUS'}</span>
                 </button>
               )}
               {state.stage === GameStage.WARMUP && <button onClick={startTopicSelection} className="bg-blue-600 hover:bg-blue-500 px-10 py-4 rounded-full font-black uppercase shadow-xl">Choose Topic Master</button>}
               {state.stage === GameStage.QUESTION && <button onClick={revealRound} className="bg-purple-600 hover:bg-purple-500 px-10 py-4 rounded-full font-black uppercase shadow-xl">Reveal Answers</button>}
               {state.stage === GameStage.VOTING_RESULTS && (
                 <>
                  <button onClick={handleRebuttal} className="bg-red-600 hover:bg-red-500 px-10 py-4 rounded-full font-black uppercase shadow-xl">Argue with AJ</button>
                  <button onClick={endRound} className="bg-pink-600 hover:bg-pink-500 px-10 py-4 rounded-full font-black uppercase shadow-xl">Final Scores</button>
                 </>
               )}
               {state.stage === GameStage.REVEAL && <button onClick={startTopicSelection} className="bg-emerald-600 hover:bg-emerald-500 px-10 py-4 rounded-full font-black uppercase shadow-xl">Next Round</button>}
            </div>
          )}
        </div>
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onSelectTopic={setTopic} onSubmitAnswer={(a) => sync({ players: state.players.map(p => p.id === playerId ? { ...p, lastAnswer: a } : p) })} onClaimChallenge={()=>{}} onSendRebuttal={handleRebuttal} />
      )}
    </div>
  );
};

export default App;