
import React, { useState, useEffect, useRef } from 'react';
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

  // Spotlight & Visualizer Simulation
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpotlightPos({ x: Math.random() * 100, y: Math.random() * 100 });
      // Simulate mouth moving if hostMessage changes
      setWaveform(Array.from({ length: 10 }, () => Math.random() * 100));
    }, 150);
    return () => clearInterval(interval);
  }, [hostMessage]);

  return (
    <div className={`h-full w-full p-20 flex flex-col items-center justify-center relative transition-all duration-1000 overflow-hidden ${isChaos ? 'bg-[#020617]' : 'bg-[#050b1a]'}`}>
      
      {/* Dynamic Stage Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 blur-[150px] transition-all duration-[3000ms]" 
             style={{ background: `radial-gradient(circle at ${spotlightPos.x}% ${spotlightPos.y}%, ${isChaos ? '#d946ef' : '#10b981'}, transparent)` }}></div>
        <div className="absolute top-[-20%] right-[-20%] w-[140%] h-[140%] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      {/* Header HUD */}
      <div className="absolute top-10 left-10 right-10 flex items-center justify-between z-[50]">
         <div className="flex items-center gap-6">
           <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600 rounded-full animate-pulse flex items-center justify-center text-xs font-black shadow-[0_0_20px_rgba(220,38,38,0.5)]">REC</div>
              <h1 className="text-5xl font-black italic tracking-tighter leading-none select-none">MIND <span className={accentColor}>MASH</span></h1>
           </div>
           <div className={`px-6 py-2 rounded-full border-2 font-black uppercase text-xs tracking-widest ${isChaos ? 'border-fuchsia-500/50 text-fuchsia-500' : 'border-emerald-500/50 text-emerald-500'}`}>
              CHANNEL 01: AJ SHOW
           </div>
         </div>
         <div className="flex gap-4 items-center bg-black/40 px-8 py-3 rounded-full backdrop-blur-xl border border-white/5">
            <div className="text-right">
              <p className="text-[8px] font-black opacity-30 uppercase tracking-[0.3em]">AI BROADCAST</p>
              <p className="text-sm font-black text-emerald-500">ULTRA HIGH DEF</p>
            </div>
         </div>
      </div>

      {state.stage === GameStage.LOBBY && (
        <div className="z-10 w-full max-w-7xl grid grid-cols-2 gap-24 items-center animate-in fade-in zoom-in duration-1000">
          <div className="space-y-12">
            <div className="space-y-4">
              <p className="text-2xl font-black uppercase tracking-[0.5em] text-fuchsia-500 italic animate-pulse">Waiting for Players</p>
              <h1 className="text-[14rem] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_80px_rgba(192,38,211,0.3)]">
                {state.roomCode || '....'}
              </h1>
              <p className="text-2xl font-bold opacity-40 uppercase tracking-widest">Connect your phones now!</p>
            </div>
            <div className="bg-white/5 p-12 rounded-[5rem] border-4 border-white/10 backdrop-blur-3xl flex items-center gap-12 shadow-3xl group hover:border-fuchsia-500/50 transition-all">
              <img src={qrUrl} alt="QR" className="w-56 h-56 bg-white p-4 rounded-[2rem] shadow-2xl group-hover:scale-105 transition-transform" />
              <div className="space-y-4">
                <p className="text-6xl font-black uppercase italic leading-none">JOIN NOW</p>
                <p className="text-xl font-bold opacity-30 uppercase leading-tight">AJ is getting bored. <br/> Don't make him wait.</p>
              </div>
            </div>
          </div>

          <div className="bg-black/60 border-8 border-white/5 rounded-[6rem] p-16 h-[650px] flex flex-col shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent animate-shimmer"></div>
            <h2 className="text-4xl font-black uppercase italic mb-10 border-b-2 border-white/10 pb-6 flex justify-between items-center">
              THE VICTIMS <span className="bg-fuchsia-600 px-6 py-1 rounded-2xl text-2xl font-black italic">{state.players.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-6 overflow-y-auto pr-4 scrollbar-hide">
              {state.players.map((p, i) => (
                <div key={p.id} className="bg-white/5 p-8 rounded-[2.5rem] border-2 border-white/5 flex items-center justify-between animate-in slide-in-from-right-20 duration-500 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-indigo-600 rounded-3xl flex items-center justify-center font-black text-2xl shadow-xl">{p.name[0]}</div>
                    <div className="text-left">
                       <span className="text-4xl font-black uppercase block leading-none">{p.name}</span>
                       <span className="text-xs font-black opacity-30 uppercase tracking-widest mt-2 block">{p.age} YEARS • {p.preferredLanguage}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                     <span className="bg-emerald-500 w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
                     <span className="text-[10px] font-black opacity-40 uppercase tracking-tighter">CONNECTED</span>
                  </div>
                </div>
              ))}
              {state.players.length === 0 && (
                 <div className="flex-1 flex flex-col items-center justify-center opacity-20 space-y-8 py-20 text-center">
                    <div className="w-32 h-32 border-[12px] border-white/10 border-t-fuchsia-500 rounded-full animate-spin"></div>
                    <p className="text-4xl font-black uppercase tracking-[0.3em]">Hurry up, brains!</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AJ'S TALKING FACE & MESSAGE OVERLAY */}
      <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-[200] w-full max-w-6xl">
         <div className="bg-white p-12 rounded-[4rem] shadow-[0_0_120px_rgba(255,255,255,0.15)] text-black relative border-[20px] border-indigo-700 animate-in slide-in-from-bottom-24">
            
            {/* AJ Mouth Visualizer */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-end gap-1 h-20 px-8 bg-indigo-700 rounded-t-3xl border-t-4 border-l-4 border-r-4 border-white/20">
               {waveform.map((h, i) => (
                 <div key={i} className="w-2 bg-white rounded-t-full transition-all duration-150" style={{ height: `${h}%` }}></div>
               ))}
            </div>

            <div className="absolute -top-12 -left-10 bg-indigo-700 text-white px-12 py-5 rounded-[2rem] text-4xl font-black italic shadow-2xl uppercase flex items-center gap-4 border-4 border-white/20">
               <span className="w-5 h-5 bg-red-500 rounded-full animate-ping"></span>
               AJ ON AIR
            </div>
            
            <p className="text-5xl font-black italic leading-[1.1] uppercase tracking-tighter text-center px-10">
              {hostMessage}
            </p>
         </div>
      </div>

      {/* STAGE FOOTER TICKER */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-r from-fuchsia-700 to-indigo-700 h-20 flex items-center overflow-hidden border-t-8 border-white z-[300] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
         <div className="bg-black text-white px-12 h-full flex items-center font-black italic text-3xl uppercase tracking-tighter border-r-4 border-white z-10">LIVE NEWS</div>
         <div className="flex-1 overflow-hidden relative">
            <div className="whitespace-nowrap animate-[ticker_30s_linear_infinite] inline-block text-3xl font-black uppercase tracking-[0.2em] py-2">
               &nbsp;&nbsp;&nbsp;&nbsp; ⚡ BREAKING: {state.players.length > 0 ? `${state.players[0].name} reported to be extremely confused` : 'No players found - AJ considering retirement'} ⚡ TIP: Don't use your brain, use your instincts ⚡ AJ IS WATCHING EVERYTHING YOU CLICK ⚡ CURRENT ROOM: {state.roomCode} ⚡ NEXT ROUND STARTING SOON ⚡ &nbsp;&nbsp;&nbsp;&nbsp;
            </div>
         </div>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* GAME STAGES */}
      <div className="mt-[-80px] w-full flex flex-col items-center">
        {state.stage === GameStage.WARMUP && (
          <div className="z-10 text-center space-y-12 animate-in zoom-in-50 duration-700">
             <h2 className="text-4xl font-black uppercase tracking-[1em] opacity-20 italic">The Pulse Check</h2>
             <h1 className="text-[10rem] font-black leading-none max-w-7xl uppercase tracking-tighter drop-shadow-3xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                "{state.warmupQuestion}"
             </h1>
          </div>
        )}

        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="z-10 w-full max-w-7xl space-y-16 animate-in fade-in duration-1000">
            <div className="text-center space-y-6">
              <div className={`inline-block px-16 py-4 rounded-full text-3xl font-black uppercase tracking-widest shadow-2xl ${isChaos ? 'bg-fuchsia-600' : 'bg-emerald-600'} border-4 border-white/20`}>
                ROUND {state.round}: {state.topic}
              </div>
              <h1 className="text-[7.5rem] font-black leading-[0.85] tracking-tighter uppercase drop-shadow-2xl">
                {state.currentQuestion.textEn}
              </h1>
              <h2 className="text-4xl font-bold italic opacity-40">
                "{state.currentQuestion.textTa}"
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-10 max-w-6xl mx-auto">
              {state.currentQuestion.options.map((opt, i) => (
                <div key={i} className="bg-white/5 border-4 border-white/10 p-12 rounded-[4rem] flex flex-col items-center justify-center relative shadow-3xl backdrop-blur-xl hover:scale-105 transition-transform">
                  <span className={`absolute -top-8 -left-8 w-20 h-20 bg-white text-black flex items-center justify-center rounded-3xl text-5xl font-black shadow-3xl border-4 border-black`}>{i + 1}</span>
                  <p className="text-4xl font-black uppercase text-center leading-tight mb-2">{opt.en}</p>
                  <p className="text-xl opacity-30 font-bold italic">{opt.ta}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.stage === GameStage.LOADING && (
          <div className="z-10 flex flex-col items-center gap-16">
             <div className="relative">
                <div className={`w-56 h-56 border-[24px] border-t-white border-white/5 rounded-full animate-spin ${accentColor}`}></div>
                <div className="absolute inset-0 flex items-center justify-center text-5xl">⚡</div>
             </div>
             <div className="space-y-4 text-center">
                <p className="text-6xl font-black uppercase tracking-[0.5em] opacity-10 italic animate-pulse">BRAIN ENGINE STARTING</p>
                <p className="text-xl font-bold italic opacity-30 uppercase">AJ is processing your poor choices...</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TVView;
