
import React, { useState } from 'react';
import { GameState, GameStage, Language, Player, GameMode } from './types';
import TVView from './components/TVView';
import PhoneView from './components/PhoneView';
import * as gemini from './geminiService';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'TV' | 'PHONE'>('TV');
  const [playerId, setPlayerId] = useState<string>();
  const [hostMessage, setHostMessage] = useState<string>('Welcome! Choose your Destiny.');
  const [iqData, setIqData] = useState<string>('');
  const [state, setState] = useState<GameState>({
    roomCode: Math.random().toString(36).substr(2, 4).toUpperCase(),
    stage: GameStage.LOBBY, players: [], mode: GameMode.CHAOS,
    language: Language.MIXED, round: 1, history: [],
    isWarmup: false, topicOptions: []
  });

  const toggleMode = () => {
    const newMode = state.mode === GameMode.CHAOS ? GameMode.GENIUS : GameMode.CHAOS;
    // CRITICAL: Reset the current round data when switching modes to avoid "Stale UI"
    setState(s => ({ 
      ...s, 
      mode: newMode, 
      stage: GameStage.LOBBY, 
      currentQuestion: undefined, 
      topic: undefined,
      topicOptions: []
    }));
    
    const msg = newMode === GameMode.GENIUS 
      ? "Switching to GENIUS MODE. I will now behave like a professional professor. Let's learn."
      : "Switching to CHAOS MODE. The roasting oven is hot! Prepare yourselves.";
    setHostMessage(msg);
    gemini.speakText(msg);
  };

  const handleJoin = (name: string, age: number, lang: Language) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newPlayer: Player = { id, name, age, score: 0, traits: [], preferredLanguage: lang };
    setState(s => ({ ...s, players: [...s.players, newPlayer] }));
    setPlayerId(id);
  };

  const startTopicSelection = async () => {
    setState(s => ({ ...s, stage: GameStage.LOADING }));
    const options = await gemini.generateTopicOptions(state);
    setState(s => ({ ...s, stage: GameStage.TOPIC_SELECTION, topicOptions: options, topicPickerId: undefined }));
    
    const msg = state.mode === GameMode.CHAOS 
      ? "I've picked 4 topics. Who is brave enough to pick one and potentially fail miserably?"
      : "Scholars, here are our disciplines for this round. Who will lead the inquiry?";
    gemini.speakText(msg);
  };

  const setTopic = (topic: string, pickerId: string) => {
    if (state.stage !== GameStage.TOPIC_SELECTION) return;
    const picker = state.players.find(p => p.id === pickerId);
    setState(s => ({ 
      ...s, 
      topic, 
      stage: GameStage.LOADING, 
      topicPickerId: pickerId,
      history: [...s.history, topic] // Add to history to prevent repeat
    }));
    
    const msg = state.mode === GameMode.CHAOS 
      ? `${picker?.name} thinks they are an expert in ${topic}. This will be fun to watch.`
      : `${picker?.name} has selected ${topic}. A most enlightened choice!`;
    setHostMessage(msg);
    gemini.speakText(msg);
    
    setTimeout(() => nextQuestion(), 2000);
  };

  const nextQuestion = async () => {
    const q = await gemini.generateQuestion(state);
    setState(s => ({ 
      ...s, 
      currentQuestion: q, 
      stage: GameStage.QUESTION, 
      players: s.players.map(p => ({ ...p, lastAnswer: '' })),
      history: [...s.history, q.textEn] // Add question to history
    }));
    gemini.speakText(q.textEn + " . " + q.textTa);
  };

  const startReveal = async () => {
    setState(s => ({ ...s, stage: GameStage.LOADING }));
    const roastOrPraise = await gemini.generateRoast(state);
    setHostMessage(roastOrPraise);
    setState(s => ({ ...s, stage: GameStage.VOTING_RESULTS }));
    gemini.speakText(roastOrPraise);
  };

  const showCorrectAnswer = () => {
    setState(s => ({ ...s, stage: GameStage.REVEAL }));
    const correct = state.currentQuestion?.correctIndex;
    setState(s => ({
      ...s,
      players: s.players.map(p => {
        let pts = 0;
        const isPicker = p.id === s.topicPickerId;
        const isCorrect = parseInt(p.lastAnswer || '0') === correct;
        if (isCorrect) pts = isPicker ? 100 : 50;
        else if (isPicker && p.lastAnswer && s.mode === GameMode.CHAOS) pts = -50;
        return { ...p, score: p.score + pts };
      })
    }));
    gemini.speakText(state.mode === GameMode.CHAOS ? "The truth is Option " + correct : "The verified answer is Option " + correct);
  };

  const showDashboard = async () => {
    setState(s => ({ ...s, stage: GameStage.LOADING }));
    const judge = await gemini.generateIQBoard(state);
    setIqData(judge);
    setState(s => ({ ...s, stage: GameStage.DASHBOARD }));
    gemini.speakText(judge);
  };

  return (
    <div className="h-screen w-screen overflow-hidden font-game">
      {/* PROFESSIONAL TV CONTROL PANEL (Only on TV View) */}
      <div className="fixed top-6 left-6 z-[9999] flex flex-wrap gap-3 p-3 bg-black/90 backdrop-blur-3xl rounded-[2.5rem] border-2 border-white/10 shadow-2xl">
        <button onClick={() => setViewMode(v => v === 'TV' ? 'PHONE' : 'TV')} className="bg-white text-black text-[11px] px-6 py-3 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform">
           {viewMode === 'TV' ? '📱 To Phone' : '📺 To TV'}
        </button>
        {viewMode === 'TV' && (
          <div className="flex gap-2">
            <button onClick={toggleMode} className={`${state.mode === GameMode.GENIUS ? 'bg-amber-500' : 'bg-fuchsia-600'} text-[11px] px-6 py-3 rounded-full font-black text-white uppercase shadow-lg transition-all active:scale-95`}>
              MODE: {state.mode}
            </button>
            <div className="w-[1px] bg-white/20 mx-1"></div>
            {state.stage === GameStage.LOBBY && <button onClick={startTopicSelection} className="bg-indigo-600 text-[11px] px-6 py-3 rounded-full font-bold text-white uppercase shadow-lg">1. START</button>}
            {state.stage === GameStage.QUESTION && <button onClick={startReveal} className="bg-purple-600 text-[11px] px-6 py-3 rounded-full font-bold text-white uppercase shadow-lg">2. REVEAL GUESSES</button>}
            {state.stage === GameStage.VOTING_RESULTS && <button onClick={showCorrectAnswer} className="bg-pink-600 text-[11px] px-6 py-3 rounded-full font-bold text-white uppercase shadow-lg">3. SHOW ANSWER</button>}
            {state.stage === GameStage.REVEAL && <button onClick={showDashboard} className="bg-blue-600 text-[11px] px-6 py-3 rounded-full font-bold text-white uppercase shadow-lg">4. IQ BOARD</button>}
            {state.stage === GameStage.DASHBOARD && <button onClick={() => { setState(s => ({ ...s, round: s.round + 1 })); startTopicSelection(); }} className="bg-emerald-600 text-[11px] px-6 py-3 rounded-full font-bold text-white uppercase shadow-lg">NEXT ROUND</button>}
          </div>
        )}
      </div>

      {viewMode === 'TV' ? (
        <TVView state={state} hostMessage={hostMessage} iqData={iqData} />
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onSelectTopic={(t) => setTopic(t, playerId!)} onSubmitAnswer={(ans) => setState(s => ({ ...s, players: s.players.map(p => p.id === playerId ? { ...p, lastAnswer: ans } : p) }))} onClaimChallenge={() => {}} onSendRebuttal={(t) => gemini.speakText(t)} />
      )}
    </div>
  );
};

export default App;
