
import React, { useState, useEffect } from 'react';
import { GameState, GameStage, GameMode } from '../types';

interface TVViewProps {
  state: GameState;
  hostMessage: string;
  iqData: string;
  onReset: () => void;
  onStop: () => void;
}

const TVView: React.FC<TVViewProps> = ({ state, hostMessage, onReset, onStop }) => {
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
    <div className={`h-full w-full p-12 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-1000 ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-[#020617]' : 'bg-[#1a0121]'}`}>
      
      {/* MODE SPECIFIC FILTERS */}
      {state.mode === GameMode.ACTUALLY_GENIUS ? (
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      ) : (
        <div className="absolute inset-0 pointer-events-none z-[100] opacity-10 mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/vhs.png')]"></div>
      )}

      {/* REACTION PARTICLES */}
      <div className="absolute inset-0 z-[600] pointer-events-none">
         {state.reactions?.map(r => (
           <div key={r.id} className="absolute bottom-0 text-7xl animate-float-up" style={{ left: `${r.x}%` }}>
              {r.emoji}
           </div>
         ))}
      </div>

      {/* HUD */}
      <div className="absolute top-10 left-10 flex flex-col gap-4 z-[50]">
         <div className="bg-black/60 p-4 rounded-3xl border border-white/10 backdrop-blur-xl flex items-center gap-4">
            <div className={`w-10 h-10 ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-500' : 'bg-fuchsia-500'} rounded-full animate-pulse border-2 border-white/20`}></div>
            <h1 className="text-4xl font-black italic select-none uppercase">MIND <span className="text-fuchsia-500">MASH</span></h1>
            <div className="flex gap-2 ml-4">
               <button onClick={onStop} className="bg-red-600/20 hover:bg-red-600 p-2 rounded-xl transition-all border border-red-500/50">⏹️</button>
            </div>
         </div>
         <div className={`px-6 py-2 rounded-full border border-white/5 text-sm font-black uppercase tracking-[0.3em] transition-all ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-emerald-600/20 text-emerald-400' : 'bg-fuchsia-600/20 text-fuchsia-400'}`}>
            {state.mode === GameMode.ACTUALLY_GENIUS ? 'CLEVER BOT SEARCH' : '1980s MOKKA PARTY'}
         </div>
      </div>

      {/* AJ & VJ BUBBLE */}
      <div className="absolute top-10 right-10 z-[200] w-full max-w-xl">
         <div className={`p-8 rounded-[3rem] shadow-3xl text-white relative border-4 border-white/20 backdrop-blur-2xl transition-all ${state.mode === GameMode.ACTUALLY_GENIUS ? 'bg-indigo-900/90' : 'bg-fuchsia-900/90'}`}>
            <div className="flex justify-between mb-4 border-b border-white/10 pb-2">
               <div className="flex gap-1 items-end h-8">
                  {waveAJ.map((h, i) => <div key={i} className="w-1.5 bg-blue-400 rounded-t-full transition-all duration-75" style={{ height: `${h}%` }}></div>)}
                  <span className="text-xs font-black uppercase ml-2 text-blue-400">AJ</span>
               </div>
               <div className="flex gap-1 items-end h-8">
                  <span className="text-xs font-black uppercase mr-2 text-fuchsia-400">VJ</span>
                  {waveVJ.map((h, i) => <div key={i} className="w-1.5 bg-fuchsia-400 rounded-t-full transition-all duration-75" style={{ height: `${h}%` }}></div>)}
               </div>
            </div>
            <p className="text-3xl font-black italic leading-tight uppercase tracking-tight text-center">
               {hostMessage.split(/AJ:|VJ:/).map((part, i) => (
                 <span key={i} className={i % 2 === 0 ? "text-white" : "text-amber-300"}>{part}</span>
               ))}
            </p>
         </div>
      </div>

      {state.stage === GameStage.LOBBY && (
        <div className="z-10 w-full max-w-7xl grid grid-cols-2 gap-24 items-center animate-in fade-in duration-700">
          <div className="space-y-12">
            <div>
              <p className="text-3xl font-black uppercase tracking-[0.4em] text-fuchsia-500 italic opacity-50">Room Code</p>
              <h1 className="text-[14rem] font-black leading-none text-white tracking-tighter">{state.roomCode || '....'}</h1>
            </div>
            <div className="bg-white/5 p-12 rounded-[5rem] border border-white/10 backdrop-blur-3xl flex items-center gap-12">
              <img src={qrUrl} alt="QR" className="w-56 h-56 bg-white p-4 rounded-3xl shadow-2xl" />
              <div className="space-y-4">
                <p className="text-6xl font-black uppercase italic leading-none">JOIN NOW</p>
                <p className="text-xl font-bold opacity-30 uppercase tracking-widest leading-none">AJ & VJ logic pieces-ku<br/>waiting panranga.</p>
              </div>
            </div>
          </div>
          <div className="bg-black/60 border-4 border-white/5 rounded-[6rem] p-16 h-[650px] flex flex-col overflow-hidden shadow-2xl backdrop-blur-md">
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
            </div>
          </div>
        </div>
      )}

      {/* GAMEPLAY STAGES */}
      <div className="mt-[-80px] w-full flex flex-col items-center z-10">
        {state.stage === GameStage.REVEAL && (
          <div className="z-10 w-full max-w-7xl flex flex-col items-center animate-in zoom-in-95 duration-700">
             <h1 className={`text-[10rem] font-black uppercase italic mb-12 tracking-tighter ${state.mode === GameMode.ACTUALLY_GENIUS ? 'text-emerald-400' : 'text-fuchsia-400'}`}>
                {state.mode === GameMode.ACTUALLY_GENIUS ? 'CLEVER BOT!' : 'MOKKA KING!'}
             </h1>
             <div className="grid grid-cols-3 gap-12 w-full">
                {state.players.sort((a,b) => b.score - a.score).slice(0, 3).map((p, i) => (
                  <div key={p.id} className={`p-12 rounded-[5rem] border-4 flex flex-col items-center text-center transition-all ${i === 0 ? 'bg-amber-500/20 border-amber-500 scale-110 shadow-[0_0_100px_rgba(245,158,11,0.3)]' : 'bg-white/5 border-white/10 opacity-60'}`}>
                     <div className="text-9xl mb-6">{i === 0 ? '👑' : i === 1 ? '🧠' : '🤡'}</div>
                     <h2 className="text-5xl font-black uppercase mb-2">{p.name}</h2>
                     <p className="text-2xl font-black opacity-50 mb-6">POINTS: {p.score}</p>
                  </div>
                ))}
             </div>
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
                <div key={i} className="bg-white/5 border-4 border-white/10 p-12 rounded-[3rem] text-center relative group backdrop-blur-md">
                  <span className="absolute -top-6 -left-6 w-16 h-16 bg-white text-black flex items-center justify-center rounded-2xl text-4xl font-black shadow-xl">{i + 1}</span>
                  <p className="text-4xl font-black uppercase">{opt.en}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        @keyframes float-up { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-100vh) scale(2); opacity: 0; } }
        .animate-float-up { animation: float-up 2.5s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TVView;
