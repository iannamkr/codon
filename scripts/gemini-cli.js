#!/usr/bin/env node

import * as dotenv from "dotenv";
import * as readline from "readline";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

dotenv.config({ path: envPath });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY 환경변수를 설정해주세요");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chat(userMessage) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "API 요청 실패");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "(응답 없음)";
    console.log("\n🤖 Gemini:", text);
  } catch (error) {
    console.error("❌ 오류:", error.message);
  }
}

function prompt() {
  rl.question("\n👤 당신: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      console.log("👋 종료합니다");
      rl.close();
      process.exit(0);
    }

    if (input.trim()) {
      await chat(input);
    }

    prompt();
  });
}

console.log("🧬 Dawchkins Gemini CLI");
console.log('메시지를 입력하세요 (종료: "exit")');

prompt();
