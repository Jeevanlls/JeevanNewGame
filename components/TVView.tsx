
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

  const totalAnswered = state.players.filter(p => !!p.lastAnswer).length;
  const allAnswered = state.players.length > 0 && totalAnswered === state.players.length;

  return (
    <div className="h-full w-full bg-[#020617] p-12 flex flex-col relative overflow-hidden font-game">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-fuchsia-900/40 blur-[200px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-900/40 blur-[200px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <header className="flex justify-between items-start z-10 mb-8">
        <div className="flex flex-col">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-5 h-5 rounded-full bg-red-600 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.8)]"></div>
              <span className="text-2xl font-black tracking-[0.5em] text-white/50 uppercase italic">On-Air Chennai</span>
           </div>
           <h1 className="text-[9rem] font-black tracking-tighter italic uppercase text-white leading-none drop-shadow-2xl">
             MIND <span className="text-fuchsia-600">MASH</span>
           </h1>
        </div>

        <div className="flex gap-12 pt-6">
           <div className={`flex flex-col items-center gap-3 transition-all duration-500 ${ajPart ? 'scale-125 translate-y-2' : 'opacity-20'}`}>
              <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2rem] flex items-center justify-center text-6xl font-black border-4 border-white/30 shadow-2xl">AJ</div>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Aggro Host</span>
           </div>
           <div className={`flex flex-col items-center gap-3 transition-all duration-500 ${vjPart ? 'scale-125 translate-y-2' : 'opacity-20'}`}>
              <div className="w-28 h-28 bg-gradient-to-br from-fuchsia-600 to-pink-800 rounded-[2rem] flex items-center justify-center text-6xl font-black border-4 border-white/30 shadow-2xl">VJ</div>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-fuchsia-400">Mokka Queen</span>
           </div>
        </div>
      </header>

      {/* REACTIVE CHAT BUBBLE */}
      <div className="w-full max-w-6xl mx-auto z-10 mb-8 h-48 flex items-center justify-center">
         <div className="bg-white/5 border-2 border-white/10 p-12 rounded-[4rem] backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,0.5)] w-full text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 via-white to-fuchsia-500"></div>
            <p className="text-5xl font-black italic uppercase leading-tight tracking-tight drop-shadow-lg">
               <span className="text-blue-300">{ajPart || "SCAN TO JOIN!"}</span>
               {vjPart && <span className="text-white/10 mx-6">//</span>}
               <span className="text-fuchsia-400">{vjPart}</span>
            </p>
         </div>
      </div>

      <main className="flex-1 flex flex-col items-center z-10 w-full">
        {state.stage === GameStage.LOBBY && (
          <div className="w-full grid grid-cols-12 gap-16 h-full items-center">
             <div className="col-span-5 flex flex-col items-center gap-10">
                <div className="bg-white p-8 rounded-[4rem] shadow-[0_0_120px_rgba(255,255,255,0.2)] transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                   <img src={qrUrl} alt="QR" className="w-80 h-80" />
                </div>
                <div className="text-center">
                   <p className="text-4xl font-black text-amber-500 uppercase tracking-[0.3em] mb-4 italic">ROOM FREQUENCY</p>
                   <h2 className="text-[7rem] font-black tracking-tighter text-white uppercase bg-white/5 px-16 py-6 rounded-[3rem] border-2 border-white/10 shadow-inner">{state.roomCode || "----"}</h2>
                </div>
             </div>

             <div className="col-span-7 bg-white/5 border-2 border-white/10 rounded-[5rem] flex flex-col p-14 h-[35rem] backdrop-blur-md shadow-2xl relative">
                <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/10">
                   <h3 className="text-6xl font-black uppercase italic tracking-tighter text-white">The Victims</h3>
                   <span className="bg-emerald-600/20 text-emerald-400 border-2 border-emerald-500/50 px-10 py-4 rounded-full font-black text-3xl animate-pulse">LIVE: {state.players.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-8 overflow-y-auto pr-6 custom-scrollbar">
                   {state.players.map((p, idx) => (
                     <div key={p.id} className="bg-white/5 p-8 rounded-[2.5rem] border-2 border-white/5 flex justify-between items-center animate-in slide-in-from-bottom-10" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-800 rounded-2xl flex items-center justify-center text-4xl font-black shadow-xl">{p.name[0]}</div>
                           <span className="text-4xl font-black uppercase tracking-tighter">{p.name}</span>
                        </div>
                        <span className="text-amber-500 font-black text-4xl">{p.score}</span>
                     </div>
                   ))}
                   {state.players.length === 0 && (
                     <div className="col-span-2 h-full flex flex-col items-center justify-center opacity-10 gap-6">
                        <span className="text-9xl">📻</span>
                        <p className="text-5xl font-black uppercase italic">SCAN DA LOGIC PIECE!</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="w-full flex flex-col items-center gap-14 animate-in zoom-in-95 duration-500">
             <div className="text-center space-y-8 max-w-[85%] relative">
                <span className="bg-fuchsia-600 px-12 py-4 rounded-full text-3xl font-black uppercase tracking-[0.3em] shadow-glow transform -rotate-1 inline-block">{state.topic}</span>
                <h2 className="text-[7.5rem] font-black uppercase leading-[0.85] tracking-tighter text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                  {state.currentQuestion.textEn}
                </h2>
                <p className="text-5xl opacity-40 italic font-medium text-blue-200">"{state.currentQuestion.textTa}"</p>
                
                {allAnswered && (
                  <div className="absolute -top-20 right-0 bg-emerald-500 text-black px-10 py-4 rounded-full font-black text-2xl animate-bounce shadow-2xl">
                     ALL LOGIC LOCKED! ⚡
                  </div>
                )}
             </div>

             <div className="grid grid-cols-2 gap-12 w-full max-w-[90rem]">
                {state.currentQuestion.options.map((o, i) => {
                  const answers = state.players.filter(p => p.lastAnswer === (i+1).toString());
                  const numAns = answers.length;
                  return (
                    <div key={i} className={`p-12 rounded-[4rem] border-4 transition-all duration-500 relative ${numAns > 0 ? 'bg-white/10 border-fuchsia-500 shadow-[0_0_60px_rgba(217,70,239,0.3)] scale-105' : 'bg-black/60 border-white/5'}`}>
                       <span className={`absolute -top-8 -left-8 w-24 h-24 rounded-3xl flex items-center justify-center text-6xl font-black shadow-2xl transition-all ${numAns > 0 ? 'bg-fuchsia-600 text-white' : 'bg-white text-black'}`}>{i+1}</span>
                       <div className="absolute top-8 right-12 flex gap-4">
                          {answers.map((p) => (
                            <div key={p.id} className="w-8 h-8 rounded-xl bg-fuchsia-500 animate-ping shadow-[0_0_20px_rgba(217,70,239,1)] flex items-center justify-center text-[10px] font-black">{p.name[0]}</div>
                          ))}
                       </div>
                       <div className="text-5xl font-black uppercase mb-4 tracking-tight leading-none">{o.en}</div>
                       <div className="text-3xl opacity-30 italic">{o.ta}</div>
                    </div>
                  );
                })}
             </div>
             
             <div className="w-full max-w-4xl bg-white/5 h-6 rounded-full overflow-hidden mt-4 border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-fuchsia-500 transition-all duration-1000 shadow-glow" 
                  style={{ width: `${(totalAnswered / Math.max(1, state.players.length)) * 100}%` }}
                ></div>
             </div>
          </div>
        )}

        {state.stage === GameStage.REVEAL && state.currentQuestion && (
           <div className="w-full flex flex-col items-center gap-14 animate-in fade-in duration-1000">
              <div className="relative">
                <h2 className="text-[11rem] font-black text-emerald-500 italic uppercase tracking-tighter drop-shadow-glow animate-bounce">THE TRUTH!</h2>
                <div className="absolute -inset-10 bg-emerald-500/20 blur-[100px] -z-10 rounded-full animate-pulse"></div>
              </div>
              
              <div className="bg-emerald-500/5 border-[10px] border-emerald-500 p-24 rounded-[7rem] text-center max-w-[80rem] shadow-[0_0_150px_rgba(16,185,129,0.5)] transform hover:scale-105 transition-transform relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                 <p className="text-[6.5rem] font-black uppercase mb-12 text-white leading-none tracking-tighter">
                    {state.currentQuestion.options[state.currentQuestion.correctIndex].en}
                 </p>
                 <div className="h-3 w-48 mx-auto bg-emerald-500/30 rounded-full mb-12"></div>
                 <p className="text-5xl font-black text-emerald-400 uppercase italic leading-tight px-10">"{state.currentQuestion.explanation}"</p>
              </div>
              
              <div className="flex gap-10 mt-10">
                 {state.players.sort((a,b) => b.score - a.score).slice(0, 3).map((p, i) => (
                    <div key={p.id} className="flex flex-col items-center gap-2">
                       <div className="text-2xl font-black text-white/40 uppercase">#{i+1}</div>
                       <div className="bg-white/10 px-8 py-4 rounded-3xl font-black text-3xl border border-white/20">
                          {p.name}: {p.score}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {state.stage === GameStage.LOADING && (
          <div className="h-full flex flex-col items-center justify-center gap-16">
             <div className="relative scale-150">
                <div className="w-56 h-56 border-[16px] border-fuchsia-500/10 rounded-full"></div>
                <div className="absolute top-0 left-0 w-56 h-56 border-[16px] border-fuchsia-500 border-t-transparent rounded-full animate-spin shadow-glow"></div>
                <div className="absolute inset-0 flex items-center justify-center text-7xl animate-pulse">📡</div>
             </div>
             <div className="text-center space-y-4">
               <p className="text-8xl font-black uppercase italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-fuchsia-500">AJ IS COOKING LOGIC...</p>
               <p className="text-3xl font-black uppercase opacity-20 tracking-[0.5em]">Tuning Radio Frequency</p>
             </div>
          </div>
        )}
      </main>

      <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
        {state.reactions?.slice(-15).map(r => (
          <div key={r.id} className="absolute bottom-0 text-[12rem] animate-float-reaction" style={{ left: `${r.x}%` }}>
            {r.emoji}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes float-reaction {
          0% { transform: translateY(200px) scale(0.3); opacity: 0; }
          20% { opacity: 1; transform: translateY(0) scale(1.5); }
          100% { transform: translateY(-130vh) scale(4) rotate(60deg); opacity: 0; }
        }
        .animate-float-reaction { animation: float-reaction 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .shadow-glow { box-shadow: 0 0 30px rgba(217, 70, 239, 0.6); }
        .drop-shadow-glow { filter: drop-shadow(0 0 40px rgba(16, 185, 129, 0.8)); }
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default TVView;
