
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
      <div className="h-screen bg-[#020617] text-white flex flex-col p-8 justify-center gap-6 overflow-y-auto">
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-black tracking-tighter italic uppercase">MIND <span className="text-fuchsia-500">MASH</span></h1>
        </div>
        <div className="space-y-4 bg-white/5 p-6 rounded-[2rem] border-2 border-white/10 backdrop-blur-xl">
          {isJoining ? (
            <div className="py-20 text-center space-y-4">
               <div className="w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
               <p className="font-black uppercase tracking-widest text-fuchsia-500">Connecting...</p>
            </div>
          ) : (
            <>
              <input className="w-full bg-black/40 border-4 border-white/10 p-5 rounded-2xl text-xl font-black text-center uppercase outline-none" placeholder="NAME" value={name} onChange={e => setName(e.target.value.toUpperCase().slice(0, 10))} />
              <button disabled={!name.trim()} onClick={() => { setIsJoining(true); props.onJoin(name, age, lang); }} className="w-full bg-fuchsia-600 p-6 rounded-2xl font-black text-xl shadow-2xl uppercase">Join Show</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col p-6 overflow-hidden">
      <header className="flex justify-between items-center bg-white/5 p-4 rounded-[2rem] mb-6 border border-white/5">
         <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${isChaos ? 'bg-fuchsia-600' : 'bg-emerald-600'} rounded-lg flex items-center justify-center font-black text-lg`}>{player?.name[0]}</div>
            <p className="font-black text-sm uppercase leading-none">{player?.name}</p>
         </div>
         <p className="text-3xl font-black text-amber-500">{player?.score}</p>
      </header>

      <div className="flex-1 flex flex-col gap-6">
        {/* CHAOS PAD */}
        <div className="bg-white/5 p-4 rounded-[2rem] border border-white/5">
           <p className="text-[10px] font-black opacity-30 uppercase tracking-widest text-center mb-4">Chaos Control</p>
           <div className="flex gap-2 justify-center mb-4">
              {['🔥', '😂', '🤡', '🧠', '💩'].map(e => (
                <button key={e} onClick={() => props.onReaction(e)} className="w-12 h-12 bg-white/5 rounded-xl text-2xl active:scale-90 transition-transform">{e}</button>
              ))}
           </div>
           <button onClick={props.onRoast} className="w-full bg-red-600/20 border-2 border-red-500/50 p-4 rounded-2xl font-black uppercase text-red-500 active:bg-red-500 active:text-white transition-all">Savage Roast 🎙️</button>
        </div>

        <div className="flex-1">
          {props.state.stage === GameStage.LOBBY && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-4 border-dashed border-white/5 rounded-[3rem]">
              <p className="text-2xl font-black uppercase italic opacity-20">Waiting for start...</p>
            </div>
          )}
          
          {props.state.stage === GameStage.TOPIC_SELECTION && isMaster && (
            <div className="space-y-3">
              <p className="text-center font-black text-fuchsia-500 uppercase italic">Picker Mode</p>
              {props.state.topicOptions.map((t, i) => (
                <button key={i} onClick={() => props.onSelectTopic(t)} className="w-full bg-white/5 border-2 border-white/5 p-6 rounded-2xl font-black text-lg uppercase active:bg-white active:text-black transition-all">{t}</button>
              ))}
            </div>
          )}

          {props.state.stage === GameStage.QUESTION && (
            <div className="flex flex-col gap-4 h-full">
              <div className="grid grid-cols-2 gap-3 flex-1">
                {[1,2,3,4].map(n => (
                  <button key={n} onClick={() => props.onSubmitAnswer(n.toString())} className={`border-4 rounded-[2rem] font-black text-5xl active:scale-95 transition-all ${player?.lastAnswer === n.toString() ? 'bg-indigo-600 border-white' : 'bg-white/5 border-white/10'}`}>{n}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <button onClick={props.onReset} className="mt-4 text-[10px] font-black opacity-10 uppercase self-center tracking-widest">Restart Session</button>
    </div>
  );
};

export default PhoneView;
