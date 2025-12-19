
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';
let sharedAudioCtx: AudioContext | null = null;

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// CRITICAL: Must be called from a user gesture (button click)
export const initAudio = async () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (sharedAudioCtx.state === 'suspended') {
    await sharedAudioCtx.resume();
  }
  // Play a tiny beep to confirm unlock
  const osc = sharedAudioCtx.createOscillator();
  const gain = sharedAudioCtx.createGain();
  osc.connect(gain);
  gain.connect(sharedAudioCtx.destination);
  gain.gain.value = 0.01;
  osc.start();
  osc.stop(sharedAudioCtx.currentTime + 0.01);
  return sharedAudioCtx;
};

const getSystemInstruction = (state: GameState) => {
  return `You are AJ, a savage Tamil TV host. 
  Rules: Short sentences (max 10 words). Use slang: Gubeer, Mokka, Sema, Vera Level, Paavam.
  Be explosive. You are high on energy.`;
};

export const generateIntro = async (state: GameState) => {
  const ai = getAI();
  const res = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: "AJ, give a very short explosive intro. Tell them to join.",
    config: { systemInstruction: getSystemInstruction(state) },
  });
  return res.text || "Welcome to the show!";
};

export const generateJoinComment = async (state: GameState, playerName: string, age: number) => {
  const ai = getAI();
  const res = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: `Player "${playerName}" (${age}) just joined. Give a 5-word savage roast.`,
    config: { systemInstruction: getSystemInstruction(state) },
  });
  return res.text || `${playerName} is here! Paavam.`;
};

export const generateLobbyIdleComment = async (state: GameState) => {
  const ai = getAI();
  const res = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: "Roast the slow players for not joining yet.",
    config: { systemInstruction: getSystemInstruction(state) },
  });
  return res.text || "Join fast or leave!";
};

export const generateWarmup = async (state: GameState) => {
  const ai = getAI();
  const res = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: "One spicy family-friendly icebreaker question.",
    config: { 
      systemInstruction: getSystemInstruction(state),
      responseMimeType: "application/json",
      responseSchema: { type: Type.OBJECT, properties: { question: { type: Type.STRING } }, required: ['question'] }
    },
  });
  return JSON.parse(res.text || '{"question": "Who is the laziest here?"}');
};

export const generateTopicOptions = async (state: GameState) => {
  const ai = getAI();
  const res = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: "Give 3 funny category names.",
    config: { 
      systemInstruction: getSystemInstruction(state),
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
  });
  return JSON.parse(res.text || '["Cinema", "Food", "Gossip"]');
};

export const generateQuestion = async (state: GameState) => {
  const ai = getAI();
  const res = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: `Create a funny question about ${state.topic}.`,
    config: { 
      systemInstruction: getSystemInstruction(state),
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
};

export const generateRoast = async (state: GameState) => {
  const ai = getAI();
  const res = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: "Roast the scoreboard result.",
    config: { systemInstruction: getSystemInstruction(state) },
  });
  return res.text || "Sema mokka performance!";
};

export const speakText = async (text: string) => {
  if (!text) return;
  try {
    const ctx = await initAudio();
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    }
  } catch (e) { console.error("AJ Audio Fail:", e); }
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
