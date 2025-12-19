
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode, GameStage } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';
let sharedAudioCtx: AudioContext | null = null;
let musicInterval: number | null = null;
let musicGainNode: GainNode | null = null;
let currentBPM = 110;

const LOCAL_AJ = {
  slang: ["Gubeer!", "Mokka!", "Vera Level!", "Paavam!", "Sema!", "Gaali!", "Adade!", "Enna ya idhu?", "Oyy!"],
  tutorial: [
    "AJ: Vanga vanga! Welcome to Mind Mash. I am AJ, and this is VJ. VJ: Hello victims! Ready to lose your dignity?",
    "AJ: Step 1: Scan that QR code. If you're too slow, VJ will roast you. VJ: I've already started. Look at their faces.",
    "AJ: Step 2: One player picks a topic. VJ: Choose something logic-less, like your life choices.",
    "AJ: Step 3: Answer fast. Correct gets points. Mokka logic gets burned. VJ: And I have the matches ready.",
    "AJ: Simple right? VJ: For us, yes. For them? We'll see. Let's start!"
  ]
};

const duckMusic = (isSpeaking: boolean) => {
  if (!musicGainNode || !sharedAudioCtx) return;
  const target = isSpeaking ? 0.05 : 0.35;
  musicGainNode.gain.setTargetAtTime(target, sharedAudioCtx.currentTime, 0.4);
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

const getSystemInstruction = (mode: GameMode = GameMode.CONFIDENTLY_WRONG) => {
  const modeContext = mode === GameMode.ACTUALLY_GENIUS 
    ? "This is 'Actually Genius' mode. Find the smartest player (the Clever Bot). VJ is obsessed with high IQ. AJ roasts the low scorers."
    : "This is 'Confidently Wrong' mode. Focus on trickery, funny answers, and mocka logic. AJ loves the chaos. VJ judges everyone's confidence.";

  return `You are two savage hosts, AJ (Male) and VJ (Female).
  ${modeContext}
  Rules:
  1. Always respond as a dialogue: "AJ: [text] VJ: [text]".
  2. Be extremely brief (max 10 words total).
  3. Use heavy Tanglish/Tamil slang (Gubeer, Mokka, Vera Level, Gaali).
  4. VJ is sharper and cynical. AJ is energetic and loud.`;
};

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

export const speakText = async (text: string, mode?: GameMode) => {
  if (!text) return;
  try {
    const ctx = await initAudio();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    duckMusic(true);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Generate multi-speaker TTS for this dialogue: ${text}` }] }],
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

// Added missing export generateLobbyIdleComment used in App.tsx
export const generateLobbyIdleComment = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "The players are taking too long in the lobby. AJ and VJ, give a 1-sentence funny roast to hurry them up.",
      config: { systemInstruction: getSystemInstruction(state.mode) },
    });
    return res.text || "AJ: Enna ya? Start pannungappa! VJ: Time is money, and you have neither.";
  } catch (e) {
    return "AJ: Waiting for you... VJ: Boring.";
  }
};

// Added missing export generateWarmup used in App.tsx
export const generateWarmup = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "Generate one funny, logic-less warmup question for the players.",
      config: { 
        systemInstruction: getSystemInstruction(state.mode) + " Return JSON with key 'question'.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING }
          },
          required: ['question']
        }
      },
    });
    return JSON.parse(res.text || '{"question": "Are you ready for the mash?"}');
  } catch (e) {
    return { question: "AJ: Ready for the mash? VJ: I doubt it." };
  }
};

export const generateIntro = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "AJ and VJ, give a 1-sentence explosive intro.",
      config: { systemInstruction: getSystemInstruction(state.mode) },
    });
    return res.text || "AJ: We are LIVE! VJ: Unfortunately.";
  } catch (e) { return "AJ: We are LIVE! VJ: Let the roasts begin."; }
};

export const generateJoinComment = async (state: GameState, playerName: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Player "${playerName}" joined. Quick roast.`,
      config: { systemInstruction: getSystemInstruction(state.mode) },
    });
    return res.text || `AJ: Welcome ${playerName}! VJ: Another mokka piece.`;
  } catch (e) { return `AJ: ${playerName} is here! VJ: RIP quality.`; }
};

export const generateQuestion = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = state.mode === GameMode.ACTUALLY_GENIUS 
      ? `Generate a real knowledge question about ${state.topic}.`
      : `Generate a tricky or funny logic question about ${state.topic}.`;

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
      correctIndex: 0, explanation: "Logic missing!"
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
