
import React, { useState, useEffect } from 'react';
import { GameState, GameStage, Language, GameMode } from '../types';

interface PhoneViewProps {
  state: GameState;
  onJoin: (name: string, age: number, lang: Language) => void;
  onSubmitAnswer: (answer: string) => void;
  onSelectTopic: (topic: string) => void;
  onRoast: () => void;
  onReaction: (emoji: string) => void;
  onReset: () => void;
  playerId?: string;
}

const PhoneView: React.FC<PhoneViewProps> = (props) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [lang, setLang] = useState(Language.MIXED);
  const [isJoining, setIsJoining] = useState(false);

  const player = props.state.players.find(p => p.id === props.playerId);
  const isMaster = props.playerId === props.state.topicPickerId;
  const isChaos = props.state.mode === GameMode.CONFIDENTLY_WRONG;

  if (!props.playerId) {
    return (
      <div className="h-screen bg-[#020617] text-white flex flex-col p-8 justify-center gap-8 overflow-y-auto">
        <div className="text-center space-y-2">
          <p className="text-fuchsia-500 font-black uppercase tracking-[0.4em] text-xs">AJ & VJ PRESENTS</p>
          <h1 className="text-7xl font-black tracking-tighter italic uppercase">MIND <span className="text-fuchsia-500">MASH</span></h1>
        </div>
        <div className="space-y-4 bg-white/5 p-8 rounded-[3rem] border-2 border-white/10 backdrop-blur-3xl shadow-2xl">
          {isJoining ? (
            <div className="py-24 text-center space-y-6">
               <div className="w-20 h-20 border-8 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
               <p className="font-black uppercase tracking-widest text-fuchsia-500">Joining Radio...</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black opacity-30 uppercase ml-2">VICTIM NAME</label>
                <input className="w-full bg-black/40 border-4 border-white/10 p-6 rounded-3xl text-2xl font-black text-center uppercase outline-none focus:border-fuchsia-500 transition-all" placeholder="YOUR NAME" value={name} onChange={e => setName(e.target.value.toUpperCase().slice(0, 10))} />
              </div>
              <button disabled={!name.trim()} onClick={() => { setIsJoining(true); props.onJoin(name, age, lang); }} className="w-full bg-fuchsia-600 p-8 rounded-3xl font-black text-2xl shadow-3xl uppercase active:scale-95 transition-all">START DA! 🚀</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (props.state.isPaused) {
    return (
      <div className="h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-12 text-center animate-pulse">
         <div className="text-8xl mb-8">⏸️</div>
         <h1 className="text-5xl font-black uppercase italic">PAUSED DA!</h1>
         <p className="text-xl font-black opacity-40 uppercase tracking-widest mt-4">AJ is roasting the producers. Wait for resume.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col p-6 overflow-hidden">
      <header className="flex justify-between items-center bg-white/5 p-5 rounded-[2.5rem] mb-6 border border-white/10">
         <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${isChaos ? 'bg-fuchsia-600' : 'bg-emerald-600'} rounded-2xl flex items-center justify-center font-black text-xl shadow-lg`}>{player?.name[0]}</div>
            <div className="flex flex-col">
              <p className="font-black text-sm uppercase leading-none">{player?.name}</p>
              <p className="text-[8px] font-black opacity-20 uppercase tracking-widest">Victim #{props.playerId?.slice(-3)}</p>
            </div>
         </div>
         <div className="bg-black/40 px-6 py-2 rounded-2xl border border-white/10">
           <p className="text-3xl font-black text-amber-500">{player?.score}</p>
         </div>
      </header>

      <div className="flex-1 flex flex-col gap-6">
        {/* CHAOS PAD */}
        <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 shadow-xl">
           <p className="text-[10px] font-black opacity-30 uppercase tracking-widest text-center mb-4 italic">Reaction Control</p>
           <div className="flex gap-2 justify-center mb-5">
              {['🔥', '😂', '🤡', '🧠', '💩', '💀'].map(e => (
                <button key={e} onClick={() => props.onReaction(e)} className="w-14 h-14 bg-white/5 rounded-2xl text-3xl active:scale-90 transition-transform shadow-inner">{e}</button>
              ))}
           </div>
           <button onClick={props.onRoast} className="w-full bg-red-600/10 border-4 border-red-500/50 p-5 rounded-3xl font-black uppercase text-red-500 active:bg-red-500 active:text-white transition-all text-lg shadow-lg">ROAST AJ 🎙️</button>
        </div>

        <div className="flex-1">
          {props.state.stage === GameStage.LOBBY && (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 border-4 border-dashed border-white/5 rounded-[4rem]">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center animate-pulse mb-6">
                <span className="text-4xl text-white/20">📡</span>
              </div>
              <p className="text-2xl font-black uppercase italic opacity-20 leading-tight">Connected! Waiting for AJ to Go Live...</p>
            </div>
          )}
          
          {props.state.stage === GameStage.TOPIC_SELECTION && isMaster && (
            <div className="space-y-4 animate-in slide-in-from-bottom-10">
              <p className="text-center font-black text-fuchsia-500 uppercase italic tracking-widest">YOU ARE PICKING!</p>
              {props.state.topicOptions.map((t, i) => (
                <button key={i} onClick={() => props.onSelectTopic(t)} className="w-full bg-white/5 border-4 border-white/10 p-7 rounded-[2.5rem] font-black text-xl uppercase active:bg-fuchsia-600 active:text-white active:border-white transition-all shadow-xl">{t}</button>
              ))}
            </div>
          )}

          {props.state.stage === GameStage.TOPIC_SELECTION && !isMaster && (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
               <p className="text-xl font-black opacity-30 uppercase">Someone is picking a topic da...</p>
            </div>
          )}

          {props.state.stage === GameStage.QUESTION && (
            <div className="flex flex-col gap-4 h-full animate-in zoom-in-95">
              <p className="text-center text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">SELECT ANSWER DA!</p>
              <div className="grid grid-cols-2 gap-4 flex-1">
                {[1,2,3,4].map(n => (
                  <button key={n} onClick={() => props.onSubmitAnswer(n.toString())} className={`border-8 rounded-[3rem] font-black text-6xl active:scale-90 transition-all shadow-2xl ${player?.lastAnswer === n.toString() ? 'bg-fuchsia-600 border-white rotate-2 scale-105' : 'bg-white/5 border-white/10 opacity-60'}`}>{n}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <button onClick={props.onReset} className="mt-6 text-[10px] font-black opacity-10 uppercase self-center tracking-[0.5em] hover:opacity-100 transition-opacity">Reset Session</button>
    </div>
  );
};

export default PhoneView;
