import Groq from "groq-sdk"
import { models } from "./models"
import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { GoogleGenAI } from "@google/genai"

export const createGroqChatCompletionStreaming = async (
  system_prompt: string,
  user_question: string,
  model = models.groq_models.LLAMA_4_SCOUT_17B_16E_INSTRUCT
) => {
  const API_KEY = process.env.GROQ_API_KEY
  const groq = new Groq({ apiKey: API_KEY })

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: system_prompt,
      },
      {
        role: "user",
        content: user_question,
      },
    ],
    model: model,
    temperature: 0.3,
    stream: true,
    stop: null,
  })

  return chatCompletion
}

export const createGroqChatCompletion = async (
  system_prompt: string,
  user_question: string,
  model = models.groq_models.LLAMA_4_SCOUT_17B_16E_INSTRUCT
) => {
  const API_KEY = process.env.GROQ_API_KEY
  const groq = new Groq({ apiKey: API_KEY })

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: system_prompt,
        },
        {
          role: "user",
          content: user_question,
        },
      ],
      model: model,
      temperature: 0.3,
      max_tokens: 8192,
      // top_p: 1,
      stream: false,
      stop: null,
    })
    return chatCompletion.choices[0].message.content
  } catch (error) {
    console.error("Error:", error)
    return ""
  }
}

export async function createAnthropicResponse(
  system_prompt: string,
  user_question: string
) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const response = await anthropic.messages.create({
    messages: [{ role: "user", content: user_question }],
    model: models.anthropic_models.CLAUDE_3_5_SONNET,
    stream: false,
    max_tokens: 8192,
    system: system_prompt,
    temperature: 0.2,
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}

export async function createAnthropicResponseStreaming(
  system_prompt: string,
  user_question: string
) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const response = await anthropic.messages.create({
    messages: [{ role: "user", content: user_question }],
    model: models.anthropic_models.CLAUDE_3_5_SONNET,
    stream: true,
    max_tokens: 8192,
    system: system_prompt,
    temperature: 0.2,
  })

  return response
}

export async function createOpenAIChatCompletion(
  system_prompt: string,
  user_question: string
) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  const response = await openai.chat.completions.create({
    messages: [
      { role: "system", content: system_prompt },
      { role: "user", content: user_question },
    ],
    model: models.openai_models.GPT_5_NANO,
    stream: false,
  })
  return response.choices[0].message.content
}

export async function createOpenAIChatCompletionStreaming(
  system_prompt: string,
  user_question: string
) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  const response = await openai.chat.completions.create({
    messages: [
      { role: "system", content: system_prompt },
      { role: "user", content: user_question },
    ],
    model: models.openai_models.GPT_5_NANO,
    stream: true,
  })
  return response
}

export async function createGeminiChatCompletion(
  system_prompt: string,
  user_question: string,
  model = models.gemini_models.GEMINI_2_0_FLASH
) {
  const API_KEY = process.env.GEMINI_API_KEY
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set")
  }

  const genai = new GoogleGenAI({ apiKey: API_KEY })

  try {
    const response = await genai.models.generateContent({
      model: model,
      contents: [
        {
          role: "user",
          parts: [{ text: system_prompt }, { text: user_question }],
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
    })

    return response.text || ""
  } catch (error) {
    console.error("Error:", error)
    return ""
  }
}

export async function createGeminiChatCompletionStreaming(
  system_prompt: string,
  user_question: string,
  model = models.gemini_models.GEMINI_2_0_FLASH
) {
  const API_KEY = process.env.GEMINI_API_KEY
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set")
  }

  const genai = new GoogleGenAI({ apiKey: API_KEY })

  const response = await genai.models.generateContentStream({
    model: model,
    contents: [
      {
        role: "user",
        parts: [{ text: system_prompt }, { text: user_question }],
      },
    ],
    config: {
      temperature: 0.2,
      maxOutputTokens: 4000,
    },
  })

  return response
}
