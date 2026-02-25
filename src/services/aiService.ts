import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export interface AIAnalysisResult {
  summary: string;
  tags: string[];
  category: string;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A brief description or summary (2-3 sentences)",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Relevant keywords (5-7 tags)",
    },
    category: {
      type: Type.STRING,
      description: "A single word category (e.g., nature, tech, document, etc.)",
    },
  },
  required: ["summary", "tags", "category"],
};

export const analyzeImage = async (base64Data: string, mimeType: string): Promise<AIAnalysisResult> => {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }
  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          text: "Analyze this image and provide a summary, tags, and a category in JSON format.",
        },
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  return JSON.parse(response.text || '{}') as AIAnalysisResult;
};

export const analyzeText = async (text: string): Promise<AIAnalysisResult> => {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this text and provide a summary, tags, and a category in JSON format:\n\n${text.slice(0, 10000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  return JSON.parse(response.text || '{}') as AIAnalysisResult;
};
