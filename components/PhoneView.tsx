
import React, { useState } from 'react';
import { GameState, GameStage, Language, GameMode } from '../types';

interface PhoneViewProps {
  state: GameState;
  onJoin: (name: string, age: number, lang: Language) => void;
  onSubmitAnswer: (answer: string) => void;
  onSelectTopic: (topic: string) => void;
  onClaimChallenge: () => void;
  onSendRebuttal: () => void;
  playerId?: string;
}

const PhoneView: React.FC<PhoneViewProps> = (props) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [lang, setLang] = useState(Language.MIXED);

  const player = props.state.players.find(p => p.id === props.playerId);
  const isMaster = props.playerId === props.state.topicPickerId;
  const isChaos = props.state.mode === GameMode.CONFIDENTLY_WRONG;

  if (!props.playerId) {
    return (
      <div className="h-screen bg-[#020617] text-white flex flex-col p-8 justify-center gap-10">
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-7xl font-black tracking-tighter italic">MIND <span className="text-fuchsia-500">MASH</span></h1>
          <p className="text-xs font-black opacity-30 uppercase tracking-[0.5em]">The AJ Show</p>
        </div>

        <div className="space-y-6 bg-white/5 p-8 rounded-[3rem] border-2 border-white/10 backdrop-blur-xl">
          <input 
            className="w-full bg-black/40 border-4 border-white/10 p-6 rounded-2xl text-2xl font-black text-center uppercase placeholder:text-white/10 outline-none focus:border-fuchsia-500 transition-all" 
            placeholder="NAME" 
            value={name} 
            onChange={e => setName(e.target.value.toUpperCase().slice(0, 10))} 
          />
          <div className="flex gap-4">
             <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] font-black opacity-30 mb-2 uppercase">Your Age</p>
                <input type="number" className="w-full bg-transparent text-center text-2xl font-black outline-none" value={age} onChange={e => setAge(parseInt(e.target.value) || 0)} />
             </div>
             <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] font-black opacity-30 mb-2 uppercase">Lingo</p>
                <button onClick={() => setLang(l => l === Language.ENGLISH ? Language.TAMIL : Language.ENGLISH)} className="text-lg font-black uppercase text-fuchsia-400">{lang}</button>
             </div>
          </div>
          <button 
            disabled={!name.trim()} 
            onClick={() => props.onJoin(name, age, lang)} 
            className="w-full bg-fuchsia-600 disabled:opacity-50 p-8 rounded-3xl font-black text-2xl active:scale-95 transition-all shadow-[0_10px_30px_-5px_rgba(192,38,211,0.5)] uppercase"
          >
            I'm Ready
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col p-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-white/5 p-5 rounded-[2.5rem] mb-6 border border-white/5">
         <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${isChaos ? 'bg-fuchsia-600' : 'bg-emerald-600'} rounded-xl flex items-center justify-center font-black text-xl shadow-lg`}>{player?.name[0]}</div>
            <div>
              <p className="font-black text-lg uppercase leading-none">{player?.name}</p>
              <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-1">
                {isChaos ? 'Chaos Mode' : 'Genius Mode'}
              </p>
            </div>
         </div>
         <p className="text-4xl font-black text-amber-500 tabular-nums">{player?.score}</p>
      </header>

      <div className="flex-1 flex flex-col">
        {props.state.stage === GameStage.LOBBY && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center animate-pulse mb-6">
              <span className="text-4xl">👽</span>
            </div>
            <p className="text-2xl font-black uppercase italic leading-tight mb-2">Connected</p>
            <p className="opacity-30 font-bold uppercase text-xs tracking-[0.2em]">AJ is judging the room vibe...</p>
          </div>
        )}
        
        {props.state.stage === GameStage.WARMUP && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-6 animate-in zoom-in duration-500">
            <p className="text-4xl font-black italic tracking-tighter text-fuchsia-500 uppercase">Listen Up</p>
            <p className="text-xl font-bold opacity-60 uppercase tracking-widest leading-relaxed">AJ is asking the group a warmup question on the TV.</p>
          </div>
        )}

        {props.state.stage === GameStage.TOPIC_SELECTION && (
          <div className="space-y-4 animate-in slide-in-from-bottom-8">
            {isMaster ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="font-black uppercase text-fuchsia-500 text-2xl tracking-tighter italic">Topic Master</h2>
                  <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Pick our destiny</p>
                </div>
                {props.state.topicOptions.map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => props.onSelectTopic(t)} 
                    className="w-full bg-white/5 border-2 border-white/5 p-8 rounded-[2rem] font-black text-left text-2xl uppercase active:bg-white active:text-black hover:border-fuchsia-500 transition-all shadow-xl"
                  >
                    {t}
                  </button>
                ))}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <p className="opacity-20 italic font-black text-4xl uppercase leading-none mb-2">Master is<br/>Choosing...</p>
                <p className="text-[10px] font-black opacity-10 uppercase tracking-[0.5em]">Be patient, mere mortal</p>
              </div>
            )}
          </div>
        )}

        {props.state.stage === GameStage.QUESTION && (
          <div className="flex-1 flex flex-col gap-6 animate-in zoom-in duration-300">
            <div className="text-center">
              <p className="text-xs font-black opacity-30 uppercase tracking-[0.5em] mb-2">Pick Choice</p>
              <p className={`text-xl font-black uppercase ${isChaos ? 'text-fuchsia-500' : 'text-emerald-500'}`}>
                {isChaos ? 'Give the FUNNIEST Answer!' : 'Give the CORRECT Answer!'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 flex-1">
              {[1,2,3,4].slice(0, props.state.currentQuestion?.options.length).map(n => (
                <button 
                  key={n} 
                  onClick={() => props.onSubmitAnswer(n.toString())} 
                  className={`border-4 rounded-[2.5rem] font-black text-7xl active:scale-95 transition-all shadow-2xl flex items-center justify-center ${
                    player?.lastAnswer === n.toString() 
                    ? 'bg-indigo-600 border-white text-white' 
                    : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {props.state.stage === GameStage.VOTING_RESULTS && (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 animate-in fade-in">
            <div className="text-[10rem] animate-bounce drop-shadow-[0_0_50px_rgba(239,68,68,0.5)]">🤬</div>
            <div className="text-center space-y-4">
              <button 
                onClick={props.onSendRebuttal} 
                className="bg-red-600 hover:bg-red-500 px-16 py-8 rounded-3xl font-black text-2xl shadow-[0_15px_40px_-10px_rgba(220,38,38,0.6)] uppercase active:scale-90 transition-all"
              >
                Argue with AJ
              </button>
              <p className="text-xs font-black opacity-40 uppercase tracking-[0.3em]">Think he's wrong? Fight back.</p>
            </div>
          </div>
        )}
        
        {(props.state.stage === GameStage.REVEAL || props.state.stage === GameStage.DASHBOARD) && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <p className="text-4xl font-black italic tracking-tighter uppercase">Look Up!</p>
            <p className="text-lg font-bold opacity-60 uppercase tracking-widest">The scores are updating on the big screen.</p>
          </div>
        )}
      </div>

      <footer className="pt-6 text-center opacity-20 font-black uppercase tracking-[0.5em] text-[10px]">ROOM: {props.state.roomCode}</footer>
    </div>
  );
};

export default PhoneView;
