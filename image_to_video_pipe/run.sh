#!/bin/bash
# Agnes AI Image → Video Pipeline Runner
# Usage: ./run.sh [--prompt "your custom prompt"]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Agnes AI Pipeline"
echo "📁 Working directory: $SCRIPT_DIR"
echo ""

# Check for .env
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "📝 Copy .env.example to .env and add your API key"
    exit 1
fi

# Check for node
if ! command -v node &> /dev/null; then
    echo "❌ Error: node is not installed"
    exit 1
fi

# Run pipeline
echo "▶️  Running pipeline..."
node pipeline.mjs "$@"

echo ""
echo "✅ Done! Check these files:"
echo "   - image_url.txt (generated image)"
echo "   - video_id.txt (task ID for video)"
echo "   - video_url.txt (final video)"
