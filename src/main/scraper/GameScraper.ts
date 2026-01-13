import * as https from 'https';
import { parse } from 'node-html-parser';
import log from 'electron-log';

export interface ScrapedGame {
  title: string;
  slug: string;
  version: string;
  original_size_mb: number;
  repack_size_mb: number;
  repack_size_text: string;
  repack_size_min_mb: number;
  repack_size_max_mb: number | null;
  magnet_link: string;
  page_url: string;
  cover_image_url: string | null;
  description: string;
  genres: string[];
  companies: string;
  languages: string;
  repack_date: string;
  date_added: string;
}

export class GameScraper {
  private baseUrl = 'https://fitgirl-repacks.site';

  constructor() {
    log.info('[Scraper] GameScraper initialized');
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

      // Extract repack date from <time datetime="">
      let repackDate = '';
      const timeElem = root.querySelector('time.entry-date[datetime]');
      if (timeElem) {
        const datetime = timeElem.getAttribute('datetime');
        if (datetime) {
          repackDate = datetime;
        }
      }

      // Get article content
      const contentElem = root.querySelector('.entry-content');

      // Extract genres from footer tag-links
      const genres: string[] = [];
      const footerMeta = root.querySelector('footer.entry-meta .tag-links');
      if (footerMeta) {
        const genreLinks = footerMeta.querySelectorAll('a[rel="tag"]');
        genreLinks.forEach(link => {
          const genre = link.text.trim();
          if (genre && !genres.includes(genre)) genres.push(genre);
        });
      }

      // Fallback: try content area for tags
      if (genres.length === 0 && contentElem) {
        const genreText = contentElem.text;
        const genreMatch = genreText.match(/Genres?\/Tags?:\s*([^\n]+)/i);
        if (genreMatch) {
          const genreLinks = contentElem.querySelectorAll('a[href*="/tag/"]');
          genreLinks.forEach(link => {
            const genre = link.text.trim();
            if (genre && !genres.includes(genre)) genres.push(genre);
          });
        }
      }

      // Extract metadata from content
      let companies = '';
      let languages = '';
      let originalSize = '';
      let repackSizeText = '';

      if (contentElem) {
        const fullText = contentElem.text;
        
        // Extract companies (handle <strong> tags)
        const companyMatch = fullText.match(/Compan(?:y|ies):\s*([^\n]+)/i);
        if (companyMatch) {
          companies = companyMatch[1].trim().replace(/\s+/g, ' ');
        }
        
        // Extract languages
        const langMatch = fullText.match(/Languages?:\s*([^\n]+)/i);
        if (langMatch) {
          languages = langMatch[1].trim();
        }
        
        // Extract original size
        const origSizeMatch = fullText.match(/Original Size:\s*([^\n]+)/i);
        if (origSizeMatch) {
          originalSize = origSizeMatch[1].trim();
        }
        
        // Extract repack size (improved regex for all formats)
        const repackSizeMatch = fullText.match(/Repack Size:\s*([^\n]+)/i);
        if (repackSizeMatch) {
          repackSizeText = repackSizeMatch[1].trim();
        }
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
      if (imgSrc && (imgSrc.includes('riotpixels.com') || imgSrc.includes('imageban.ru') || imgSrc.startsWith('http'))) {
        coverImage = imgSrc;
      }
      
      // If not found, try first content image
      if (!coverImage && contentElem) {
        const firstImg = contentElem.querySelector('img');
        imgSrc = firstImg?.getAttribute('src');
        if (imgSrc && (imgSrc.includes('riotpixels.com') || imgSrc.includes('imageban.ru') || imgSrc.startsWith('http'))) {
          coverImage = imgSrc;
        }
      }

      // Get description from first paragraph
      let description = '';
      if (contentElem) {
        const firstP = contentElem.querySelector('p');
        description = firstP?.text?.trim().slice(0, 500) || '';
      }

      // Parse sizes
      const originalSizeMb = this.parseSizeToMb(originalSize);
      const { min, max, text } = this.parseRepackSize(repackSizeText);

      const game: ScrapedGame = {
        title: title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
        slug,
        version,
        original_size_mb: originalSizeMb,
        repack_size_mb: min, // Keep for backwards compatibility
        repack_size_text: text,
        repack_size_min_mb: min,
        repack_size_max_mb: max,
        magnet_link: magnetLink,
        page_url: url,
        cover_image_url: coverImage,
        description,
        genres: genres.length > 0 ? genres : ['Unknown'],
        companies,
        languages,
        repack_date: repackDate || new Date().toISOString(),
        date_added: new Date().toISOString()
      };

      log.info(`[Scraper] Successfully scraped: ${game.title} (${game.repack_date})`);
      return game;
    } catch (error) {
      log.error(`[Scraper] Error scraping game page ${url}:`, error);
      return null;
    }
  }

