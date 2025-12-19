
import React, { useState, useEffect } from 'react';
import { GameState, GameStage, Language, Player, GameMode } from './types';
import TVView from './components/TVView';
import PhoneView from './components/PhoneView';
import * as gemini from './geminiService';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from "firebase/firestore";

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'TV' | 'PHONE'>(() => {
    // Check URL params to auto-switch to phone if a room code is present
    const params = new URLSearchParams(window.location.search);
    return params.has('room') ? 'PHONE' : 'TV';
  });
  
  const [roomCode, setRoomCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || '';
  });

  const [playerId, setPlayerId] = useState<string>(() => localStorage.getItem('AJ_PLAYER_ID') || '');
  const [hostMessage, setHostMessage] = useState<string>('Welcome! I am AJ. Connect your phones to begin.');
  const [iqData, setIqData] = useState<string>('');
  const [thinkingSubtitle, setThinkingSubtitle] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const [state, setState] = useState<GameState>({
    roomCode: '',
    stage: GameStage.LOBBY, players: [], mode: GameMode.CHAOS,
    language: Language.MIXED, round: 1, history: [],
    isWarmup: false, topicOptions: []
  });

  // Listen to Firestore for updates
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onSnapshot(doc(db, "games", roomCode), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as GameState;
        setState(data);
        
        // Host-only: Reaction logic when stages change
        if (viewMode === 'TV') {
           if (data.stage === GameStage.VOTING_RESULTS && !hostMessage.includes("Answer")) {
             // We can trigger roasts here
           }
        }
      }
    });
    return () => unsub();
  }, [roomCode, viewMode]);

  // TV: Initialize a new room
  const createRoom = async () => {
    const code = Math.random().toString(36).substr(2, 4).toUpperCase();
    const initialState: GameState = {
      roomCode: code,
      stage: GameStage.LOBBY, players: [], mode: GameMode.CHAOS,
      language: Language.MIXED, round: 1, history: [],
      isWarmup: false, topicOptions: []
    };
    await setDoc(doc(db, "games", code), initialState);
    setRoomCode(code);
  };

  useEffect(() => {
    if (viewMode === 'TV' && !roomCode) {
      createRoom();
    }
  }, [viewMode]);

  const enableAudio = () => {
    setAudioEnabled(true);
    gemini.speakText("I am awake! Let's see if your family actually has any brain cells today.");
  };

  const syncState = async (updates: Partial<GameState>) => {
    if (!roomCode) return;
    await updateDoc(doc(db, "games", roomCode), updates);
  };

  const toggleMode = () => {
    const newMode = state.mode === GameMode.CHAOS ? GameMode.GENIUS : GameMode.CHAOS;
    syncState({ 
      mode: newMode, 
      stage: GameStage.LOBBY, 
      currentQuestion: undefined, 
      topic: undefined,
      topicOptions: []
    });
    const msg = newMode === GameMode.GENIUS ? "Academic mode active. Try to keep up." : "Chaos mode. I'm taking the gloves off.";
    setHostMessage(msg);
    if (audioEnabled) gemini.speakText(msg);
  };

  const handleJoin = async (name: string, age: number, lang: Language) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    const newPlayers = [...state.players, newPlayer];
    await syncState({ players: newPlayers });
    setPlayerId(id);
    localStorage.setItem('AJ_PLAYER_ID', id);
  };

  const startTopicSelection = async () => {
    await syncState({ stage: GameStage.LOADING });
    const options = await gemini.generateTopicOptions(state);
    await syncState({ stage: GameStage.TOPIC_SELECTION, topicOptions: options });
    if (audioEnabled) gemini.speakText(state.mode === GameMode.CHAOS ? "One of you pick a topic. Preferably one you aren't terrible at." : "Select a field of study for our first round.");
  };

  const setTopic = async (topic: string, pickerId: string) => {
    await syncState({ 
      topic, 
      stage: GameStage.LOADING, 
      topicPickerId: pickerId,
      history: [...state.history, topic] 
    });
    // Generate question
    const q = await gemini.generateQuestion({ ...state, topic });
    await syncState({ 
      currentQuestion: q, 
      stage: GameStage.QUESTION, 
      players: state.players.map(p => ({ ...p, lastAnswer: '' })),
      history: [...state.history, q.textEn]
    });
    if (audioEnabled) gemini.speakText(q.textEn);
  };

  const startReveal = async () => {
    await syncState({ stage: GameStage.LOADING });
    const roast = await gemini.generateRoast(state);
    setHostMessage(roast);
    await syncState({ stage: GameStage.VOTING_RESULTS });
    if (audioEnabled) gemini.speakText(roast);
  };

  const showCorrectAnswer = async () => {
    const correct = state.currentQuestion?.correctIndex;
    const updatedPlayers = state.players.map(p => {
      let pts = 0;
      const isCorrect = parseInt(p.lastAnswer || '0') === correct;
      if (isCorrect) pts = (p.id === state.topicPickerId) ? 100 : 50;
      return { ...p, score: p.score + pts };
    });
    await syncState({ stage: GameStage.REVEAL, players: updatedPlayers });
  };

  const showDashboard = async () => {
    await syncState({ stage: GameStage.LOADING });
    const summary = await gemini.generateIQBoard(state);
    setIqData(summary);
    await syncState({ stage: GameStage.DASHBOARD });
    if (audioEnabled) gemini.speakText(summary);
  };

  const submitAnswer = async (ans: string) => {
    const updatedPlayers = state.players.map(p => p.id === playerId ? { ...p, lastAnswer: ans } : p);
    await syncState({ players: updatedPlayers });
  };

  return (
    <div className="h-screen w-screen overflow-hidden font-game bg-[#0f172a] text-white">
      {/* Dev Controls */}
      <div className="fixed top-4 left-4 z-[100] flex gap-2">
        <button onClick={() => setViewMode(v => v === 'TV' ? 'PHONE' : 'TV')} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md border border-white/20">
           Switch to {viewMode === 'TV' ? 'Phone' : 'TV'}
        </button>
        {viewMode === 'TV' && !audioEnabled && (
          <button onClick={enableAudio} className="bg-yellow-500 text-black px-6 py-2 rounded-full text-xs font-black animate-pulse">
             🔊 Wake AJ Up
          </button>
        )}
      </div>

      {viewMode === 'TV' ? (
        <>
          <TVView state={state} hostMessage={hostMessage} iqData={iqData} thinkingSubtitle={thinkingSubtitle} />
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-50">
            {state.stage === GameStage.LOBBY && state.players.length > 0 && <button onClick={startTopicSelection} className="bg-indigo-600 px-8 py-4 rounded-full font-black uppercase shadow-2xl hover:scale-105 transition-all">Start Game</button>}
            {state.stage === GameStage.QUESTION && <button onClick={startReveal} className="bg-purple-600 px-8 py-4 rounded-full font-black uppercase shadow-2xl">Reveal Answers</button>}
            {state.stage === GameStage.VOTING_RESULTS && <button onClick={showCorrectAnswer} className="bg-pink-600 px-8 py-4 rounded-full font-black uppercase shadow-2xl">Correct Answer</button>}
            {state.stage === GameStage.REVEAL && <button onClick={showDashboard} className="bg-blue-600 px-8 py-4 rounded-full font-black uppercase shadow-2xl">Scoreboard</button>}
            {state.stage === GameStage.DASHBOARD && <button onClick={() => { syncState({ round: state.round + 1 }); startTopicSelection(); }} className="bg-emerald-600 px-8 py-4 rounded-full font-black uppercase shadow-2xl">Next Round</button>}
            <button onClick={toggleMode} className="bg-slate-800 px-6 py-4 rounded-full text-xs font-black">MODE: {state.mode}</button>
          </div>
        </>
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onSelectTopic={(t) => setTopic(t, playerId!)} onSubmitAnswer={submitAnswer} onClaimChallenge={() => {}} onSendRebuttal={(t) => audioEnabled && gemini.speakText(t)} />
      )}
    </div>
  );
};

export default App;
