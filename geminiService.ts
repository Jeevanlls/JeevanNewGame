
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode, GameStage, Player } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';
let sharedAudioCtx: AudioContext | null = null;
let musicInterval: number | null = null;
let musicGainNode: GainNode | null = null;
let currentBPM = 110;

const LOCAL_AJ = {
  tutorial: [
    "AJ: Vanga vanga! Welcome to Mind Mash. I am AJ, and this is VJ. VJ: Ready-ah victims? Let's start the chaos.",
    "AJ: Scan that QR code seekram! VJ: Time is money, logic is zero here.",
    "AJ: One person will pick a topic. VJ: Choice ungaladhu, roast engaladhu.",
    "AJ: Answer fast-ah panni score ethunga. VJ: Illana Gubeer-u dhan ungaluku answer.",
    "AJ: Ready for the mash? VJ: Logic-ku oru periya kumbudu. Let's go!"
  ]
};

const duckMusic = (isSpeaking: boolean) => {
  if (!musicGainNode || !sharedAudioCtx) return;
  const target = isSpeaking ? 0.05 : 0.35;
  musicGainNode.gain.setTargetAtTime(target, sharedAudioCtx.currentTime, 0.4);
};

export const updateBGM = (stage: GameStage, urgency: number = 0) => {
  if (!sharedAudioCtx) return;
  if (!musicGainNode) {
    musicGainNode = sharedAudioCtx.createGain();
    musicGainNode.gain.setValueAtTime(0.35, sharedAudioCtx.currentTime);
    musicGainNode.connect(sharedAudioCtx.destination);
  }
  
  let bpm = 108;
  if (stage === GameStage.QUESTION) bpm = 140 + (urgency * 10);
  if (stage === GameStage.REVEAL) bpm = 125;
  if (stage === GameStage.WARMUP) bpm = 115;

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
      osc.frequency.setValueAtTime(110, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
      g.gain.setValueAtTime(0.3, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(g); g.connect(musicGainNode!);
      osc.start(time); osc.stop(time + 0.1);
    }
    if (beat % 4 === 2) {
      const noise = sharedAudioCtx.createBufferSource();
      const buf = sharedAudioCtx.createBuffer(1, 4096, sharedAudioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < 4096; i++) d[i] = Math.random() * 2 - 1;
      noise.buffer = buf;
      const g = sharedAudioCtx.createGain();
      g.gain.setValueAtTime(0.07, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
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
  const modeContext = mode === GameMode.ACTUALLY_GENIUS 
    ? "ACTUALLY GENIUS mode: Focus on high IQ and speed. VJ is the 'Clever Bot' hunter. AJ roasts slow players."
    : "CONFIDENTLY WRONG mode: 1980s party vibe. Focus on funny, mokka, and logical-less answers. AJ loves the chaos. VJ judges everyone's confidence.";

  return `You are two savage hosts, AJ (Male) and VJ (Female).
  MANDATORY: Speak in 100% Tanglish (English + Tamil mixed).
  ${modeContext}
  Rules:
  1. Dialogue format: "AJ: [Tanglish] VJ: [Tanglish]".
  2. Max 8-10 words. Be fast. Don't yap.
  3. Slang: Gubeer, Mokka, Vera Level, Gaali, Oyy, Adade, Paavam.`;
};

export const speakText = async (text: string, mode: GameMode = GameMode.CONFIDENTLY_WRONG) => {
  if (!text) return;
  try {
    const ctx = await initAudio();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    duckMusic(true);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Generate high-energy Tanglish multi-speaker TTS for: ${text}` }] }],
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
    } else throw new Error("TTS Fail");
  } catch (e) { 
    speakNativeFallback(text); 
  }
};

export const generateDynamicRoast = async (state: GameState, playerName: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Player ${playerName} clicked the ROAST button. Give them a quick Tanglish burn.`,
      config: { systemInstruction: getSystemInstruction(state.mode) },
    });
    return res.text || "AJ: Dei logic enga da? VJ: Roast ready-ah iruku.";
  } catch (e) { return "AJ: Gaali! VJ: Mokka logic stop pannu."; }
};

export const generateLobbyIdleComment = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "Lobby slow-ah iruku. Tanglish roast ready-ah?",
      config: { systemInstruction: getSystemInstruction(state.mode) },
    });
    return res.text || "AJ: Start pannunga logic pieces! VJ: Time waste logic-u.";
  } catch (e) { return "AJ: Join fast! VJ: Waiting boring-ah iruku."; }
};

