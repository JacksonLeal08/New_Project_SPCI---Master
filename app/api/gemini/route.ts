import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Dynamic initialization to avoid crashing if API key is not yet set
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemInstruction } = await req.json();
    
    const client = getAiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: systemInstruction ? {
        systemInstruction: systemInstruction
      } : undefined
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate content from AI" },
      { status: 500 }
    );
  }
}
