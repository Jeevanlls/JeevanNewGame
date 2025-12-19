
import React, { useState, useEffect } from 'react';
import { GameState, GameStage, Language, Player, GameMode } from './types';
import TVView from './components/TVView';
import PhoneView from './components/PhoneView';
import * as gemini from './geminiService';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'TV' | 'PHONE'>('TV');
  const [playerId, setPlayerId] = useState<string>();
  const [hostMessage, setHostMessage] = useState<string>('Welcome! I am AJ. Ready to play?');
  const [iqData, setIqData] = useState<string>('');
  const [thinkingSubtitle, setThinkingSubtitle] = useState<string>('');
  
  const [state, setState] = useState<GameState>({
    roomCode: Math.random().toString(36).substr(2, 4).toUpperCase(),
    stage: GameStage.LOBBY, players: [], mode: GameMode.CHAOS,
    language: Language.MIXED, round: 1, history: [],
    isWarmup: false, topicOptions: []
  });

  // Funny thinking messages to show when AI is generating
  const thinkingMessages = {
    [GameMode.CHAOS]: [
      "Sharpening my tongue...",
      "Consulting the Book of Mokka...",
      "Calculating your imminent failure...",
      "Asking my robot friends for better roasts...",
      "Upgrading my sarcasm processors..."
    ],
    [GameMode.GENIUS]: [
      "Consulting the Library of Alexandria...",
      "Verifying scholarly citations...",
      "Calibrating intellectual rigour...",
      "Measuring the room's collective IQ (it's low)...",
      "Drafting a peer-reviewed question..."
    ]
  };

  useEffect(() => {
    let interval: any;
    if (state.stage === GameStage.LOADING) {
      interval = setInterval(() => {
        const msgs = thinkingMessages[state.mode];
        setThinkingSubtitle(msgs[Math.floor(Math.random() * msgs.length)]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [state.stage, state.mode]);

  const toggleMode = () => {
    const newMode = state.mode === GameMode.CHAOS ? GameMode.GENIUS : GameMode.CHAOS;
    setState(s => ({ 
      ...s, 
      mode: newMode, 
      stage: GameStage.LOBBY, 
      currentQuestion: undefined, 
      topic: undefined,
      topicOptions: []
    }));
    const msg = newMode === GameMode.GENIUS ? "Professor mode active." : "Chaos mode active. Be careful.";
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
    setState(s => ({ ...s, stage: GameStage.TOPIC_SELECTION, topicOptions: options }));
    gemini.speakText(state.mode === GameMode.CHAOS ? "Pick a topic so I can judge you." : "Scholars, choose your discipline.");
  };

  const setTopic = (topic: string, pickerId: string) => {
    if (state.stage !== GameStage.TOPIC_SELECTION) return;
    setState(s => ({ 
      ...s, 
      topic, 
      stage: GameStage.LOADING, 
      topicPickerId: pickerId,
      history: [...s.history, topic] 
    }));
    setTimeout(() => nextQuestion(), 1500);
  };

  const nextQuestion = async () => {
    const q = await gemini.generateQuestion(state);
    setState(s => ({ 
      ...s, 
      currentQuestion: q, 
      stage: GameStage.QUESTION, 
      players: s.players.map(p => ({ ...p, lastAnswer: '' })),
      history: [...s.history, q.textEn]
    }));
    gemini.speakText(q.textEn);
  };

  const startReveal = async () => {
    setState(s => ({ ...s, stage: GameStage.LOADING }));
    const response = await gemini.generateRoast(state);
    setHostMessage(response);
    setState(s => ({ ...s, stage: GameStage.VOTING_RESULTS }));
    gemini.speakText(response);
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
  };

  const showDashboard = async () => {
    setState(s => ({ ...s, stage: GameStage.LOADING }));
    const judge = await gemini.generateIQBoard(state);
    setIqData(judge);
    setState(s => ({ ...s, stage: GameStage.DASHBOARD }));
    gemini.speakText(judge);
  };

  return (
    <div className="h-screen w-screen overflow-hidden font-game bg-[#0f172a]">
      {/* Universal Control Header */}
      <div className="fixed top-4 left-4 z-[100] flex gap-2">
        <button onClick={() => setViewMode(v => v === 'TV' ? 'PHONE' : 'TV')} className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
           {viewMode === 'TV' ? 'Switch to Phone' : 'Switch to TV'}
        </button>
      </div>

      {viewMode === 'TV' ? (
        <>
          {/* Main Controls Overlay for the TV Host */}
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex gap-2 bg-black/50 p-2 rounded-full backdrop-blur-md border border-white/10 opacity-30 hover:opacity-100 transition-opacity">
            <button onClick={toggleMode} className="bg-fuchsia-600 px-4 py-2 rounded-full text-xs font-black text-white">MODE: {state.mode}</button>
            {state.stage === GameStage.LOBBY && <button onClick={startTopicSelection} className="bg-indigo-600 px-4 py-2 rounded-full text-xs font-bold text-white uppercase">Start Game</button>}
            {state.stage === GameStage.QUESTION && <button onClick={startReveal} className="bg-purple-600 px-4 py-2 rounded-full text-xs font-bold text-white uppercase">Reveal Answers</button>}
            {state.stage === GameStage.VOTING_RESULTS && <button onClick={showCorrectAnswer} className="bg-pink-600 px-4 py-2 rounded-full text-xs font-bold text-white uppercase">Correct Answer</button>}
            {state.stage === GameStage.REVEAL && <button onClick={showDashboard} className="bg-blue-600 px-4 py-2 rounded-full text-xs font-bold text-white uppercase">Scoreboard</button>}
            {state.stage === GameStage.DASHBOARD && <button onClick={() => { setState(s => ({ ...s, round: s.round + 1 })); startTopicSelection(); }} className="bg-emerald-600 px-4 py-2 rounded-full text-xs font-bold text-white uppercase">Next Round</button>}
          </div>
          
          <TVView state={state} hostMessage={hostMessage} iqData={iqData} thinkingSubtitle={thinkingSubtitle} />
        </>
      ) : (
        <PhoneView state={state} playerId={playerId} onJoin={handleJoin} onSelectTopic={(t) => setTopic(t, playerId!)} onSubmitAnswer={(ans) => setState(s => ({ ...s, players: s.players.map(p => p.id === playerId ? { ...p, lastAnswer: ans } : p) }))} onClaimChallenge={() => {}} onSendRebuttal={(t) => gemini.speakText(t)} />
      )}
    </div>
  );
};

export default App;
