@echo off
echo ============================================
echo Running Supabase Migrations
echo ============================================
echo.

cd /d "%~dp0"

echo Checking Supabase CLI...
supabase --version
if %errorlevel% neq 0 (
    echo ERROR: Supabase CLI not found!
    echo Please make sure Supabase CLI is installed and in your PATH.
    echo.
    echo Installation guide: https://supabase.com/docs/guides/cli/getting-started
    pause
    exit /b 1
)

echo.
echo Pushing migrations to Supabase...
echo.

supabase db push

echo.
echo ============================================
echo Migration complete!
echo ============================================
echo.
pause
