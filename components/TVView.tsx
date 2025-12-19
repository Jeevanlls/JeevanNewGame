
import React from 'react';
import { GameState, GameStage, Language, GameMode } from '../types';

interface TVViewProps {
  state: GameState;
  hostMessage: string;
  iqData: string;
}

const TVView: React.FC<TVViewProps> = ({ state, hostMessage, iqData }) => {
  const joinUrl = window.location.href;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;

  const isGenius = state.mode === GameMode.GENIUS;
  const themeClass = isGenius 
    ? "from-emerald-950 via-slate-950 to-emerald-900" 
    : "from-indigo-950 via-slate-950 to-fuchsia-950";
  const accentColor = isGenius ? "text-amber-400" : "text-fuchsia-400";
  const borderColor = isGenius ? "border-amber-500/30" : "border-fuchsia-500/30";
  const cardBg = isGenius ? "bg-emerald-900/20" : "bg-indigo-900/20";

  return (
    <div className={`h-full w-full flex flex-col items-center justify-center p-12 text-center text-white overflow-hidden relative font-game transition-all duration-1000 bg-gradient-to-br ${themeClass}`}>
      
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
        backgroundImage: isGenius 
          ? 'url("https://www.transparenttextures.com/patterns/natural-paper.png")' 
          : 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' 
      }}></div>

      {state.stage === GameStage.LOADING && (
        <div className="flex flex-col items-center gap-10 z-10 animate-pulse">
           <div className="w-56 h-56 rounded-full bg-white/5 border-8 border-indigo-500/30 flex items-center justify-center text-9xl animate-spin-slow">
              {isGenius ? '🧠' : '🔥'}
           </div>
           <h2 className="text-6xl font-black uppercase tracking-[0.3em] text-white/50">
             AJ IS {isGenius ? 'RESEARCHING' : 'CALCULATING ROASTS'}...
           </h2>
        </div>
      )}

      {state.stage === GameStage.LOBBY && (
        <div className="flex flex-col md:flex-row items-center gap-20 z-10 animate-in fade-in duration-1000">
          <div className="space-y-10 max-w-xl">
            <h1 className={`text-[10rem] font-black tracking-tighter ${isGenius ? 'text-amber-500' : 'text-indigo-500'} drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]`}>
               {state.roomCode}
            </h1>
            <div className="space-y-4">
              <p className="text-4xl font-bold text-slate-400 italic">
                {isGenius ? 'Academy Lobby' : 'Chaos Lobby'}
              </p>
              <div className="bg-white p-8 rounded-[3rem] shadow-2xl inline-block transform hover:rotate-3 transition-transform">
                 <img src={qrUrl} alt="Join QR Code" className="w-64 h-64" />
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-8 min-w-[400px]">
            <h2 className={`text-5xl font-black uppercase tracking-[0.2em] ${accentColor}`}>
              {isGenius ? 'SCHOLARS JOINED' : 'VICTIMS LISTED'}
            </h2>
            <div className="flex flex-wrap gap-6 justify-center max-w-2xl">
              {state.players.map(p => (
                <div key={p.id} className={`${cardBg} border-2 ${borderColor} px-10 py-5 rounded-[2.5rem] shadow-xl animate-in zoom-in`}>
                  <p className="text-4xl font-black">{p.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(state.stage === GameStage.EXPLANATION || state.stage === GameStage.REVEAL) && (
        <div className="max-w-6xl space-y-12 z-10 animate-in zoom-in">
          <div className={`w-40 h-40 ${isGenius ? 'bg-amber-500/20' : 'bg-fuchsia-500/20'} rounded-full mx-auto flex items-center justify-center text-8xl shadow-2xl border-4 border-white animate-float`}>
            {isGenius ? '🎓' : '🤖'}
          </div>
          <div className={`${cardBg} border-4 ${borderColor} p-16 rounded-[5rem] backdrop-blur-3xl shadow-2xl`}>
             <p className="text-5xl leading-tight italic font-bold text-white">
               {hostMessage}
             </p>
             {isGenius && state.stage === GameStage.REVEAL && state.currentQuestion?.explanation && (
               <div className="mt-12 p-8 bg-amber-500/10 rounded-[3rem] border-2 border-amber-500/30 animate-in slide-in-from-bottom-10">
                  <h4 className="text-amber-400 font-black uppercase tracking-[0.3em] text-sm mb-4">The Professor's Deep Dive:</h4>
                  <p className="text-3xl font-medium leading-relaxed italic text-amber-50 shadow-sm">{state.currentQuestion.explanation}</p>
               </div>
             )}
          </div>
        </div>
      )}

      {state.stage === GameStage.TOPIC_SELECTION && (
        <div className="space-y-12 z-10">
          <h2 className={`text-9xl font-black ${isGenius ? 'text-amber-500' : 'text-orange-500'} animate-pulse uppercase tracking-tighter`}>
            {isGenius ? 'CHOOSE YOUR DISCIPLINE' : 'TOPIC CHAOS!'}
          </h2>
          <div className="flex flex-wrap gap-10 justify-center mt-12">
            {state.topicOptions.map((opt, i) => (
              <div key={i} className={`${cardBg} border-4 ${borderColor} p-12 rounded-[4rem] w-80 h-64 flex flex-col items-center justify-center gap-6 shadow-2xl transform hover:scale-110 transition-transform cursor-pointer`}>
                 <span className="text-6xl">{isGenius ? '📚' : '🎯'}</span>
                 <p className="text-3xl font-black uppercase leading-none tracking-tighter">{opt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.stage === GameStage.QUESTION && state.currentQuestion && (
        <div className="w-full max-w-[90rem] space-y-12 z-10">
          <div className="flex justify-between items-center bg-black/40 p-10 rounded-[3.5rem] border-2 border-white/10 px-20 shadow-2xl">
             <div className="flex flex-col items-start">
               <span className={`text-5xl font-black ${isGenius ? 'text-amber-400' : 'text-fuchsia-400'} uppercase tracking-tighter`}>{state.topic}</span>
               <span className="text-xl font-bold opacity-30 mt-1 uppercase tracking-widest">{isGenius ? 'Academic Inquiry' : 'Random Madness'}</span>
             </div>
             <div className="flex flex-col items-end">
               <span className="text-3xl font-black opacity-60">ROUND {state.round}</span>
               {state.topicPickerId && (
                 <span className="text-sm font-black text-amber-500 uppercase mt-2">Specialist: {state.players.find(p => p.id === state.topicPickerId)?.name}</span>
               )}
             </div>
          </div>
          <div className="space-y-8 animate-in slide-in-from-top-10">
             <h2 className="text-7xl font-black leading-tight text-white px-20 drop-shadow-lg">
               {state.currentQuestion.textEn}
             </h2>
             <h3 className={`text-5xl font-medium ${isGenius ? 'text-amber-200' : 'text-indigo-300'} italic px-20`}>
               "{state.currentQuestion.textTa}"
             </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mt-12 px-10">
            {state.currentQuestion.options.map((opt, i) => (
              <div key={i} className={`${cardBg} border-4 ${borderColor} p-8 rounded-[3rem] text-left relative group shadow-2xl transition-all`}>
                <span className={`absolute -top-5 -left-5 w-16 h-16 ${isGenius ? 'bg-amber-600' : 'bg-indigo-600'} text-white flex items-center justify-center rounded-[1.5rem] text-4xl font-black shadow-xl group-hover:scale-110`}>
                  {i + 1}
                </span>
                <div className="pt-4 space-y-3">
                   <p className="text-2xl font-black leading-tight text-white">{opt.en}</p>
                   <p className="text-lg font-medium text-slate-400 italic leading-tight">{opt.ta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.stage === GameStage.DASHBOARD && (
        <div className="w-full max-w-[95rem] space-y-16 z-10 p-12 animate-in zoom-in duration-700">
          <div className="flex flex-col items-center gap-4">
            <h2 className={`text-9xl font-black tracking-tighter ${isGenius ? 'text-amber-500' : 'text-fuchsia-500'} italic uppercase drop-shadow-2xl`}>
              {isGenius ? 'HALL OF WISDOM' : 'HALL OF MOCKERY'}
            </h2>
            <div className={`h-2 w-64 ${isGenius ? 'bg-amber-500' : 'bg-fuchsia-500'} rounded-full`}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
             {/* LEFT: AI ANALYSIS */}
             <div className={`${cardBg} p-16 rounded-[5rem] text-left border-2 ${borderColor} shadow-3xl backdrop-blur-3xl md:col-span-7 flex flex-col gap-10`}>
                <div className="flex items-center gap-8 border-b border-white/10 pb-8">
                   <span className="text-8xl">{isGenius ? '📜' : '🔥'}</span>
                   <div>
                     <h3 className={`text-5xl font-black ${isGenius ? 'text-amber-400' : 'text-fuchsia-400'} uppercase tracking-tighter`}>
                        {isGenius ? 'Scholarly Feedback' : 'Savage Summary'}
                     </h3>
                     <p className="text-xl font-bold opacity-30 italic">{isGenius ? 'Professor AJ has evaluated your minds...' : 'AJ is calculating your failures...'}</p>
                   </div>
                </div>
                <p className="text-5xl leading-snug italic font-black text-white drop-shadow-md">
                   {iqData}
                </p>
             </div>

             {/* RIGHT: LEADERBOARD */}
             <div className="md:col-span-5 flex flex-col gap-6">
                <h3 className="text-3xl font-black text-white/40 uppercase tracking-[0.4em] mb-4">Standings</h3>
                {state.players.sort((a,b) => b.score - a.score).map((p, i) => (
                  <div key={p.id} className={`flex justify-between items-center p-10 bg-black/40 rounded-[3.5rem] border-2 ${i === 0 ? 'border-amber-500' : 'border-white/10'} shadow-2xl relative overflow-hidden group`}>
                     {i === 0 && <div className="absolute top-0 right-0 p-4 text-3xl">👑</div>}
                     <div className="flex items-center gap-8">
                        <span className={`text-4xl font-black ${i === 0 ? 'text-amber-400' : 'opacity-20'}`}>#{i+1}</span>
                        <div className="flex flex-col items-start">
                          <span className="text-5xl font-black">{p.name}</span>
                          <span className="text-xs font-bold text-white/30 uppercase mt-1 tracking-widest">{p.age} Years Old</span>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                       <span className={`text-6xl font-black ${isGenius ? 'text-amber-400' : 'text-orange-500'}`}>{p.score}</span>
                       <span className="text-xs font-black opacity-20">PTS</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Mode Indicator Overlay */}
      <div className="absolute top-12 right-12 flex items-center gap-4 group">
         <div className={`px-10 py-4 rounded-full text-2xl font-black uppercase tracking-tighter shadow-2xl border-2 border-white/20 backdrop-blur-3xl flex items-center gap-4 transition-all group-hover:scale-110 ${isGenius ? 'bg-emerald-600' : 'bg-fuchsia-600'}`}>
           <span className="text-3xl">{isGenius ? '🎓' : '🤡'}</span>
           {state.mode} MODE
         </div>
      </div>
    </div>
  );
};

export default TVView;
