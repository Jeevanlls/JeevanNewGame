
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
  const isChaos = state.mode === GameMode.CONFIDENTLY_WRONG;
  const accentColor = isChaos ? "text-fuchsia-500" : "text-emerald-400";

  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaveform(Array.from({ length: 15 }, () => Math.random() * 100));
    }, 120);
    return () => clearInterval(interval);
  }, [hostMessage]);

  return (
    <div className={`h-full w-full p-12 flex flex-col items-center justify-center relative transition-all duration-1000 overflow-hidden ${isChaos ? 'bg-[#020617]' : 'bg-[#050b1a]'}`}>
      
      {/* HUD: Status Indicators */}
      <div className="absolute top-10 left-10 flex flex-col gap-4 z-[50]">
         <div className="bg-black/60 p-4 rounded-3xl border border-white/10 backdrop-blur-xl flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600 rounded-full animate-pulse flex items-center justify-center text-[10px] font-black border-2 border-white/20">REC</div>
            <h1 className="text-4xl font-black italic tracking-tighter leading-none select-none">MIND <span className={accentColor}>MASH</span></h1>
         </div>
         <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">LIVE BROADCAST</p>
         </div>
      </div>

      {/* AJ'S BUBBLE (TOP RIGHT) - Clear of QR and Room Code */}
      <div className="absolute top-10 right-10 z-[200] w-full max-w-lg">
         <div className="bg-indigo-700/90 p-8 rounded-[3rem] shadow-3xl text-white relative border-4 border-white/20 backdrop-blur-2xl animate-in slide-in-from-right-10">
            <div className="absolute -top-4 right-12 flex items-end gap-1.5 h-12">
               {waveform.map((h, i) => (
                 <div key={i} className="w-2 bg-white/90 rounded-t-full transition-all duration-150" style={{ height: `${h}%` }}></div>
               ))}
            </div>
            <div className="absolute -top-4 -left-4 bg-fuchsia-600 text-white px-4 py-1 rounded-lg text-xs font-black uppercase italic shadow-lg">AJ ON AIR</div>
            <p className="text-3xl font-black italic leading-tight uppercase text-left tracking-tight">
              {hostMessage}
            </p>
         </div>
      </div>

      {/* VOICE CONTROL PANEL (BOTTOM LEFT) */}
      <div className="absolute bottom-20 left-10 z-[300]">
        <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 space-y-3">
          <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Voice Controls</p>
          <div className="flex gap-2">
            <button 
              onClick={() => gemini.speakText("Testing mic! AJ is back!")} 
              className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg active:scale-95"
            >
              RE-TEST VOICE
            </button>
          </div>
        </div>
      </div>

      {state.stage === GameStage.LOBBY && (
        <div className="z-10 w-full max-w-7xl grid grid-cols-2 gap-24 items-center">
          {/* LOBBY LEFT: QR & ROOM CODE */}
          <div className="space-y-12">
            <div className="space-y-4">
              <p className="text-3xl font-black uppercase tracking-[0.4em] text-fuchsia-500 italic opacity-50">Room Secret</p>
              <h1 className="text-[14rem] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_80px_rgba(255,255,255,0.1)]">
                {state.roomCode || '....'}
              </h1>
            </div>
            <div className="bg-white/5 p-12 rounded-[5rem] border border-white/10 backdrop-blur-3xl flex items-center gap-12 shadow-3xl">
              <div className="p-4 bg-white rounded-3xl shadow-inner">
                <img src={qrUrl} alt="QR" className="w-56 h-56" />
              </div>
              <div className="space-y-4">
                <p className="text-6xl font-black uppercase italic leading-none">JOIN NOW</p>
                <p className="text-xl font-bold opacity-30 uppercase leading-tight">Grab your phones. <br/> Don't make AJ yell.</p>
              </div>
            </div>
          </div>

          {/* LOBBY RIGHT: PLAYER LIST */}
          <div className="bg-black/60 border-4 border-white/5 rounded-[6rem] p-16 h-[650px] flex flex-col shadow-2xl backdrop-blur-md relative overflow-hidden mt-20">
            <h2 className="text-4xl font-black uppercase italic mb-10 border-b border-white/10 pb-6 flex justify-between items-center">
              VICTIMS <span className="text-fuchsia-500 text-6xl">[{state.players.length}]</span>
            </h2>
            <div className="grid grid-cols-1 gap-6 overflow-y-auto scrollbar-hide pr-4">
              {state.players.map((p) => (
                <div key={p.id} className="bg-white/5 p-8 rounded-[3rem] border-2 border-white/5 flex items-center justify-between animate-in slide-in-from-right-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-3xl flex items-center justify-center font-black text-2xl shadow-xl">{p.name[0]}</div>
                    <div className="text-left">
                       <span className="text-4xl font-black uppercase block leading-none">{p.name}</span>
                       <span className="text-[12px] font-bold opacity-30 uppercase tracking-[0.3em] mt-1 block">READY TO MASH</span>
                    </div>
                  </div>
                  <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_#10b981]"></div>
                </div>
              ))}
              {state.players.length === 0 && (
                 <div className="flex-1 flex flex-col items-center justify-center opacity-10 space-y-8 py-20">
                    <div className="w-24 h-24 border-8 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-3xl font-black uppercase tracking-[0.5em]">Lobby is empty...</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER TICKER */}
      <div className="fixed bottom-0 left-0 w-full bg-indigo-950 h-16 flex items-center overflow-hidden border-t-4 border-white/10 z-[400] backdrop-blur-xl">
         <div className="bg-black text-white px-10 h-full flex items-center font-black italic text-2xl uppercase tracking-tighter border-r-2 border-white/10">TV-01</div>
         <div className="flex-1 overflow-hidden relative">
            <div className="whitespace-nowrap animate-[ticker_30s_linear_infinite] inline-block text-2xl font-black uppercase tracking-[0.3em] py-2">
               &nbsp;&nbsp;&nbsp;&nbsp; ⚡ BREAKING: {state.players.length > 0 ? `${state.players[0].name} joined the riot` : 'Waiting for victims...'} ⚡ NEXT ROUND STARTING SOON ⚡ ROOM: {state.roomCode} ⚡ NO LOGIC ALLOWED ⚡ &nbsp;&nbsp;&nbsp;&nbsp;
            </div>
         </div>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      {/* GAMEPLAY AREA */}
      <div className="mt-[-80px] w-full flex flex-col items-center z-10">
        {state.stage === GameStage.WARMUP && (
          <div className="text-center space-y-12 animate-in zoom-in-50 duration-700">
             <h2 className="text-5xl font-black uppercase tracking-[1em] opacity-20 italic">The Pulse</h2>
             <h1 className="text-[10rem] font-black leading-none max-w-7xl uppercase tracking-tighter drop-shadow-3xl">
                "{state.warmupQuestion}"
             </h1>
          </div>
        )}

        {state.stage === GameStage.QUESTION && state.currentQuestion && (
          <div className="w-full max-w-7xl space-y-16 animate-in fade-in duration-1000">
            <div className="text-center space-y-6">
              <div className="inline-block px-14 py-4 rounded-full text-3xl font-black uppercase tracking-widest bg-fuchsia-600 border-4 border-white/20 shadow-2xl">
                {state.topic}
              </div>
              <h1 className="text-[8rem] font-black leading-[0.85] tracking-tighter uppercase drop-shadow-2xl">
                {state.currentQuestion.textEn}
              </h1>
              <h2 className="text-5xl font-bold italic opacity-40">
                "{state.currentQuestion.textTa}"
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-10 max-w-6xl mx-auto">
              {state.currentQuestion.options.map((opt, i) => (
                <div key={i} className="bg-white/5 border-4 border-white/10 p-14 rounded-[4rem] flex flex-col items-center justify-center relative shadow-3xl backdrop-blur-xl group hover:border-white/40 transition-all">
                  <span className="absolute -top-8 -left-8 w-20 h-20 bg-white text-black flex items-center justify-center rounded-3xl text-5xl font-black border-4 border-black group-hover:scale-110 transition-transform">{i + 1}</span>
                  <p className="text-5xl font-black uppercase text-center leading-tight mb-2">{opt.en}</p>
                  <p className="text-2xl opacity-30 font-bold italic">{opt.ta}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.stage === GameStage.LOADING && (
          <div className="flex flex-col items-center gap-16 animate-pulse">
             <div className="relative">
                <div className="w-56 h-56 border-[24px] border-t-white border-white/5 rounded-full animate-spin text-fuchsia-500"></div>
                <div className="absolute inset-0 flex items-center justify-center text-7xl">⚡</div>
             </div>
             <p className="text-6xl font-black uppercase tracking-[0.5em] opacity-20 italic">AJ IS JUDGING...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TVView;
