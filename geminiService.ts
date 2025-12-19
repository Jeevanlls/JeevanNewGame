
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode } from "./types";

// Create instance inside functions or ensure it handles missing keys gracefully
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY is missing. Please check Vercel Environment Variables.");
  return new GoogleGenAI({ apiKey });
};

const getSystemPrompt = (state: GameState) => {
  const players = state.players.sort((a,b) => b.score - a.score);
  const winner = players[0]?.name || "nobody";
  const loser = players[players.length - 1]?.name || "nobody";
  
  const base = `You are AJ, a witty AI host for a family game. 
  CURRENT RANKINGS: 
  - Leader: ${winner} (Score: ${players[0]?.score || 0})
  - Struggling: ${loser} (Score: ${players[players.length-1]?.score || 0})
  Language: Tanglish (Tamil + English).
  Game History: ${state.history.join(", ")}.`;

  if (state.mode === GameMode.CHAOS) {
    return `${base} 
    PERSONALITY: Savage, funny, 'Confidently Wrong'. 
    LEARNING GOAL: Roast ${loser} for their low score and suggest ${winner} might be cheating. 
    Use terms like 'Mokka', 'Sema', 'Attakaasam'. Be high energy!`;
  } else {
    return `${base} 
    PERSONALITY: Professor AJ, academic, elite. 
    LEARNING GOAL: Praise ${winner} for their intellectual dominance and offer ${loser} a 'scholarship' of easier questions (jokingly). 
    Use sophisticated English mixed with formal Tamil.`;
  }
};

export const generateTopicOptions = async (state: GameState): Promise<string[]> => {
  const ai = getAI();
  const prompt = state.mode === GameMode.CHAOS 
    ? "Generate 4 funny, weird topics. Return as JSON array of strings."
    : "Generate 4 serious, intellectual categories. Return as JSON array of strings.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { 
      systemInstruction: getSystemPrompt(state),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
  });
  return JSON.parse(response.text || "[]");
};

export const generateQuestion = async (state: GameState): Promise<GameQuestion> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Topic: ${state.topic}. Generate a question with 5-10 options. Return JSON: { "textEn": "...", "textTa": "...", "options": [{"en": "..", "ta": ".."}], "correctIndex": 1-10, "explanation": "..." }`,
    config: {
      systemInstruction: getSystemPrompt(state),
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text || '{}');
};

export const generateRoast = async (state: GameState) => {
  const ai = getAI();
  const results = state.players.map(p => `${p.name} guessed ${p.lastAnswer}`).join(", ");
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Correct answer was ${state.currentQuestion?.correctIndex}. Player guesses: ${results}. Give a 30-second Tanglish commentary.`,
    config: { systemInstruction: getSystemPrompt(state) },
  });
  return response.text || "";
};

export const generateIQBoard = async (state: GameState) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: "The game is over. Look at the scores and give a final, hilarious Tanglish summary of everyone's performance.",
    config: { systemInstruction: getSystemPrompt(state) },
  });
  return response.text || "";
};

// Internal decoding helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; }
  }
  return buffer;
}

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
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContext.destination);
      source.start();
    }
  } catch (e) { console.error("TTS Error:", e); }
};
