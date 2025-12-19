
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode, GameStage, Player } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';
let sharedAudioCtx: AudioContext | null = null;
let musicInterval: number | null = null;
let musicGainNode: GainNode | null = null;
let currentBPM = 110;

const duckMusic = (isSpeaking: boolean) => {
  if (!musicGainNode || !sharedAudioCtx) return;
  const target = isSpeaking ? 0.03 : 0.3;
  musicGainNode.gain.setTargetAtTime(target, sharedAudioCtx.currentTime, 0.3);
};

export const updateBGM = (stage: GameStage, urgency: number = 0) => {
  if (!sharedAudioCtx) return;
  if (!musicGainNode) {
    musicGainNode = sharedAudioCtx.createGain();
    musicGainNode.gain.setValueAtTime(0.3, sharedAudioCtx.currentTime);
    musicGainNode.connect(sharedAudioCtx.destination);
  }
  
  let bpm = 110;
  if (stage === GameStage.QUESTION) bpm = 135 + (urgency * 5);
  if (stage === GameStage.REVEAL) bpm = 128;
  if (stage === GameStage.TOPIC_SELECTION) bpm = 118;

  if (bpm === currentBPM && musicInterval) return;
  
  currentBPM = bpm;
  if (musicInterval) clearInterval(musicInterval);
  const interval = (60 / bpm) * 1000;
  let beat = 0;

  musicInterval = window.setInterval(() => {
    if (!sharedAudioCtx || !musicGainNode) return;
    const time = sharedAudioCtx.currentTime;
    
    // Hard Gana Kick
    if (beat % 4 === 0) {
      const osc = sharedAudioCtx.createOscillator();
      const g = sharedAudioCtx.createGain();
      osc.frequency.setValueAtTime(115, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
      g.gain.setValueAtTime(0.4, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(g); g.connect(musicGainNode!);
      osc.start(time); osc.stop(time + 0.15);
    }
    // Gritty Snare
    if (beat % 4 === 2) {
      const noise = sharedAudioCtx.createBufferSource();
      const buf = sharedAudioCtx.createBuffer(1, 4096, sharedAudioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < 4096; i++) d[i] = Math.random() * 2 - 1;
      noise.buffer = buf;
      const g = sharedAudioCtx.createGain();
      g.gain.setValueAtTime(0.12, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      noise.connect(g); g.connect(musicGainNode!);
      noise.start(time);
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
  return `You are AJ and VJ, a savage Tanglish RJ duo. 
  MANDATORY: 100% Tanglish (English words mixed with raw Tamil slang).
  NO "Hello", NO "I am your host". Start with "Enna ya", "Oyy", "Dei".
  Personality:
  AJ: Rough, roasts everything, Gubeer laughter.
  VJ: Sharp, sarcastic, calls people "Logic pieces".
  Mode: ${mode === GameMode.ACTUALLY_GENIUS ? 'Searching for the ONE clever bot among losers.' : 'Looking for the biggest mokka/logic-less answer.'}
  Structure: "AJ: [slang phrase] VJ: [sarcastic comeback]". 
  Keep it to 2 short sentences total. Be extremely lively.`;
};

export const speakText = async (text: string, mode: GameMode = GameMode.CONFIDENTLY_WRONG) => {
  if (!text) return;
  try {
    const ctx = await initAudio();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    duckMusic(true);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `High-energy savage Tanglish dialogue for a radio show: ${text}` }] }],
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
  } catch (e) { speakNativeFallback(text); }
};

export const generateReactiveComment = async (state: GameState, event: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `React to this event: ${event}. Make it a short Tanglish roast.`,
      config: { systemInstruction: getSystemInstruction(state.mode) },
    });
    return res.text || "AJ: Enna ya logic gaali? VJ: Semma mokka.";
  } catch (e) { return "AJ: Chaos start-u! VJ: Logic dead-u."; }
};

export const generateTopicOptions = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "3 hilarious Tanglish categories for a party game.",
      config: { 
        systemInstruction: "Return JSON string array in Tanglish slang.",
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
    });
    return JSON.parse(res.text || '["Cinema Gubeer", "Food Crimes", "Logic Illa"]');
  } catch (e) { return ["Cinema", "Logic Crimes", "Food Logic"]; }
};

export const generateQuestion = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Topic is ${state.topic}. Generate a logical-less or clever question.`,
      config: { 
        systemInstruction: getSystemInstruction(state.mode) + " Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textEn: { type: Type.STRING }, textTa: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ta: { type: Type.STRING } } } },
            correctIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING }
          },
          required: ['textEn', 'textTa', 'options', 'correctIndex', 'explanation']
        }
      },
    });
    return JSON.parse(res.text || '{}');
  } catch (e) { return { textEn: "Logic?", textTa: "லாஜிக்?", options: [{en: "A", ta: "அ"}], correctIndex: 0, explanation: "Gubeer!" }; }
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
