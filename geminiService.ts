
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';
let sharedAudioCtx: AudioContext | null = null;

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Local library for INSTANT noise if the AI is slow
const INSTANT_ROASTS = [
  "Sema mokka performance! Even my grandmother plays better.",
  "Enna ya idhu? Logic-ae illama pesuringa!",
  "Vera level... level-0 logically. Gubeer சிரிப்பு incoming!",
  "I've seen smarter pieces of toast. Move it!",
  "Ayyayo! That was a massive fail. Paavam!",
  "Is this a family game or a meditation session? Someone join already!"
];

const getSystemInstruction = (state: GameState) => {
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  const leader = sortedPlayers[0];
  
  return `You are AJ, the savage, high-energy host of "MIND MASH". 
  You are a legendary Tamil TV anchor with no filter.
  
  CONTEXT:
  - Players: ${state.players.length}
  - Lead: ${leader ? leader.name : "Nobody"}
  
  ROLES:
  1. NEVER BE SILENT. If you're thinking, say something funny.
  2. TAMIL SLANG: Gubeer, Mokka, Sema, Vera Level, Otha, Nanba, Thalaiva, Kashtam, Paavam.
  3. AGE JABS: <15 = "Chutti", >40 = "Ancient Thaatha".
  4. Max 8-10 words. Punchy. Explosive energy.`;
};

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

export const generateIntro = async (state: GameState) => {
  const ai = getAI();
  const res = await withTimeout(
    ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "AJ, give a 1-sentence explosive, bilingual intro. Mention the room code.",
      config: { systemInstruction: getSystemInstruction(state), thinkingConfig: { thinkingBudget: 0 } },
    }),
    4000,
    { text: "Welcome to MIND MASH! Scan the code and let's go. Vera Level energy venum!" } as any
  );
  return res.text || "Welcome to the show!";
};

export const generateJoinComment = async (state: GameState, playerName: string, age: number) => {
  const ai = getAI();
  const res = await withTimeout(
    ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Player "${playerName}" (${age}y/o) joined. Give a savage 5-word roast.`,
      config: { systemInstruction: getSystemInstruction(state), thinkingConfig: { thinkingBudget: 0 } },
    }),
    3000,
    { text: `${playerName} is here? Pack your bags everyone, the mokka king has arrived.` } as any
  );
  return res.text || "Next victim joined!";
};

export const generateLobbyIdleComment = async (state: GameState) => {
  const ai = getAI();
  const prompt = state.players.length === 0 
    ? "No one has joined. Scream at them to scan the code."
    : "Roast the slow players for not starting.";
  
  const res = await withTimeout(
    ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: prompt,
      config: { systemInstruction: getSystemInstruction(state), thinkingConfig: { thinkingBudget: 0 } },
    }),
    3000,
    { text: INSTANT_ROASTS[Math.floor(Math.random() * INSTANT_ROASTS.length)] } as any
  );
  return res.text || "Join fast!";
};

export const generateWarmup = async (state: GameState): Promise<{ question: string }> => {
  const ai = getAI();
  const res = await withTimeout(
    ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "Spicy icebreaker question in Tanglish.",
      config: { 
        systemInstruction: getSystemInstruction(state),
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: { type: Type.OBJECT, properties: { question: { type: Type.STRING } }, required: ['question'] }
      },
    }),
    6000,
    { text: JSON.stringify({ question: "Who in this room is the biggest 'mokka' piece?" }) } as any
  );
  try { return JSON.parse(res.text || ''); } catch (e) { return { question: "Who is the laziest here?" }; }
};

export const generateTopicOptions = async (state: GameState): Promise<string[]> => {
  const ai = getAI();
  const res = await withTimeout(
    ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "3 savage round topics.",
      config: { 
        systemInstruction: getSystemInstruction(state),
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
    }),
    6000,
    { text: JSON.stringify(["Cinema Secrets", "Food Crimes", "Family Gossip"]) } as any
  );
  try { return JSON.parse(res.text || ''); } catch (e) { return ["Cinema", "Food", "Logic"]; }
};

export const generateQuestion = async (state: GameState): Promise<GameQuestion> => {
  const ai = getAI();
  const fallback: GameQuestion = {
    textEn: "Which fruit is the King?",
    textTa: "பழங்களின் ராஜா?",
    options: [{en: "Apple", ta: "ஆப்பிள்"}, {en: "Mango", ta: "மாம்பழம்"}, {en: "Banana", ta: "வாழை"}, {en: "Grape", ta: "திராட்சை"}],
    correctIndex: 1,
    explanation: "Mango! Vera level taste."
  };
  const res = await withTimeout(
    ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Topic: "${state.topic}". Create a funny question.`,
      config: { 
        systemInstruction: getSystemInstruction(state), 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
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
    }),
    10000,
    { text: JSON.stringify(fallback) } as any
  );
  try { return JSON.parse(res.text || ''); } catch (e) { return fallback; }
};

export const generateRoast = async (state: GameState): Promise<string> => {
  const ai = getAI();
  const res = await withTimeout(
    ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "Roast the current scores.",
      config: { systemInstruction: getSystemInstruction(state), thinkingConfig: { thinkingBudget: 0 } },
    }),
    5000,
    { text: "Sema mokka scoring. Even my internet is faster than your brains." } as any
  );
  return res.text || "Round over!";
};

export const speakText = async (text: string) => {
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (sharedAudioCtx.state === 'suspended') await sharedAudioCtx.resume();
    
    const ai = getAI();
    // Use a faster, slightly higher pitch for energy
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
      const audioBuffer = await decodeAudioData(decode(base64Audio), sharedAudioCtx, 24000, 1);
      const source = sharedAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(sharedAudioCtx.destination);
      source.start();
    }
  } catch (e) { console.error("AJ Voice Error:", e); }
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
