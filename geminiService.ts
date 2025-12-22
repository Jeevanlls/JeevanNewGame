
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode, GameStage, Player } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';
let sharedAudioCtx: AudioContext | null = null;
let musicInterval: number | null = null;
let musicGainNode: GainNode | null = null;
let currentBPM = 110;

const duckMusic = (isSpeaking: boolean) => {
  if (!musicGainNode || !sharedAudioCtx) return;
  const target = isSpeaking ? 0.03 : 0.35; // Increased base volume
  musicGainNode.gain.setTargetAtTime(target, sharedAudioCtx.currentTime, 0.2);
};

export const updateBGM = (stage: GameStage, urgency: number = 0, isPaused: boolean = false) => {
  if (!sharedAudioCtx) return;
  
  if (isPaused) {
    if (musicGainNode) musicGainNode.gain.setTargetAtTime(0, sharedAudioCtx.currentTime, 0.5);
    return;
  }
  
  if (!musicGainNode) {
    musicGainNode = sharedAudioCtx.createGain();
    musicGainNode.gain.setValueAtTime(0.35, sharedAudioCtx.currentTime);
    musicGainNode.connect(sharedAudioCtx.destination);
  } else {
    musicGainNode.gain.setTargetAtTime(0.35, sharedAudioCtx.currentTime, 0.5);
  }
  
  let bpm = 110;
  if (stage === GameStage.QUESTION) bpm = 128; 
  if (stage === GameStage.REVEAL) bpm = 145;
  if (stage === GameStage.TOPIC_SELECTION) bpm = 115;
  if (stage === GameStage.LOADING) bpm = 150;

  if (bpm === currentBPM && musicInterval) return;
  
  currentBPM = bpm;
  if (musicInterval) clearInterval(musicInterval);
  const interval = (60 / bpm) * 1000;
  let beat = 0;

  musicInterval = window.setInterval(() => {
    if (!sharedAudioCtx || !musicGainNode) return;
    const time = sharedAudioCtx.currentTime;
    
    // Kick Drum (Thumping radio bass)
    if (beat % 4 === 0) {
      const osc = sharedAudioCtx.createOscillator();
      const g = sharedAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
      g.gain.setValueAtTime(0.6, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.connect(g); g.connect(musicGainNode!);
      osc.start(time); osc.stop(time + 0.3);
    }
    
    // Snare/Hat (Crunchy radio static beat)
    if (beat % 4 === 2 || beat % 8 === 7) {
      const noise = sharedAudioCtx.createBufferSource();
      const buffer = sharedAudioCtx.createBuffer(1, sharedAudioCtx.sampleRate * 0.1, sharedAudioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      const g = sharedAudioCtx.createGain();
      g.gain.setValueAtTime(0.1, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      noise.connect(g); g.connect(musicGainNode!);
      noise.start(time); noise.stop(time + 0.1);
    }

    // Melodic Synth (Techno radio vibe)
    if (beat % 16 === 0 || beat % 16 === 3 || beat % 16 === 10) {
      const osc = sharedAudioCtx.createOscillator();
      const g = sharedAudioCtx.createGain();
      osc.type = 'square';
      const freqs = [110, 130, 165, 196];
      osc.frequency.setValueAtTime(freqs[Math.floor(Math.random() * freqs.length)], time);
      g.gain.setValueAtTime(0.05, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
      osc.connect(g); g.connect(musicGainNode!);
      osc.start(time); osc.stop(time + 0.5);
    }

    beat = (beat + 1) % 16;
  }, interval / 2);
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
  const modeVibe = state.mode === GameMode.ACTUALLY_GENIUS 
    ? "MODE: ACTUALLY GENIUS. Reward high-IQ logic. Roast the gubeers."
    : "MODE: CONFIDENTLY WRONG. Reward the biggest mokka answer. Smart answers get roasted.";

  return `You are AJ and VJ, Chennai's #1 radio host duo. 
  AJ: Aggressive, high-energy, uses "Dei", "Logic Piece", "Gaali".
  VJ: Sarcastic, lazy, loves "Mokka", "Gubeer", "Semma scene-u".
  MANDATORY: Speak in Tanglish (50% Tamil slang, 50% English). 
  CONTEXT: Round ${state.round} of Mind Mash. Topic: ${state.topic || 'Random Logic'}.
  ${modeVibe}
  Max 10 words total. Break-neck speed energy.`;
};

export const speakText = async (text: string, mode: GameMode = GameMode.CONFIDENTLY_WRONG) => {
  if (!text) return;
  try {
    const ctx = await initAudio();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    duckMusic(true);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `High Energy Radio Duo: ${text}` }] }],
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
      source.onended = () => {
        duckMusic(false);
      };
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
      contents: `Quick reaction to: ${event}. Tanglish slang only.`,
      config: { systemInstruction: getSystemInstruction(state) },
    });
    return res.text || "AJ: Logic gaali! VJ: Semma mokka logic piece.";
  } catch (e) { return "AJ: Live on air! VJ: Mic check logic."; }
};

export const generateTopicOptions = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: "List 3 crazy radio game topics in Tanglish Slang.",
      config: { 
        systemInstruction: "Return JSON array of 3 strings.",
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
    });
    return JSON.parse(res.text || '["Cinema Mokka", "Food Crimes", "Logic Piece Test"]');
  } catch (e) { return ["Cinema", "Food", "Logic"]; }
};

export const generateQuestion = async (state: GameState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: MODEL_SPEEDY,
      contents: `Generate a savage question for topic: ${state.topic}. Mode: ${state.mode}.`,
      config: { 
        systemInstruction: getSystemInstruction(state) + " Return JSON. textEn must be Tanglish.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textEn: { type: Type.STRING },
            textTa: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  en: { type: Type.STRING }, 
                  ta: { type: Type.STRING } 
                },
                required: ['en', 'ta']
              } 
            },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ['textEn', 'textTa', 'options', 'correctIndex', 'explanation']
        }
      },
    });
    const parsed = JSON.parse(res.text || '{}');
    if (!parsed.options || parsed.options.length < 2) throw new Error("Invalid Question Format");
    return parsed;
  } catch (e) { 
    console.error("AI Question Failed, using fallback", e);
    return { 
      textEn: "Which logic piece here is the biggest mokka?", 
      textTa: "இதில் எது பெரிய மொக்கை லாஜிக்?", 
      options: [
        {en: "Me", ta: "நான்"}, 
        {en: "This Game", ta: "இந்த கேம்"},
        {en: "AJ's Face", ta: "AJ-வின் முகம்"},
        {en: "VJ's Voice", ta: "VJ-வின் குரல்"}
      ], 
      correctIndex: 0, 
      explanation: "Exactly! Logic is fully gaali today." 
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
