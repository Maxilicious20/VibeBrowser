#!/bin/bash
# VibeBrowser v1.1.0 GitHub Release Script
# Usage: bash release.sh

set -e

VERSION="1.1.0"
REPO="Maxilicious20/VibeBrowser"
BRANCH="main"

echo "🚀 VibeBrowser v$VERSION Release Script"
echo "========================================"

# Step 1: Check Git Status
echo "📋 Checking git status..."
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Step 2: Initialize Git if needed
if [ ! -d .git ]; then
    echo "🔧 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: VibeBrowser v$VERSION"
    git branch -M main
fi

# Step 3: Verify package.json version
echo "📦 Verifying version in package.json..."
PACKAGE_VERSION=$(grep '"version"' package.json | head -1 | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")
if [ "$PACKAGE_VERSION" != "$VERSION" ]; then
    echo "⚠️  Warning: package.json version ($PACKAGE_VERSION) doesn't match release version ($VERSION)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 4: Build the project
echo "🔨 Building VibeBrowser..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Check errors above."
    exit 1
fi

# Step 5: Create Git tag
echo "🏷️  Creating Git tag v$VERSION..."
if git rev-parse v$VERSION >/dev/null 2>&1; then
    echo "⚠️  Tag v$VERSION already exists. Skipping tag creation."
else
    git tag -a v$VERSION -m "VibeBrowser v$VERSION
    
✨ Features:
- Custom CSS Themes
- Built-in Adblock
- Smart Search Suggestions
- Improved Settings UI
- Update Notifications

🐛 Bug Fixes:
- Theme CSS loading issue
- Memory leak in event listeners
- Null reference errors
- Hardcoded URLs and versions (now dynamic)

See CHANGELOG.md for full details."
    
    echo "✅ Tag v$VERSION created"
fi

# Step 6: Instructions for GitHub
echo ""
echo "========================================"
echo "✅ Release Preparation Complete!"
echo "========================================"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1️⃣  Push to GitHub:"
echo "   git push origin main"
echo "   git push origin v$VERSION"
echo ""
echo "2️⃣  Create GitHub Release:"
echo "   - Go to: https://github.com/$REPO/releases/new"
echo "   - Tag: v$VERSION"
echo "   - Title: VibeBrowser v$VERSION - Custom Themes, Adblock & Update Notifications"
echo "   - Copy description from RELEASE_INSTRUCTIONS.md"
echo "   - Upload files from release/ folder (after dist build)"
echo "   - Click 'Publish release'"
echo ""
echo "3️⃣  Users upgrading from v1.0.0 will see update notification!"
echo ""
echo "📚 Documentation:"
echo "   - See RELEASE_INSTRUCTIONS.md for detailed guide"
echo "   - See CHANGELOG.md for complete release notes"
echo ""
echo "🔗 GitHub Repo: $REPO"
echo "📦 Release URL: https://github.com/$REPO/releases/tag/v$VERSION"
echo ""
