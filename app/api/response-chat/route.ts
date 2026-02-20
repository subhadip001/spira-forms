import { aiApiHandlerStreaming, aiApiHandler } from "@/lib/ai-api-handler"
import { models } from "@/lib/models"
import {
  RESPONSE_CHAT_SYSTEM_PROMPT,
  RESPONSE_CHAT_USER_PROMPT,
} from "@/lib/prompts/csv-prompts"
import { FORM_SCHEMA_GENERATOR_PROMPT } from "@/lib/prompts/form-gen-prompts"
import { NextResponse } from "next/server"
import { ChatCompletionChunk } from "groq-sdk/resources/chat/completions.mjs"

export async function POST(req: Request) {
  const {
    xml,
    prompt,
    streaming = true,
  }: { xml: string; prompt: string; streaming?: boolean } = await req.json()

  if (prompt === undefined || prompt === "") {
    return new Response(JSON.stringify({ message: "Invalid request" }), {
      status: 400,
    })
  }

  const userPrompt = RESPONSE_CHAT_USER_PROMPT.replace(
    "{{CSV_XML}}",
    xml
  ).replace("{{USER_QUERY}}", prompt)

  try {
    if (streaming) {
      const stream = await aiApiHandlerStreaming(
        "groq",
        {
          system_prompt: RESPONSE_CHAT_SYSTEM_PROMPT,
          user_question: userPrompt,
        },
        models.groq_models.LLAMA_4_SCOUT_17B_16E_INSTRUCT
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
              const content =
                (chunk as ChatCompletionChunk).choices[0].delta.content || ""
              if (content) {
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

    const response = await aiApiHandler(
      "groq",
      {
        system_prompt: RESPONSE_CHAT_SYSTEM_PROMPT,
        user_question: userPrompt,
      },
      models.groq_models.LLAMA_4_SCOUT_17B_16E_INSTRUCT
    )

    return Response.json({ message: response }, { status: 200 })
  } catch (error) {
    console.error(error)
    return Response.json(
      { message: "Error processing request" },
      { status: 500 }
    )
  }
}