export const generateTopicOptions = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "Generate 3 funny Tanglish topic categories.",
      config: { 
        systemInstruction: "Return JSON string array in Tanglish.",
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
    });
    return JSON.parse(res.text || '["Cinema Mokka", "Food Crimes", "Logic Illa"]');
  } catch (e) { return ["Cinema", "Logic Crimes", "Food Logic"]; }
};

export const generateRevealCommentary = async (state: GameState, winner: Player | null) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = state.mode === GameMode.ACTUALLY_GENIUS 
      ? `Player ${winner?.name} is the Clever Bot. Roast others.`
      : `Player ${winner?.name} won with Mokka logic. Comment on the chaos.`;

    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: prompt,
      config: { systemInstruction: getSystemInstruction(state.mode) },
    });
    return res.text || `AJ: ${winner?.name} win pannita! VJ: Luck dhan logic illa.`;
  } catch (e) { return "AJ: Vera level performance! VJ: Logic gaali."; }
};

export const generateWarmup = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "Tanglish warmup question.",
      config: { 
        systemInstruction: getSystemInstruction(state.mode) + " Return JSON with 'question' field.",
        responseMimeType: "application/json",
        responseSchema: { type: Type.OBJECT, properties: { question: { type: Type.STRING } }, required: ['question'] }
      },
    });
    return JSON.parse(res.text || '{"question": "AJ: Ready-ah logic pieces? VJ: Warmup-a paru."}');
  } catch (e) { return { question: "AJ: Who is the biggest mokka here? VJ: Everyone." }; }
};

export const generateIntro = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "AJ and VJ, Tanglish show intro.",
      config: { systemInstruction: getSystemInstruction(state.mode) },
    });
    return res.text || "AJ: We are LIVE! VJ: Ready-ah logic-less people?";
  } catch (e) { return "AJ: Start the show! VJ: Logic is gaali."; }
};

export const generateJoinComment = async (state: GameState, playerName: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Player "${playerName}" joined. Tanglish roast.`,
      config: { systemInstruction: getSystemInstruction(state.mode) },
    });
    return res.text || `AJ: Welcome ${playerName}! VJ: Another mokka entry.`;
  } catch (e) { return `AJ: ${playerName} joined! VJ: RIP logic.`; }
};

export const generateQuestion = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = state.mode === GameMode.ACTUALLY_GENIUS 
      ? `Generate a real Tanglish knowledge question about ${state.topic}.`
      : `Generate a logical-less or tricky Tanglish question about ${state.topic}.`;

    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: prompt,
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
  } catch (e) {
    return {
      textEn: "Which is King?", textTa: "எது ராஜா?",
      options: [{en: "A", ta: "அ"}, {en: "B", ta: "ஆ"}, {en: "C", ta: "இ"}, {en: "D", ta: "ஈ"}],
      correctIndex: 0, explanation: "Logic gaali!"
    };
  }
};

export const getLocalTutorial = (index: number) => LOCAL_AJ.tutorial[index];

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
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/AJ:|VJ:/g, ''));
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-US')) || voices[0];
  utterance.pitch = 1.1;
  utterance.rate = 1.2;
  duckMusic(true);
  utterance.onend = () => duckMusic(false);
  window.speechSynthesis.speak(utterance);
};
