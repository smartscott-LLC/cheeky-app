#!/bin/bash
# Batch split all GLB sheets in the meshes directory
MESH_DIR="/home/server/Pictures/avatar/meshes"
OUT_BASE="/home/server/Pictures/avatar/split_assets"
SCRIPT="/home/server/cheeky-app/scripts/split_sheet.py"
X_GAP=${1:-0.03}
MIN_VERTS=${2:-100}

mkdir -p "$OUT_BASE"

total_files=$(ls "$MESH_DIR"/*.glb 2>/dev/null | wc -l)
echo "Found $total_files GLB files to process"
echo "X-gap: $X_GAP, Min verts: $MIN_VERTS"
echo ""

processed=0
skipped=0
errors=0

for src in "$MESH_DIR"/*.glb; do
    name=$(basename "$src" .glb)
    out_dir="$OUT_BASE/$name"
    mkdir -p "$out_dir"
    
    echo "── $name ──"
    
    result=$(SPLIT_SRC="$src" SPLIT_OUT="$out_dir" SPLIT_X_GAP="$X_GAP" SPLIT_MIN_VERTS="$MIN_VERTS" \
        blender --background --python "$SCRIPT" 2>&1)
    
    exported=$(echo "$result" | grep "^Exported" | grep -oP '\d+(?= files)')
    
    if [ -n "$exported" ] && [ "$exported" -gt 0 ]; then
        count=$(ls "$out_dir"/*.glb 2>/dev/null | wc -l)
        size=$(du -sh "$out_dir" 2>/dev/null | cut -f1)
        echo "  ✓ $count files split ($size)"
        processed=$((processed + 1))
    else
        echo "  ✗ Failed or empty"
        errors=$((errors + 1))
    fi
done

echo ""
echo "Done: $processed processed, $errors errors"
echo "Output: $OUT_BASE"
