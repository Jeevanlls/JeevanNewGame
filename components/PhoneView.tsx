
import React, { useState, useEffect } from 'react';
import { GameState, GameStage, Language, GameMode } from '../types';

interface PhoneViewProps {
  state: GameState;
  onJoin: (name: string, age: number, lang: Language) => void;
  onSubmitAnswer: (answer: string) => void;
  onSelectTopic: (topic: string) => void;
  onClaimChallenge: () => void;
  onSendRebuttal: () => void;
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

  useEffect(() => {
    if (player) setIsJoining(false);
  }, [player]);

  if (!props.playerId) {
    return (
      <div className="h-screen bg-[#020617] text-white flex flex-col p-8 justify-center gap-6 overflow-y-auto">
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-6xl font-black tracking-tighter italic">MIND <span className="text-fuchsia-500">MASH</span></h1>
          <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.5em]">ROOM: {props.state.roomCode || '...'}</p>
        </div>

        <div className="space-y-4 bg-white/5 p-6 rounded-[2rem] border-2 border-white/10 backdrop-blur-xl">
          {isJoining ? (
            <div className="py-20 text-center space-y-4">
               <div className="w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
               <p className="font-black uppercase tracking-widest text-fuchsia-500">Syncing with TV...</p>
               <button onClick={props.onReset} className="text-[10px] uppercase opacity-40 underline pt-10">Stuck? Reset Session</button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-black opacity-30 ml-4 uppercase">Nickname</p>
                <input className="w-full bg-black/40 border-4 border-white/10 p-5 rounded-2xl text-xl font-black text-center uppercase focus:border-fuchsia-500 transition-all outline-none" placeholder="NAME" value={name} onChange={e => setName(e.target.value.toUpperCase().slice(0, 10))} />
              </div>
              <div className="flex gap-4">
                 <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                    <p className="text-[10px] font-black opacity-30 mb-1 uppercase">Age</p>
                    <input type="number" className="w-full bg-transparent text-center text-xl font-black outline-none" value={age} onChange={e => setAge(parseInt(e.target.value) || 0)} />
                 </div>
                 <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                    <p className="text-[10px] font-black opacity-30 mb-1 uppercase">Lingo</p>
                    <button onClick={() => setLang(l => l === Language.ENGLISH ? Language.TAMIL : Language.ENGLISH)} className="text-sm font-black uppercase text-fuchsia-400">{lang}</button>
                 </div>
              </div>
              <button disabled={!name.trim() || !props.state.roomCode} onClick={() => { setIsJoining(true); props.onJoin(name, age, lang); }} className="w-full bg-fuchsia-600 disabled:opacity-50 p-6 rounded-2xl font-black text-xl shadow-2xl uppercase mt-4">Join Show</button>
            </>
          )}
        </div>
        <p className="text-[10px] text-center opacity-20 px-10 leading-relaxed uppercase font-bold">AJ is watching. Please behave. Just kidding, do whatever.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col p-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-white/5 p-4 rounded-[2rem] mb-6 border border-white/5">
         <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${isChaos ? 'bg-fuchsia-600' : 'bg-emerald-600'} rounded-lg flex items-center justify-center font-black text-lg`}>{player?.name[0]}</div>
            <div>
              <p className="font-black text-sm uppercase leading-none">{player?.name}</p>
              <button onClick={props.onReset} className="text-[8px] font-black opacity-30 uppercase tracking-widest mt-1 hover:opacity-100">Reset Session</button>
            </div>
         </div>
         <p className="text-3xl font-black text-amber-500">{player?.score}</p>
      </header>

      <div className="flex-1 flex flex-col">
        {props.state.stage === GameStage.LOBBY && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center animate-pulse mb-6 text-4xl">🕹️</div>
            <p className="text-2xl font-black uppercase italic leading-tight mb-2">You are IN!</p>
            <p className="opacity-40 font-bold uppercase text-[10px] tracking-[0.2em]">Wait for the Host to start the Warmup.</p>
          </div>
        )}
        
        {props.state.stage === GameStage.TOPIC_SELECTION && (
          <div className="space-y-3">
            {isMaster ? (
              <>
                <div className="text-center mb-4">
                  <h2 className="font-black uppercase text-fuchsia-500 text-xl tracking-tighter italic">Topic Master</h2>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Choose wisely</p>
                </div>
                {props.state.topicOptions.map((t, i) => (
                  <button key={i} onClick={() => props.onSelectTopic(t)} className="w-full bg-white/5 border-2 border-white/5 p-6 rounded-2xl font-black text-left text-lg uppercase active:bg-white active:text-black transition-all shadow-xl">{t}</button>
                ))}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center opacity-20">
                <p className="italic font-black text-3xl uppercase leading-none">Choosing Category...</p>
              </div>
            )}
          </div>
        )}

        {props.state.stage === GameStage.QUESTION && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="text-center">
              <p className={`text-sm font-black uppercase ${isChaos ? 'text-fuchsia-500' : 'text-emerald-500'}`}>Select your choice:</p>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1">
              {[1,2,3,4].map(n => (
                <button key={n} onClick={() => props.onSubmitAnswer(n.toString())} className={`border-4 rounded-[2rem] font-black text-5xl active:scale-95 transition-all shadow-2xl flex items-center justify-center ${player?.lastAnswer === n.toString() ? 'bg-indigo-600 border-white text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>{n}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <footer className="pt-4 text-center opacity-20 font-black uppercase tracking-[0.5em] text-[8px]">ROOM: {props.state.roomCode}</footer>
    </div>
  );
};

export default PhoneView;
