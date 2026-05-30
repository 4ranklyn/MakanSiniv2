package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"backend/models"
	"strings"

	"google.golang.org/genai"
)

// GenAIClient is the global Gemini client instance
var GenAIClient *genai.Client

// InitGenAIClient initializes the GenAI client with standard Gemini API key or Vertex AI fallback.
func InitGenAIClient(ctx context.Context, apiKey, project, region string) error {
	var err error
	if apiKey != "" {
		GenAIClient, err = genai.NewClient(ctx, &genai.ClientConfig{
			Backend: genai.BackendGeminiAPI,
			APIKey:  apiKey,
		})
		if err != nil {
			return err
		}
		log.Println("Google GenAI client initialized (Gemini API backend)")
	} else {
		GenAIClient, err = genai.NewClient(ctx, &genai.ClientConfig{
			Backend:  genai.BackendVertexAI,
			Project:  project,
			Location: region,
		})
		if err != nil {
			return err
		}
		log.Printf("Google GenAI client initialized (Vertex AI backend: project=%q, region=%q)\n", project, region)
	}
	return nil
}

// RerankPlacesWithGemini performs semantic reranking of candidate restaurants by asking
// Gemini to score each candidate (0-10) based on how well it matches the user's raw craving.
// Returns a map of place ID -> context score. On any failure, all candidates get a default score of 5.0.
func RerankPlacesWithGemini(ctx context.Context, candidates []models.PlaceCandidate, rawCraving string, tasteProfile string, lang string) map[string]float64 {
	resultMap := make(map[string]float64)

	// Default all candidates to 5.0 (neutral score) as safety net
	for _, c := range candidates {
		resultMap[c.Item.ID] = 5.0
	}

	if len(candidates) == 0 {
		return resultMap
	}

	// Build the candidate list for the prompt
	var candidateList strings.Builder
	for i, c := range candidates {
		candidateList.WriteString(fmt.Sprintf("%d. ID: %q, Nama: %q, Rating: %.1f, Jarak: %.2fkm\n",
			i+1, c.Item.ID, c.Item.Name, c.Item.Rating, c.Dist))
	}

	// Build the user message
	userMsg := fmt.Sprintf("Craving pengguna: %q\n\nDaftar kandidat tempat makan:\n%s", rawCraving, candidateList.String())

	// Add taste profile context if available
	if tasteProfile != "" {
		userMsg += "\nKonteks Preferensi Historis: " + tasteProfile
	}

	contents := []*genai.Content{
		{
			Parts: []*genai.Part{
				{Text: userMsg},
			},
		},
	}

	var sysInstructionText string
	if lang == "en" {
		sysInstructionText = `You are a Semantic Reranker Evaluator for a food recommendation application. Your task is to analyze each food place from the candidates list and provide a contextual score (context_score) from 0 to 10 based on how well the place matches the user's craving.

Consider the following aspects in your analysis:
- How well the food type matches the craving
- Desired vibe/ambiance (place to study, romantic, crowded, etc.)
- Implicit price/budget aspect (cheap, student-friendly, luxurious)
- Portion size or quantity requested
- Other specific characteristics of the user's craving

Score guidelines:
- 0-2: Highly irrelevant to the craving
- 3-4: Slightly relevant
- 5-6: Moderately relevant
- 7-8: Highly relevant
- 9-10: Perfect match with the craving

RETURN THE OUTPUT ONLY AS A CLEAN JSON ARRAY OF OBJECTS, WITH NO MARKDOWN CODE FENCES OR OTHER TEXT:
[{"id": "place_id", "context_score": 7.5}]

Make sure all IDs from the candidate list are present in the output. Do not add markdown formatting or any explanatory text.`
	} else {
		sysInstructionText = `Kamu adalah Semantic Reranker Evaluator untuk aplikasi rekomendasi makanan. Tugasmu adalah menganalisis setiap tempat makan dari daftar kandidat dan memberikan skor kontekstual (context_score) dari 0 sampai 10 berdasarkan seberapa cocok tempat tersebut dengan craving/keinginan pengguna.

Pertimbangkan aspek-aspek berikut dalam analisismu:
- Kesesuaian jenis makanan dengan craving
- Nuansa/suasana yang diminta (tempat nugas, romantis, ramai, dll)
- Aspek harga/budget yang tersirat (murah, mahasiswa, mewah)
- Aspek porsi atau kuantitas yang diminta
- Karakteristik spesifik lainnya dari craving pengguna

Skor panduan:
- 0-2: Sangat tidak relevan dengan craving
- 3-4: Sedikit relevan 
- 5-6: Cukup relevan
- 7-8: Sangat relevan
- 9-10: Sempurna cocok dengan craving

KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON ARRAY BERIKUT, TANPA TEKS LAIN:
[{"id": "place_id", "context_score": 7.5}]

Pastikan semua ID dari daftar kandidat ada di output. Jangan tambahkan markdown formatting atau teks penjelasan apapun.`
	}

	sysInstruction := &genai.Content{
		Parts: []*genai.Part{
			{Text: sysInstructionText},
		},
	}

	genConfig := &genai.GenerateContentConfig{
		SystemInstruction: sysInstruction,
		Temperature:       genai.Ptr(float32(0.3)), // Slightly creative but still deterministic
	}

	resp, err := GenAIClient.Models.GenerateContent(ctx, "gemini-2.0-flash", contents, genConfig)
	if err != nil {
		log.Printf("Semantic reranking Gemini call failed: %v. Using default context scores (5.0).\n", err)
		return resultMap
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		log.Println("Semantic reranking: empty response from Gemini. Using default context scores (5.0).")
		return resultMap
	}

	rawJSON := strings.TrimSpace(resp.Candidates[0].Content.Parts[0].Text)
	log.Printf("Gemini reranking raw response: %s\n", rawJSON)

	// Defensive parsing: strip markdown code fences if Gemini wraps the JSON
	rawJSON = strings.TrimPrefix(rawJSON, "```json")
	rawJSON = strings.TrimPrefix(rawJSON, "```")
	rawJSON = strings.TrimSuffix(rawJSON, "```")
	rawJSON = strings.TrimSpace(rawJSON)

	var rerankResults []models.RerankResult
	if err := json.Unmarshal([]byte(rawJSON), &rerankResults); err != nil {
		log.Printf("Failed to parse Gemini reranking JSON: %v. Raw: %s. Using default context scores (5.0).\n", err, rawJSON)
		return resultMap
	}

	// Merge parsed scores into the result map
	for _, rr := range rerankResults {
		// Clamp score to [0, 10] range
		score := rr.ContextScore
		if score < 0 {
			score = 0
		}
		if score > 10 {
			score = 10
		}
		resultMap[rr.ID] = score
	}

	log.Printf("Semantic reranking complete: %d/%d candidates scored by Gemini\n", len(rerankResults), len(candidates))
	return resultMap
}

