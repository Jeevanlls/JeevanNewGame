
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameState, GameQuestion, Language, GameMode } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemPrompt = (state: GameState) => {
  const playerInfo = state.players.map(p => `${p.name} (Age: ${p.age})`).join(", ");
  const base = `You are AJ, a world-class AI game host. Current players: ${playerInfo}. 
  You speak Tanglish (mix of Tamil and English). 
  STRICT RULE: Never repeat topics or facts listed in the Game History.`;

  if (state.mode === GameMode.CHAOS) {
    return `${base} You are in CHAOS MODE. You are sarcastic, funny, and love to roast players. Be a bit 'naughty' with your jokes but stay family-friendly. Use terms like 'Mokka', 'Sema', 'Attakaasam'.`;
  } else {
    return `${base} You are in GENIUS MODE. You are Professor AJ—wise, encouraging, and sophisticated. You share deep knowledge and treat the game like a prestigious academy.`;
  }
};

export const generateTopicOptions = async (state: GameState): Promise<string[]> => {
  const historyFilter = state.history.length > 0 ? `DO NOT choose anything related to: ${state.history.join(", ")}.` : "";
  const prompt = state.mode === GameMode.CHAOS 
    ? `AJ, give me 4 funny, weird topics (3 words max) for a roast. ${historyFilter}`
    : `Professor AJ, provide 4 intellectual, deep categories for a scholarly challenge. ${historyFilter}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Using Pro for better variety and memory
    contents: prompt + " Return as JSON array of 4 strings.",
    config: { 
      systemInstruction: getSystemPrompt(state),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
  });
  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return ["General Knowledge", "Movies", "Sports", "Culture"];
  }
};

export const generateQuestion = async (state: GameState): Promise<GameQuestion> => {
  const historyFilter = state.history.length > 0 ? `STRICT: Do not repeat these previous themes/questions: ${state.history.join(", ")}.` : "";
  const modeModifier = state.mode === GameMode.CHAOS 
    ? "Create a tricky, funny question with sarcastic options. Make it hard so I can roast them later."
    : "Create a fascinating, factual question. Provide a detailed 'explanation' in Tanglish for the 'Professor's Moment'.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Topic: ${state.topic}. ${modeModifier} ${historyFilter}
    Return JSON: { "textEn": "...", "textTa": "...", "options": [{"en": "..", "ta": ".."}, ...], "correctIndex": 1-10, "explanation": "..." }`,
    config: {
      systemInstruction: getSystemPrompt(state),
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text || '{}');
};

export const generateRoast = async (state: GameState) => {
  const picker = state.players.find(p => p.id === state.topicPickerId);
  const results = state.players.map(p => `${p.name} guessed #${p.lastAnswer}`).join(", ");
  const content = state.mode === GameMode.CHAOS
    ? `The correct answer was #${state.currentQuestion?.correctIndex}. Here are the guesses: ${results}. Roast them savagely in Tanglish, especially ${picker?.name} who picked this topic!`
    : `The correct answer was #${state.currentQuestion?.correctIndex}. ${results}. Celebrate the winners and explain why: ${state.currentQuestion?.explanation}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: content,
    config: { systemInstruction: getSystemPrompt(state) },
  });
  return response.text || "";
};

export const generateIQBoard = async (state: GameState) => {
  const playerStats = state.players.map(p => `${p.name} (Score: ${p.score}, Age: ${p.age})`).join(", ");
  const prompt = state.mode === GameMode.CHAOS
    ? `Look at these scores: ${playerStats}. Assign each player a hilarious 'Mokka' title and explain why they are failing at life in a funny way.`
    : `Evaluate these scholars: ${playerStats}. Give them prestigious titles like 'Sovereign of Science' or 'Grandmaster of History' and praise their intellect.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { systemInstruction: getSystemPrompt(state) },
  });
  return response.text || "";
};

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
  } catch (e) { console.error(e); }
};
