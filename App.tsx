
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
        const newState = snapshot.data() as GameState;
        setState(newState);
        if (viewMode === 'TV' && audioEnabled) {
          gemini.updateBGM(newState.stage);
        }
      }
    });
    return unsub;
  }, [roomCode, audioEnabled, viewMode]);

  // AJ 15-SECOND POKE TIMER
  useEffect(() => {
    if (viewMode !== 'TV' || !audioEnabled || state.stage !== GameStage.LOBBY) return;
    const interval = setInterval(() => {
      const secondsSinceLast = (Date.now() - lastActivityRef.current) / 1000;
      if (secondsSinceLast >= 15) {
        gemini.generateLobbyIdleComment(state).then(msg => {
          setHostMessage(msg);
          gemini.speakText(msg);
          lastActivityRef.current = Date.now();
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [viewMode, audioEnabled, state.stage]);

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
    try {
      await gemini.initAudio();
      setAudioEnabled(true);
      gemini.updateBGM(state.stage);
      const intro = await gemini.generateIntro(state);
      setHostMessage(intro);
      await gemini.speakText(intro);
      lastActivityRef.current = Date.now();
    } catch (e) {
      setAudioEnabled(true);
    } finally { setIsWakingAJ(false); }
  };

  const handleStartTutorial = async () => {
    sync({ stage: GameStage.TUTORIAL });
    for (let i = 0; i < 5; i++) {
      const msg = gemini.getLocalRoast('tutorial', i);
      setHostMessage(msg);
      await gemini.speakText(msg);
      await new Promise(r => setTimeout(r, 4000));
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
  };

  const sync = (updates: Partial<GameState>) => updateDoc(doc(db, "games", roomCode), updates);

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game select-none">
      {viewMode === 'TV' ? (
        <div className="h-full relative">
          <TVView state={state} hostMessage={hostMessage} iqData="" />
          {!audioEnabled ? (
            <div className="fixed inset-0 bg-black/95 z-[1000] flex flex-col items-center justify-center p-20 text-center">
               <div className="w-48 h-48 bg-fuchsia-600 rounded-full flex items-center justify-center text-8xl mb-12 shadow-[0_0_120px_rgba(192,38,211,0.8)] border-4 border-white animate-pulse">🎤</div>
               <h1 className="text-[10rem] font-black italic uppercase leading-none mb-12">MIND MASH</h1>
               <button onClick={handleStartShow} className="bg-white text-black px-32 py-10 rounded-[3rem] text-6xl font-black shadow-3xl hover:scale-110 active:scale-95 transition-all">ACTIVATE AJ</button>
            </div>
          ) : (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-6 z-[500]">
               {state.stage === GameStage.LOBBY && (
                  <>
                    <button onClick={handleStartTutorial} className="bg-indigo-600 px-12 py-6 rounded-full text-3xl font-black border-2 border-white/20 shadow-xl hover:bg-indigo-500">RULES?</button>
                    {state.players.length > 0 && (
                      <button onClick={async () => {
                        sync({ stage: GameStage.LOADING });
                        const w = await gemini.generateWarmup(state);
                        sync({ stage: GameStage.WARMUP, warmupQuestion: w.question });
                        gemini.speakText(w.question);
                      }} className="bg-fuchsia-600 px-20 py-8 rounded-full text-5xl font-black border-4 border-white shadow-3xl">START</button>
                    )}
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
          gemini.speakText(q.textEn);
        }} onSubmitAnswer={(a) => sync({ players: state.players.map(p => p.id === playerId ? { ...p, lastAnswer: a } : p) })} onClaimChallenge={()=>{}} onSendRebuttal={()=>{}} onReset={() => { localStorage.clear(); window.location.reload(); }} />
      )}
    </div>
  );
};

export default App;