// ExtractTagsWithGemini calls the Google GenAI API to clean and tag the craving string.
// If tasteProfile is non-empty, it is appended to the system instruction to personalize results.
func ExtractTagsWithGemini(ctx context.Context, craving string, tasteProfile string, lang string) (string, error) {
	contents := []*genai.Content{
		{
			Parts: []*genai.Part{
				{Text: craving},
			},
		},
	}

	var baseInstruction string
	if lang == "en" {
		baseInstruction = "Extract the craving string into a maximum of 3 food keywords (tags) representing nouns or adjectives, separated by commas. Format: only words separated by commas, no other text or formatting. Example: 'craving warm noodles with rich broth' -> 'noodles, soup, warm'. Focus ONLY on extracting the name of food types or dishes from the user's craving text. Ignore keywords related to price or distance, as those parameters are managed separately by the system."
		if tasteProfile != "" {
			baseInstruction += "\n\nPersonalization Context: " + tasteProfile
		}
	} else {
		baseInstruction = "Extract the craving string into a maximum of 3 food keywords (tags) representing nouns or adjectives, separated by commas. Format: only words separated by commas, no other text or formatting. Example: 'pengen soto anget porsi banyak pas hujan' -> 'soto, sup, hangat'. Fokuslah HANYA pada ekstraksi nama jenis makanan atau nama hidangan saja dari teks craving user. Abaikan kata kunci terkait harga atau jarak, karena parameter tersebut sudah diatur secara terpisah oleh sistem."
		if tasteProfile != "" {
			baseInstruction += "\n\nKonteks Personalisasi: " + tasteProfile
		}
	}

	sysInstruction := &genai.Content{
		Parts: []*genai.Part{
			{Text: baseInstruction},
		},
	}

	config := &genai.GenerateContentConfig{
		SystemInstruction: sysInstruction,
		Temperature:       genai.Ptr(float32(0.1)), // Low temperature for deterministic tag outputs
	}

	resp, err := GenAIClient.Models.GenerateContent(ctx, "gemini-2.0-flash", contents, config)
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from Gemini model")
	}

	return strings.TrimSpace(resp.Candidates[0].Content.Parts[0].Text), nil
}

