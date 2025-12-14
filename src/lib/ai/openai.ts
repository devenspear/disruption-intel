import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate text if too long
  const maxLength = 8000
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: truncatedText,
  })

  return response.data[0].embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const maxLength = 8000
  const truncatedTexts = texts.map((t) =>
    t.length > maxLength ? t.substring(0, maxLength) : t
  )

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: truncatedTexts,
  })

  return response.data.map((d) => d.embedding)
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  // Convert Buffer to Uint8Array which is compatible with File
  const uint8Array = new Uint8Array(audioBuffer)
  const blob = new Blob([uint8Array], { type: "audio/mpeg" })
  const file = new File([blob], "audio.mp3", { type: "audio/mpeg" })

  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
  })

  return response.text
}
