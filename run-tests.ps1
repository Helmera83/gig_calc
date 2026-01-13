# Playwright Test Runner for GigCalc
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  GigCalc Playwright Test Suite" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if dev server is running
Write-Host "Checking dev server..." -ForegroundColor Yellow
$response = $null
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Dev server is running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "✗ Dev server is not running!" -ForegroundColor Red
    Write-Host "Please start it with: npm run dev" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Running Playwright tests..." -ForegroundColor Yellow
Write-Host ""

# Run Playwright tests
& npx playwright test --reporter=list --workers=1

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Tests completed!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run tests again, execute: .\run-tests.ps1" -ForegroundColor Gray
Write-Host "To see test UI, execute: npx playwright test --ui" -ForegroundColor Gray
Write-Host ""

