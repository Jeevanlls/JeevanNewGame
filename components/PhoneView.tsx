
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
  const [rebuttal, setRebuttal] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isTypingCustom, setIsTypingCustom] = useState(false);

  const player = props.state.players.find(p => p.id === props.playerId);
  const isGenius = props.state.mode === GameMode.GENIUS;
  const accentClass = isGenius ? "border-amber-500 text-amber-500" : "border-indigo-500 text-indigo-500";
  const buttonClass = isGenius ? "bg-amber-600" : "bg-indigo-600";

  if (!props.playerId) {
    return (
      <div className={`min-h-screen ${isGenius ? 'bg-emerald-950' : 'bg-slate-950'} text-white p-8 flex flex-col justify-center gap-10 transition-colors duration-1000`}>
        <div className="text-center">
           <h1 className={`text-7xl font-black tracking-tighter ${isGenius ? 'text-amber-500' : 'text-indigo-500'}`}>JAM ON</h1>
           <p className="text-slate-500 mt-4 text-2xl font-bold uppercase tracking-widest">{isGenius ? 'Competitive Mode' : 'Roast Mode'}</p>
        </div>
        <div className="space-y-8">
          <input className="w-full bg-black/40 border-4 border-white/10 p-8 rounded-[2.5rem] text-3xl font-black" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <div className="flex gap-4">
            <input type="number" className="flex-1 bg-black/40 border-4 border-white/10 p-7 rounded-[2.5rem] font-black text-2xl" value={age} onChange={e => setAge(parseInt(e.target.value))} />
            <select className="flex-1 bg-black/40 border-4 border-white/10 p-7 rounded-[2.5rem] font-black text-xl" value={lang} onChange={e => setLang(e.target.value as Language)}>
               {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <button onClick={() => props.onJoin(name, age, lang)} className={`w-full ${buttonClass} p-10 rounded-[3rem] font-black text-4xl shadow-2xl active:scale-95 transition-all`}>ENTER LOBBY</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isGenius ? 'bg-emerald-950' : 'bg-slate-950'} text-white p-6 flex flex-col transition-colors duration-1000 font-game`}>
      <div className="flex justify-between items-center mb-10 bg-black/20 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
         <div className="flex items-center gap-5">
            <div className={`w-16 h-16 ${buttonClass} rounded-[1.2rem] flex items-center justify-center font-black text-4xl`}>{player?.name[0]}</div>
            <div>
               <p className="font-black text-3xl leading-none">{player?.name}</p>
               <p className={`text-xs ${isGenius ? 'text-amber-400' : 'text-indigo-400'} font-black uppercase tracking-widest mt-2`}>{isGenius ? 'Genius Scholar' : 'Future Victim'}</p>
            </div>
         </div>
         <div className="text-right">
            <p className={`text-5xl font-black ${isGenius ? 'text-amber-400' : 'text-orange-500'}`}>{player?.score}</p>
            <p className="text-xs font-black opacity-30 uppercase">Points</p>
         </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {props.state.stage === GameStage.TOPIC_SELECTION && (
          <div className="space-y-6">
            <h2 className={`text-4xl font-black text-center ${isGenius ? 'text-amber-400' : 'text-orange-500'} italic mb-4 uppercase`}>
              {isGenius ? 'Choose Category' : 'CHAOS RACE!'}
            </h2>
            {isTypingCustom ? (
               <div className="space-y-4">
                  <input className="w-full bg-black/40 p-8 rounded-[2rem] border-4 border-indigo-500 text-2xl font-black text-center" placeholder="Any Topic..." value={customTopic} onChange={e => setCustomTopic(e.target.value)} autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => props.onSelectTopic(customTopic)} className="flex-1 bg-emerald-600 p-6 rounded-[1.5rem] font-black text-xl">GO!</button>
                    <button onClick={() => setIsTypingCustom(false)} className="bg-slate-800 p-6 rounded-[1.5rem] font-black text-xl">X</button>
                  </div>
               </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                 {props.state.topicOptions.map((topic, i) => (
                   <button key={i} onClick={() => props.onSelectTopic(topic)} className={`${buttonClass} p-8 rounded-[2.5rem] font-black text-2xl shadow-xl active:scale-95 transition-all`}>
                     {topic}
                   </button>
                 ))}
                 <button onClick={() => setIsTypingCustom(true)} className="bg-white/5 border-2 border-dashed border-white/20 p-6 rounded-[2.5rem] font-black text-xl opacity-60">
                   ✍️ Custom Topic
                 </button>
              </div>
            )}
          </div>
        )}

        {props.state.stage === GameStage.QUESTION && (
          <div className="space-y-8">
            {player?.id === props.state.topicPickerId && (
              <div className={`${isGenius ? 'bg-amber-600' : 'bg-orange-600'} p-8 rounded-[2.5rem] text-center shadow-2xl`}>
                 <p className="text-sm font-black uppercase text-white tracking-widest">{isGenius ? '🌟 SPECIALIST ROUND 🌟' : '🔥 YOUR CHAOS 🔥'}</p>
                 <p className="text-2xl font-black mt-2">{props.state.topic}</p>
              </div>
            )}
            
            {player?.lastAnswer ? (
              <div className="text-center py-20 space-y-8 bg-black/20 rounded-[4rem] border border-white/5">
                 <div className="text-9xl animate-bounce">{isGenius ? '📖' : '🔒'}</div>
                 <p className="text-4xl font-black">LOCKED IN #{player.lastAnswer}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5 px-2">
                 {[1,2,3,4,5,6,7,8,9,10].map(n => (
                   <button key={n} onClick={() => props.onSubmitAnswer(n.toString())} className="bg-black/40 border-4 border-white/10 h-28 rounded-[2.5rem] font-black text-5xl active:scale-90 transition-all">
                     {n}
                   </button>
                 ))}
              </div>
            )}
          </div>
        )}

        {(props.state.stage === GameStage.LOBBY || props.state.stage === GameStage.EXPLANATION) && (
           <div className="text-center py-20 animate-pulse space-y-8">
              <div className={`w-48 h-48 ${buttonClass}/10 rounded-full mx-auto flex items-center justify-center text-9xl shadow-inner`}>
                {isGenius ? '💡' : '🍿'}
              </div>
              <p className="text-4xl font-black text-white uppercase">{isGenius ? 'Awaiting Lesson' : 'Prepare for Heat'}</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default PhoneView;
