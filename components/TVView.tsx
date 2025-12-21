
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
  const [pulse, setPulse] = useState(1);

  useEffect(() => {
    if (state.isPaused) return;
    const interval = setInterval(() => setPulse(1 + Math.random() * 0.15), 100);
    return () => clearInterval(interval);
  }, [state.isPaused]);

  const isAj = hostMessage.toLowerCase().startsWith('aj:');
  const isVj = hostMessage.toLowerCase().includes('vj:');
  const isGenius = state.mode === GameMode.ACTUALLY_GENIUS;

  return (
    <div className={`h-full w-full p-10 flex flex-col relative overflow-hidden font-game transition-colors duration-700 ${isGenius ? 'bg-[#020617]' : 'bg-[#0f0114]'}`}>
      
      {/* PAUSE OVERLAY */}
      {state.isPaused && (
        <div className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="text-amber-500 text-[15rem] animate-bounce">⏸️</div>
           <h2 className="text-8xl font-black uppercase italic tracking-tighter text-white">COMMERCIAL BREAK!</h2>
           <p className="text-3xl font-black opacity-50 uppercase tracking-[0.5em] mt-4">AJ is drinking tea, wait da...</p>
        </div>
      )}

      {/* HEADER: STATUS & HOSTS */}
      <div className="flex justify-between items-start z-[500] mb-8">
         <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_20px_#dc2626]`}></div>
            <span className="text-xl font-black uppercase tracking-[0.4em] text-white/40">RADIO MASH LIVE</span>
            {state.isPaused && <span className="ml-4 px-4 py-1 bg-amber-600 rounded-lg text-xs font-black uppercase tracking-widest">ON HOLD</span>}
         </div>

         <div className="flex gap-8">
            <div className={`flex flex-col items-center gap-2 transition-all duration-200 ${isAj ? 'scale-110 opacity-100' : 'scale-90 opacity-30'}`}>
               <div className={`w-28 h-28 rounded-[2.5rem] border-4 flex items-center justify-center text-4xl font-black italic shadow-2xl ${isAj ? 'border-blue-400 bg-blue-900/40 text-blue-400' : 'border-blue-900 bg-transparent text-blue-900'}`} style={{ transform: isAj && !state.isPaused ? `scale(${pulse})` : 'scale(1)' }}>AJ</div>
               <span className="text-[10px] font-black uppercase tracking-widest opacity-50">SAVAGE RJ</span>
            </div>
            <div className={`flex flex-col items-center gap-2 transition-all duration-200 ${isVj ? 'scale-110 opacity-100' : 'scale-90 opacity-30'}`}>
               <div className={`w-28 h-28 rounded-[2.5rem] border-4 flex items-center justify-center text-4xl font-black italic shadow-2xl ${isVj ? 'border-fuchsia-400 bg-fuchsia-900/40 text-fuchsia-400' : 'border-fuchsia-900 bg-transparent text-fuchsia-900'}`} style={{ transform: isVj && !state.isPaused ? `scale(${pulse})` : 'scale(1)' }}>VJ</div>
               <span className="text-[10px] font-black uppercase tracking-widest opacity-50">SARCASTIC Q</span>
            </div>
         </div>
      </div>

      {/* SPEECH BANNER */}
      <div className="w-full max-w-5xl mx-auto mb-10 z-[500]">
         <div className="bg-black/95 backdrop-blur-3xl p-10 rounded-[3.5rem] border-2 border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.7)] text-center">
            <p className="text-4xl font-black italic leading-tight uppercase tracking-tight text-white drop-shadow-xl">
               {hostMessage.split(/AJ:|VJ:/).map((part, i) => (
                 <span key={i} className={i % 2 === 0 ? "text-indigo-200" : "text-amber-400"}>{part}</span>
               ))}
            </p>
         </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col items-center z-10 overflow-hidden pb-40">
        {state.stage === GameStage.LOBBY && (
          <div className="w-full h-full grid grid-cols-12 gap-10 items-stretch animate-in zoom-in-95 duration-500">
            {/* JOIN INFO */}
            <div className="col-span-4 flex flex-col justify-center gap-8">
               <div className="bg-white/5 p-12 rounded-[5rem] border border-white/10 backdrop-blur-3xl flex flex-col items-center text-center gap-8 shadow-2xl">
                  <div className="bg-white p-6 rounded-[3rem] shadow-2xl transition-transform hover:scale-105 duration-300">
                    <img src={qrUrl} alt="QR" className="w-64 h-64" />
                  </div>
                  <div className="space-y-1">
                     <p className="text-2xl font-black text-fuchsia-500 uppercase tracking-widest opacity-40 italic">RADIO CODE</p>
                     <h1 className="text-[11rem] font-black leading-none text-white tracking-tighter drop-shadow-lg">{state.roomCode || '....'}</h1>
                  </div>
               </div>
            </div>

            {/* VICTIM FEED */}
            <div className="col-span-8 bg-black/40 border-4 border-white/5 rounded-[6rem] flex flex-col shadow-2xl overflow-hidden backdrop-blur-md">
               <div className="p-12 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <h2 className="text-5xl font-black uppercase italic tracking-tighter">VICTIM FEED</h2>
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                    <span className="text-7xl font-black text-fuchsia-500">[{state.players.length}]</span>
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-12 grid grid-cols-2 gap-8 custom-scrollbar">
                  {state.players.length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center opacity-10 py-24 text-center">
                       <span className="text-[15rem] mb-6 animate-pulse">📻</span>
                       <p className="text-4xl font-black uppercase tracking-[0.5em]">Waiting for victims...</p>
                    </div>
                  ) : state.players.map(p => (
                    <div key={p.id} className="bg-white/5 p-10 rounded-[4.5rem] border-2 border-white/10 flex justify-between items-center transition-all hover:bg-white/10 group">
                       <div className="flex items-center gap-8">
                          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-3xl flex items-center justify-center font-black text-4xl shadow-xl group-hover:rotate-6 transition-transform">{p.name[0]}</div>
                          <div className="flex flex-col">
                            <span className="text-4xl font-black uppercase tracking-tighter group-hover:text-fuchsia-400 transition-colors">{p.name}</span>
                            <span className="text-xs font-black opacity-30 uppercase tracking-widest">Logic Piece</span>
                          </div>
                       </div>
                       <span className="text-5xl font-black text-amber-500 drop-shadow-lg">{p.score}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="flex-1 flex flex-col items-center justify-center gap-12 animate-in fade-in duration-500 w-full max-w-7xl">
             <div className="bg-fuchsia-600 px-16 py-4 rounded-full text-3xl font-black uppercase shadow-2xl border-4 border-white/30 animate-bounce tracking-widest">{state.topic}</div>
             <div className="text-center space-y-6">
                <h1 className="text-[7.5rem] font-black leading-[0.85] uppercase tracking-tighter drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">{state.currentQuestion.textEn}</h1>
                <h2 className="text-5xl italic opacity-50 text-indigo-300 font-medium">"{state.currentQuestion.textTa}"</h2>
             </div>
             <div className="grid grid-cols-2 gap-10 w-full pt-12">
                {state.currentQuestion.options.map((o, i) => {
                  const numAns = state.players.filter(p => p.lastAnswer === (i+1).toString()).length;
                  return (
                    <div key={i} className={`bg-black/60 border-4 border-white/10 p-14 rounded-[4.5rem] text-4xl font-black uppercase text-center relative overflow-hidden group backdrop-blur-2xl transition-all ${numAns > 0 ? 'border-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.2)]' : ''}`}>
                       <span className="absolute -top-6 -left-6 w-20 h-20 bg-white text-black rounded-3xl flex items-center justify-center text-5xl font-black shadow-2xl">{i + 1}</span>
                       <div className="absolute top-4 right-8 flex gap-2">
                          {Array.from({length: numAns}).map((_, idx) => (
                            <div key={idx} className="w-5 h-5 rounded-full bg-fuchsia-500 animate-pulse shadow-[0_0_10px_#d946ef]"></div>
                          ))}
                       </div>
                       <div className="space-y-2">
                         <div className="text-white">{o.en}</div>
                         <div className="text-2xl opacity-30 italic">{o.ta}</div>
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}
      </div>

      {/* REACTION SYSTEM */}
      <div className="absolute inset-0 z-[600] pointer-events-none">
         {state.reactions?.map(r => (
           <div key={r.id} className="absolute bottom-0 text-[12rem] animate-float-up" style={{ left: `${r.x}%` }}>{r.emoji}</div>
         ))}
      </div>

      <style>{`
        @keyframes float-up { 0% { transform: translateY(0) scale(1) rotate(0); opacity: 1; } 100% { transform: translateY(-135vh) scale(3) rotate(25deg); opacity: 0; } }
        .animate-float-up { animation: float-up 3.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default TVView;
