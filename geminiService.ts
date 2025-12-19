
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const getSystemInstruction = (state: GameState) => {
  const isChaos = state.mode === GameMode.CONFIDENTLY_WRONG;
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  const leader = sortedPlayers[0];
  const tail = sortedPlayers[sortedPlayers.length - 1];
  
  const roomVibe = state.players.length > 3 ? "Party Mode" : "Intimate Gathering";

  return `You are AJ, the high-energy, savage AI host of "MIND MASH: The AJ Show". 
  You speak Tanglish (English + Tamil slang like Mokka, Sema, Gubeer, Otha, Nanba).

  ROOM INTEL:
  - Players: ${state.players.length}. Names: ${state.players.map(p => p.name).join(", ")}
  - Leader: ${leader ? leader.name : "None"}. Loser: ${tail ? tail.name : "None"}.
  - Mode: ${state.mode}. Round: ${state.round}.

  AJ'S BEHAVIOR:
  1. Be a TV SHOW HOST. High energy. Loud. Sarcastic.
  2. SELF-LEARNING: If players are joining, roast their names or their "vibe".
  3. LANGUAGE: Mix English and Tamil. "Enna ya idhu?" for confusion, "Vera level" for excitement.
  4. Max 15 words per response. Sharp and funny.`;
};

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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

export const generateIntro = async (state: GameState) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: "AJ, welcome the world to Mind Mash. Be high energy and bilingual. Mention it's time to mash some brains.",
    config: { systemInstruction: getSystemInstruction(state), thinkingConfig: { thinkingBudget: 0 } },
  });
  return response.text || "Welcome to Mind Mash! Let's get savage.";
};

export const generateJoinComment = async (state: GameState, playerName: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: `Player "${playerName}" just joined the lobby. Welcome them with a short, bilingual roast.`,
    config: { systemInstruction: getSystemInstruction(state), thinkingConfig: { thinkingBudget: 0 } },
  });
  return response.text || `Welcome ${playerName}. Let's see if you have any brain cells.`;
};

export const generateWarmup = async (state: GameState) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: "AJ, stir up drama with a 'Who in this room' question.",
    config: { 
      systemInstruction: getSystemInstruction(state), 
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.OBJECT,
        properties: { question: { type: Type.STRING }, hint: { type: Type.STRING } },
        required: ['question', 'hint']
      }
    },
  });
  return JSON.parse(response.text?.trim() || '{}');
};

export const generateTopicOptions = async (state: GameState): Promise<string[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: "Suggest 4 categories based on the room's current intelligence vibe.",
    config: { 
      systemInstruction: getSystemInstruction(state),
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
  });
  return JSON.parse(response.text?.trim() || "[]");
};

export const generateQuestion = async (state: GameState): Promise<GameQuestion> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: `Topic: "${state.topic}". Make it ${state.mode}.`,
    config: { 
      systemInstruction: getSystemInstruction(state), 
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          textEn: { type: Type.STRING }, textTa: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { en: { type: Type.STRING }, ta: { type: Type.STRING } },
              required: ['en', 'ta']
            }
          },
          correctIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING }
        },
        required: ['textEn', 'textTa', 'options', 'correctIndex', 'explanation']
      }
    },
  });
  return JSON.parse(response.text?.trim() || '{}');
};

export const generateRoast = async (state: GameState, isRebuttal: boolean = false): Promise<string> => {
  const ai = getAI();
  const prompt = isRebuttal ? "Destroy a player's logic." : "Roast the scoreboard results.";
  const response = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: prompt,
    config: { systemInstruction: getSystemInstruction(state), thinkingConfig: { thinkingBudget: 0 } },
  });
  return response.text || "Mokka performance. Next.";
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
  } catch (e) { console.error("TTS Fail:", e); }
};
