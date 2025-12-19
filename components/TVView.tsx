
import React, { useState, useEffect } from 'react';
import { GameState, GameStage, GameMode } from '../types';

interface TVViewProps {
  state: GameState;
  hostMessage: string;
  iqData: string;
}

const TVView: React.FC<TVViewProps> = ({ state, hostMessage }) => {
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${state.roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(joinUrl)}`;
  const isChaos = state.mode === GameMode.CONFIDENTLY_WRONG;
  const accentColor = isChaos ? "text-fuchsia-500" : "text-emerald-400";
  const master = state.players.find(p => p.id === state.topicPickerId);

  // Dynamic lobby messages
  const [lobbyMsg, setLobbyMsg] = useState("Scanning for brain signals...");
  useEffect(() => {
    if (state.stage !== GameStage.LOBBY) return;
    const msgs = [
      "Judging your outfit choices...",
      "Calculating your collective IQ (it's low)...",
      "Scanning for hidden snacks...",
      "Searching for signs of intelligence...",
      "AJ is stretching his virtual vocal cords...",
      "Preparing some spicy roasts...",
      "Tamil dictionary loaded (Slang level: High)",
      "Ready to roast some Nanbas..."
    ];
    const interval = setInterval(() => {
      setLobbyMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    }, 4000);
    return () => clearInterval(interval);
  }, [state.stage]);

  return (
    <div className={`h-full w-full p-20 flex flex-col items-center justify-center relative transition-colors duration-1000 ${isChaos ? 'bg-[#020617]' : 'bg-[#0f172a]'}`}>
      
      {/* HUD Header */}
      <div className="absolute top-10 left-0 right-0 flex items-center justify-between px-20">
         <div className="flex items-center gap-10">
           <h1 className="text-4xl font-black italic tracking-tighter">MIND <span className={accentColor}>MASH</span></h1>
           <div className={`px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${isChaos ? 'border-fuchsia-500/50 text-fuchsia-500' : 'border-emerald-500/50 text-emerald-500'}`}>
              {isChaos ? 'Confidently Wrong' : 'Actually Genius'}
           </div>
         </div>
         
         <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
            <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Cloud Sync Active</p>
         </div>
      </div>

      {state.stage === GameStage.LOBBY && (
        <div className="z-10 w-full max-w-7xl grid grid-cols-2 gap-20 items-center">
          <div className="text-left space-y-10">
            <h1 className="text-[12rem] font-black leading-none tracking-tighter text-white drop-shadow-2xl">
              {state.roomCode || 'BOOT'}
            </h1>
            <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 backdrop-blur-3xl flex items-center gap-8">
              <img src={qrUrl} alt="QR" className="w-40 h-40 bg-white p-3 rounded-2xl" />
              <div className="space-y-2">
                <p className="text-4xl font-black uppercase">Scan to Play</p>
                <p className="text-lg font-bold opacity-30 uppercase tracking-widest leading-tight">Join the AJ Show. Good luck, you'll need it.</p>
                <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.2em] pt-4 italic">{lobbyMsg}</p>
              </div>
            </div>
          </div>
          <div className="bg-black/40 border-4 border-white/5 rounded-[4rem] p-12 h-[500px] flex flex-col shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <span className="text-[15rem] font-black leading-none">AJ</span>
            </div>
            <h2 className="text-4xl font-black uppercase italic mb-6 border-b border-white/10 pb-4 relative z-10">Current Victims ({state.players.length})</h2>
            <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 relative z-10">
              {state.players.map((p, i) => (
                <div key={p.id} className="bg-white/10 p-5 rounded-2xl border border-white/10 animate-in slide-in-from-bottom-4 group" style={{ animationDelay: `${i * 100}ms` }}>
                  <p className="text-2xl font-black uppercase truncate group-hover:text-fuchsia-400 transition-colors">{p.name}</p>
                  <p className="text-[10px] font-bold opacity-20 uppercase">Score: {p.score}</p>
                </div>
              ))}
              {state.players.length === 0 && (
                 <p className="col-span-2 text-center py-20 opacity-10 font-black uppercase tracking-widest animate-pulse">Waiting for signals...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {state.stage === GameStage.WARMUP && (
        <div className="z-10 text-center space-y-16 animate-in zoom-in">
           <div className="space-y-4">
             <h2 className="text-4xl font-black uppercase tracking-[0.6em] opacity-30 italic">Pre-Game Scan</h2>
             <h1 className="text-[6rem] font-black leading-tight max-w-5xl uppercase tracking-tighter drop-shadow-2xl">
                "{state.warmupQuestion}"
             </h1>
           </div>
           <p className="text-3xl font-bold italic opacity-60 bg-white/5 px-10 py-5 rounded-full border border-white/10">
             Discuss. AJ is watching your reactions.
           </p>
        </div>
      )}

      {state.stage === GameStage.TOPIC_SELECTION && (
        <div className="z-10 text-center space-y-12">
          <p className="text-3xl font-black uppercase tracking-[0.5em] opacity-20 italic">Master Decision</p>
          <div className="bg-white/5 p-16 rounded-[4rem] border-4 border-white/10 backdrop-blur-2xl">
            <h1 className="text-[10rem] font-black uppercase leading-none tracking-tighter">
              {master?.name}<br/>
              <span className={accentColor}>CHOOSING</span>
            </h1>
          </div>
        </div>
      )}

      {state.stage === GameStage.QUESTION && state.currentQuestion && (
        <div className="z-10 w-full max-w-7xl space-y-12">
          <div className="text-center space-y-6">
            <div className="inline-block bg-white/10 px-8 py-2 rounded-full text-lg font-black uppercase tracking-widest">{state.topic}</div>
            <h1 className="text-[7rem] font-black leading-[0.9] tracking-tighter uppercase drop-shadow-2xl">{state.currentQuestion.textEn}</h1>
            <h2 className="text-3xl font-bold italic opacity-30">"{state.currentQuestion.textTa}"</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
            {state.currentQuestion.options.map((opt, i) => (
              <div key={i} className="bg-white/5 border-4 border-white/10 p-10 rounded-[3rem] flex flex-col items-center justify-center relative shadow-xl">
                <span className={`absolute -top-5 -left-5 w-14 h-14 bg-white text-black flex items-center justify-center rounded-2xl text-3xl font-black shadow-lg`}>{i + 1}</span>
                <p className="text-3xl font-black uppercase text-center leading-tight">{opt.en}</p>
                <p className="text-lg opacity-30 font-bold italic">{opt.ta}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4">
             {state.players.map(p => (
                <div key={p.id} className={`w-3 h-3 rounded-full ${p.lastAnswer ? 'bg-indigo-500' : 'bg-white/10'}`}></div>
             ))}
          </div>
        </div>
      )}

      {(state.stage === GameStage.VOTING_RESULTS || state.stage === GameStage.REVEAL) && (
        <div className="z-10 max-w-5xl space-y-10 animate-in zoom-in text-center">
           <div className="bg-white p-16 rounded-[4rem] shadow-3xl text-black text-left relative max-w-4xl mx-auto">
              <div className="absolute -top-10 -left-10 bg-indigo-600 text-white px-8 py-3 rounded-2xl text-2xl font-black italic shadow-xl">AJ SAYS:</div>
              <p className="text-5xl font-black italic leading-tight">{state.hostRoast || hostMessage}</p>
           </div>
           {state.stage === GameStage.REVEAL && (
             <div className="space-y-4 pt-10">
                <p className="text-2xl font-black uppercase tracking-[0.4em] opacity-40">Correct Answer</p>
                <div className={`text-[12rem] font-black ${accentColor} animate-bounce drop-shadow-2xl leading-none`}>#{state.currentQuestion?.correctIndex}</div>
                <p className="text-2xl font-bold opacity-30 max-w-2xl mx-auto italic">"{state.currentQuestion?.explanation}"</p>
             </div>
           )}
        </div>
      )}

      {state.stage === GameStage.LOADING && (
        <div className="z-10 flex flex-col items-center gap-8">
           <div className={`w-24 h-24 border-8 border-t-white border-white/5 rounded-full animate-spin ${accentColor}`}></div>
           <p className="text-2xl font-black uppercase tracking-[0.4em] opacity-20 italic">AJ is Thinking...</p>
        </div>
      )}
    </div>
  );
};

export default TVView;
