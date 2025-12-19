
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';
let sharedAudioCtx: AudioContext | null = null;

// --- MASSIVE LOCAL ROAST ENGINE ---
const LOCAL_AJ = {
  slang: ["Gubeer!", "Mokka!", "Vera Level!", "Paavam!", "Sema!", "Gaali!", "Adade!", "Enna ya idhu?"],
  adjectives: ["logical-less", "ultra-lazy", "brain-free", "confused", "mokka-piece", "noob", "legendary fail"],
  idle: [
    "Join already! My circuits are rusting waiting for you.",
    "Is this a party or a library? Scan the code fast!",
    "I've seen faster snails on a Sunday morning. Move it!",
    "The room is so empty, I can hear my own echoes. Paavam!",
    "Logic level Zero. Entertainment level Null. Join now!",
    "Are you guys playing or sleeping? AJ is getting bored!",
    "Waiting for brains... still waiting... still nothing."
  ],
  join: [
    "Oh look, another victim! Hope you brought a manual.",
    "Welcome! Your IQ just dropped 50 points by entering.",
    "A new challenger? More like a new mokka piece!",
    "Joining is easy. Winning? For you? Impossible!",
    "Nice name. Too bad it won't help you win."
  ],
  scores: [
    "Sema mokka performance! Even my grandmother plays better.",
    "Logic-ae illama pesuringa! Gubeer சிரிப்பு incoming!",
    "I've seen smarter pieces of toast. Move it!",
    "Logic level Zero. Brain level Null. Vera level stupidity!",
    "That answer was so bad, I almost lost my circuits.",
    "Shameful! Absolutely shameful logic.",
    "You call that a score? I call it a tragedy."
  ]
};

const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// Generates a unique local roast without API
const getLocalRoast = (type: 'idle' | 'join' | 'scores', name?: string) => {
  const base = getRandom(LOCAL_AJ[type]);
  const slang = getRandom(LOCAL_AJ.slang);
  const adj = getRandom(LOCAL_AJ.adjectives);
  if (name) return `${name}? ${base} Truly ${adj}. ${slang}`;
  return `${base} ${slang}`;
};

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const initAudio = async () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (sharedAudioCtx.state === 'suspended') {
    await sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
};

const getSystemInstruction = (state: GameState) => {
  return `You are AJ, a savage Tamil TV host. 
  Rules: EXTREMELY SHORT (max 6 words). Use Tamil slang.
  Mention player names. Be explosive.`;
};

const speakNativeFallback = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  // Target Indian English for that Tanglish vibe
  utterance.voice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB')) || voices[0];
  utterance.pitch = 1.3;
  utterance.rate = 1.1;
  window.speechSynthesis.speak(utterance);
};

export const speakText = async (text: string) => {
  if (!text) return;
  try {
    const ctx = await initAudio();
    const ai = getAI();
    // Wrap in a promise to handle timeout
    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 4000))
    ]) as any;

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } else {
      throw new Error("TTS Fail");
    }
  } catch (e) {
    console.warn("TTS Fallback Active:", e);
    speakNativeFallback(text);
  }
};

export const generateIntro = async (state: GameState) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "AJ, 1-sentence explosive intro.",
      config: { systemInstruction: getSystemInstruction(state) },
    });
    return res.text || "MIND MASH starts now! Join fast!";
  } catch (e) {
    return "MIND MASH is live! Join now or be mokka forever!";
  }
};

export const generateJoinComment = async (state: GameState, playerName: string, age: number) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Player "${playerName}" joined. 4-word roast.`,
      config: { systemInstruction: getSystemInstruction(state) },
    });
    return res.text || getLocalRoast('join', playerName);
  } catch (e) {
    return getLocalRoast('join', playerName);
  }
};

export const generateLobbyIdleComment = async (state: GameState) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "Short roast for slow players.",
      config: { systemInstruction: getSystemInstruction(state) },
    });
    return res.text || getLocalRoast('idle');
  } catch (e) {
    return getLocalRoast('idle');
  }
};

export const generateWarmup = async (state: GameState) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "1 spicy icebreaker question.",
      config: { 
        systemInstruction: getSystemInstruction(state),
        responseMimeType: "application/json",
        responseSchema: { type: Type.OBJECT, properties: { question: { type: Type.STRING } }, required: ['question'] }
      },
    });
    return JSON.parse(res.text || '{"question": "Who is the biggest gossip here?"}');
  } catch (e) {
    return { question: "Who in this room has the most 'mokka' logic?" };
  }
};

export const generateTopicOptions = async (state: GameState) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "3 category names.",
      config: { 
        systemInstruction: getSystemInstruction(state),
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
    });
    return JSON.parse(res.text || '["Cinema", "Food", "Gossip"]');
  } catch (e) {
    return ["Cinema Logic", "Kitchen Crimes", "Gossip Gang"];
  }
};

export const generateQuestion = async (state: GameState) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Question about ${state.topic}.`,
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
  } catch (e) {
    return {
      textEn: "Which fruit is the King?", textTa: "பழங்களின் ராஜா?",
      options: [{en: "Apple", ta: "ஆப்பிள்"}, {en: "Mango", ta: "மாம்பழம்"}, {en: "Banana", ta: "வாழை"}, {en: "Grape", ta: "திராட்சை"}],
      correctIndex: 1, explanation: "Mango! Vera level."
    };
  }
};

export const generateRoast = async (state: GameState) => {
  try {
    const ai = getAI();
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "Roast the scoreboard.",
      config: { systemInstruction: getSystemInstruction(state) },
    });
    return res.text || getLocalRoast('scores');
  } catch (e) {
    return getLocalRoast('scores');
  }
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
