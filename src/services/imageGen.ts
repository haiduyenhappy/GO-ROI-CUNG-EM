import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateMascot() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: 'A very cute 3D robot named Bobi, mascot for a children\'s app. Bobi has a rounded body, big glowing blue eyes, and a friendly smile. Color scheme is blue and white. Child-friendly, expressive, and welcoming, like a best friend. High quality 3D render, soft lighting, simple light background.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating mascot:", error);
    return null;
  }
}
