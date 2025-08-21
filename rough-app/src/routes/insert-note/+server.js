// Import Pinecone Client
import { Pinecone } from "@pinecone-database/pinecone"
import { json } from "@sveltejs/kit"
// Initialize Pinecone Client

// Function to chunk a long text into smaller parts
function chunkText(text, chunkSize = 30) {
  const words = text.split(" ")
  const chunks = []
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push({ text: words.slice(i, i + chunkSize).join(" ") })
  }
  return chunks
}

// Function to get text embeddings
async function getEmbedding(pc, texts) {
  let response = await pc.inference.embed(
    "multilingual-e5-large",
    texts.map((d) => d.text),
    { inputType: "query", truncate: "END" },
  )

  response = response.data

  let n = response.length,
    i = 0
  const arr = []

  for (i = 0; i < n; i++) {
    arr.push(response[i].values)
  }
  return arr
}

// Function to insert a note into Pinecone
export async function POST({ request }) {
  try {
    const { apiKey, fullText } = await request.json()

    if (!apiKey || !fullText) {
      return json({ error: "Missing apiKey or fullText" }, { status: 400 })
    }

    const pc = new Pinecone({
      apiKey: apiKey,
    })
    let chunked = []
    chunked = chunkText(fullText)
    const index = pc.index("rough-man")
    const vectors = await getEmbedding(pc, chunked)

    let noteId = Date.now() // Use timestamp as unique ID
    try {
      const fetchResult = await index.fetch(["count"])
      if (fetchResult.records && fetchResult.records.count && fetchResult.records.count.metadata?.count) {
        noteId = Number.parseInt(fetchResult.records.count.metadata.count) + 1
      }
    } catch (countError) {
      console.warn("Could not fetch count, using timestamp:", countError)
      // noteId already set to timestamp above
    }

    const records = []
    for (let i = 0; i < vectors.length; i++) {
      records.push({
        id: `${noteId}-${i}`,
        values: vectors[i],
        metadata: { note_id: noteId, full_text: fullText, chunk_index: i },
      })
    }

    await index.upsert(records)

    try {
      await index.upsert([{ id: "count", values: vectors[0], metadata: { count: noteId + 1 } }])
    } catch (countUpdateError) {
      console.warn("Could not update count:", countUpdateError)
      // Continue anyway, the note was still inserted
    }

    console.log("Note stored successfully!")
    return json({ message: `Note inserted successfully!`, noteId: noteId })
  } catch (error) {
    console.error("Error inserting note:", error)
    return json({ error: error.message || String(error) }, { status: 500 })
  }
}
