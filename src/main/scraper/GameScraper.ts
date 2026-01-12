import * as https from 'https';
import { parse } from 'node-html-parser';
import log from 'electron-log';

export interface ScrapedGame {
  title: string;
  slug: string;
  version: string;
  original_size_mb: number;
  repack_size_mb: number;
  magnet_link: string;
  page_url: string;
  cover_image_url: string | null;
  description: string;
  genres: string[];
  companies: string;
  languages: string;
  date_added: string;
}

export class GameScraper {
  private baseUrl = 'https://fitgirl-repacks.site';
  private delay = 10; // 10ms between requests
  private readonly CONCURRENT_GAME_PAGES = 5; // Scrape 5 game pages concurrently

  constructor() {
    log.info('[Scraper] GameScraper initialized');
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Fetch URL content using native https
   */
  private async fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  /**
   * Scrape all game links from a listing page
   */
  async scrapeListingPage(pageNum: number = 1): Promise<string[]> {
    try {
      const url = pageNum === 1 ? this.baseUrl : `${this.baseUrl}/page/${pageNum}/`;
      log.info(`[Scraper] Fetching listing page: ${url}`);

      const html = await this.fetchUrl(url);
      const root = parse(html);

      const gameUrls: string[] = [];
      const links = root.querySelectorAll('.entry-title a');
      links.forEach(elem => {
        const href = elem.getAttribute('href');
        if (href && href.includes(this.baseUrl)) {
          gameUrls.push(href);
        }
      });

      log.info(`[Scraper] Found ${gameUrls.length} games on page ${pageNum}`);
      return gameUrls;
    } catch (error) {
      log.error(`[Scraper] Error scraping listing page ${pageNum}:`, error);
      return [];
    }
  }

  /**
   * Scrape detailed information from a game page
   */
  async scrapeGamePage(url: string): Promise<ScrapedGame | null> {
    try {
      log.info(`[Scraper] Fetching game page: ${url}`);

      const html = await this.fetchUrl(url);
      const root = parse(html);

      // Extract title
      const titleElem = root.querySelector('h1.entry-title');
      let title = titleElem?.text?.trim() || '';

      // Extract version from title if present
      const versionMatch = title.match(/\(([^)]+)\)\s*$/);
      const version = versionMatch ? versionMatch[1].trim() : '';
      
      // Generate slug from URL
      const urlParts = url.split('/').filter(p => p);
      const slug = urlParts[urlParts.length - 1] || this.slugify(title);

      // Get article content
      const contentElem = root.querySelector('.entry-content');

      // Extract genres
      const genres: string[] = [];
      if (contentElem) {
        const genreLinks = contentElem.querySelectorAll('a[rel="tag"]');
        genreLinks.forEach(link => {
          const genre = link.text.trim();
          if (genre && !genres.includes(genre)) genres.push(genre);
        });
      }

      // Extract metadata - search in all content
      let companies = '';
      let languages = '';
      let originalSize = '';
      let repackSize = '';

      if (contentElem) {
        const fullText = contentElem.text;
        
        // Extract companies
        const companyMatch = fullText.match(/Compan(?:y|ies):\s*([^\n]+)/i);
        if (companyMatch) companies = companyMatch[1].trim();
        
        // Extract languages
        const langMatch = fullText.match(/Languages?:\s*([^\n]+)/i);
        if (langMatch) languages = langMatch[1].trim();
        
        // Extract original size
        const origSizeMatch = fullText.match(/Original Size:\s*([\d.]+\s*[GMT]B)/i);
        if (origSizeMatch) originalSize = origSizeMatch[1].trim();
        
        // Extract repack size
        const repackSizeMatch = fullText.match(/Repack Size:\s*([\d.]+\s*[GMT]B)/i);
        if (repackSizeMatch) repackSize = repackSizeMatch[1].trim();
      }

      // Extract magnet link
      let magnetLink = '';
      if (contentElem) {
        const magnetLinks = contentElem.querySelectorAll('a[href^="magnet"]');
        if (magnetLinks.length > 0) {
          magnetLink = magnetLinks[0].getAttribute('href') || '';
        }
      }

      // Extract cover image
      let coverImage: string | null = null;
      
      // Try og:image first
      const metaImg = root.querySelector('meta[property="og:image"]');
      let imgSrc = metaImg?.getAttribute('content');
      if (imgSrc && (imgSrc.includes('riotpixels.com') || imgSrc.startsWith('http'))) {
        coverImage = imgSrc;
      }
      
      // If not found, try first content image
      if (!coverImage && contentElem) {
        const firstImg = contentElem.querySelector('img');
        imgSrc = firstImg?.getAttribute('src');
        if (imgSrc && (imgSrc.includes('riotpixels.com') || imgSrc.startsWith('http'))) {
          coverImage = imgSrc;
        }
      }

      // Get description from first paragraph
      let description = '';
      if (contentElem) {
        const firstP = contentElem.querySelector('p');
        description = firstP?.text?.trim().slice(0, 500) || '';
      }

      // Parse sizes to MB
      const originalSizeMb = this.parseSizeToMb(originalSize);
      const repackSizeMb = this.parseSizeToMb(repackSize);

      const game: ScrapedGame = {
        title: title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
        slug,
        version,
        original_size_mb: originalSizeMb,
        repack_size_mb: repackSizeMb,
        magnet_link: magnetLink,
        page_url: url,
        cover_image_url: coverImage,
        description,
        genres: genres.length > 0 ? genres : ['Unknown'],
        companies,
        languages,
        date_added: new Date().toISOString()
      };

      log.info(`[Scraper] Successfully scraped: ${game.title}`);
      return game;
    } catch (error) {
      log.error(`[Scraper] Error scraping game page ${url}:`, error);
      return null;
    }
  }

