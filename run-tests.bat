@echo off
echo Starting Playwright Tests...
echo.
call npx playwright test --reporter=list --workers=1
echo.
echo Tests Complete!
pause

