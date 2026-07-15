@echo off
echo ========================================================
echo Moving Antigravity IDE folder (.gemini) to D: drive
echo ========================================================
echo.
echo Please close the IDE and the chat window before continuing
echo so that all active session files are unlocked.
echo.
pause

echo Closing active development servers...
taskkill /F /IM node.exe >nul 2>&1

echo Moving C:\Users\GOWTHAMSANJAY\.gemini to D:\.gemini...
robocopy "C:\Users\GOWTHAMSANJAY\.gemini" "D:\.gemini" /E /MOVE /R:2 /W:2

echo Creating Directory Junction link...
rmdir /S /Q "C:\Users\GOWTHAMSANJAY\.gemini" 2>nul
mklink /J "C:\Users\GOWTHAMSANJAY\.gemini" "D:\.gemini"

echo.
echo ========================================================
echo Done! All Antigravity data is now stored on D: drive.
echo You can now safely reopen your IDE.
echo ========================================================
echo.
pause
