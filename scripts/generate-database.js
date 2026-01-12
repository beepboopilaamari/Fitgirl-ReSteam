// Script to generate initial database by scraping FitGirl Repacks site
// Run this manually to generate the pre-scraped database
// Usage: node scripts/generate-database.js

const path = require('path');
const fs = require('fs');

// This script needs to be run with ts-node or after compilation
console.log('='.repeat(60));
console.log('FitGirl Resteam - Database Generator');
console.log('='.repeat(60));
console.log('');
console.log('This script will scrape fitgirl-repacks.site and generate');
console.log('a database with all available games.');
console.log('');
console.log('WARNING: This will take 3-4 hours to complete!');
console.log('');
console.log('To run this script:');
console.log('1. Build the project: npm run build');
console.log('2. Run: node dist/main/scraper-cli.js');
console.log('');
console.log('Or use ts-node:');
console.log('npm install -g ts-node');
console.log('ts-node scripts/generate-database-full.ts');
console.log('');
console.log('='.repeat(60));