  /**
   * Scrape multiple game pages concurrently (up to CONCURRENT_GAME_PAGES at a time)
   */
  async scrapeGamePages(urls: string[]): Promise<ScrapedGame[]> {
    log.info(`[Scraper] Scraping ${urls.length} game pages (concurrent limit: ${this.CONCURRENT_GAME_PAGES})`);
    const games: ScrapedGame[] = [];
    
    // Process URLs in batches to avoid hammering the server
    for (let i = 0; i < urls.length; i += this.CONCURRENT_GAME_PAGES) {
      const batch = urls.slice(i, i + this.CONCURRENT_GAME_PAGES);
      
      // Fetch all URLs in this batch concurrently
      const batchGames = await Promise.all(
        batch.map(url => this.scrapeGamePage(url))
      );
      
      // Add successfully scraped games to results
      batchGames.forEach(game => {
        if (game) {
          games.push(game);
        }
      });
      
      // Wait before next batch (only if there are more batches)
      if (i + this.CONCURRENT_GAME_PAGES < urls.length) {
        await this.sleep(this.delay * 2); // Small delay between batches
      }
    }
    
    return games;
  }

  /**
   * Scrape all pages from startPage to endPage
   */
  async scrapeAllPages(startPage: number = 1, endPage: number = 5): Promise<ScrapedGame[]> {
    const allGames: ScrapedGame[] = [];
    
    for (let page = startPage; page <= endPage; page++) {
      log.info(`[Scraper] Processing page ${page} of ${endPage}`);
      
      const urls = await this.scrapeListingPage(page);
      if (urls.length === 0) {
        log.warn(`[Scraper] No games found on page ${page}, stopping`);
        break;
      }
      
      const games = await this.scrapeGamePages(urls);
      allGames.push(...games);
      
      // Rate limiting between pages
      if (page < endPage) {
        await this.sleep(this.delay);
      }
    }
    
    log.info(`[Scraper] Scraped ${allGames.length} games total`);
    return allGames;
  }

