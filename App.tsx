
import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameStage, Language, Player, GameMode } from './types';
import TVView from './components/TVView';
import PhoneView from './components/PhoneView';
import * as gemini from './geminiService';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const App: React.FC = () => {
  const [viewMode] = useState<'TV' | 'PHONE'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('room') ? 'PHONE' : 'TV';
  });
  
  const [roomCode, setRoomCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.toUpperCase() || '';
  });

  const [playerId, setPlayerId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [hostMessage, setHostMessage] = useState<string>('AJ & VJ ON-AIR WAITING...');
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const [state, setState] = useState<GameState>({
    roomCode: '', stage: GameStage.LOBBY, players: [], mode: GameMode.CONFIDENTLY_WRONG,
    language: Language.MIXED, round: 1, history: [], topicOptions: [], reactions: [], isPaused: false
  });

  const getStorageKey = (code: string) => `MIND_MASH_PLAYER_${code}`;

  // 1. Initial Room Setup
  useEffect(() => {
    const init = async () => {
      if (viewMode === 'TV' && !roomCode && db) {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        console.log("TV: Creating Room", code);
        const initialState: GameState = {
          roomCode: code,
          stage: GameStage.LOBBY,
          players: [],
          mode: GameMode.CONFIDENTLY_WRONG,
          language: Language.MIXED,
          round: 1,
          history: [],
          topicOptions: [],
          reactions: [],
          isPaused: false
        };
        try {
          await setDoc(doc(db, "games", code), initialState);
          setRoomCode(code);
        } catch (e) {
          console.error("TV Init Failed", e);
        }
      } else if (viewMode === 'PHONE' && roomCode) {
        // Load existing player ID from storage for this specific room
        const storedId = localStorage.getItem(getStorageKey(roomCode));
        if (storedId) setPlayerId(storedId);
      }
      setIsInitializing(false);
    };
    init();
  }, [viewMode, db]);

  // 2. Real-time Subscription
  useEffect(() => {
    if (!roomCode || !db || isInitializing) return;
    
    console.log(`Subscribing to Room: ${roomCode}`);
    const unsub = onSnapshot(doc(db, "games", roomCode), (snapshot) => {
      if (snapshot.exists()) {
        const newState = snapshot.data() as GameState;
        setState(newState);
        
        // Reconnection Logic: If player session exists but they aren't in the list, re-auth or clear
        if (viewMode === 'PHONE' && playerId) {
          const isPlayerInRoom = newState.players.some(p => p.id === playerId);
          if (!isPlayerInRoom && newState.players.length > 0 && newState.stage !== GameStage.LOADING) {
             console.log("Session stale, clearing player ID");
             setPlayerId('');
             localStorage.removeItem(getStorageKey(roomCode));
          }
        }

        if (viewMode === 'TV' && audioEnabled) {
          gemini.updateBGM(newState.stage, 0, newState.isPaused);
        }
      } else {
        console.warn("Room document does not exist yet.");
      }
    }, (error) => {
      console.error("Firestore Subscription Error:", error);
    });
    
    return unsub;
  }, [roomCode, db, isInitializing, audioEnabled, viewMode, playerId]);

  const sync = async (updates: Partial<GameState>) => {
    if (!db || !roomCode) return;
    try {
      await updateDoc(doc(db, "games", roomCode), updates);
    } catch (e) {
      console.error("Sync Error:", e);
    }
  };

  // 3. Game Lifecycle (TV ONLY)
  useEffect(() => {
    if (viewMode !== 'TV' || state.isPaused || state.stage !== GameStage.QUESTION) return;

    if (state.players.length > 0 && state.players.every(p => !!p.lastAnswer)) {
      const timer = setTimeout(() => handleRoundEnd(), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.players, state.stage, state.isPaused, viewMode]);

  const handleRoundEnd = async () => {
    if (!state.currentQuestion) return;
    
    sync({ stage: GameStage.REVEAL });
    
    const updatedPlayers = state.players.map(p => {
      const isCorrect = p.lastAnswer === (state.currentQuestion!.correctIndex + 1).toString();
      let points = 0;
      if (state.mode === GameMode.ACTUALLY_GENIUS && isCorrect) points = 100;
      if (state.mode === GameMode.CONFIDENTLY_WRONG && !isCorrect) points = 100;
      return { ...p, score: p.score + points };
    });

    const commentary = await gemini.generateReactiveComment(state, "Round over. Reveal the truth.");
    setHostMessage(commentary);
    gemini.speakText(commentary, state.mode);

    setTimeout(() => {
      sync({ 
        players: updatedPlayers.map(p => ({ ...p, lastAnswer: '' })), 
        stage: GameStage.LOBBY,
        currentQuestion: undefined,
        topic: ''
      });
    }, 8000);
  };

  const handleJoin = async (name: string) => {
    if (!db || !roomCode) return;
    
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { 
      id, name, age: 25, score: 0, traits: [], preferredLanguage: Language.MIXED 
    };
    
    await updateDoc(doc(db, "games", roomCode), { players: arrayUnion(newPlayer) });
    setPlayerId(id);
    localStorage.setItem(getStorageKey(roomCode), id);

    const msg = await gemini.generateReactiveComment({ ...state, players: [...state.players, newPlayer] }, `${name} joined.`);
    setHostMessage(msg);
    gemini.speakText(msg, state.mode);
  };

  const handleStartGame = async () => {
    if (state.players.length === 0) return;
    sync({ stage: GameStage.LOADING, isPaused: false });
    const options = await gemini.generateTopicOptions(state);
    const pickerId = state.players[Math.floor(Math.random() * state.players.length)].id;
    sync({ stage: GameStage.TOPIC_SELECTION, topicOptions: options, topicPickerId: pickerId });
    
    const msg = await gemini.generateReactiveComment(state, "Starting game. Selecting topic picker.");
    setHostMessage(msg);
    gemini.speakText(msg, state.mode);
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black gap-6">
        <div className="w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-2xl uppercase tracking-widest text-white/50 animate-pulse">
          Connecting to Frequency...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden font-game select-none">
      {viewMode === 'TV' ? (
        <div className="h-full relative">
          <TVView 
            state={state} 
            hostMessage={hostMessage} 
            iqData="" 
            onReset={() => sync({ stage: GameStage.LOBBY, players: state.players.map(p => ({...p, score: 0, lastAnswer: ''})), currentQuestion: undefined })} 
            onStop={() => sync({ stage: GameStage.LOBBY, currentQuestion: undefined, topic: '' })} 
          />
          
          <div className="fixed bottom-0 left-0 w-full p-10 flex justify-center items-center gap-6 bg-gradient-to-t from-black via-black/80 to-transparent z-[999]">
            {!audioEnabled ? (
              <button 
                onClick={async () => { await gemini.initAudio(); setAudioEnabled(true); gemini.updateBGM(state.stage); }} 
                className="bg-white text-black px-24 py-10 rounded-full text-5xl font-black shadow-3xl hover:scale-105 active:scale-95 transition-all animate-pulse"
              >
                ACTIVATE RADIO 🎙️
              </button>
            ) : (
              <div className="flex items-center gap-6">
                {state.stage === GameStage.LOBBY && (
                  <button 
                    onClick={handleStartGame} 
                    disabled={state.players.length === 0} 
                    className="bg-fuchsia-600 px-24 py-10 rounded-full text-5xl font-black border-4 border-white shadow-3xl uppercase transition-all hover:bg-fuchsia-500 disabled:opacity-30 disabled:scale-90"
                  >
                    GO LIVE 🚀
                  </button>
                )}
                {state.stage !== GameStage.LOBBY && (
                  <div className="flex gap-4">
                    <button 
                      onClick={() => sync({ isPaused: !state.isPaused })} 
                      className="bg-amber-500 px-12 py-6 rounded-full font-black text-2xl border-4 border-white"
                    >
                      {state.isPaused ? 'RESUME ▶️' : 'PAUSE ⏸️'}
                    </button>
                    <button 
                      onClick={() => sync({ stage: GameStage.LOBBY, currentQuestion: undefined, isPaused: false, topic: '' })} 
                      className="bg-red-600 px-12 py-6 rounded-full font-black text-2xl border-4 border-white"
                    >
                      STOP ⏹️
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <PhoneView 
          state={state} 
          playerId={playerId} 
          onJoin={handleJoin} 
          onSelectTopic={async (t) => {
            sync({ topic: t, stage: GameStage.LOADING });
            const q = await gemini.generateQuestion({ ...state, topic: t });
            sync({ currentQuestion: q, stage: GameStage.QUESTION, players: state.players.map(p => ({ ...p, lastAnswer: '' })) });
          }} 
          onSubmitAnswer={(a) => {
            const updated = state.players.map(p => p.id === playerId ? { ...p, lastAnswer: a } : p);
            sync({ players: updated });
          }} 
          onRoast={async () => {
             const roast = await gemini.generateReactiveComment(state, "Player requested a roast via mobile.");
             setHostMessage(roast);
             gemini.speakText(roast, state.mode);
          }}
          onReaction={(e) => sync({ reactions: [...(state.reactions || []), { id: Math.random().toString(), emoji: e, x: Math.random() * 80 + 10 }] })} 
          onReset={() => { localStorage.clear(); window.location.reload(); }} 
        />
      )}
    </div>
  );
};

export default App;
