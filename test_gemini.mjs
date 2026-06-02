import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

let apiKey = "";
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf-8");
  const match = envContent.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);
  if (match) {
    apiKey = match[1].trim();
  }
} catch (e) {
  console.error("Could not read .env.local file:", e.message);
}

console.log("Using API Key starting with:", apiKey ? apiKey.substring(0, 10) + "..." : "undefined");

if (!apiKey) {
  console.error("No API Key found!");
  process.exit(1);
}

try {
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: "Hello, test this connection.",
  });
  console.log("Success! Response text:", response.text);
} catch (error) {
  console.error("Gemini API Call Failed!");
  console.error(error);
}
