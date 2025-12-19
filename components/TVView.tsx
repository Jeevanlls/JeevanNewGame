
import React, { useState, useEffect } from 'react';
import { GameState, GameStage, GameMode } from '../types';

interface TVViewProps {
  state: GameState;
  hostMessage: string;
  iqData: string;
  onReset: () => void;
}

const TVView: React.FC<TVViewProps> = ({ state, hostMessage, onReset }) => {
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${state.roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;
  const [waveAJ, setWaveAJ] = useState<number[]>([]);
  const [waveVJ, setWaveVJ] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaveAJ(Array.from({ length: 12 }, () => Math.random() * 100));
      setWaveVJ(Array.from({ length: 12 }, () => Math.random() * 100));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full p-12 flex flex-col items-center justify-center relative overflow-hidden bg-[#020617]">
      {/* BACKGROUND EFFECTS */}
      <div className={`absolute inset-0 opacity-10 blur-[120px] pointer-events-none transition-colors duration-1000 ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-500' : 'bg-fuchsia-500'}`}></div>

      {/* HUD */}
      <div className="absolute top-10 left-10 flex flex-col gap-4 z-[50]">
         <div className="bg-black/60 p-4 rounded-3xl border border-white/10 backdrop-blur-xl flex items-center gap-4">
            <div className={`w-10 h-10 ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-500' : 'bg-fuchsia-500'} rounded-full animate-pulse border-2 border-white/20`}></div>
            <h1 className="text-4xl font-black italic select-none uppercase">MIND <span className="text-fuchsia-500">MASH</span></h1>
            <button onClick={onReset} className="ml-4 opacity-30 hover:opacity-100 transition-opacity bg-white/10 p-2 rounded-xl text-xl" title="Stop & Restart Game">⏹️</button>
         </div>
         <div className={`px-6 py-2 rounded-full border border-white/5 text-sm font-black uppercase tracking-[0.3em] transition-all ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-600/20 text-emerald-400' : 'bg-fuchsia-600/20 text-fuchsia-400'}`}>
            {state.mode === GameMode.ACTUALLY_GENIUS ? 'CLEVER BOT SEARCH' : '1980s MOKKA PARTY'}
         </div>
      </div>

      {/* AJ & VJ BUBBLE */}
      <div className="absolute top-10 right-10 z-[200] w-full max-w-xl">
         <div className="bg-indigo-700/90 p-8 rounded-[3rem] shadow-3xl text-white relative border-4 border-white/20 backdrop-blur-2xl">
            <div className="flex justify-between mb-4 border-b border-white/10 pb-2">
               <div className="flex gap-1 items-end h-8">
                  {waveAJ.map((h, i) => <div key={i} className="w-1.5 bg-blue-400 rounded-t-full" style={{ height: `${h}%` }}></div>)}
                  <span className="text-xs font-black uppercase ml-2 text-blue-400">AJ</span>
               </div>
               <div className="flex gap-1 items-end h-8">
                  <span className="text-xs font-black uppercase mr-2 text-fuchsia-400">VJ</span>
                  {waveVJ.map((h, i) => <div key={i} className="w-1.5 bg-fuchsia-400 rounded-t-full" style={{ height: `${h}%` }}></div>)}
               </div>
            </div>
            <p className="text-3xl font-black italic leading-tight uppercase tracking-tight text-center">
               {hostMessage.split(/AJ:|VJ:/).map((part, i) => (
                 <span key={i} className={i % 2 === 0 ? "text-white" : "text-fuchsia-300"}>{part}</span>
               ))}
            </p>
         </div>
      </div>

      {state.stage === GameStage.LOBBY && (
        <div className="z-10 w-full max-w-7xl grid grid-cols-2 gap-24 items-center">
          <div className="space-y-12">
            <div>
              <p className="text-3xl font-black uppercase tracking-[0.4em] text-fuchsia-500 italic opacity-50">Room Code</p>
              <h1 className="text-[14rem] font-black leading-none text-white">{state.roomCode || '....'}</h1>
            </div>
            <div className="bg-white/5 p-12 rounded-[5rem] border border-white/10 backdrop-blur-3xl flex items-center gap-12">
              <img src={qrUrl} alt="QR" className="w-56 h-56 bg-white p-4 rounded-3xl" />
              <div className="space-y-4">
                <p className="text-6xl font-black uppercase italic">JOIN NOW</p>
                <p className="text-xl font-bold opacity-30 uppercase tracking-widest leading-none">AJ & VJ Tanglish logic-ku<br/>waiting panranga.</p>
              </div>
            </div>
          </div>
          <div className="bg-black/60 border-4 border-white/5 rounded-[6rem] p-16 h-[650px] flex flex-col overflow-hidden shadow-2xl">
            <h2 className="text-4xl font-black uppercase italic mb-10 border-b border-white/10 pb-6 flex justify-between items-center">
              VICTIMS LIST <span className="text-fuchsia-500 text-6xl">[{state.players.length}]</span>
            </h2>
            <div className="grid grid-cols-1 gap-6 overflow-y-auto pr-4 custom-scrollbar">
              {state.players.map((p) => (
                <div key={p.id} className="bg-white/5 p-8 rounded-[3rem] border-2 border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-3xl flex items-center justify-center font-black text-2xl shadow-lg">{p.name[0]}</div>
                    <span className="text-4xl font-black uppercase">{p.name}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black opacity-30">SCORE</span>
                    <span className="text-3xl font-black text-amber-500">{p.score}</span>
                  </div>
                </div>
              ))}
              {state.players.length === 0 && (
                <div className="h-full flex items-center justify-center text-center opacity-20">
                   <p className="text-2xl font-black uppercase tracking-widest">No one joined yet...<br/>VJ is getting bored.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {state.stage === GameStage.TUTORIAL && (
        <div className="z-[300] bg-black/95 fixed inset-0 flex flex-col items-center justify-center p-20 animate-in fade-in zoom-in-95 duration-500">
           <h2 className="text-white text-8xl font-black uppercase italic mb-12 tracking-tighter">AJ & VJ'S <span className="text-fuchsia-500">BOOTCAMP</span></h2>
           <div className="grid grid-cols-2 gap-10 max-w-6xl">
              {[
                {icon: "📱", title: "SCAN SEEKRAM", desc: "No QR, no game. VJ roast-u ready-ah iruku."},
                {icon: "🎭", title: "TOPIC MASTER", desc: "Category choose panni chaos start pannunga."},
                {icon: "⚡", title: "BRAIN SPEED", desc: "Fast answers = Vera Level score."},
                {icon: "🔥", title: "MOKKA LOGIC", desc: "Logic-less players will be grilled by AJ."}
              ].map((step, i) => (
                <div key={i} className="bg-white/5 p-12 rounded-[4rem] border-4 border-white/10 flex flex-col items-center text-center backdrop-blur-3xl shadow-3xl">
                   <div className="text-8xl mb-6">{step.icon}</div>
                   <h3 className="text-4xl font-black uppercase mb-4">{step.title}</h3>
                   <p className="text-xl font-bold opacity-50 uppercase tracking-widest">{step.desc}</p>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* GAMEPLAY AREA */}
      <div className="mt-[-80px] w-full flex flex-col items-center z-10">
        {state.stage === GameStage.WARMUP && (
          <div className="text-center space-y-12 animate-in zoom-in-50 duration-700">
             <div className="bg-fuchsia-600 text-white px-10 py-4 rounded-full text-2xl font-black uppercase italic mb-6 shadow-2xl border-4 border-white animate-bounce">WARMUP QUESTION!</div>
             <h1 className="text-[9rem] font-black leading-none uppercase tracking-tighter drop-shadow-[0_10px_60px_rgba(255,255,255,0.3)]">"{state.warmupQuestion}"</h1>
          </div>
        )}
        
        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="w-full max-w-7xl space-y-12 animate-in fade-in duration-1000">
            <div className="text-center space-y-6">
              <div className={`inline-block px-14 py-4 rounded-full text-3xl font-black uppercase border-4 border-white/20 shadow-3xl ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-600' : 'bg-fuchsia-600'}`}>
                {state.topic || 'GENERAL CHAOS'}
              </div>
              <h1 className="text-[7rem] font-black leading-[0.85] uppercase drop-shadow-[0_20px_80px_rgba(0,0,0,0.5)]">{state.currentQuestion.textEn}</h1>
              <h2 className="text-5xl italic opacity-50 text-indigo-300">"{state.currentQuestion.textTa}"</h2>
            </div>
            <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
              {state.currentQuestion.options.map((opt, i) => (
                <div key={i} className="bg-white/5 border-4 border-white/10 p-12 rounded-[3rem] text-center relative group hover:border-white/40 transition-all backdrop-blur-md">
                  <span className="absolute -top-6 -left-6 w-16 h-16 bg-white text-black flex items-center justify-center rounded-2xl text-4xl font-black shadow-xl group-hover:scale-110 transition-transform">{i + 1}</span>
                  <p className="text-4xl font-black uppercase">{opt.en}</p>
                  <p className="text-xl italic opacity-30 mt-2">{opt.ta}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
               <p className="text-2xl font-black opacity-40 uppercase tracking-[0.5em] animate-pulse">Waiting for answers...</p>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER TICKER */}
      <div className="fixed bottom-0 left-0 w-full bg-indigo-950 h-16 flex items-center overflow-hidden border-t-4 border-white/10 z-[400]">
         <div className="bg-black text-white px-10 h-full flex items-center font-black italic text-2xl uppercase border-r-4 border-white/10">DUO FEED</div>
         <div className="flex-1 overflow-hidden">
            <div className="whitespace-nowrap animate-[ticker_30s_linear_infinite] inline-block text-2xl font-black uppercase tracking-widest text-indigo-200">
               &nbsp;&nbsp;&nbsp;&nbsp; ⚡ GANA BEATS ACTIVE ⚡ MODE: {state.mode.replace('_', ' ')} ⚡ AJ & VJ TANGLISH MONITORING ⚡ {state.players.length} VICTIMS CONNECTED ⚡ &nbsp;&nbsp;&nbsp;&nbsp;
            </div>
         </div>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default TVView;
