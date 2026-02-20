import { aiApiHandlerStreaming, aiApiHandler } from "@/lib/ai-api-handler"
import { models } from "@/lib/models"
import { FORM_SCHEMA_GENERATOR_PROMPT } from "@/lib/prompts/form-gen-prompts"
import { GenerateContentResponse } from "@google/genai"
import { NextResponse } from "next/server"
import { ChatCompletionChunk } from "groq-sdk/resources/chat/completions.mjs"

export async function POST(req: Request) {
  const {
    prompt,
    streaming = true,
    provider = "groq",
  }: {
    prompt: string
    streaming?: boolean
    provider?: "groq" | "gemini"
  } = await req.json()

  if (prompt === undefined || prompt === "") {
    return new Response(JSON.stringify({ message: "Invalid request" }), {
      status: 400,
    })
  }

  try {
    if (streaming) {
      if (provider === "gemini") {
        const stream = await aiApiHandlerStreaming(
          provider,
          {
            system_prompt: FORM_SCHEMA_GENERATOR_PROMPT,
            user_question: prompt,
          },
          models.gemini_models.GEMINI_2_5_FLASH_04_17
        )
        if (!stream) {
          return new Response(
            JSON.stringify({ message: "Error processing request" }),
            {
              status: 500,
            }
          )
        }
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                let textToEnqueue: string | undefined | null = ""
                const chunkData = chunk as GenerateContentResponse
                if (chunkData.candidates && chunkData.candidates.length > 0) {
                  const candidate = chunkData.candidates[0]
                  if (
                    candidate.content &&
                    candidate.content.parts &&
                    candidate.content.parts.length > 0
                  ) {
                    textToEnqueue = candidate.content.parts[0].text
                  }
                }
                if (textToEnqueue) {
                  if (textToEnqueue.includes("```json")) {
                    textToEnqueue = textToEnqueue.replace("```json", "")
                    textToEnqueue = textToEnqueue.replace("```", "")
                    textToEnqueue = textToEnqueue.trim()
                  }
                  if (textToEnqueue.includes("```")) {
                    textToEnqueue = textToEnqueue.replace("```", "")
                    textToEnqueue = textToEnqueue.trim()
                  }
                  controller.enqueue(new TextEncoder().encode(textToEnqueue))
                }
              }
            } catch (error) {
              console.error(error)
              controller.error(error)
            }
          },
        })
        return new NextResponse(readableStream, {
          headers: {
            "Content-Type": "application/json",
            "Transfer-Encoding": "chunked",
          },
        })
      } else if (provider === "groq") {
        const stream = await aiApiHandlerStreaming(
          provider,
          {
            system_prompt: FORM_SCHEMA_GENERATOR_PROMPT,
            user_question: prompt,
          },
          models.groq_models.COMPOUND
        )
        if (!stream) {
          return new Response(
            JSON.stringify({ message: "Error processing request" }),
            {
              status: 500,
            }
          )
        }
        const readableStream = new ReadableStream({
          async start(controller) {
            for await (const chunk of stream) {
              if ((chunk as ChatCompletionChunk).choices[0]?.delta?.content) {
                let content =
                  (chunk as ChatCompletionChunk).choices[0].delta.content || ""
                if (content) {
                  if (content.includes("```json")) {
                    content = content.replace("```json", "")
                    content = content.replace("```", "")
                    content = content.trim()
                  }
                  if (content.includes("```")) {
                    content = content.replace("```", "")
                    content = content.trim()
                  }
                  controller.enqueue(new TextEncoder().encode(content))
                }
              }
            }
            controller.close()
          },
        })

        return new NextResponse(readableStream, {
          headers: {
            "Content-Type": "application/json",
            "Transfer-Encoding": "chunked",
          },
        })
      }
    } else {
      const response = await aiApiHandler(
        "groq",
        {
          system_prompt: FORM_SCHEMA_GENERATOR_PROMPT,
          user_question: prompt,
        },
        models.groq_models.COMPOUND
      )

      return Response.json({ message: response }, { status: 200 })
    }
  } catch (error) {
    console.error(error)
    return Response.json(
      { message: "Error processing request" },
      { status: 500 }
    )
  }
}
