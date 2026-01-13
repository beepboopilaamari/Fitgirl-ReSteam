import { GoogleGenerativeAI } from '@google/generative-ai';
import { Game } from '../../shared/types';

export class GeminiRecommendationService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string = '';

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async getRecommendations(
    libraryGames: Game[],
    allCachedGames: Game[],
    maxRecommendations: number = 10
  ): Promise<Game[]> {
    if (!this.genAI || !this.apiKey) {
      throw new Error('Gemini API key not configured. Please add your API key in Settings → AI Recommendations');
    }

    if (libraryGames.length === 0) {
      throw new Error('No games in library to base recommendations on');
    }

    if (allCachedGames.length === 0) {
      throw new Error('No cached games available for recommendations');
    }

    // Get library games info for analysis
    const libraryInfo = libraryGames.slice(0, 50).map(g => ({
      title: g.title,
      genres: g.genres,
      companies: g.companies
    }));

    // Get all cached games info (titles only for matching)
    const cachedGamesMap = new Map(allCachedGames.map(g => [g.title.toLowerCase(), g]));
    const cachedGamesList = allCachedGames.slice(0, 500).map(g => ({
      title: g.title,
      genres: g.genres,
      companies: g.companies
    }));

    const prompt = `You are a game recommendation AI. Based on the user's library of games they own/play, recommend ${maxRecommendations} games from the available cached games that they would most likely enjoy.

USER'S LIBRARY (games they own/play):
${JSON.stringify(libraryInfo, null, 2)}

AVAILABLE GAMES TO RECOMMEND FROM:
${JSON.stringify(cachedGamesList, null, 2)}

Analyze the user's gaming preferences based on:
1. Game genres they enjoy
2. Common themes and companies in their library
3. Game complexity and style patterns
4. Variety vs specialization in their taste

Provide EXACTLY ${maxRecommendations} game recommendations. Respond with a JSON array of game titles ONLY, matching the exact titles from the available games list. Do not recommend games already in their library.

Example format:
["Game Title 1", "Game Title 2", "Game Title 3"]

IMPORTANT: Only recommend games from the AVAILABLE GAMES list above. Match titles EXACTLY as they appear.`;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('Failed to parse Gemini response:', text);
        throw new Error('Invalid response format from AI');
      }

      const recommendedTitles: string[] = JSON.parse(jsonMatch[0]);

      // Map titles back to full game objects
      const recommendedGames: Game[] = [];
      for (const title of recommendedTitles) {
        const game = cachedGamesMap.get(title.toLowerCase());
        if (game) {
          recommendedGames.push(game);
        }
      }

      // If we couldn't match enough games, fill with random popular games
      if (recommendedGames.length < maxRecommendations) {
        const remaining = allCachedGames
          .filter(g => !recommendedGames.some(r => r.id === g.id))
          .filter(g => !libraryGames.some(l => l.id === g.id))
          .slice(0, maxRecommendations - recommendedGames.length);
        
        recommendedGames.push(...remaining);
      }

      return recommendedGames.slice(0, maxRecommendations);
    } catch (error) {
      console.error('Gemini API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get AI recommendations: ${errorMessage}`);
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.genAI;
  }
}
