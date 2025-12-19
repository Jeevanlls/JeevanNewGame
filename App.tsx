
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
  const [hostMessage, setHostMessage] = useState<string>('AJ & VJ LOBBY-LA WAITING...');
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
    } catch (e) { console.error(e); }
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

  // AI "Spectator" Logic: Roasts players for being slow or joining
  useEffect(() => {
    if (viewMode !== 'TV' || !audioEnabled) return;
    const checkInterval = setInterval(async () => {
      const now = Date.now();
      if (now - lastCommentTime.current < 20000) return;

      let event = '';
      if (state.stage === GameStage.LOBBY && state.players.length > 0) event = "Too many mokka players in lobby.";
      if (state.stage === GameStage.QUESTION) {
        const slowOnes = state.players.filter(p => !p.lastAnswer);
        if (slowOnes.length > 0) event = `Player ${slowOnes[0].name} is too slow! Logic search panran?`;
      }

      if (event) {
        const roast = await gemini.generateReactiveComment(state, event);
        setHostMessage(roast);
        gemini.speakText(roast, state.mode);
        lastCommentTime.current = now;
      }
    }, 5000);
    return () => clearInterval(checkInterval);
  }, [state.stage, state.players.length, audioEnabled]);

  const handleJoin = async (name: string, age: number, lang: Language) => {
    if (!db || !roomCode) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    await updateDoc(doc(db, "games", roomCode), { players: arrayUnion(newPlayer) });
    setPlayerId(id);
    localStorage.setItem('AJ_PLAYER_ID', id);
    
    // Immediate Roast on Join
    const roast = await gemini.generateReactiveComment(state, `Player ${name} just joined the game.`);
    setHostMessage(roast);
    gemini.speakText(roast, state.mode);
  };

  const handleStartGame = async () => {
    sync({ stage: GameStage.LOADING });
    const options = await gemini.generateTopicOptions(state);
    const pickerId = state.players[Math.floor(Math.random() * state.players.length)].id;
    sync({ stage: GameStage.TOPIC_SELECTION, topicOptions: options, topicPickerId: pickerId });
    const msg = "AJ: Picker logic paru! VJ: Topic choose pannunga victims.";
    setHostMessage(msg);
    gemini.speakText(msg, state.mode);
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game select-none">
      {viewMode === 'TV' ? (
        <div className="h-full relative">
          <TVView state={state} hostMessage={hostMessage} iqData="" onReset={() => sync({ stage: GameStage.LOBBY, players: state.players.map(p => ({...p, score: 0, lastAnswer: ''})) })} onStop={() => sync({ stage: GameStage.LOBBY })} />
          {!audioEnabled && (
            <div className="fixed inset-0 bg-black/95 z-[1000] flex flex-col items-center justify-center p-20 text-center">
               <h1 className="text-[12rem] font-black italic uppercase leading-none mb-12 tracking-tighter text-fuchsia-500 animate-pulse">MIND MASH</h1>
               <button onClick={async () => { await gemini.initAudio(); setAudioEnabled(true); gemini.updateBGM(state.stage); }} className="bg-white text-black px-32 py-10 rounded-full text-6xl font-black shadow-3xl hover:scale-110 active:scale-95 transition-all">START BROADCAST</button>
            </div>
          )}
          {audioEnabled && state.stage === GameStage.LOBBY && (
            <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[500]">
               <button onClick={handleStartGame} className="bg-fuchsia-600 px-24 py-10 rounded-full text-7xl font-black border-4 border-white shadow-3xl uppercase hover:bg-fuchsia-500 transition-all">GO LIVE 🚀</button>
            </div>
          )}
        </div>
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onSelectTopic={async (t) => {
          sync({ topic: t, stage: GameStage.LOADING });
          const q = await gemini.generateQuestion({ ...state, topic: t });
          sync({ currentQuestion: q, stage: GameStage.QUESTION, players: state.players.map(p => ({ ...p, lastAnswer: '' })) });
        }} onSubmitAnswer={(a) => sync({ players: state.players.map(p => p.id === playerId ? { ...p, lastAnswer: a } : p) })} onRoast={async () => {
          const roast = await gemini.generateReactiveComment(state, `Player ${state.players.find(p=>p.id===playerId)?.name} is asking for a roast!`);
          setHostMessage(roast);
          gemini.speakText(roast, state.mode);
        }} onReaction={(e) => updateDoc(doc(db, "games", roomCode), { reactions: arrayUnion({ id: Math.random().toString(), emoji: e, x: Math.random() * 80 + 10 }) })} onReset={() => { localStorage.clear(); window.location.reload(); }} />
      )}
    </div>
  );
};

export default App;
