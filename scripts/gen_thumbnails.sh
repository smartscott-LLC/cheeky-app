#!/bin/bash
# Fast thumbnail generator - batch process all GLBs
ASSET_DIR="/home/server/Pictures/avatar/split_assets"
THUMB_DIR="/home/server/Pictures/avatar/thumbnails"
MAX_JOBS=${1:-8}

mkdir -p "$THUMB_DIR"

# Create Blender script for thumbnails
cat > /tmp/thumb_gen.py << 'PYEOF'
import bpy
import sys
import os

args = sys.argv
filepath = args[args.index('--') + 1] if '--' in args else args[1]
outdir = args[args.index('--out') + 1] if '--out' in args else '/tmp'

filename = os.path.basename(filepath).replace('.glb', '.png')
outpath = os.path.join(outdir, filename)

# Clean scene
for obj in bpy.data.objects:
    bpy.data.objects.remove(obj)
for mesh in bpy.data.meshes:
    bpy.data.meshes.remove(mesh)

# Import
bpy.ops.import_scene.gltf(filepath=filepath)

# Find first mesh (skip Cube)
mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH']
if not mesh_objs:
    sys.exit(1)

obj = mesh_objs[0]

# Center
bounds = obj.bound_box
cx = sum(b[0] for b in bounds) / 8
cy = sum(b[1] for b in bounds) / 8
cz = sum(b[2] for b in bounds) / 8
obj.location = (-cx, -cy, -cz)

# Scale to fit
span = max(
    max(abs(b[j] - [cx, cy, cz][j]) for b in bounds)
    for j in range(3)
) * 2
scale = 1.0 / max(span, 0.01)
obj.scale = (scale, scale, scale)

# Scene setup
scene = bpy.context.scene
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.resolution_x = 256
scene.render.resolution_y = 256
scene.render.filepath = outpath
scene.render.film_transparent = True

# Camera
cam = bpy.data.cameras.new('cam')
co = bpy.data.objects.new('cam', cam)
scene.collection.objects.link(co)
co.location = (0, -1.2, 0.4)
co.rotation_euler = (0.4, 0, 0)
cam.lens = 40

# Lights
lt = bpy.data.lights.new('l', 'SUN')
lo = bpy.data.objects.new('l', lt)
scene.collection.objects.link(lo)
lo.location = (2, 2, 3)
lo.rotation_euler = (0.8, 0, 0.5)

# Render
scene.camera = co
bpy.ops.render.render(write_still=True)
print(f"OK: {filename}")
PYEOF

count=0
errors=0

while IFS= read -r -d '' glb; do
  cat=$(basename "$(dirname "$glb")")
  name=$(basename "$glb" .glb)
  thumb="$THUMB_DIR/$cat/${name}.png"
  
  if [ -f "$thumb" ]; then
    continue
  fi
  
  mkdir -p "$THUMB_DIR/$cat"
  
  blender --background --python /tmp/thumb_gen.py -- \
    -- "$glb" --out "$THUMB_DIR/$cat" &
  
  count=$((count + 1))
  
  # Throttle
  if [ $((count % MAX_JOBS)) -eq 0 ]; then
    wait
    echo "Processed $count..."
  fi
done < <(find "$ASSET_DIR" -name "*.glb" -print0)

wait
echo "Done: $count thumbnails"
