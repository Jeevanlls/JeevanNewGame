
import React, { useState } from 'react';
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
  const [isJoining, setIsJoining] = useState(false);

  const player = props.state.players.find(p => p.id === props.playerId);
  const isMaster = props.playerId === props.state.topicPickerId;

  if (!props.playerId || !player) {
    return (
      <div className="h-screen bg-[#020617] text-white flex flex-col p-8 justify-center gap-10">
        <div className="text-center">
          <h1 className="text-7xl font-black italic uppercase tracking-tighter text-white">MIND <span className="text-fuchsia-500">MASH</span></h1>
          <p className="text-xs font-black opacity-30 uppercase tracking-[0.5em] mt-2">AJ & VJ ON-AIR</p>
        </div>
        <div className="space-y-6">
          <input 
            className="w-full bg-white/5 border-4 border-white/10 p-6 rounded-3xl text-2xl font-black text-center uppercase focus:border-fuchsia-500 outline-none placeholder:opacity-20" 
            placeholder="NICKNAME DA" 
            value={name} 
            onChange={e => setName(e.target.value.toUpperCase().slice(0, 10))} 
          />
          <button 
            disabled={!name.trim() || isJoining} 
            onClick={() => { setIsJoining(true); props.onJoin(name, 25, Language.MIXED); }} 
            className="w-full bg-fuchsia-600 p-8 rounded-[2rem] font-black text-3xl shadow-2xl active:scale-95 transition-all disabled:opacity-50"
          >
            JOIN NOW 🚀
          </button>
        </div>
        <p className="text-center text-xs opacity-20 font-bold uppercase tracking-widest leading-loose">
          Connect your frequency to the radio show.
        </p>
      </div>
    );
  }

  if (props.state.isPaused) {
    return (
      <div className="h-screen bg-black text-amber-500 flex flex-col items-center justify-center p-12 text-center">
        <div className="text-9xl mb-8 animate-pulse">⏸️</div>
        <h1 className="text-6xl font-black">BREAK-U!</h1>
        <p className="font-bold opacity-50 mt-4 uppercase">Host logic is being refilled. Wait da.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col p-6 overflow-hidden">
      <header className="flex justify-between items-center bg-white/5 p-4 rounded-3xl mb-6 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-fuchsia-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg">{player?.name?.[0] || '?'}</div>
          <span className="font-black text-sm uppercase tracking-tight">{player?.name}</span>
        </div>
        <div className="bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-500/30">
          <span className="text-2xl font-black text-amber-500">{player?.score}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {props.state.stage === GameStage.LOBBY && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 animate-pulse">
               <span className="text-6xl">📡</span>
            </div>
            <p className="text-2xl font-black uppercase italic text-white/40">Connected! Waiting for AJ to start...</p>
          </div>
        )}

        {props.state.stage === GameStage.TOPIC_SELECTION && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5">
            <p className="text-center font-black text-fuchsia-400 uppercase italic mb-6 text-xl">
              {isMaster ? "PICK THE BATTLEFIELD:" : "WAITING FOR CHIEF TO PICK..."}
            </p>
            {isMaster && props.state.topicOptions.map((t, i) => (
              <button key={i} onClick={() => props.onSelectTopic(t)} className="w-full bg-white/5 border-2 border-white/20 p-8 rounded-[2rem] font-black text-2xl text-left uppercase hover:bg-fuchsia-600 transition-all active:scale-95 shadow-lg">
                <span className="text-fuchsia-500 mr-4">#</span>{t}
              </button>
            ))}
            {!isMaster && (
              <div className="flex flex-col items-center gap-4 opacity-30 mt-10">
                 <div className="w-12 h-12 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="font-black">Picking frequency...</p>
              </div>
            )}
          </div>
        )}

        {props.state.stage === GameStage.QUESTION && props.state.currentQuestion && (
          <div className="flex flex-col h-full gap-6 animate-in fade-in">
            <p className="text-center font-black opacity-30 text-xs uppercase tracking-[0.3em]">YOUR LOGIC PIECE:</p>
            <div className="grid grid-cols-1 gap-4">
              {props.state.currentQuestion.options.map((opt, i) => {
                const isSelected = player?.lastAnswer === (i + 1).toString();
                return (
                  <button 
                    key={i} 
                    disabled={!!player?.lastAnswer}
                    onClick={() => props.onSubmitAnswer((i + 1).toString())}
                    className={`p-6 rounded-[2rem] font-black text-xl text-left border-4 transition-all ${isSelected ? 'bg-fuchsia-600 border-white scale-100 shadow-[0_0_30px_rgba(217,70,239,0.5)]' : 'bg-white/5 border-white/10 opacity-80 active:scale-95'}`}
                  >
                    <div className="flex items-center gap-5">
                      <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${isSelected ? 'bg-black/30' : 'bg-white/10'}`}>{i + 1}</span>
                      <div className="flex-1">
                        <div className="uppercase leading-tight text-white">{opt.en}</div>
                        <div className={`text-xs italic mt-1 ${isSelected ? 'text-white/60' : 'text-white/20'}`}>{opt.ta}</div>
                      </div>
                      {isSelected && <span className="text-3xl animate-bounce">🔥</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {player?.lastAnswer && (
              <div className="mt-8 text-center animate-in zoom-in-90">
                <p className="font-black text-emerald-400 uppercase text-2xl italic">ANSWER LOCKED! 🔒</p>
                <p className="text-xs opacity-30 mt-2 uppercase tracking-widest">Wait for reveal da logic piece.</p>
              </div>
            )}
          </div>
        )}

        {props.state.stage === GameStage.REVEAL && (
          <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in-95">
             <div className="text-8xl mb-6 animate-bounce">🎭</div>
             <h2 className="text-5xl font-black uppercase italic text-emerald-500">TRUTH!</h2>
             <p className="opacity-40 mt-4 uppercase font-black text-sm tracking-widest">Look at the big screen da!</p>
          </div>
        )}

        {props.state.stage === GameStage.LOADING && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6">
             <div className="w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="font-black uppercase italic opacity-30">AJ is generating...</p>
          </div>
        )}
      </div>

      <div className="mt-auto grid grid-cols-6 gap-2 pt-6 border-t border-white/10">
        {['🔥', '😂', '🤡', '🧠', '💩', '💀'].map(e => (
          <button key={e} onClick={() => props.onReaction(e)} className="text-3xl p-3 hover:bg-white/5 rounded-2xl active:scale-125 transition-all">{e}</button>
        ))}
      </div>
    </div>
  );
};

export default PhoneView;