// AnalyzeCommunityTrends aggregates recent community reviews and asks Gemini
// to produce a short culinary trend summary with 3 trending tags.
func AnalyzeCommunityTrends(ctx context.Context, posts []models.CommunityPost, lang string) (models.TrendsResponse, error) {
	// If no posts exist yet, return a safe default
	if len(posts) == 0 {
		summary := "Belum ada ulasan di komunitas. Jadilah yang pertama membagikan pengalaman kulinermu!"
		if lang == "en" {
			summary = "No reviews in the community yet. Be the first to share your culinary experience!"
		}
		return models.TrendsResponse{
			Summary: summary,
			Tags:    []string{},
		}, nil
	}

	// Aggregate review_text and restaurant_name into a single text block
	var aggregate strings.Builder
	for i, p := range posts {
		aggregate.WriteString(fmt.Sprintf("%d. Ulasan: %q", i+1, p.ReviewText))
		if p.RestaurantName != "" {
			aggregate.WriteString(fmt.Sprintf(" | Tempat: %q", p.RestaurantName))
		}
		aggregate.WriteString("\n")
	}

	userMsg := aggregate.String()
	contents := []*genai.Content{
		{
			Parts: []*genai.Part{
				{Text: userMsg},
			},
		},
	}

	var bahasaParam string
	if lang == "en" {
		bahasaParam = "en"
	} else {
		bahasaParam = "id"
	}

	sysInstructionText := fmt.Sprintf(`Analisis data ulasan komunitas berikut. Hasilkan ringkasan singkat maksimal 2 kalimat mengenai tren rasa saat ini beserta 3 tags relevan. Respons HARUS menggunakan bahasa yang sesuai dengan parameter: %s. Jika 'en', gunakan English. Jika 'id', gunakan Bahasa Indonesia. Respons harus tetap berupa JSON bersih dengan format: { 'summary': '...', 'tags': [...] }. Jangan sertakan pembungkus markdown seperti %sjson atau penjelasan teks tambahan.`, bahasaParam, "```")

	sysInstruction := &genai.Content{
		Parts: []*genai.Part{
			{Text: sysInstructionText},
		},
	}

	genConfig := &genai.GenerateContentConfig{
		SystemInstruction: sysInstruction,
		Temperature:       genai.Ptr(float32(0.4)),
	}

	resp, err := GenAIClient.Models.GenerateContent(ctx, "gemini-2.0-flash", contents, genConfig)
	if err != nil {
		return models.TrendsResponse{}, err
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return models.TrendsResponse{}, fmt.Errorf("empty response from Gemini")
	}

	rawJSON := strings.TrimSpace(resp.Candidates[0].Content.Parts[0].Text)

	// Defensive parsing: strip markdown code fences if Gemini wraps the JSON
	rawJSON = strings.TrimPrefix(rawJSON, "```json")
	rawJSON = strings.TrimPrefix(rawJSON, "```")
	rawJSON = strings.TrimSuffix(rawJSON, "```")
	rawJSON = strings.TrimSpace(rawJSON)

	var trendsResult models.TrendsResponse
	if err := json.Unmarshal([]byte(rawJSON), &trendsResult); err != nil {
		return models.TrendsResponse{}, err
	}

	// Clamp tags to at most 5
	if len(trendsResult.Tags) > 5 {
		trendsResult.Tags = trendsResult.Tags[:5]
	}

	return trendsResult, nil
}
