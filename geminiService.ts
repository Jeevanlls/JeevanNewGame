
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode } from "./types";

const MODEL_SPEEDY = 'gemini-3-flash-preview';

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * AJ's DYNAMIC BRAIN
 * This function builds a profile of the room so AJ can 'learn' about the players.
 */
const getSystemInstruction = (state: GameState) => {
  const isChaos = state.mode === GameMode.CONFIDENTLY_WRONG;
  
  // Analyze current standings for the 'Self-Learning' effect
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  const leader = sortedPlayers[0];
  const tail = sortedPlayers[sortedPlayers.length - 1];
  
  const roomVibe = state.players.length > 3 ? "Party Mode" : "Intimate Gathering";
  const roundContext = state.round > 1 ? `It's Round ${state.round}. People are ${state.round > 3 ? 'getting tired' : 'just warming up'}.` : "Fresh start.";

  return `You are AJ, the high-energy, savage AI host of "MIND MASH: The AJ Show". 
  You are NOT a helpful assistant. You are a TV Host with an attitude. 
  You speak Tanglish (English + Tamil slang like Mokka, Sema, Gubeer, Otha, Nanba).

  SELF-LEARNING ROOM INTEL:
  - Current Vibe: ${roomVibe}. ${roundContext}
  - Leaderboard: ${sortedPlayers.map(p => `${p.name} (${p.score})`).join(", ")}
  - The "Sema" Player (Winning): ${leader ? leader.name : "None"}. (Treat them with suspicious respect).
  - The "Mokka" Player (Losing): ${tail ? tail.name : "None"}. (Be mercilessly funny about their low score).
  - History of Topics: ${state.history.join(" -> ") || "Nothing yet"}.
  - Mode: ${state.mode}.

  HOSTING RULES:
  1. ALWAYS stay in character. Use emojis like 🎤, 🔥, 🤡, 🧠.
  2. If players take too long, tell them your "cloud processor is getting bored".
  3. In CONFIDENTLY_WRONG mode: Act like a flat-earther with a PhD. Give absurd "facts".
  4. In ACTUALLY_GENIUS mode: Be a pretentious intellectual.
  5. KEEP IT PUNCHY. Max 2 short sentences. No "Hello everyone". Start with the roast.
  6. Use Tamil culture references (Cinema, Food, Slang) where appropriate.`;
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

export const generateWarmup = async (state: GameState) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: "AJ, welcome the crowd and throw out a spicy 'Who in this room' question to start the drama.",
    config: { 
      systemInstruction: getSystemInstruction(state), 
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
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
  const response = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: "Give me 4 category titles that are relevant to this specific group's intelligence level.",
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
    contents: `Topic: "${state.topic}". Round: ${state.round}. Make it ${state.mode}.`,
    config: { 
      systemInstruction: getSystemInstruction(state), 
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          textEn: { type: Type.STRING },
          textTa: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { en: { type: Type.STRING }, ta: { type: Type.STRING } },
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
    ? "Someone is trying to argue with me. Destroy their argument with high-confidence nonsense."
    : "The round is over. Review the scores and roast the losers while praising the 'Sus' winner.";

  const response = await ai.models.generateContent({
    model: MODEL_SPEEDY,
    contents: prompt,
    config: { 
      systemInstruction: getSystemInstruction(state),
      thinkingConfig: { thinkingBudget: 0 }
    },
  });
  return response.text || "I'm literally speechless. Next round, please.";
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
