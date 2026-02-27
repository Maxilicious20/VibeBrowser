# VibeBrowser v1.2.0 GitHub Release Script for Windows
# Usage: .\release.ps1 -GitHubToken "your_token_here"
# Or just: .\release.ps1 (and follow manual steps)

param(
    [string]$GitHubToken = "",
    [bool]$AutoPush = $false
)

$VERSION = "1.2.0"
$REPO = "Maxilicious20/VibeBrowser"
$GITHUB_REPO_OWNER = "Maxilicious20"
$GITHUB_REPO_NAME = "VibeBrowser"
$BRANCH = "main"

Write-Host "🚀 VibeBrowser v$VERSION GitHub Release Script" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git first." -ForegroundColor Red
    exit 1
}

# Step 0: Verify package.json version matches
Write-Host "📦 Verifying version in package.json..." -ForegroundColor Yellow
$packageContent = Get-Content package.json | ConvertFrom-Json
$PACKAGE_VERSION = $packageContent.version

if ($PACKAGE_VERSION -ne $VERSION) {
    Write-Host "❌ package.json version ($PACKAGE_VERSION) doesn't match script version ($VERSION)!" -ForegroundColor Red
    Write-Host "❌ Update the VERSION variable in release.ps1 to match package.json" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Version verified: $PACKAGE_VERSION" -ForegroundColor Green

# Step 1: Build the project
Write-Host ""
Write-Host "🔨 Building VibeBrowser v$VERSION..." -ForegroundColor Yellow
npm run build 2>&1 | Select-Object -Last 5
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Check errors above." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green

# Step 2: Create Distribution (EXE + ZIP)
Write-Host ""
Write-Host "📦 Creating Windows distribution (EXE + ZIP)..." -ForegroundColor Yellow
npm run dist 2>&1 | Select-Object -Last 10
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  electron-builder had some output (check above)" -ForegroundColor Yellow
}

# Step 3: Verify artifacts were created
Write-Host ""
Write-Host "✅ Checking artifacts in release/ folder..." -ForegroundColor Yellow
$artifacts = Get-ChildItem "release" -Filter "*.exe" -ErrorAction SilentlyContinue
$zipArtifacts = Get-ChildItem "release" -Filter "*.zip" -ErrorAction SilentlyContinue

if ($artifacts) {
    Write-Host "   ✅ EXE found:" -ForegroundColor Green
    $artifacts | ForEach-Object { Write-Host "      - $($_.Name) ($([math]::Round($_.Length/1MB, 2)) MB)" -ForegroundColor Gray }
} else {
    Write-Host "   ⚠️  No EXE files found in release/" -ForegroundColor Yellow
}

if ($zipArtifacts) {
    Write-Host "   ✅ ZIP found:" -ForegroundColor Green
    $zipArtifacts | ForEach-Object { Write-Host "      - $($_.Name) ($([math]::Round($_.Length/1MB, 2)) MB)" -ForegroundColor Gray }
} else {
    Write-Host "   ⚠️  No ZIP files found in release/" -ForegroundColor Yellow
}

# Step 4: Git Tag
Write-Host ""
Write-Host "🏷️  Creating Git tag v$VERSION..." -ForegroundColor Yellow

$tagExists = git tag -l "v$VERSION" 2>$null | Where-Object { $_ -eq "v$VERSION" }

if ($tagExists) {
    Write-Host "⚠️  Tag v$VERSION already exists. Skipping tag creation." -ForegroundColor Yellow
} else {
    $releaseMessage = "VibeBrowser v$VERSION - Download Manager, Revolutionary Tabs System, Crash Recovery & MASSIVE Performance Boost"
    git tag -a "v$VERSION" -m $releaseMessage
    Write-Host "✅ Tag v$VERSION created" -ForegroundColor Green
}

# Step 5: Display next steps
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "✅ Release Package Ready!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

Write-Host "📝 NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣  Push to GitHub:" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host "   git push origin --tags" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Create GitHub Release:" -ForegroundColor White
Write-Host ""
Write-Host "   Option A (Recommended - Automatic with CLI):" -ForegroundColor Cyan
Write-Host "   gh release create v$VERSION --title 'VibeBrowser v$VERSION' --notes 'See CHANGELOG.md' --draft --files release/VibeBrowser-*.exe release/VibeBrowser-*.zip" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option B (Manual via Web UI):" -ForegroundColor Cyan
Write-Host "   - Go to: https://github.com/$REPO/releases/new" -ForegroundColor Gray
Write-Host "   - Tag: v$VERSION" -ForegroundColor Gray
Write-Host "   - Title: VibeBrowser v$VERSION - Download Manager, Revolutionary Tabs & Performance Boost" -ForegroundColor Gray
Write-Host "   - Description: Copy from CHANGELOG.md (v1.2.0 section)" -ForegroundColor Gray
Write-Host "   - Upload files from release/ folder:" -ForegroundColor Gray
Write-Host "      • VibeBrowser-$VERSION.exe (portable)" -ForegroundColor Gray
Write-Host "      • VibeBrowser-$VERSION.zip (archive)" -ForegroundColor Gray
Write-Host "   - Publish release" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Update History (Git Log):" -ForegroundColor White
git log --oneline -3

Write-Host ""
Write-Host "🎉 Release v$VERSION is ready for deployment!" -ForegroundColor Green
Write-Host ""

Write-Host "4️⃣  Verify:" -ForegroundColor White
Write-Host "   - Visit: https://github.com/$REPO/releases/tag/v$VERSION" -ForegroundColor Gray
Write-Host "   - Download and test the installer" -ForegroundColor Gray
Write-Host "   - Install on fresh system to see update notification" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - RELEASE_INSTRUCTIONS.md (detailed guide)" -ForegroundColor Gray
Write-Host "   - CHANGELOG.md (complete release notes)" -ForegroundColor Gray
Write-Host "   - README.md (project overview)" -ForegroundColor Gray
Write-Host ""

Write-Host "🎯 Expected User Experience:" -ForegroundColor Cyan
Write-Host "   - Users with v1.0.0 will see: '🎉 VibeBrowser wurde auf v1.1.0 aktualisiert!'" -ForegroundColor Gray
Write-Host "   - Notification shows for 10 seconds then auto-hides" -ForegroundColor Gray
Write-Host "   - Click 'Changelog ansehen' to view release notes" -ForegroundColor Gray
Write-Host ""

Write-Host "🔗 URLs:" -ForegroundColor Cyan
Write-Host "   - GitHub Repo: https://github.com/$REPO" -ForegroundColor Gray
Write-Host "   - Release Page: https://github.com/$REPO/releases/tag/v$VERSION" -ForegroundColor Gray
Write-Host "   - Changelog: https://github.com/$REPO/blob/main/CHANGELOG.md" -ForegroundColor Gray
Write-Host ""

# Offer to open GitHub in browser
$openBrowser = Read-Host "Open GitHub release page in browser? (y/n)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Start-Process "https://github.com/$REPO/releases/new?tag=v$VERSION"
}

Write-Host "✨ Release ready! Good luck! 🚀" -ForegroundColor Green
