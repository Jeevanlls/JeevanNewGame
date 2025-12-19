import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode } from "./types";

// Always use a new instance and access process.env.API_KEY directly as per guidelines.
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const getSystemInstruction = (state: GameState) => {
  const isChaos = state.mode === GameMode.CONFIDENTLY_WRONG;
  
  return `You are AJ, the host of "MIND MASH: The AJ Show". You speak Tanglish (English + Tamil slang like Mokka, Sema, Gubeer).

  CURRENT MODE: ${state.mode}
  - If CONFIDENTLY_WRONG: Your goal is laughter. Ask absurd, trick, or funny situational questions. Roast players who give "boring correct" answers.
  - If ACTUALLY_GENIUS: Your goal is General Knowledge and Learning. Ask high-quality, challenging GK questions. Be a bit more respectful of intelligence but still witty.

  ENVIRONMENT:
  - Occasion: ${state.occasion || 'A random gathering of humans'}
  - Language: English/Tamil mix.

  PERSONALITY:
  - You are self-learning. You notice who is winning and who is "Mokka."
  - You love arguing. If someone rebuts your judgment, be prepared to defend your logic with more wit.`;
};

// Helper to decode base64 to Uint8Array as per guidelines
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode raw PCM data to AudioBuffer as per guidelines
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateWarmup = async (state: GameState) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "Ask the group 1 environmental question to set the mood (e.g., 'Who is the most likely to cheat in this game?' or 'Who here thinks they are the smartest?').",
    config: { 
      systemInstruction: getSystemInstruction(state), 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          hint: { type: Type.STRING }
        },
        required: ['question', 'hint']
      }
    },
  });
  return JSON.parse(response.text?.trim() || '{}');
};

export const generateTopicOptions = async (state: GameState): Promise<string[]> => {
  const ai = getAI();
  const isChaos = state.mode === GameMode.CONFIDENTLY_WRONG;
  const prompt = isChaos 
    ? "Give 4 hilarious, weird, or embarrassing category names for a funny family game."
    : "Give 4 serious categories for a General Knowledge learning game (e.g., Astrophysics, Tamil History, Global Economics).";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { 
      systemInstruction: getSystemInstruction(state),
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
  });
  return JSON.parse(response.text?.trim() || "[]");
};

export const generateQuestion = async (state: GameState): Promise<GameQuestion> => {
  const ai = getAI();
  const isChaos = state.mode === GameMode.CONFIDENTLY_WRONG;
  const prompt = isChaos
    ? `Create a funny, trick, or situational question for "${state.topic}". The 'correct' answer should be the funniest one.`
    : `Create a high-quality General Knowledge question for "${state.topic}". It should be educational.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { 
      systemInstruction: getSystemInstruction(state), 
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
  return JSON.parse(response.text?.trim() || '{}');
};

export const generateRoast = async (state: GameState, isRebuttal: boolean = false): Promise<string> => {
  const ai = getAI();
  const prompt = isRebuttal 
    ? "A player is arguing with your logic! Give a savage Tanglish rebuttal. Don't back down easily."
    : "The round is over. Roast the people who got it wrong and praise the 'Genius' who got it right.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { systemInstruction: getSystemInstruction(state) },
  });
  return response.text || "I'm literally speechless at this performance.";
};

export const speakText = async (text: string) => {
  try {
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
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    }
  } catch (e) { console.error("TTS Error", e); }
};