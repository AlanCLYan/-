
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function analyzeFriendship(score: number, questionsCount: number) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Context: A friendship quiz between two friends, "詠婷" (the test taker) and "群倫" (the subject).
        Data: 詠婷 scored ${score} out of ${questionsCount}. 
        Topics covered: Memories from 2022-2025, emotional support during dental surgery, movie recommendations ("努拉"), Xiaoyi (小邑) and his mom Su Auntie (蘇阿姨), social media drama (Threads/脆), 12/18 anniversary, and personal growth.
        
        Task: Write a warm, encouraging, and slightly humorous "Friendship Analysis Report".
        Tone: Friendly, heartfelt, and nostalgic.
        Language: Traditional Chinese (Taiwan style).
        
        Instructions:
        1. If the score is high (15+), praise their deep bond and mention how they navigated years of drama together.
        2. If the score is medium (10-14), suggest they grab a coffee at NCCU and catch up on the latest "Xinfangfang" jokes.
        3. If low (<10), tell them to go back to 2022 and restart the chat log.
        4. Mention specific keywords like "小邑", "Threads", "蘇阿姨", "12/18", "萬芳醫院" to make it personalized.
        5. Keep it under 200 words.
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "分析過程中發生了一點小錯誤，但你們從 2022 到 2025 的友誼是無價的！";
  }
}
