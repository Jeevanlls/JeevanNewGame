
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
    const interval = setInterval(() => setPulse(1 + Math.random() * 0.15), 120);
    return () => clearInterval(interval);
  }, []);

  const isAj = hostMessage.toLowerCase().startsWith('aj:');
  const isVj = hostMessage.toLowerCase().includes('vj:');
  const isGenius = state.mode === GameMode.ACTUALLY_GENIUS;

  return (
    <div className={`h-full w-full p-10 flex flex-col relative overflow-hidden font-game transition-colors duration-1000 ${isGenius ? 'bg-[#020617]' : 'bg-[#0f0114]'}`}>
      
      {/* MODE FX */}
      {!isGenius && (
        <div className="absolute inset-0 pointer-events-none z-[800] opacity-5 mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/vhs.png')]"></div>
      )}
      {isGenius && (
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-start z-[500] mb-6">
         <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_20px_#dc2626]`}></div>
            <span className="text-xl font-black uppercase tracking-[0.4em] text-white/40">RADIO MASH LIVE</span>
            <div className={`ml-4 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest ${isGenius ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'}`}>
              {isGenius ? 'GENIUS HUNT ON' : 'MOKKA PARTY ON'}
            </div>
         </div>

         {/* HOST ORBS */}
         <div className="flex gap-10">
            <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${isAj ? 'scale-110' : 'opacity-30'}`}>
               <div className={`w-28 h-28 rounded-[2.5rem] border-4 flex items-center justify-center text-4xl font-black italic shadow-2xl transition-all ${isAj ? 'border-blue-500 bg-blue-900/50 text-blue-300' : 'border-blue-900 bg-transparent text-blue-900'}`} style={{ transform: isAj ? `scale(${pulse})` : 'scale(1)' }}>AJ</div>
               <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Savage RJ</span>
            </div>
            <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${isVj ? 'scale-110' : 'opacity-30'}`}>
               <div className={`w-28 h-28 rounded-[2.5rem] border-4 flex items-center justify-center text-4xl font-black italic shadow-2xl transition-all ${isVj ? 'border-fuchsia-500 bg-fuchsia-900/50 text-fuchsia-300' : 'border-fuchsia-900 bg-transparent text-fuchsia-900'}`} style={{ transform: isVj ? `scale(${pulse})` : 'scale(1)' }}>VJ</div>
               <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Sarcastic Q</span>
            </div>
         </div>
      </div>

      {/* SPEECH BANNER */}
      <div className="w-full max-w-4xl mx-auto mb-12 z-[500]">
         <div className="bg-black/90 backdrop-blur-2xl p-10 rounded-[4rem] border-2 border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
            <p className="text-4xl font-black italic text-center leading-tight uppercase tracking-tight">
               {hostMessage.split(/AJ:|VJ:/).map((part, i) => (
                 <span key={i} className={i % 2 === 0 ? "text-indigo-100" : "text-amber-400"}>{part}</span>
               ))}
            </p>
         </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col items-center z-10 overflow-hidden pb-40">
        {state.stage === GameStage.LOBBY && (
          <div className="w-full h-full grid grid-cols-12 gap-12 items-stretch animate-in zoom-in-95 duration-500">
            {/* JOIN CARD */}
            <div className="col-span-4 flex flex-col justify-center gap-10">
              <div className="bg-white/5 p-12 rounded-[5rem] border border-white/10 backdrop-blur-3xl flex flex-col items-center text-center gap-8 shadow-2xl">
                 <img src={qrUrl} alt="QR" className="w-64 h-64 bg-white p-6 rounded-[3rem] shadow-[0_0_80px_rgba(255,255,255,0.1)]" />
                 <div className="space-y-2">
                    <p className="text-2xl font-black text-fuchsia-500 uppercase tracking-widest opacity-50">RADIO CODE</p>
                    <h1 className="text-[10rem] font-black leading-none text-white tracking-tighter">{state.roomCode || '....'}</h1>
                 </div>
              </div>
            </div>

            {/* VICTIMS LIST */}
            <div className="col-span-8 bg-black/60 border-4 border-white/5 rounded-[6rem] flex flex-col shadow-2xl overflow-hidden backdrop-blur-lg">
               <div className="p-12 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <h2 className="text-5xl font-black uppercase italic">VICTIM FEED</h2>
                  <div className="flex items-center gap-4">
                     <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="text-6xl font-black text-emerald-500">[{state.players.length}]</span>
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-12 grid grid-cols-2 gap-8 custom-scrollbar">
                  {state.players.length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center opacity-10 py-20 text-center">
                       <span className="text-[15rem] mb-6">📻</span>
                       <p className="text-4xl font-black uppercase tracking-[0.5em]">Waiting for victims...</p>
                    </div>
                  ) : state.players.map(p => (
                    <div key={p.id} className="bg-white/5 p-8 rounded-[4rem] border-2 border-white/10 flex justify-between items-center transition-all hover:bg-white/10 group">
                       <div className="flex items-center gap-8">
                          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-3xl flex items-center justify-center font-black text-4xl shadow-lg">{p.name[0]}</div>
                          <div className="flex flex-col">
                             <span className="text-4xl font-black uppercase tracking-tighter group-hover:text-fuchsia-400 transition-colors">{p.name}</span>
                             <span className="text-xs font-black opacity-30 uppercase">RADIO VICTIM</span>
                          </div>
                       </div>
                       <span className="text-5xl font-black text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">{p.score}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {state.stage === GameStage.TOPIC_SELECTION && (
          <div className="text-center space-y-20 flex-1 flex flex-col justify-center animate-in slide-in-from-bottom-20 duration-500">
             <div className="space-y-4">
                <h2 className="text-8xl font-black uppercase italic text-fuchsia-500 tracking-tighter drop-shadow-2xl">PICK THE BATTLEFIELD</h2>
                <p className="text-2xl font-black opacity-40 uppercase tracking-[0.4em]">One logic piece is choosing...</p>
             </div>
             <div className="flex justify-center gap-12">
                {state.topicOptions.map((t, i) => (
                  <div key={i} className="bg-white/5 border-4 border-white/10 p-20 rounded-[5rem] text-5xl font-black uppercase shadow-[0_20px_80px_rgba(0,0,0,0.5)] transition-all animate-pulse">
                     {t}
                  </div>
                ))}
             </div>
          </div>
        )}

        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="flex-1 flex flex-col items-center justify-center gap-12 animate-in fade-in duration-700 max-w-7xl">
             <div className="bg-fuchsia-600 px-16 py-4 rounded-full text-3xl font-black uppercase shadow-2xl border-4 border-white/30 animate-bounce tracking-widest">{state.topic}</div>
             <div className="space-y-6 text-center">
                <h1 className="text-[7.5rem] font-black leading-[0.8] uppercase tracking-tighter drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]">{state.currentQuestion.textEn}</h1>
                <h2 className="text-5xl italic opacity-50 text-indigo-300 font-medium">"{state.currentQuestion.textTa}"</h2>
             </div>
             <div className="grid grid-cols-2 gap-10 w-full pt-12">
                {state.currentQuestion.options.map((o, i) => {
                  const numAnswered = state.players.filter(p => p.lastAnswer === (i+1).toString()).length;
                  return (
                    <div key={i} className="bg-black/40 border-4 border-white/10 p-14 rounded-[4rem] text-4xl font-black uppercase text-center relative overflow-hidden group backdrop-blur-xl">
                       <span className="absolute -top-6 -left-6 w-16 h-16 bg-white text-black rounded-2xl flex items-center justify-center text-4xl font-black shadow-2xl">{i + 1}</span>
                       <div className="absolute top-0 right-0 p-6 flex gap-1">
                          {Array.from({length: numAnswered}).map((_, idx) => (
                            <div key={idx} className="w-4 h-4 rounded-full bg-fuchsia-500 animate-pulse"></div>
                          ))}
                       </div>
                       {o.en}
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
        @keyframes float-up { 0% { transform: translateY(0) scale(1) rotate(0); opacity: 1; } 100% { transform: translateY(-130vh) scale(3) rotate(20deg); opacity: 0; } }
        .animate-float-up { animation: float-up 2.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default TVView;
