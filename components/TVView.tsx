
import React from 'react';
import { GameState, GameStage, GameMode } from '../types';

interface TVViewProps {
  state: GameState;
  hostMessage: string;
  iqData: string;
  thinkingSubtitle?: string;
}

const TVView: React.FC<TVViewProps> = ({ state, hostMessage, iqData, thinkingSubtitle }) => {
  // Generate a join URL that includes the room code
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${state.roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(joinUrl)}`;

  const isGenius = state.mode === GameMode.GENIUS;
  const themeClass = isGenius 
    ? "from-emerald-950 via-slate-950 to-emerald-900" 
    : "from-indigo-950 via-slate-950 to-fuchsia-950";
  const accentColor = isGenius ? "text-amber-400" : "text-fuchsia-400";
  const cardBg = isGenius ? "bg-emerald-900/20" : "bg-indigo-900/20";
  const borderColor = isGenius ? "border-amber-500/30" : "border-fuchsia-500/30";

  return (
    <div className={`h-full w-full flex flex-col items-center justify-center p-12 text-center overflow-hidden bg-gradient-to-br ${themeClass} transition-all duration-1000`}>
      
      {state.stage === GameStage.LOBBY && (
        <div className="flex flex-col md:flex-row items-center gap-20 animate-in fade-in zoom-in duration-700">
          <div className="space-y-12">
            <h1 className={`text-[12rem] leading-none font-black tracking-tighter ${accentColor} drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
               {state.roomCode || '....'}
            </h1>
            <div className="bg-white p-6 rounded-[3rem] shadow-2xl inline-block transform -rotate-2 hover:rotate-0 transition-all">
               <img src={qrUrl} alt="Join Game" className="w-64 h-64" />
            </div>
            <p className="text-3xl font-bold opacity-60 italic">Scan to Join!</p>
          </div>
          
          <div className="flex flex-col items-center gap-8 min-w-[500px]">
            <h2 className="text-5xl font-black uppercase tracking-widest text-slate-400">Players</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              {state.players.map(p => (
                <div key={p.id} className={`${cardBg} border-2 ${borderColor} px-10 py-5 rounded-[2rem] shadow-xl animate-in zoom-in`}>
                  <p className="text-4xl font-black">{p.name}</p>
                </div>
              ))}
              {state.players.length === 0 && <p className="text-2xl animate-pulse opacity-40 italic">Waiting for family to wake up...</p>}
            </div>
          </div>
        </div>
      )}

      {state.stage === GameStage.LOADING && (
        <div className="text-center space-y-10">
           <div className="w-56 h-56 rounded-full bg-white/5 border-8 border-indigo-500/20 flex items-center justify-center text-9xl animate-spin-slow mx-auto">
              {isGenius ? '🧠' : '👾'}
           </div>
           <p className="text-5xl font-black italic animate-pulse text-indigo-300">"{thinkingSubtitle || 'Processing...'}"</p>
        </div>
      )}

      {state.stage === GameStage.TOPIC_SELECTION && (
        <div className="space-y-12">
          <h2 className={`text-8xl font-black ${accentColor} uppercase tracking-tighter animate-bounce`}>Topic Choice!</h2>
          <div className="flex flex-wrap gap-8 justify-center">
            {state.topicOptions.map((opt, i) => (
              <div key={i} className={`${cardBg} border-4 ${borderColor} p-12 rounded-[4rem] w-80 h-64 flex flex-col items-center justify-center shadow-2xl`}>
                 <p className="text-3xl font-black uppercase">{opt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.stage === GameStage.QUESTION && state.currentQuestion && (
        <div className="w-full max-w-7xl space-y-16 animate-in slide-in-from-bottom-20 duration-500">
          <div className="space-y-6">
            <h2 className="text-8xl font-black leading-tight drop-shadow-lg">{state.currentQuestion.textEn}</h2>
            <h3 className={`text-5xl font-bold italic ${isGenius ? 'text-amber-200' : 'text-indigo-400'}`}>"{state.currentQuestion.textTa}"</h3>
          </div>
          <div className="grid grid-cols-5 gap-6">
            {state.currentQuestion.options.map((opt, i) => (
              <div key={i} className={`${cardBg} border-4 ${borderColor} p-8 rounded-[3rem] relative shadow-2xl`}>
                <span className="absolute -top-6 -left-6 w-16 h-16 bg-white text-black flex items-center justify-center rounded-2xl text-4xl font-black">{i + 1}</span>
                <p className="text-2xl font-black mb-2">{opt.en}</p>
                <p className="text-sm opacity-50 italic">{opt.ta}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(state.stage === GameStage.VOTING_RESULTS || state.stage === GameStage.REVEAL) && (
        <div className="max-w-5xl space-y-12">
           <div className={`${cardBg} border-8 ${borderColor} p-20 rounded-[5rem] shadow-3xl backdrop-blur-xl animate-in zoom-in`}>
              <p className="text-6xl font-black italic leading-tight text-white">{hostMessage}</p>
           </div>
           {state.stage === GameStage.REVEAL && (
             <div className="text-7xl font-black text-emerald-400 animate-bounce">
                CORRECT ANSWER: {state.currentQuestion?.correctIndex}
             </div>
           )}
        </div>
      )}

      {state.stage === GameStage.DASHBOARD && (
        <div className="w-full max-w-7xl grid grid-cols-12 gap-10">
           <div className="col-span-8 flex flex-col gap-8">
              <h2 className="text-8xl font-black text-left uppercase tracking-tighter">AJ'S REPORT</h2>
              <div className="bg-black/40 p-12 rounded-[4rem] border-2 border-white/10 text-left">
                 <p className="text-4xl italic font-bold leading-relaxed">{iqData}</p>
              </div>
           </div>
           <div className="col-span-4 flex flex-col gap-4 pt-20">
              {state.players.sort((a,b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className="flex justify-between items-center bg-white/5 p-8 rounded-3xl border border-white/10">
                   <span className="text-4xl font-black opacity-30">#{i+1}</span>
                   <span className="text-3xl font-black">{p.name}</span>
                   <span className="text-5xl font-black text-amber-500">{p.score}</span>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default TVView;
