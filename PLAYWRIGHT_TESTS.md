# Playwright Test Suite for GigCalc

## Test Files Created

### 1. `tests/e2e.spec.ts` - End-to-End Tests (Enhanced)
Comprehensive test coverage for main application flows:

- ✅ **Save and Export Trip Flow**
  - Tests the complete flow: input data → save trip → export CSV
  - Includes download interception and CSV content verification
  - Validates snackbar notifications

- ✅ **Calculator Accuracy**
  - Verifies correct calculation of:
    - Gas cost: (distance / MPG) × gas price
    - Net earnings: payment - gas cost
    - Earnings per mile: net earnings / distance
  - Example: $30 payment, 10 miles, $4/gal, 25 MPG
    - Expected: $1.60 gas, $28.40 net, $2.84/mile

- ✅ **GPS Tracking Button**
  - Verifies button presence and LIVE/STOP toggle
  - Basic state validation (full GPS testing requires mocking)

- ✅ **History Modal**
  - Tests modal open/close functionality
  - Verifies trip records display
  - Checks aggregate statistics (Net, Mileage)
  - Validates close button behavior

- ✅ **Recent Activity Feed**
  - Tests trip cards appear after saving
  - Verifies feed updates in real-time

- ✅ **Export Button State**
  - Validates button is disabled when history is empty
  - Tests proper enable/disable logic

- ✅ **Input Validation & Persistence**
  - Save button disabled without required inputs
  - Payment & distance clear after save
  - Gas price & MPG persist (user preferences)

### 2. `tests/theme-switcher.spec.ts` - Theme Tests (New)
Tests the Material 3 theme switching functionality:

- ✅ **Theme Cycling**
  - Verifies: dark → high-contrast → light → dark
  - Validates CSS classes applied to `<html>` element
  - Checks theme transitions

- ✅ **Theme Persistence**
  - Tests localStorage saves theme preference
  - Verifies theme persists after page reload
  - Key: `gigCalcTheme` (values: 'dark', 'high', 'light')

## Running the Tests

### Option 1: Command Line
```bash
# Run all tests
npm run test:e2e

# Run with UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test tests/e2e.spec.ts

# Run with headed browser (see what's happening)
npx playwright test --headed

# Run with detailed reporter
npx playwright test --reporter=list

# Run single worker (sequential, easier to debug)
npx playwright test --workers=1
```

### Option 2: Batch File
```bash
# Double-click or run:
run-tests.bat
```

### Option 3: VS Code Playwright Extension
1. Install "Playwright Test for VSCode" extension
2. Open test file
3. Click green play button next to test

## Test Configuration

**File:** `playwright.config.ts`

```typescript
{
  testDir: 'tests',
  timeout: 30_000,           // 30 seconds per test
  baseURL: 'http://localhost:3000',
  retries: 0,
  workers: 1,                // Run sequentially
  projects: ['chromium']
}
```

## Prerequisites

✅ **Dev Server Running**
```bash
npm run dev
```
Server must be running on `http://localhost:3000` before tests execute.

✅ **Playwright Installed**
```bash
# Already in package.json
# Install browsers if needed:
npx playwright install
```

## Test Coverage Summary

| Feature | Tests | Status |
|---------|-------|--------|
| Calculator Logic | 1 | ✅ Complete |
| Save Trip | 2 | ✅ Complete |
| Export CSV | 1 | ✅ Complete w/ Download Intercept |
| History Modal | 1 | ✅ Complete |
| Recent Activity | 1 | ✅ Complete |
| Input Validation | 1 | ✅ Complete |
| Theme Switching | 2 | ✅ Complete |
| GPS Button | 1 | ⚠️  Basic (no mock) |
| **Total** | **10** | **9 Complete, 1 Partial** |

## Expected Test Results

When all tests pass, you should see:
```
✓ tests/e2e.spec.ts:8:1 › save and export trip flow (Xs)
✓ tests/e2e.spec.ts:57:1 › calculator computes results correctly (Xs)
✓ tests/e2e.spec.ts:89:1 › GPS tracking button toggles state (Xs)
✓ tests/e2e.spec.ts:100:1 › history modal opens and displays correctly (Xs)
✓ tests/e2e.spec.ts:138:1 › recent activity feed displays saved trips (Xs)
✓ tests/e2e.spec.ts:159:1 › export button is disabled when history is empty (Xs)
✓ tests/e2e.spec.ts:169:1 › input validation and clearing after save (Xs)
✓ tests/theme-switcher.spec.ts:6:1 › theme switcher cycles through themes (Xs)
✓ tests/theme-switcher.spec.ts:31:1 › theme preference persists in localStorage (Xs)

9 passed (XXs)
```

## Debugging Failed Tests

### Common Issues

1. **Dev server not running**
   - Error: `net::ERR_CONNECTION_REFUSED`
   - Fix: Run `npm run dev` first

2. **Wrong port**
   - Error: Tests timeout waiting for page
   - Fix: Check `vite.config.ts` port matches `playwright.config.ts` baseURL

3. **Timing issues**
   - Error: Element not found
   - Fix: Increase `page.waitForTimeout()` or use `waitForSelector()`

4. **localStorage conflicts**
   - Error: Unexpected state
   - Fix: Clear browser state between tests or in `beforeEach`

### Debug Mode
```bash
# Run with inspector
npx playwright test --debug

# Generate trace for failed tests
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run Playwright tests
  run: npm run test:e2e
```

## Future Enhancements

- [ ] Add visual regression tests (screenshot comparison)
- [ ] Mock GPS geolocation API for full tracking tests
- [ ] Add AI analysis tests (requires API mocking)
- [ ] Test mobile responsive layouts
- [ ] Add accessibility (a11y) tests
- [ ] Performance testing with Lighthouse
- [ ] Test error states and edge cases

## Notes

- Tests use Material 3 CSS classes for theme detection
- CSV download intercept validates export functionality
- LocalStorage is used for theme and trip history persistence
- All tests include console.log success messages for debugging

