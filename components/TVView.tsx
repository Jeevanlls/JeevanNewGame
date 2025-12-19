
import React, { useState, useEffect } from 'react';
import { GameState, GameStage, GameMode } from '../types';
import * as gemini from '../geminiService';

interface TVViewProps {
  state: GameState;
  hostMessage: string;
  iqData: string;
}

const TVView: React.FC<TVViewProps> = ({ state, hostMessage }) => {
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${state.roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;
  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaveform(Array.from({ length: 24 }, () => Math.random() * 100));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full p-12 flex flex-col items-center justify-center relative overflow-hidden bg-[#020617]">
      {/* HUD */}
      <div className="absolute top-10 left-10 flex flex-col gap-4 z-[50]">
         <div className="bg-black/60 p-4 rounded-3xl border border-white/10 backdrop-blur-xl flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600 rounded-full animate-pulse border-2 border-white/20"></div>
            <h1 className="text-4xl font-black italic select-none uppercase">MIND <span className="text-fuchsia-500">MASH</span></h1>
         </div>
      </div>

      {/* AJ'S BUBBLE */}
      <div className="absolute top-10 right-10 z-[200] w-full max-w-lg">
         <div className="bg-indigo-700/90 p-8 rounded-[3rem] shadow-3xl text-white relative border-4 border-white/20 backdrop-blur-2xl">
            <div className="absolute -top-6 right-12 flex items-end gap-1.5 h-16">
               {waveform.map((h, i) => (
                 <div key={i} className="w-2 bg-white/90 rounded-t-full transition-all" style={{ height: `${h}%` }}></div>
               ))}
            </div>
            <p className="text-3xl font-black italic leading-tight uppercase tracking-tight">{hostMessage}</p>
         </div>
      </div>

      {state.stage === GameStage.LOBBY && (
        <div className="z-10 w-full max-w-7xl grid grid-cols-2 gap-24 items-center">
          <div className="space-y-12">
            <div>
              <p className="text-3xl font-black uppercase tracking-[0.4em] text-fuchsia-500 italic opacity-50">Room Secret</p>
              <h1 className="text-[14rem] font-black leading-none text-white">{state.roomCode || '....'}</h1>
            </div>
            <div className="bg-white/5 p-12 rounded-[5rem] border border-white/10 backdrop-blur-3xl flex items-center gap-12">
              <img src={qrUrl} alt="QR" className="w-56 h-56 bg-white p-4 rounded-3xl" />
              <div className="space-y-4">
                <p className="text-6xl font-black uppercase italic">JOIN NOW</p>
                <p className="text-xl font-bold opacity-30 uppercase tracking-widest leading-none">Don't be shy.<br/>Bring your logic.</p>
              </div>
            </div>
          </div>
          <div className="bg-black/60 border-4 border-white/5 rounded-[6rem] p-16 h-[650px] flex flex-col overflow-hidden">
            <h2 className="text-4xl font-black uppercase italic mb-10 border-b border-white/10 pb-6 flex justify-between">
              READY TO MASH <span className="text-fuchsia-500 text-6xl">[{state.players.length}]</span>
            </h2>
            <div className="grid grid-cols-1 gap-6 overflow-y-auto pr-4">
              {state.players.map((p) => (
                <div key={p.id} className="bg-white/5 p-8 rounded-[3rem] border-2 border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-3xl flex items-center justify-center font-black text-2xl">{p.name[0]}</div>
                    <span className="text-4xl font-black uppercase">{p.name}</span>
                  </div>
                  <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.stage === GameStage.TUTORIAL && (
        <div className="z-[300] bg-black/80 fixed inset-0 flex flex-col items-center justify-center p-20 animate-in fade-in zoom-in-95 duration-500">
           <h2 className="text-fuchsia-500 text-6xl font-black uppercase italic mb-12 animate-bounce">AJ'S MASTERCLASS</h2>
           <div className="grid grid-cols-2 gap-10 max-w-6xl">
              {[
                {icon: "📱", title: "SCAN & SYNC", desc: "Get in the lobby fast."},
                {icon: "🎭", title: "TOPIC MASTER", desc: "One of you picks the chaos."},
                {icon: "⚡", title: "SPEED MATTERS", desc: "Fast brains get more points."},
                {icon: "🔥", title: "THE ROAST", desc: "Fail and AJ will roast you."}
              ].map((step, i) => (
                <div key={i} className="bg-white/5 p-12 rounded-[4rem] border-4 border-white/10 flex flex-col items-center text-center">
                   <div className="text-8xl mb-6">{step.icon}</div>
                   <h3 className="text-4xl font-black uppercase mb-4">{step.title}</h3>
                   <p className="text-xl font-bold opacity-50 uppercase tracking-widest">{step.desc}</p>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* FOOTER TICKER */}
      <div className="fixed bottom-0 left-0 w-full bg-indigo-950 h-16 flex items-center overflow-hidden border-t-4 border-white/10 z-[400]">
         <div className="bg-black text-white px-10 h-full flex items-center font-black italic text-2xl uppercase">NEWS</div>
         <div className="flex-1 overflow-hidden">
            <div className="whitespace-nowrap animate-[ticker_30s_linear_infinite] inline-block text-2xl font-black uppercase tracking-widest">
               &nbsp;&nbsp;&nbsp;&nbsp; ⚡ GANA VIBES ACTIVE ⚡ {state.players.length > 0 ? `${state.players[0].name} IS ALREADY LOSING` : 'JOIN THE RIOT'} ⚡ NO SENSE ALLOWED ⚡ &nbsp;&nbsp;&nbsp;&nbsp;
            </div>
         </div>
      </div>

      {/* GAMEPLAY AREA */}
      <div className="mt-[-80px] w-full flex flex-col items-center z-10">
        {state.stage === GameStage.WARMUP && (
          <div className="text-center space-y-12 animate-in zoom-in-50 duration-700">
             <h1 className="text-[9rem] font-black leading-none uppercase tracking-tighter drop-shadow-3xl">"{state.warmupQuestion}"</h1>
          </div>
        )}
        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="w-full max-w-7xl space-y-12 animate-in fade-in duration-1000">
            <div className="text-center space-y-6">
              <div className="inline-block px-14 py-4 rounded-full text-3xl font-black uppercase bg-fuchsia-600 border-4 border-white/20">{state.topic}</div>
              <h1 className="text-[7rem] font-black leading-[0.85] uppercase drop-shadow-2xl">{state.currentQuestion.textEn}</h1>
              <h2 className="text-4xl italic opacity-40">"{state.currentQuestion.textTa}"</h2>
            </div>
            <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
              {state.currentQuestion.options.map((opt, i) => (
                <div key={i} className="bg-white/5 border-4 border-white/10 p-12 rounded-[3rem] text-center relative">
                  <span className="absolute -top-6 -left-6 w-16 h-16 bg-white text-black flex items-center justify-center rounded-2xl text-4xl font-black">{i + 1}</span>
                  <p className="text-4xl font-black uppercase">{opt.en}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default TVView;
