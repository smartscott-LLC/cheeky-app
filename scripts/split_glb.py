#!/usr/bin/env python3
"""Split a multi-object GLB into individual per-object GLB files."""
import bpy
import sys
import os

src_path = sys.argv[1]
out_dir = sys.argv[2] if len(sys.argv) > 2 else "/tmp/split_assets"

os.makedirs(out_dir, exist_ok=True)
print(f"Loading: {src_path}")
print(f"Output: {out_dir}")

bpy.ops.import_scene.gltf(filepath=src_path)

mesh_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH']
print(f"Found {len(mesh_objects)} mesh objects")

for obj in mesh_objects:
    # Select only this object
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    # Export as individual GLB
    out_path = os.path.join(out_dir, f"{obj.name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_selected=True,
        export_apply=False
    )
    print(f"  Exported: {obj.name}.glb")

# Cleanup
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

print("Done!")
