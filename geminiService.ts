
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode, GameStage } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';
let sharedAudioCtx: AudioContext | null = null;
let musicInterval: number | null = null;
let musicGainNode: GainNode | null = null;
let currentBPM = 110;

const LOCAL_AJ = {
  slang: ["Gubeer!", "Mokka!", "Vera Level!", "Paavam!", "Sema!", "Gaali!", "Adade!", "Enna ya idhu?", "Oyy!", "Ennamma ipdi panringale ma!"],
  adjectives: ["logical-less", "ultra-lazy", "brain-free", "confused", "mokka-piece", "noob", "legendary fail", "comedy piece"],
  pokes: [
    "I'm still waiting! Is the internet slow or your brain?",
    "Hello? Mic check! Is anyone actually alive there?",
    "If you're this slow at joining, how will you even play?",
    "Logic missing in this room. Emergency roast incoming!",
    "My AI batteries are draining just looking at your silence.",
    "Did everyone go for filter coffee? Get back here!",
    "This is a game show, not a library! Move it!",
    "Don't make me call your parents. Join already!",
    "I've seen smarter pieces of stone. Vera level boredom!"
  ],
  tutorial: [
    "Vanga vanga! Welcome to Mind Mash. I am AJ, and I have more IQ than this whole room combined.",
    "Step 1: Scan that QR code with your phone. If you don't have a phone, why are you even here?",
    "Step 2: Pick a category. One player becomes the 'Topic Master'. Choose something spicy!",
    "Step 3: Answer fast. Correct answers get points. Mokka logic gets roasted by ME.",
    "That's it! Simple enough for even your 'mokka' brain to understand. Let's start!"
  ],
  idle: [
    "Join already! My circuits are rusting waiting for you.",
    "Is this a party or a library? Scan the code fast!",
    "Are you guys playing or sleeping? AJ is getting bored!",
    "Waiting for brains... still waiting... still nothing."
  ]
};

const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const getLocalRoast = (type: 'idle' | 'join' | 'scores' | 'pokes' | 'tutorial', index?: number) => {
  if (type === 'tutorial' && index !== undefined) return LOCAL_AJ.tutorial[index];
  const base = getRandom(LOCAL_AJ[type as any] || LOCAL_AJ.idle);
  return base;
};

const duckMusic = (isSpeaking: boolean) => {
  if (!musicGainNode || !sharedAudioCtx) return;
  const target = isSpeaking ? 0.06 : 0.35;
  musicGainNode.gain.setTargetAtTime(target, sharedAudioCtx.currentTime, 0.3);
};

export const updateBGM = (stage: GameStage) => {
  if (!sharedAudioCtx) return;
  if (!musicGainNode) {
    musicGainNode = sharedAudioCtx.createGain();
    musicGainNode.gain.setValueAtTime(0.35, sharedAudioCtx.currentTime);
    musicGainNode.connect(sharedAudioCtx.destination);
  }
  
  const bpm = (stage === GameStage.QUESTION || stage === GameStage.SELECTOR_REVEAL) ? 140 : 108;
  if (bpm === currentBPM && musicInterval) return;
  
  currentBPM = bpm;
  if (musicInterval) clearInterval(musicInterval);
  const interval = (60 / bpm) * 1000;
  let beat = 0;

  musicInterval = window.setInterval(() => {
    if (!sharedAudioCtx || !musicGainNode) return;
    const time = sharedAudioCtx.currentTime;
    if (beat % 4 === 0 || beat % 4 === 2) {
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.frequency.setValueAtTime(110, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(gain); gain.connect(musicGainNode!);
      osc.start(time); osc.stop(time + 0.1);
    }
    if (beat % 4 === 2) {
      const noise = sharedAudioCtx.createBufferSource();
      const buffer = sharedAudioCtx.createBuffer(1, 4096, sharedAudioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < 4096; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const gain = sharedAudioCtx.createGain();
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      noise.connect(gain); gain.connect(musicGainNode!);
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

const speakNativeFallback = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(v => v.lang.includes('en-IN')) || voices[0];
  utterance.pitch = 1.4;
  utterance.rate = 1.2;
  duckMusic(true);
  utterance.onend = () => duckMusic(false);
  window.speechSynthesis.speak(utterance);
};

export const speakText = async (text: string) => {
  if (!text) return;
  try {
    const ctx = await initAudio();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    duckMusic(true);
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
      source.onended = () => duckMusic(false);
      source.start();
    } else throw new Error("TTS Fail");
  } catch (e) { speakNativeFallback(text); }
};

export const generateIntro = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "AJ, 1 explosive Tanglish intro line.",
      config: { systemInstruction: "Savage Tamil host. Very short." },
    });
    return res.text || "MIND MASH IS LIVE!";
  } catch (e) { return "MIND MASH IS LIVE!"; }
};

export const generateJoinComment = async (state: GameState, playerName: string, age: number) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Player "${playerName}" joined. Savage 4-word roast.`,
      config: { systemInstruction: "Savage Tamil host. Very short." },
    });
    return res.text || `${playerName} joined! Paavam!`;
  } catch (e) { return `${playerName} joined! Paavam!`; }
};

export const generateLobbyIdleComment = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "Savage roast for slow players.",
      config: { systemInstruction: "Savage Tamil host. Very short." },
    });
    return res.text || "Still waiting for brains...";
  } catch (e) { return "Still waiting for brains..."; }
};

export const generateWarmup = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "1 funny icebreaker question.",
      config: { 
        systemInstruction: "Savage Tamil host. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: { type: Type.OBJECT, properties: { question: { type: Type.STRING } }, required: ['question'] }
      },
    });
    return JSON.parse(res.text || '{"question": "Who is the biggest gossip?"}');
  } catch (e) { return { question: "Who has the most 'mokka' logic?" }; }
};

export const generateTopicOptions = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "3 category names.",
      config: { 
        systemInstruction: "Savage Tamil host. Return JSON array.",
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
    });
    return JSON.parse(res.text || '["Cinema", "Food", "Gossip"]');
  } catch (e) { return ["Cinema Logic", "Kitchen Crimes", "Gossip Gang"]; }
};

export const generateQuestion = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Question about ${state.topic}.`,
      config: { 
        systemInstruction: "Savage Tamil host. Return JSON object.",
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
      textEn: "Which fruit is King?", textTa: "பழங்களின் ராஜா?",
      options: [{en: "Apple", ta: "ஆ"}, {en: "Mango", ta: "மா"}, {en: "Banana", ta: "வா"}, {en: "Grape", ta: "தி"}],
      correctIndex: 1, explanation: "Mango!"
    };
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
