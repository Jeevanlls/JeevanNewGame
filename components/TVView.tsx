
import React from 'react';
import { GameState, GameStage } from '../types';

interface TVViewProps {
  state: GameState;
  hostMessage: string;
  iqData: string;
  onReset: () => void;
  onStop: () => void;
}

const TVView: React.FC<TVViewProps> = ({ state, hostMessage }) => {
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${state.roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;

  const ajPart = hostMessage.split('VJ:')[0].replace('AJ:', '').trim();
  const vjPart = hostMessage.includes('VJ:') ? hostMessage.split('VJ:')[1].trim() : '';

  return (
    <div className="h-full w-full bg-[#020617] p-12 flex flex-col relative overflow-hidden font-game">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-fuchsia-600 blur-[180px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600 blur-[180px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <header className="flex justify-between items-start z-10 mb-8">
        <div className="flex flex-col">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.8)]"></div>
              <span className="text-xl font-black tracking-[0.4em] text-white/50 uppercase italic">On-Air Chennai</span>
           </div>
           <h1 className="text-9xl font-black tracking-tighter italic uppercase text-white leading-none">
             MIND <span className="text-fuchsia-600">MASH</span>
           </h1>
        </div>

        <div className="flex gap-12 pt-4">
           <div className={`flex flex-col items-center gap-3 transition-all duration-300 ${ajPart ? 'scale-110' : 'opacity-30'}`}>
              <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-5xl font-black border-4 border-white/30 shadow-2xl">AJ</div>
              <span className="text-xs font-black uppercase tracking-widest text-blue-400">Host Alpha</span>
           </div>
           <div className={`flex flex-col items-center gap-3 transition-all duration-300 ${vjPart ? 'scale-110' : 'opacity-30'}`}>
              <div className="w-24 h-24 bg-fuchsia-600 rounded-3xl flex items-center justify-center text-5xl font-black border-4 border-white/30 shadow-2xl">VJ</div>
              <span className="text-xs font-black uppercase tracking-widest text-fuchsia-400">Logic Queen</span>
           </div>
        </div>
      </header>

      {/* REACTIVE CHAT BUBBLE */}
      <div className="w-full max-w-6xl mx-auto z-10 mb-10 h-44 flex items-center justify-center">
         <div className="bg-white/5 border-2 border-white/10 p-10 rounded-[3rem] backdrop-blur-3xl shadow-3xl w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-fuchsia-500"></div>
            <p className="text-5xl font-black italic uppercase leading-tight tracking-tight">
               <span className="text-blue-400">{ajPart}</span>
               {vjPart && <span className="text-white/20 mx-4">|</span>}
               <span className="text-fuchsia-400">{vjPart}</span>
            </p>
         </div>
      </div>

      <main className="flex-1 flex flex-col items-center z-10 w-full">
        {state.stage === GameStage.LOBBY && (
          <div className="w-full grid grid-cols-12 gap-12 h-full items-center">
             <div className="col-span-5 flex flex-col items-center gap-8">
                <div className="bg-white p-6 rounded-[3.5rem] shadow-[0_0_100px_rgba(255,255,255,0.15)] transform -rotate-3">
                   <img src={qrUrl} alt="QR" className="w-72 h-72" />
                </div>
                <div className="text-center">
                   <p className="text-3xl font-black text-amber-500 uppercase tracking-widest mb-2">Connect Now</p>
                   <h2 className="text-8xl font-black tracking-tighter text-white uppercase bg-white/10 px-10 py-4 rounded-3xl border border-white/20">{state.roomCode || "----"}</h2>
                </div>
             </div>

             <div className="col-span-7 bg-white/5 border-2 border-white/10 rounded-[4rem] flex flex-col p-10 h-full backdrop-blur-sm shadow-inner">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                   <h3 className="text-5xl font-black uppercase italic tracking-tighter text-fuchsia-500">The Victim Feed</h3>
                   <span className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 px-6 py-2 rounded-full font-black text-xl animate-pulse">LIVE: {state.players.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-6 overflow-y-auto pr-4 custom-scrollbar">
                   {state.players.map(p => (
                     <div key={p.id} className="bg-white/5 p-6 rounded-3xl border border-white/10 flex justify-between items-center animate-in slide-in-from-right-10">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">{p.name[0]}</div>
                           <span className="text-3xl font-black uppercase tracking-tighter">{p.name}</span>
                        </div>
                        <span className="text-amber-500 font-black text-2xl drop-shadow-lg">{p.score}</span>
                     </div>
                   ))}
                   {state.players.length === 0 && (
                     <div className="col-span-2 h-full flex items-center justify-center opacity-20">
                        <p className="text-4xl font-black uppercase italic">Scanning for logic pieces...</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="w-full flex flex-col items-center gap-12 animate-in zoom-in-95 duration-500">
             <div className="text-center space-y-6 max-w-6xl">
                <span className="bg-fuchsia-600 px-10 py-3 rounded-full text-2xl font-black uppercase tracking-widest shadow-lg">{state.topic}</span>
                <h2 className="text-8xl font-black uppercase leading-[0.9] tracking-tighter drop-shadow-4xl text-white">
                  {state.currentQuestion.textEn}
                </h2>
                <p className="text-4xl opacity-50 italic font-medium text-blue-200">"{state.currentQuestion.textTa}"</p>
             </div>

             <div className="grid grid-cols-2 gap-10 w-full max-w-7xl">
                {state.currentQuestion.options.map((o, i) => {
                  const numAns = state.players.filter(p => p.lastAnswer === (i+1).toString()).length;
                  return (
                    <div key={i} className={`p-10 rounded-[3.5rem] border-4 transition-all relative ${numAns > 0 ? 'bg-white/10 border-fuchsia-500 shadow-[0_0_40px_rgba(217,70,239,0.2)]' : 'bg-black/40 border-white/10'}`}>
                       <span className="absolute -top-6 -left-6 w-20 h-20 bg-white text-black rounded-3xl flex items-center justify-center text-5xl font-black shadow-2xl">{i+1}</span>
                       <div className="absolute top-6 right-10 flex gap-3">
                          {Array.from({length: numAns}).map((_, idx) => (
                            <div key={idx} className="w-6 h-6 rounded-full bg-fuchsia-500 animate-ping shadow-[0_0_15px_rgba(217,70,239,1)]"></div>
                          ))}
                       </div>
                       <div className="text-4xl font-black uppercase mb-3 tracking-tight">{o.en}</div>
                       <div className="text-2xl opacity-40 italic">{o.ta}</div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {state.stage === GameStage.REVEAL && state.currentQuestion && (
           <div className="w-full flex flex-col items-center gap-10 animate-in fade-in duration-700">
              <h2 className="text-9xl font-black text-emerald-500 italic uppercase tracking-tighter drop-shadow-glow">TRUTH REVEAL!</h2>
              <div className="bg-emerald-500/10 border-8 border-emerald-500 p-20 rounded-[6rem] text-center max-w-5xl shadow-[0_0_120px_rgba(16,185,129,0.4)] transform hover:scale-105 transition-transform">
                 <p className="text-7xl font-black uppercase mb-8 text-white">
                    {state.currentQuestion.options[state.currentQuestion.correctIndex].en}
                 </p>
                 <div className="h-2 w-full bg-emerald-500/20 rounded-full mb-8"></div>
                 <p className="text-3xl font-black text-emerald-400 uppercase italic leading-tight">"{state.currentQuestion.explanation}"</p>
              </div>
           </div>
        )}

        {state.stage === GameStage.LOADING && (
          <div className="h-full flex flex-col items-center justify-center gap-12">
             <div className="relative">
                <div className="w-48 h-48 border-[12px] border-fuchsia-500/20 rounded-full"></div>
                <div className="absolute top-0 left-0 w-48 h-48 border-[12px] border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
             <p className="text-6xl font-black uppercase italic animate-pulse tracking-tighter">AJ is cooking logic...</p>
          </div>
        )}
      </main>

      {/* REACTIONS */}
      <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
        {state.reactions?.slice(-10).map(r => (
          <div key={r.id} className="absolute bottom-0 text-9xl animate-float-reaction" style={{ left: `${r.x}%` }}>
            {r.emoji}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes float-reaction {
          0% { transform: translateY(100px) scale(0.5); opacity: 0; }
          20% { opacity: 1; transform: translateY(0) scale(1.2); }
          100% { transform: translateY(-120vh) scale(3) rotate(45deg); opacity: 0; }
        }
        .animate-float-reaction { animation: float-reaction 3.5s ease-out forwards; }
        .drop-shadow-glow { filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.6)); }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TVView;
