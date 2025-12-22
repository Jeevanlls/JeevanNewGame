
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode, GameStage, Player } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';
let sharedAudioCtx: AudioContext | null = null;
let musicInterval: number | null = null;
let musicGainNode: GainNode | null = null;
let currentBPM = 110;

const duckMusic = (isSpeaking: boolean) => {
  if (!musicGainNode || !sharedAudioCtx) return;
  const target = isSpeaking ? 0.05 : 0.25;
  musicGainNode.gain.setTargetAtTime(target, sharedAudioCtx.currentTime, 0.2);
};

export const updateBGM = (stage: GameStage, urgency: number = 0, isPaused: boolean = false) => {
  if (!sharedAudioCtx || isPaused) {
    if (musicGainNode) musicGainNode.gain.setTargetAtTime(0, sharedAudioCtx?.currentTime || 0, 0.5);
    return;
  }
  
  if (!musicGainNode) {
    musicGainNode = sharedAudioCtx.createGain();
    musicGainNode.gain.setValueAtTime(0.25, sharedAudioCtx.currentTime);
    musicGainNode.connect(sharedAudioCtx.destination);
  } else {
    musicGainNode.gain.setTargetAtTime(0.25, sharedAudioCtx.currentTime, 0.5);
  }
  
  let bpm = 110;
  if (stage === GameStage.QUESTION) bpm = 130; 
  if (stage === GameStage.REVEAL) bpm = 140;
  if (stage === GameStage.TOPIC_SELECTION) bpm = 115;

  if (bpm === currentBPM && musicInterval) return;
  
  currentBPM = bpm;
  if (musicInterval) clearInterval(musicInterval);
  const interval = (60 / bpm) * 1000;
  let beat = 0;

  musicInterval = window.setInterval(() => {
    if (!sharedAudioCtx || !musicGainNode) return;
    const time = sharedAudioCtx.currentTime;
    
    if (beat % 4 === 0) {
      const osc = sharedAudioCtx.createOscillator();
      const g = sharedAudioCtx.createGain();
      osc.frequency.setValueAtTime(80, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.2);
      g.gain.setValueAtTime(0.4, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc.connect(g); g.connect(musicGainNode!);
      osc.start(time); osc.stop(time + 0.2);
    }
    beat = (beat + 1) % 16;
  }, interval / 2);
};

export const initAudio = async () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (sharedAudioCtx.state === 'suspended') await sharedAudioCtx.resume();
  return sharedAudioCtx;
};

const getSystemInstruction = (state: GameState) => {
  const modeVibe = state.mode === GameMode.ACTUALLY_GENIUS 
    ? "MODE: ACTUALLY GENIUS. Reward smart answers. Roast dumb logic."
    : "MODE: CONFIDENTLY WRONG. Mokka logic is king. The more gubeer, the better.";

  const playerContext = state.players.length > 0 
    ? `Current Victims: ${state.players.map(p => `${p.name} (Score: ${p.score})`).join(', ')}.`
    : "No victims have joined yet.";

  return `You are AJ and VJ, a high-octane radio host duo from Chennai.
  MANDATORY: 50% English + 50% Tamil Slang (Tanglish). 
  PERSONALITIES: AJ is loud and judgmental. VJ is sarcastic and loves "mokka" jokes.
  CURRENT GAME STATE: ${state.stage}. ${playerContext}
  RULES:
  1. NO INTROS. NO FORMALITY. 
  2. Use slang: Gubeer, Mokka, Vera Level, Dei, Logic Piece, Gaali, Scene-u, Bulp-u, Kanda-ravi.
  3. FORMAT: "AJ: [slang] VJ: [roast/burn]".
  4. Max 12 words. Be savage.
  ${modeVibe}`;
};

export const speakText = async (text: string, mode: GameMode = GameMode.CONFIDENTLY_WRONG) => {
  if (!text) return;
  try {
    const ctx = await initAudio();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    duckMusic(true);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Chennai Radio Energy: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'AJ', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              { speaker: 'VJ', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            ]
          }
        }
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => duckMusic(false);
      source.start();
    }
  } catch (e) {
    console.error("TTS Failed", e);
    duckMusic(false);
  }
};

export const generateReactiveComment = async (state: GameState, event: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `React to this event: ${event}. Keep it short and savage Mixed Tanglish.`,
      config: { systemInstruction: getSystemInstruction(state) },
    });
    return res.text || "AJ: Logic gaali! VJ: Semma mokka logic.";
  } catch (e) { return "AJ: Live on air! VJ: Logic dead."; }
};

export const generateTopicOptions = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "List 3 crazy radio game topics in Mixed Tanglish.",
      config: { 
        systemInstruction: "Return JSON array of 3 strings. Mixed Tanglish only.",
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
    });
    return JSON.parse(res.text || '["Cinema Mokka", "Food Crimes", "Gubeer Logic"]');
  } catch (e) { return ["Cinema", "Food", "Logic"]; }
};

export const generateQuestion = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Topic: ${state.topic}. Mode: ${state.mode}. Generate one savage question.`,
      config: { 
        systemInstruction: getSystemInstruction(state) + " Return JSON. textEn must be Mixed Tanglish.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textEn: { type: Type.STRING },
            textTa: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ta: { type: Type.STRING } } } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ['textEn', 'textTa', 'options', 'correctIndex', 'explanation']
        }
      },
    });
    return JSON.parse(res.text || '{}');
  } catch (e) { return { textEn: "Logic piece test?", textTa: "டெஸ்ட்?", options: [{en: "A", ta: "அ"}], correctIndex: 0, explanation: "Gubeer!" }; }
};

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
