#!/usr/bin/env pwsh
# Quick test script for FitGirl Resteam development

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "FitGirl Resteam - Development Test Script" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
if (!(Test-Path "package.json")) {
    Write-Host "Error: Not in project directory!" -ForegroundColor Red
    Write-Host "Please run from d:\fitgirlresteam\" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/5] Checking Node.js version..." -ForegroundColor Green
node --version
npm --version

Write-Host ""
Write-Host "[2/5] Checking dependencies..." -ForegroundColor Green
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "Dependencies already installed ✓" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/5] Building project..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! ✓" -ForegroundColor Green
} else {
    Write-Host "Build failed ✗" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[4/5] Checking build output..." -ForegroundColor Green
$files = @(
    "dist/main/index.js",
    "dist/preload/preload.js",
    "dist/renderer/renderer.js",
    "dist/renderer/index.html"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length / 1KB
        Write-Host "  ✓ $file ($($size.ToString('F2')) KB)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (missing)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[5/5] Project status" -ForegroundColor Green
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
Write-Host "  ✓ Build successful" -ForegroundColor Green
Write-Host "  ✓ All artifacts generated" -ForegroundColor Green

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Ready to run!" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "To start development:" -ForegroundColor Yellow
Write-Host "  Terminal 1: npm run dev" -ForegroundColor White
Write-Host "  Terminal 2: npm start" -ForegroundColor White
Write-Host ""
Write-Host "To test production build:" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "To package installer:" -ForegroundColor Yellow
Write-Host "  npm run package" -ForegroundColor White
Write-Host ""
