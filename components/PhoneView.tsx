
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

  // Show join screen if no playerId OR if playerId exists but player not in current game state
  if (!props.playerId || !player) {
    return (
      <div className="h-screen bg-[#020617] text-white flex flex-col p-8 justify-center gap-10">
        <div className="text-center">
          <h1 className="text-6xl font-black italic uppercase tracking-tighter">MIND <span className="text-fuchsia-500">MASH</span></h1>
          <p className="text-xs font-black opacity-30 uppercase tracking-[0.5em] mt-2">AJ & VJ ON-AIR</p>
        </div>
        <div className="space-y-6">
          <input 
            className="w-full bg-white/5 border-4 border-white/10 p-6 rounded-3xl text-2xl font-black text-center uppercase focus:border-fuchsia-500 outline-none" 
            placeholder="ENTER NAME DA" 
            value={name} 
            onChange={e => setName(e.target.value.toUpperCase().slice(0, 10))} 
          />
          <button 
            disabled={!name.trim() || isJoining} 
            onClick={() => { setIsJoining(true); props.onJoin(name, 25, Language.MIXED); }} 
            className="w-full bg-fuchsia-600 p-8 rounded-3xl font-black text-3xl shadow-2xl active:scale-95 transition-all"
          >
            JOIN RADIO 🚀
          </button>
        </div>
        <p className="text-center text-xs opacity-20 font-bold uppercase tracking-widest">
          {props.playerId ? "Previous session expired. Join again da!" : "Connecting to Frequency..."}
        </p>
      </div>
    );
  }

  if (props.state.isPaused) {
    return (
      <div className="h-screen bg-black text-amber-500 flex flex-col items-center justify-center p-12 text-center">
        <div className="text-9xl mb-8 animate-pulse">⏸️</div>
        <h1 className="text-5xl font-black">BREAK-U!</h1>
        <p className="font-bold opacity-50 mt-4 uppercase">AJ is drinking boost. Wait da.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#020617] text-white flex flex-col p-6 overflow-hidden">
      <header className="flex justify-between items-center bg-white/5 p-4 rounded-3xl mb-6 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-fuchsia-600 rounded-xl flex items-center justify-center font-black text-lg">{player?.name?.[0] || '?'}</div>
          <span className="font-black text-sm uppercase">{player?.name}</span>
        </div>
        <div className="text-2xl font-black text-amber-500">{player?.score}</div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {props.state.stage === GameStage.LOBBY && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <div className="text-6xl mb-4">📡</div>
            <p className="text-2xl font-black uppercase italic">Connected! Waiting for AJ to start...</p>
          </div>
        )}

        {props.state.stage === GameStage.TOPIC_SELECTION && (
          <div className="space-y-4">
            <p className="text-center font-black text-fuchsia-400 uppercase italic mb-4">
              {isMaster ? "YOU ARE THE BOSS! PICK A TOPIC:" : "WAITING FOR BOSS TO PICK..."}
            </p>
            {isMaster && props.state.topicOptions.map((t, i) => (
              <button key={i} onClick={() => props.onSelectTopic(t)} className="w-full bg-white/5 border-2 border-white/20 p-6 rounded-3xl font-black text-xl text-left uppercase hover:bg-fuchsia-600 transition-colors">
                {t}
              </button>
            ))}
          </div>
        )}

        {props.state.stage === GameStage.QUESTION && props.state.currentQuestion && (
          <div className="flex flex-col h-full gap-4">
            <p className="text-center font-black opacity-30 text-xs uppercase tracking-widest">SELECT YOUR LOGIC:</p>
            <div className="grid grid-cols-1 gap-4">
              {props.state.currentQuestion.options.map((opt, i) => {
                const isSelected = player?.lastAnswer === (i + 1).toString();
                return (
                  <button 
                    key={i} 
                    onClick={() => props.onSubmitAnswer((i + 1).toString())}
                    className={`p-6 rounded-3xl font-black text-xl text-left border-4 transition-all active:scale-95 ${isSelected ? 'bg-fuchsia-600 border-white shadow-3xl' : 'bg-white/5 border-white/10'}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-lg">{i + 1}</span>
                      <div>
                        <div className="uppercase leading-tight">{opt.en}</div>
                        <div className="text-xs opacity-40 italic mt-1">{opt.ta}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {player?.lastAnswer && (
              <div className="mt-4 bg-emerald-600/20 border border-emerald-500/50 p-4 rounded-2xl text-center">
                <p className="font-black text-emerald-400 uppercase">Answer Locked! Gubeer logic loading...</p>
              </div>
            )}
          </div>
        )}

        {props.state.stage === GameStage.REVEAL && (
          <div className="h-full flex flex-col items-center justify-center text-center">
             <div className="text-7xl mb-4 animate-bounce">📊</div>
             <h2 className="text-4xl font-black uppercase italic">RESULT REVEAL!</h2>
             <p className="opacity-50 mt-2 uppercase">Look at the TV da logic piece!</p>
          </div>
        )}
      </div>

      <div className="mt-auto grid grid-cols-6 gap-2 pt-4 border-t border-white/10">
        {['🔥', '😂', '🤡', '🧠', '💩', '💀'].map(e => (
          <button key={e} onClick={() => props.onReaction(e)} className="text-2xl p-2 active:scale-125 transition-transform">{e}</button>
        ))}
      </div>
    </div>
  );
};

export default PhoneView;
