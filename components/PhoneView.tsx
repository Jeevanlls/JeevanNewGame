
import React, { useState } from 'react';
import { GameState, GameStage, Language, GameMode } from '../types';

interface PhoneViewProps {
  state: GameState;
  onJoin: (name: string, age: number, lang: Language) => void;
  onSubmitAnswer: (answer: string) => void;
  onSelectTopic: (topic: string) => void;
  onClaimChallenge: () => void;
  onSendRebuttal: (text: string) => void;
  playerId?: string;
}

const PhoneView: React.FC<PhoneViewProps> = (props) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [lang, setLang] = useState(Language.MIXED);
  const [customTopic, setCustomTopic] = useState('');
  const [isTypingCustom, setIsTypingCustom] = useState(false);

  const player = props.state.players.find(p => p.id === props.playerId);
  const isGenius = props.state.mode === GameMode.GENIUS;
  const buttonClass = isGenius ? "bg-emerald-600" : "bg-indigo-600";
  const accentText = isGenius ? "text-amber-400" : "text-indigo-400";

  if (!props.playerId) {
    return (
      <div className={`min-h-screen ${isGenius ? 'bg-emerald-950' : 'bg-slate-950'} text-white p-6 flex flex-col justify-center gap-8 transition-colors duration-1000`}>
        <div className="text-center space-y-2">
           <h1 className={`text-6xl font-black tracking-tighter ${isGenius ? 'text-amber-500' : 'text-indigo-500'}`}>AJ PARTY</h1>
           <p className="text-slate-400 text-sm font-bold uppercase tracking-[0.3em]">Join the Room</p>
        </div>
        
        <div className="space-y-6 bg-black/20 p-8 rounded-[3rem] border border-white/5 shadow-2xl">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase opacity-40 ml-4">Screen Name</label>
            <input className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-[1.5rem] text-2xl font-black outline-none focus:border-indigo-500 transition-all" placeholder="Enter Name..." value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase opacity-40 ml-4">Age</label>
              <input type="number" className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-[1.5rem] font-black text-xl" value={age} onChange={e => setAge(parseInt(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase opacity-40 ml-4">Language</label>
              <select className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-[1.5rem] font-black text-sm" value={lang} onChange={e => setLang(e.target.value as Language)}>
                 {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <button 
            disabled={!name.trim()}
            onClick={() => props.onJoin(name, age, lang)} 
            className={`w-full ${buttonClass} p-8 rounded-[2rem] font-black text-2xl shadow-xl active:scale-95 transition-all disabled:opacity-20`}
          >
            JOIN GAME
          </button>
        </div>
        <p className="text-center text-xs opacity-20 font-bold uppercase tracking-widest">v2.0 AI HOSTED</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isGenius ? 'bg-emerald-950' : 'bg-slate-950'} text-white p-6 flex flex-col transition-colors duration-1000 font-game`}>
      <header className="flex justify-between items-center bg-black/40 p-6 rounded-[2rem] border border-white/10 mb-8 shadow-xl">
         <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${buttonClass} rounded-[1rem] flex items-center justify-center font-black text-2xl`}>{player?.name[0]}</div>
            <div>
               <p className="font-black text-xl leading-none">{player?.name}</p>
               <p className={`text-[10px] ${accentText} font-black uppercase tracking-wider mt-1`}>{isGenius ? 'Scholar' : 'Victim'}</p>
            </div>
         </div>
         <div className="text-right">
            <p className={`text-3xl font-black ${isGenius ? 'text-amber-400' : 'text-orange-500'}`}>{player?.score}</p>
         </div>
      </header>

      <div className="flex-1 flex flex-col justify-center">
        {props.state.stage === GameStage.LOBBY && (
           <div className="text-center space-y-8 animate-pulse">
              <div className="text-8xl">🛋️</div>
              <h2 className="text-3xl font-black uppercase">Waiting in Lobby</h2>
              <p className="text-slate-400">AJ is sizing up the competition...</p>
           </div>
        )}

        {props.state.stage === GameStage.TOPIC_SELECTION && (
          <div className="space-y-6">
            <h2 className={`text-2xl font-black text-center ${accentText} uppercase tracking-widest mb-4`}>
              PICK THE TOPIC
            </h2>
            {isTypingCustom ? (
               <div className="space-y-4 animate-in zoom-in duration-300">
                  <input className="w-full bg-black/40 p-8 rounded-[2rem] border-4 border-indigo-500 text-2xl font-black text-center outline-none" placeholder="Any Weird Topic..." value={customTopic} onChange={e => setCustomTopic(e.target.value)} autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => props.onSelectTopic(customTopic)} className="flex-1 bg-emerald-600 p-6 rounded-[1.5rem] font-black text-xl">GO!</button>
                    <button onClick={() => setIsTypingCustom(false)} className="bg-slate-800 p-6 rounded-[1.5rem] font-black text-xl">CANCEL</button>
                  </div>
               </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                 {props.state.topicOptions.map((topic, i) => (
                   <button key={i} onClick={() => props.onSelectTopic(topic)} className={`${buttonClass} p-6 rounded-[1.5rem] font-black text-xl shadow-lg active:scale-95 transition-all text-left flex items-center gap-4`}>
                     <span className="opacity-30">#0{i+1}</span> {topic}
                   </button>
                 ))}
                 <button onClick={() => setIsTypingCustom(true)} className="bg-white/5 border-2 border-dashed border-white/20 p-6 rounded-[1.5rem] font-black text-lg opacity-40 hover:opacity-100 transition-all">
                   ✍️ Write Custom Topic
                 </button>
              </div>
            )}
          </div>
        )}

        {props.state.stage === GameStage.QUESTION && (
          <div className="space-y-8">
            {player?.lastAnswer ? (
              <div className="text-center py-16 space-y-6 bg-black/20 rounded-[3rem] border border-white/5 animate-in zoom-in">
                 <div className="text-8xl">{isGenius ? '📜' : '🔒'}</div>
                 <p className="text-3xl font-black uppercase tracking-widest">Answer Locked</p>
                 <p className="text-slate-500">Wait for the reveal on TV...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                 {[1,2,3,4,5,6,7,8,9,10].map(n => (
                   <button key={n} onClick={() => props.onSubmitAnswer(n.toString())} className="bg-white/5 border-2 border-white/10 h-24 rounded-[1.5rem] font-black text-4xl active:bg-indigo-600 active:border-white active:scale-90 transition-all">
                     {n}
                   </button>
                 ))}
              </div>
            )}
          </div>
        )}

        {props.state.stage === GameStage.LOADING && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 border-4 border-t-indigo-500 border-white/10 rounded-full animate-spin mx-auto"></div>
            <p className="text-xl font-black uppercase tracking-widest opacity-50">AJ is Thinking...</p>
          </div>
        )}
      </div>

      <footer className="mt-8 text-center py-4 border-t border-white/5">
        <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.5em]">Session ID: {props.state.roomCode}</p>
      </footer>
    </div>
  );
};

export default PhoneView;
