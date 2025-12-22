
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

  const isAj = hostMessage.startsWith('AJ:');
  const isVj = hostMessage.includes('VJ:');

  return (
    <div className="h-full w-full bg-[#020617] p-12 flex flex-col relative overflow-hidden font-game">
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-fuchsia-600/10 blur-[150px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full"></div>

      {/* HEADER SECTION */}
      <header className="flex justify-between items-start z-10 mb-12">
        <div className="flex flex-col gap-2">
           <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse"></div>
              <span className="text-xl font-black tracking-[0.5em] text-white/40 uppercase">Radio Mash Live</span>
           </div>
           <h1 className="text-8xl font-black tracking-tighter italic uppercase text-white/90">
             MIND <span className="text-fuchsia-600">MASH</span>
           </h1>
        </div>

        <div className="flex gap-10">
           <div className={`flex flex-col items-center gap-3 transition-all duration-500 ${isAj ? 'scale-110' : 'opacity-20'}`}>
              <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-4xl font-black border-4 border-white/20">AJ</div>
              <span className="text-xs font-black uppercase opacity-50">Savage RJ</span>
           </div>
           <div className={`flex flex-col items-center gap-3 transition-all duration-500 ${isVj ? 'scale-110' : 'opacity-20'}`}>
              <div className="w-24 h-24 bg-fuchsia-600 rounded-[2rem] flex items-center justify-center text-4xl font-black border-4 border-white/20">VJ</div>
              <span className="text-xs font-black uppercase opacity-50">Sarcastic Q</span>
           </div>
        </div>
      </header>

      {/* HOST MESSAGE BOX */}
      <div className="w-full max-w-6xl mx-auto z-10 mb-12">
         <div className="bg-white/5 border-2 border-white/10 p-10 rounded-[3rem] backdrop-blur-xl shadow-2xl relative">
            <div className="absolute -top-4 left-10 bg-fuchsia-600 px-6 py-1 rounded-full text-xs font-black uppercase">On Air</div>
            <p className="text-4xl font-black italic text-center uppercase leading-tight">
               {hostMessage.split(/AJ:|VJ:/).map((p, i) => (
                 <span key={i} className={i%2===0 ? "text-blue-300" : "text-amber-300"}>{p}</span>
               ))}
            </p>
         </div>
      </div>

      {/* MAIN GAME AREA */}
      <main className="flex-1 flex flex-col items-center z-10">
        {state.stage === GameStage.LOBBY && (
          <div className="w-full grid grid-cols-12 gap-12 h-full">
             <div className="col-span-5 flex flex-col justify-center gap-8">
                <div className="bg-white p-8 rounded-[4rem] shadow-[0_0_80px_rgba(255,255,255,0.1)] w-fit mx-auto">
                   <img src={qrUrl} alt="QR" className="w-64 h-64" />
                </div>
                <div className="text-center">
                   <p className="text-2xl font-black text-fuchsia-500 uppercase tracking-widest italic mb-2">Join at</p>
                   <h2 className="text-7xl font-black tracking-tighter text-white uppercase">{state.roomCode || "JOIN"}</h2>
                </div>
             </div>

             <div className="col-span-7 bg-white/5 border-2 border-white/10 rounded-[4rem] flex flex-col p-10 overflow-hidden backdrop-blur-sm">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-4xl font-black uppercase italic">Victim Feed</h3>
                   <span className="bg-emerald-600 px-4 py-2 rounded-2xl font-black">Online: {state.players.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   {state.players.map(p => (
                     <div key={p.id} className="bg-white/5 p-6 rounded-3xl border border-white/10 flex justify-between items-center animate-in zoom-in-90 duration-300">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-black">{p.name[0]}</div>
                           <span className="text-2xl font-black uppercase">{p.name}</span>
                        </div>
                        <span className="text-amber-500 font-black text-xl">{p.score}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="w-full flex flex-col items-center gap-10 animate-in fade-in duration-500">
             <div className="text-center space-y-4 max-w-5xl">
                <span className="bg-white/10 px-8 py-2 rounded-full text-xl font-black uppercase text-fuchsia-500">{state.topic}</span>
                <h2 className="text-7xl font-black uppercase leading-[0.9] tracking-tighter drop-shadow-2xl">
                  {state.currentQuestion.textEn}
                </h2>
                <p className="text-3xl opacity-40 italic font-medium">"{state.currentQuestion.textTa}"</p>
             </div>

             <div className="grid grid-cols-2 gap-8 w-full max-w-6xl">
                {state.currentQuestion.options.map((o, i) => {
                  const numAns = state.players.filter(p => p.lastAnswer === (i+1).toString()).length;
                  return (
                    <div key={i} className="bg-black/40 border-4 border-white/10 p-10 rounded-[3rem] relative group transition-all">
                       <span className="absolute -top-6 -left-6 w-16 h-16 bg-white text-black rounded-2xl flex items-center justify-center text-4xl font-black shadow-xl">{i+1}</span>
                       <div className="absolute top-4 right-8 flex gap-2">
                          {Array.from({length: numAns}).map((_, idx) => (
                            <div key={idx} className="w-4 h-4 rounded-full bg-fuchsia-500 animate-pulse"></div>
                          ))}
                       </div>
                       <div className="text-3xl font-black uppercase mb-2">{o.en}</div>
                       <div className="text-xl opacity-30 italic">{o.ta}</div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {state.stage === GameStage.REVEAL && state.currentQuestion && (
           <div className="w-full flex flex-col items-center gap-8 animate-in zoom-in-95 duration-700">
              <h2 className="text-9xl font-black text-emerald-500 italic uppercase">TRUTH REVEAL!</h2>
              <div className="bg-emerald-500/10 border-8 border-emerald-500 p-16 rounded-[5rem] text-center max-w-4xl shadow-[0_0_100px_rgba(16,185,129,0.3)]">
                 <p className="text-6xl font-black uppercase mb-6">
                    {state.currentQuestion.options[state.currentQuestion.correctIndex].en}
                 </p>
                 <p className="text-2xl font-black opacity-60 uppercase">{state.currentQuestion.explanation}</p>
              </div>
           </div>
        )}
      </main>

      {/* REACTION OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-[100]">
        {state.reactions?.slice(-15).map(r => (
          <div key={r.id} className="absolute bottom-0 text-9xl animate-float-reaction" style={{ left: `${r.x}%` }}>
            {r.emoji}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes float-reaction {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-120vh) scale(2) rotate(20deg); opacity: 0; }
        }
        .animate-float-reaction { animation: float-reaction 3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default TVView;
