// Test script to verify scraper improvements
import { GameScraper } from '../src/main/scraper/GameScraper';

async function testScraper() {
  const scraper = new GameScraper();
  
  console.log('🧪 Testing GameScraper with new parsing logic...\n');
  
  // Test pages with different formats
  const testPages = [
    'https://fitgirl-repacks.site/ww2-rebuilder/', // Single size
    'https://fitgirl-repacks.site/dead-space-2023/', // Double size 24/24.4 GB
    'https://fitgirl-repacks.site/call-of-duty-black-ops-cold-war/' // "from X GB"
  ];
  
  for (const url of testPages) {
    console.log(`\n📄 Testing: ${url}`);
    console.log('─'.repeat(80));
    
    try {
      const game = await scraper.scrapeGamePage(url);
      
      if (game) {
        console.log(`✅ Title: ${game.title}`);
        console.log(`📅 Repack Date: ${game.repack_date}`);
        console.log(`📦 Size Text: ${game.repack_size_text}`);
        console.log(`📊 Size Range: ${game.repack_size_min_mb} MB - ${game.repack_size_max_mb ? `${game.repack_size_max_mb} MB` : 'Open-ended'}`);
        console.log(`🎮 Genres: ${game.genres.join(', ')}`);
        console.log(`🏢 Companies: ${game.companies}`);
        console.log(`🌍 Languages: ${game.languages}`);
        console.log(`🖼️ Cover: ${game.cover_image_url ? 'Yes' : 'No'}`);
        console.log(`🧲 Magnet: ${game.magnet_link ? 'Yes' : 'No'}`);
      } else {
        console.error('❌ Failed to scrape game');
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n✨ Test complete!');
}

testScraper().catch(console.error);