  /**
   * Update catalog with progressive caching
   * - First run: Scrapes all pages from 1 to 705 (or until empty)
   * - Subsequent runs: Only checks pages 1-3 for new games
   */
  async updateCatalog(_lastUpdateDate: string | null, existingSlugs: string[] = [], lastScrapedPage: number = 0, onPageScraped?: (page: number, newGames: number) => void): Promise<ScrapedGame[]> {
    const newGames: ScrapedGame[] = [];
    const slugSet = new Set(existingSlugs);
    const MAX_PAGE = 705; // Last page on fitgirl-repacks.site
    
    // If we haven't scraped all pages yet, continue full scrape
    if (lastScrapedPage < MAX_PAGE) {
      log.info(`[Scraper] Starting full catalog scrape from page ${lastScrapedPage + 1} to ${MAX_PAGE}`);
      
      let currentPage = lastScrapedPage + 1;
      
      while (currentPage <= MAX_PAGE) {
        log.info(`[Scraper] Scraping page ${currentPage} of ${MAX_PAGE}...`);
        
        const urls = await this.scrapeListingPage(currentPage);
        
        if (urls.length === 0) {
          log.warn(`[Scraper] No games found on page ${currentPage}, skipping`);
          
          // Notify progress even if empty
          if (onPageScraped) {
            onPageScraped(currentPage, 0);
          }
          
          currentPage++;
          await this.sleep(this.delay);
          continue;
        }
        
        // Filter out games we already have
        const newUrls = urls.filter(u => {
          const parts = u.split('/').filter(p => p);
          const slug = parts[parts.length - 1];
          return !slugSet.has(slug);
        });
        
        if (newUrls.length === 0) {
          log.info(`[Scraper] Page ${currentPage}: All ${urls.length} games already in database`);
        } else {
          log.info(`[Scraper] Page ${currentPage}: Found ${newUrls.length} new games out of ${urls.length} total`);
          
          const games = await this.scrapeGamePages(newUrls);
          for (const game of games) {
            newGames.push(game);
            slugSet.add(game.slug);
          }
        }
        
        // Notify progress
        if (onPageScraped) {
          onPageScraped(currentPage, newUrls.length);
        }
        
        currentPage++;
        
        // Rate limiting
        await this.sleep(this.delay);
      }
      
      log.info(`[Scraper] Full scrape complete. Scraped up to page ${currentPage - 1}, found ${newGames.length} new games`);
      return newGames;
    }
    
    // If we've already done a full scrape, check pages until no new games found
    log.info(`[Scraper] Quick update - checking pages for new games (existing slugs: ${existingSlugs.length})`);
    
    let page = 1;
    let consecutivePagesWithNoNewGames = 0;
    const MAX_EMPTY_PAGES = 2; // Stop after 2 consecutive pages with no new games
    
    while (consecutivePagesWithNoNewGames < MAX_EMPTY_PAGES) {
      const urls = await this.scrapeListingPage(page);
      log.info(`[Scraper] Page ${page}: found ${urls.length} URLs total`);
      
      if (urls.length === 0) {
        log.warn(`[Scraper] No URLs found on page ${page}, stopping`);
        break;
      }
      
      // Filter out games we already have
      const newUrls = urls.filter(u => {
        const parts = u.split('/').filter(p => p);
        const slug = parts[parts.length - 1];
        return !slugSet.has(slug);
      });

      log.info(`[Scraper] Page ${page}: ${newUrls.length} new URLs after filtering`);

      if (newUrls.length === 0) {
        log.info(`[Scraper] No new games found on page ${page}`);
        consecutivePagesWithNoNewGames++;
      } else {
        consecutivePagesWithNoNewGames = 0; // Reset counter
        
        const games = await this.scrapeGamePages(newUrls);
        for (const game of games) {
          newGames.push(game);
          slugSet.add(game.slug);
        }
      }

      // Rate limiting
      await this.sleep(this.delay);
      page++;
    }

    log.info(`[Scraper] Quick update complete: checked ${page - 1} pages, found ${newGames.length} new games`);
    return newGames;
  }



  /**
   * Get all game slugs from the database (to be called from main process)
   */
  async getAllGameSlugs(): Promise<string[]> {
    // This should be implemented by DatabaseService, placeholder for now
    return [];
  }

  /**
   * Parse size string (e.g., "50 GB", "1.5 TB") to MB
   */
  private parseSizeToMb(sizeStr: string): number {
    if (!sizeStr) return 0;

    const match = sizeStr.match(/(\d+\.?\d*)\s*(GB|MB|TB)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'TB':
        return Math.round(value * 1024 * 1024);
      case 'GB':
        return Math.round(value * 1024);
      case 'MB':
        return Math.round(value);
      default:
        return 0;
    }
  }
}
