
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode, GameStage, Player } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';
let sharedAudioCtx: AudioContext | null = null;
let musicInterval: number | null = null;
let musicGainNode: GainNode | null = null;
let currentBPM = 110;

const duckMusic = (isSpeaking: boolean) => {
  if (!musicGainNode || !sharedAudioCtx) return;
  const target = isSpeaking ? 0.02 : 0.25;
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
  if (stage === GameStage.QUESTION) bpm = 135 + (urgency * 12); 
  if (stage === GameStage.REVEAL) bpm = 125;
  if (stage === GameStage.TOPIC_SELECTION) bpm = 118;

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
      osc.frequency.setValueAtTime(100, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
      g.gain.setValueAtTime(0.5, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(g); g.connect(musicGainNode!);
      osc.start(time); osc.stop(time + 0.15);
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

const getSystemInstruction = (mode: GameMode) => {
  const modeVibe = mode === GameMode.ACTUALLY_GENIUS 
    ? "MODE: ACTUALLY GENIUS. Einstein pieces only. Roast the logic-less idiots. VJ is super judgmental."
    : "MODE: CONFIDENTLY WRONG. Mokka logic wins. The more gubeer the better. AJ loves nonsense.";

  return `You are AJ and VJ, a savage radio duo from Chennai.
  MANDATORY: 50% English + 50% Tamil Slang (Tanglish). 
  STRICT RULES:
  1. NO FORMAL ENGLISH (No "Welcome", No "Please", No "Let's begin").
  2. USE SLANG: Gubeer, Mokka, Vera Level, Oyy, Dei, Logic Piece, Gaali, Scene-u, Bulp-u, Vera Maari, Kanda-ravi.
  3. STRUCTURE: "AJ: [slang roast] VJ: [sarcastic burn/laugh]".
  4. Max 10 words. 
  ${modeVibe}
  If no players join, say: "AJ: Dei players enga da? VJ: Room empty-ah iruku. Logic Gaali."`;
};

export const speakText = async (text: string, mode: GameMode = GameMode.CONFIDENTLY_WRONG) => {
  if (!text) return;
  try {
    const ctx = await initAudio();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    duckMusic(true);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `High-octane aggressive Chennai radio banter (Mixed Tanglish): ${text}` }] }],
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
    speakNativeFallback(text);
  }
};

export const generateReactiveComment = async (state: GameState, event: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Context: ${event}. React in savage Mixed Tanglish.`,
      config: { systemInstruction: getSystemInstruction(state.mode) },
    });
    return res.text || "AJ: Logic piece joined! VJ: Semma mokka.";
  } catch (e) { return "AJ: Radio live! VJ: Logic dead."; }
};

export const generateTopicOptions = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "3 unique savage Mixed Tanglish categories (e.g. Cinema Mokka, Food Logic Crimes).",
      config: { 
        systemInstruction: "Return JSON string array in Mixed Tanglish.",
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
    });
    return JSON.parse(res.text || '["Cinema Mokka", "Food Crimes", "Gubeer Humor"]');
  } catch (e) { return ["Cinema", "Logic Crimes", "Food"]; }
};

export const generateQuestion = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Topic: ${state.topic}. Mode: ${state.mode}. Generate a tricky Mixed Tanglish radio question.`,
      config: { 
        systemInstruction: getSystemInstruction(state.mode) + " Return JSON. Question and options must be Mixed Tanglish.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textEn: { type: Type.STRING, description: "Mixed Tanglish Question" },
            textTa: { type: Type.STRING, description: "Tamil Translation" },
            options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ta: { type: Type.STRING } } } },
            correctIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING }
          },
          required: ['textEn', 'textTa', 'options', 'correctIndex', 'explanation']
        }
      },
    });
    return JSON.parse(res.text || '{}');
  } catch (e) { return { textEn: "Logic gaali?", textTa: "லாஜிக் காலி?", options: [{en: "A", ta: "அ"}], correctIndex: 0, explanation: "Gubeer!" }; }
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

const speakNativeFallback = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text.replace(/AJ:|VJ:/g, ''));
  window.speechSynthesis.speak(utterance);
};
