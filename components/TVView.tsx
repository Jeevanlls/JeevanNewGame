
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
  const [ajPulse, setAjPulse] = useState(1);
  const [vjPulse, setVjPulse] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setAjPulse(1 + Math.random() * 0.4);
      setVjPulse(1 + Math.random() * 0.4);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const isAjTalking = hostMessage.toLowerCase().includes('aj:');
  const isVjTalking = hostMessage.toLowerCase().includes('vj:');

  return (
    <div className={`h-full w-full p-12 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-700 bg-[#020617]`}>
      
      {/* GLOBAL SCANLINES */}
      <div className="absolute inset-0 pointer-events-none z-[800] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>

      {/* REACTION PARTICLES */}
      <div className="absolute inset-0 z-[600] pointer-events-none">
         {state.reactions?.map(r => (
           <div key={r.id} className="absolute bottom-0 text-8xl animate-float-up" style={{ left: `${r.x}%` }}>{r.emoji}</div>
         ))}
      </div>

      {/* HOST AVATARS (ORBS) */}
      <div className="absolute top-10 right-10 flex gap-12 z-[500] items-center">
         <div className="flex flex-col items-center gap-2">
            <div className={`w-32 h-32 rounded-full border-4 transition-all duration-150 shadow-[0_0_60px_rgba(30,58,138,0.5)] flex items-center justify-center bg-blue-900/40 ${isAjTalking ? 'border-blue-400 scale-[1.2]' : 'border-blue-900 scale-100 opacity-40'}`} style={{ transform: isAjTalking ? `scale(${ajPulse})` : 'scale(1)' }}>
               <span className="text-4xl font-black text-blue-400 italic">AJ</span>
            </div>
            <span className={`text-xs font-black uppercase tracking-widest ${isAjTalking ? 'text-blue-400' : 'text-blue-900'}`}>Savage Host</span>
         </div>
         <div className="flex flex-col items-center gap-2">
            <div className={`w-32 h-32 rounded-full border-4 transition-all duration-150 shadow-[0_0_60px_rgba(192,38,211,0.5)] flex items-center justify-center bg-fuchsia-900/40 ${isVjTalking ? 'border-fuchsia-400 scale-[1.2]' : 'border-fuchsia-900 scale-100 opacity-40'}`} style={{ transform: isVjTalking ? `scale(${vjPulse})` : 'scale(1)' }}>
               <span className="text-4xl font-black text-fuchsia-400 italic">VJ</span>
            </div>
            <span className={`text-xs font-black uppercase tracking-widest ${isVjTalking ? 'text-fuchsia-400' : 'text-fuchsia-900'}`}>Sarcastic Queen</span>
         </div>
      </div>

      {/* SPEECH BUBBLE */}
      <div className="absolute top-[220px] right-10 z-[500] max-w-lg">
         <div className="bg-black/80 backdrop-blur-3xl p-8 rounded-[3rem] border-2 border-white/10 shadow-3xl text-center">
            <p className="text-3xl font-black italic uppercase leading-tight text-white">
               {hostMessage.split(/AJ:|VJ:/).map((part, i) => (
                 <span key={i} className={i % 2 === 0 ? "text-indigo-200" : "text-fuchsia-300"}>{part}</span>
               ))}
            </p>
         </div>
      </div>

      {/* CONTENT AREA */}
      <div className="z-10 w-full max-w-7xl">
        {state.stage === GameStage.LOBBY && (
          <div className="grid grid-cols-2 gap-24 items-center">
            <div className="space-y-12">
              <h1 className="text-[14rem] font-black leading-none text-white tracking-tighter drop-shadow-2xl">{state.roomCode || '....'}</h1>
              <div className="bg-white/5 p-12 rounded-[5rem] border border-white/10 backdrop-blur-3xl flex items-center gap-12">
                <img src={qrUrl} alt="QR" className="w-56 h-56 bg-white p-4 rounded-3xl" />
                <div className="space-y-4">
                  <p className="text-6xl font-black uppercase italic leading-none text-fuchsia-500">JOIN NOW</p>
                  <p className="text-xl font-bold opacity-30 uppercase">Scan to join the show.<br/>Logic gaali-ku AJ waiting.</p>
                </div>
              </div>
            </div>
            <div className="bg-black/40 border-4 border-white/5 rounded-[5rem] p-16 h-[600px] overflow-hidden flex flex-col shadow-2xl">
               <h2 className="text-4xl font-black uppercase italic mb-8 border-b border-white/10 pb-4">VICTIMS [{state.players.length}]</h2>
               <div className="flex-1 overflow-y-auto space-y-4 pr-4">
                  {state.players.map(p => (
                    <div key={p.id} className="bg-white/5 p-8 rounded-[3rem] flex justify-between items-center border border-white/5">
                       <span className="text-4xl font-black uppercase">{p.name}</span>
                       <span className="text-3xl font-black text-amber-500">{p.score}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {state.stage === GameStage.TOPIC_SELECTION && (
          <div className="text-center space-y-20 animate-in zoom-in-95">
             <h2 className="text-6xl font-black uppercase italic text-fuchsia-500">PICK A CATEGORY... OR BE MOKKA</h2>
             <div className="flex justify-center gap-12">
                {state.topicOptions.map((t, i) => (
                  <div key={i} className="bg-white/5 border-4 border-white/10 p-16 rounded-[4rem] text-4xl font-black uppercase shadow-2xl animate-pulse">
                     {t}
                  </div>
                ))}
             </div>
          </div>
        )}

        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="space-y-12 animate-in fade-in duration-500 text-center">
             <div className="bg-fuchsia-600 inline-block px-12 py-3 rounded-full text-2xl font-black uppercase mb-6">{state.topic}</div>
             <h1 className="text-[7rem] font-black leading-[0.9] uppercase tracking-tighter mb-4">{state.currentQuestion.textEn}</h1>
             <h2 className="text-5xl italic opacity-50 text-indigo-300">"{state.currentQuestion.textTa}"</h2>
             <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto pt-10">
                {state.currentQuestion.options.map((o, i) => (
                  <div key={i} className="bg-white/5 border-4 border-white/10 p-12 rounded-[3rem] text-4xl font-black uppercase">
                     {o.en}
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float-up { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-110vh) scale(3); opacity: 0; } }
        .animate-float-up { animation: float-up 3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default TVView;