  /**
   * Scrape multiple game pages - ALL AT ONCE!
   */
  async scrapeGamePages(urls: string[]): Promise<ScrapedGame[]> {
    log.info(`[Scraper] Scraping ${urls.length} game pages (NO LIMITS - ALL AT ONCE)`);
    const games: ScrapedGame[] = [];
    
    // Fetch ALL URLs at once - no batching!
    const allGames = await Promise.all(
      urls.map(url => this.scrapeGamePage(url))
    );
    
    // Add successfully scraped games to results
    allGames.forEach(game => {
      if (game) {
        games.push(game);
      }
    });
    
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
    const PAGES_PER_BATCH = 10; // Fetch 10 pages at once!
    
    // If we haven't scraped all pages yet, continue full scrape
    if (lastScrapedPage < MAX_PAGE) {
      log.info(`[Scraper] Starting full catalog scrape from page ${lastScrapedPage + 1} to ${MAX_PAGE}`);
      
      let currentPage = lastScrapedPage + 1;
      
      while (currentPage <= MAX_PAGE) {
        log.info(`[Scraper] Scraping pages ${currentPage} to ${Math.min(currentPage + PAGES_PER_BATCH - 1, MAX_PAGE)} of ${MAX_PAGE}...`);
        
        // Fetch multiple pages in parallel!
        const pagePromises = [];
        const pagesToFetch = Math.min(PAGES_PER_BATCH, MAX_PAGE - currentPage + 1);
        
        for (let i = 0; i < pagesToFetch; i++) {
          pagePromises.push(this.scrapeListingPage(currentPage + i));
        }
        
        const pagesResults = await Promise.all(pagePromises);
        
        // Process all pages from this batch
        for (let i = 0; i < pagesResults.length; i++) {
          const urls = pagesResults[i];
          const pageNum = currentPage + i;
          
          if (urls.length === 0) {
            log.warn(`[Scraper] No games found on page ${pageNum}, skipping`);
            
            if (onPageScraped) {
              onPageScraped(pageNum, 0);
            }
            
            continue;
          }
          
          // Filter out games we already have
          const newUrls = urls.filter(u => {
            const parts = u.split('/').filter(p => p);
            const slug = parts[parts.length - 1];
            return !slugSet.has(slug);
          });
          
          if (newUrls.length === 0) {
            log.info(`[Scraper] Page ${pageNum}: All ${urls.length} games already in database`);
          } else {
            log.info(`[Scraper] Page ${pageNum}: Found ${newUrls.length} new games out of ${urls.length} total`);
            
            const games = await this.scrapeGamePages(newUrls);
            for (const game of games) {
              newGames.push(game);
              slugSet.add(game.slug);
            }
          }
          
          if (onPageScraped) {
            onPageScraped(pageNum, newUrls.length);
          }
        }

        currentPage += pagesToFetch;
      }
      
      log.info(`[Scraper] Full scrape complete. Scraped up to page ${currentPage - 1}, found ${newGames.length} new games`);
      return newGames;
    }
    
    // If we've already done a full scrape, check pages until no new games found
    log.info(`[Scraper] Quick update - checking pages for new games (existing slugs: ${existingSlugs.length})`);
    
    let page = 1;
    let consecutivePagesWithNoNewGames = 0;
    const MAX_EMPTY_PAGES = 2; // Stop after 2 consecutive pages with no new games
    const QUICK_PAGES_PER_BATCH = 5; // Fetch 5 pages at once for quick updates
    const MAX_QUICK_PAGES = 10; // Never check more than 10 pages in quick mode
    
    while (consecutivePagesWithNoNewGames < MAX_EMPTY_PAGES && page <= MAX_QUICK_PAGES) {
      log.info(`[Scraper] Quick update: fetching pages ${page} to ${page + QUICK_PAGES_PER_BATCH - 1}...`);
      
      // Fetch multiple pages in parallel!
      const pagePromises = [];
      for (let i = 0; i < QUICK_PAGES_PER_BATCH; i++) {
        pagePromises.push(this.scrapeListingPage(page + i));
      }
      
      const pagesResults = await Promise.all(pagePromises);
      
      // Process all pages from this batch
      for (let i = 0; i < pagesResults.length; i++) {
        const urls = pagesResults[i];
        const pageNum = page + i;
        
        log.info(`[Scraper] Page ${pageNum}: found ${urls.length} URLs total`);
        
        if (urls.length === 0) {
          log.warn(`[Scraper] No URLs found on page ${pageNum}`);
          consecutivePagesWithNoNewGames++;
          if (consecutivePagesWithNoNewGames >= MAX_EMPTY_PAGES) break;
          continue;
        }
        
        // Filter out games we already have
        const newUrls = urls.filter(u => {
          const parts = u.split('/').filter(p => p);
          const slug = parts[parts.length - 1];
          return !slugSet.has(slug);
        });

        log.info(`[Scraper] Page ${pageNum}: ${newUrls.length} new URLs after filtering`);

        if (newUrls.length === 0) {
          log.info(`[Scraper] No new games found on page ${pageNum}`);
          consecutivePagesWithNoNewGames++;
          if (consecutivePagesWithNoNewGames >= MAX_EMPTY_PAGES) break;
        } else {
          consecutivePagesWithNoNewGames = 0; // Reset counter
          
          const games = await this.scrapeGamePages(newUrls);
          for (const game of games) {
            newGames.push(game);
            slugSet.add(game.slug);
          }
        }
      }

      page += QUICK_PAGES_PER_BATCH;
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

  /**
   * Parse repack size string to handle all formats:
   * - "2.2 GB" → min: 2252, max: 2252, text: "2.2 GB"
   * - "24/24.4 GB" → min: 24576, max: 24985, text: "24/24.4 GB"
   * - "5~6.6 GB" → min: 5120, max: 6758, text: "5~6.6 GB"
   * - "from 60 GB" → min: 61440, max: null, text: "from 60 GB"
   */
  private parseRepackSize(sizeStr: string): { min: number; max: number | null; text: string } {
    if (!sizeStr) return { min: 0, max: 0, text: '' };

    const text = sizeStr.trim();

    // Case 1: "from X GB" (selective download)
    const fromMatch = text.match(/from\s+([\d.]+)\s*(GB|MB|TB)/i);
    if (fromMatch) {
      const min = this.parseSizeToMb(`${fromMatch[1]} ${fromMatch[2]}`);
      return { min, max: null, text };
    }

    // Case 2: "X/Y GB" or "X~Y GB" (range with / or ~ separator)
    const rangeMatch = text.match(/([\d.]+)[/~]([\d.]+)\s*(GB|MB|TB)/i);
    if (rangeMatch) {
      const min = this.parseSizeToMb(`${rangeMatch[1]} ${rangeMatch[3]}`);
      const max = this.parseSizeToMb(`${rangeMatch[2]} ${rangeMatch[3]}`);
      return { min, max, text };
    }

    // Case 3: Single size "X GB"
    const singleMatch = text.match(/([\d.]+)\s*(GB|MB|TB)/i);
    if (singleMatch) {
      const size = this.parseSizeToMb(`${singleMatch[1]} ${singleMatch[2]}`);
      return { min: size, max: size, text };
    }

    return { min: 0, max: 0, text };
  }
}
