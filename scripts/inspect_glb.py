#!/usr/bin/env python3
"""Inspect GLB files and report object structure."""
import bpy
import sys
import os

filepath = sys.argv[1] if len(sys.argv) > 1 else "/home/server/Pictures/avatar/meshes/female_tops.glb"
print(f"Loading: {filepath}")

bpy.ops.import_scene.gltf(filepath=filepath)

print(f"Objects in scene: {len(bpy.data.objects)}")
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        verts = len(obj.data.vertices)
        faces = len(obj.data.polygons)
        print(f"  {obj.name}: verts={verts}, faces={faces}")
    else:
        print(f"  {obj.name}: type={obj.type}")

# Cleanup
for obj in bpy.data.objects:
    bpy.data.objects.remove(obj)
for mesh in bpy.data.meshes:
    bpy.data.meshes.remove(mesh)
