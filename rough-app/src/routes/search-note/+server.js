// Import Pinecone Client
import { Pinecone } from "@pinecone-database/pinecone";
import { json } from "@sveltejs/kit";
// Initialize Pinecone Client


// Function to get text embeddings
async function getEmbedding(pc, texts) {
    let response = await pc.inference.embed(
        "multilingual-e5-large", 
        texts.map(d => d.text),
        {inputType: 'query', truncate: 'END'}
      );
    
        response=response.data;
    
        let n=response.length, i=0 ;
        let arr=[];
        
        for(i=0;i<n;i++)
         {
          arr.push(response[i].values);
         }
         return arr;
    }
    
    

// Function to insert a note into Pinecone

export async function POST({ request }) {
    try {
        const { apiKey, text } = await request.json();
        const pc = new Pinecone({ apiKey });
        let texts = [{text}];

        // Wait for the embedding to be generated
        const vector = await getEmbedding(pc, texts);
        const index = pc.index("rough-man");

        // Query Pinecone for matches
        const response = await index.query({
            vector: vector[0],
            topK: 80,
            includeMetadata: true,
        });

        // Collect all unique full_text entries from metadata
        var matches = [];
        var matchesWithMetadata = [];

        for(let idx = 0; idx < response.matches.length; idx++){
            const match = response.matches[idx];
            if(match.id.includes("-") && match.metadata?.full_text) {
                matches.push(match.metadata.full_text);
                matchesWithMetadata.push({
                    id: match.id,
                    score: match.score,
                    metadata: match.metadata,
                    text: match.metadata.full_text
                });
            }
        }

        // Remove duplicates
        matches = [...new Set(matches)];

        // If this is a user search, prioritize exact user matches
        if (text.startsWith("User:")) {
            const exactUserMatches = matchesWithMetadata.filter(match =>
                match.metadata.full_text && match.metadata.full_text.includes(text)
            );

            if (exactUserMatches.length > 0) {
                // Return the exact user matches with full metadata
                return json({
                    matches: exactUserMatches.map(match => ({
                        id: match.id,
                        score: match.score,
                        metadata: {
                            text: match.metadata.full_text,
                            full_text: match.metadata.full_text,
                            note_id: match.metadata.note_id,
                            chunk_index: match.metadata.chunk_index
                        }
                    })),
                    data: matches
                });
            }
        }

        // For general searches, use reranking
        var documents = [];
        const rerankingModel = 'bge-reranker-v2-m3';
        for (let index = 0; index < matches.length; index++){
            documents.push({id:'vec'+index, text: matches[index]});
        }

        const query = text;
        const rerankOptions = {
            topN: 80,
            returnDocuments: true,
            parameters: {
                truncate: 'END'
            },
        };

        const response2 = await pc.inference.rerank(
            rerankingModel,
            query,
            documents,
            rerankOptions
        );

        matches = [];
        for(let index = 0; index < response2.data.length; index++){
            matches.push(response2.data[index].document?.text);
        }

        return json({
            matches: matchesWithMetadata,
            data: [...new Set(matches)]
        });
    } catch (error) {
        console.error("Error searching note:", error);
        return json({ error: error.message || String(error) }, { status: 500 });
    }
}
