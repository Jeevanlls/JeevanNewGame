
import React, { useState, useEffect } from 'react';
import { GameState, GameStage, GameMode } from '../types';

interface TVViewProps {
  state: GameState;
  hostMessage: string;
  iqData: string;
}

const TVView: React.FC<TVViewProps> = ({ state, hostMessage }) => {
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${state.roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;
  const isChaos = state.mode === GameMode.CONFIDENTLY_WRONG;
  const accentColor = isChaos ? "text-fuchsia-500" : "text-emerald-400";
  const master = state.players.find(p => p.id === state.topicPickerId);

  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpotlightPos({ x: Math.random() * 100, y: Math.random() * 100 });
      setWaveform(Array.from({ length: 12 }, () => Math.random() * 100));
    }, 150);
    return () => clearInterval(interval);
  }, [hostMessage]);

  return (
    <div className={`h-full w-full p-12 flex flex-col items-center justify-center relative transition-all duration-1000 overflow-hidden ${isChaos ? 'bg-[#020617]' : 'bg-[#050b1a]'}`}>
      
      {/* Background Lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 blur-[150px] transition-all duration-[3000ms]" 
             style={{ background: `radial-gradient(circle at ${spotlightPos.x}% ${spotlightPos.y}%, ${isChaos ? '#d946ef' : '#10b981'}, transparent)` }}></div>
      </div>

      {/* Top Header */}
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-[50]">
         <div className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="w-8 h-8 bg-red-600 rounded-full animate-pulse flex items-center justify-center text-[8px] font-black">REC</div>
            <h1 className="text-3xl font-black italic tracking-tighter leading-none">MIND <span className={accentColor}>MASH</span></h1>
         </div>
         <div className="bg-black/40 px-6 py-2 rounded-full border border-white/10">
            <p className="text-[8px] font-black opacity-30 uppercase tracking-widest">Channel 01: AJ Show</p>
         </div>
      </div>

      {state.stage === GameStage.LOBBY && (
        <div className="z-10 w-full max-w-7xl grid grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-xl font-black uppercase tracking-[0.4em] text-fuchsia-500 italic">Waiting Room</p>
              <h1 className="text-[10rem] font-black leading-none tracking-tighter text-white drop-shadow-2xl">
                {state.roomCode || '....'}
              </h1>
            </div>
            <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 backdrop-blur-3xl flex items-center gap-8 shadow-3xl">
              <img src={qrUrl} alt="QR" className="w-40 h-40 bg-white p-3 rounded-2xl shadow-xl" />
              <div className="space-y-2">
                <p className="text-4xl font-black uppercase italic leading-none">SCAN TO JOIN</p>
                <p className="text-sm font-bold opacity-30 uppercase leading-tight">Join fast or get roasted.</p>
              </div>
            </div>
          </div>

          <div className="bg-black/60 border-4 border-white/5 rounded-[4rem] p-12 h-[550px] flex flex-col shadow-2xl backdrop-blur-md relative overflow-hidden">
            <h2 className="text-3xl font-black uppercase italic mb-8 border-b border-white/10 pb-4 flex justify-between items-center">
              VICTIMS <span className="bg-fuchsia-600 px-4 py-1 rounded-xl text-lg font-black">{state.players.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-4 overflow-y-auto scrollbar-hide">
              {state.players.map((p) => (
                <div key={p.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-fuchsia-600 rounded-xl flex items-center justify-center font-black">{p.name[0]}</div>
                    <span className="text-2xl font-black uppercase">{p.name}</span>
                  </div>
                  <span className="text-[8px] font-black opacity-30 tracking-widest uppercase">READY</span>
                </div>
              ))}
              {state.players.length === 0 && (
                 <div className="flex-1 flex flex-col items-center justify-center opacity-10 space-y-4">
                    <div className="w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xl font-black uppercase tracking-widest">Empty brains...</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AJ'S BUBBLE - Positioned Bottom Right, non-obstructive */}
      <div className="fixed bottom-32 right-12 z-[200] w-full max-w-lg">
         <div className="bg-indigo-700 p-8 rounded-[3rem] shadow-3xl text-white relative border-4 border-white/20 animate-in slide-in-from-right-20">
            <div className="absolute -top-6 left-12 flex items-end gap-1 h-12">
               {waveform.map((h, i) => (
                 <div key={i} className="w-1 bg-white rounded-t-full transition-all duration-150" style={{ height: `${h}%` }}></div>
               ))}
            </div>
            <div className="absolute -top-6 -left-4 bg-white text-indigo-700 px-4 py-1 rounded-lg text-xs font-black uppercase italic shadow-lg">AJ ON AIR</div>
            <p className="text-2xl font-black italic leading-tight uppercase text-left">
              {hostMessage}
            </p>
         </div>
      </div>

      {/* Ticker at the absolute bottom */}
      <div className="fixed bottom-0 left-0 w-full bg-indigo-900 h-12 flex items-center overflow-hidden border-t-2 border-white/20 z-[300]">
         <div className="bg-black text-white px-6 h-full flex items-center font-black italic text-xl uppercase tracking-tighter">LIVE</div>
         <div className="flex-1 overflow-hidden relative">
            <div className="whitespace-nowrap animate-[ticker_20s_linear_infinite] inline-block text-lg font-black uppercase tracking-[0.2em]">
               &nbsp;&nbsp;&nbsp;&nbsp; ⚡ Welcome to Mind Mash ⚡ Room: {state.roomCode} ⚡ Next round starting soon ⚡ Keep your phones ready ⚡ No logic allowed here ⚡ &nbsp;&nbsp;&nbsp;&nbsp;
            </div>
         </div>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      {/* Mid Game View */}
      <div className="mt-[-40px] w-full flex flex-col items-center">
        {state.stage === GameStage.WARMUP && (
          <div className="text-center space-y-8 animate-in zoom-in-50">
             <h2 className="text-3xl font-black uppercase tracking-[1em] opacity-20">Pulse Check</h2>
             <h1 className="text-[7rem] font-black leading-none max-w-6xl uppercase tracking-tighter">
                "{state.warmupQuestion}"
             </h1>
          </div>
        )}

        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="w-full max-w-7xl space-y-12 animate-in fade-in">
            <div className="text-center space-y-4">
              <div className="inline-block px-10 py-3 rounded-full text-xl font-black uppercase tracking-widest bg-fuchsia-600 border-2 border-white/20">
                {state.topic}
              </div>
              <h1 className="text-[6rem] font-black leading-none tracking-tighter uppercase">
                {state.currentQuestion.textEn}
              </h1>
              <h2 className="text-3xl font-bold italic opacity-40">
                "{state.currentQuestion.textTa}"
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto">
              {state.currentQuestion.options.map((opt, i) => (
                <div key={i} className="bg-white/5 border-2 border-white/10 p-10 rounded-[2.5rem] flex flex-col items-center justify-center relative shadow-xl backdrop-blur-xl">
                  <span className="absolute -top-6 -left-6 w-14 h-14 bg-white text-black flex items-center justify-center rounded-2xl text-3xl font-black border-4 border-black">{i + 1}</span>
                  <p className="text-3xl font-black uppercase text-center leading-tight">{opt.en}</p>
                  <p className="text-lg opacity-30 font-bold italic">{opt.ta}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.stage === GameStage.LOADING && (
          <div className="flex flex-col items-center gap-8">
             <div className="w-32 h-32 border-[16px] border-t-white border-white/5 rounded-full animate-spin"></div>
             <p className="text-3xl font-black uppercase tracking-[0.5em] opacity-10 italic">AJ is Cooking...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TVView;
