#!/usr/bin/env python3
"""
Split UV-packed GLB sheets into individual character GLB files.
Builds new mesh data directly without edit mode selection.
"""
import bpy
import os
import sys
from collections import defaultdict

SRC_PATH = os.environ.get('SPLIT_SRC', '/home/server/Pictures/avatar/meshes/female_tops.glb')
OUT_DIR = os.environ.get('SPLIT_OUT', '/tmp/split_assets')
X_GAP = float(os.environ.get('SPLIT_X_GAP', '0.03'))
MIN_VERTS = int(os.environ.get('SPLIT_MIN_VERTS', '100'))

os.makedirs(OUT_DIR, exist_ok=True)

print(f"Loading: {SRC_PATH}")
print(f"Output: {OUT_DIR}")

bpy.ops.import_scene.gltf(filepath=SRC_PATH)

mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.name != 'Cube']
if not mesh_objs:
    print("No mesh objects found!")
    sys.exit(1)

main_obj = mesh_objs[0]
me = main_obj.data
print(f"Mesh: {len(me.vertices)} vertices, {len(me.polygons)} faces")

# Build position map
vert_pos = {v.index: v.co for v in me.vertices}
poly_verts = [tuple(p.vertices) for p in me.polygons]

# Cluster by X
xs_unique = sorted(set(round(v.co.x, 6) for v in me.vertices))
x_clusters = []
current = [xs_unique[0]]
for i in range(1, len(xs_unique)):
    if xs_unique[i] - xs_unique[i-1] > X_GAP:
        x_clusters.append(current)
        current = [xs_unique[i]]
    else:
        current.append(xs_unique[i])
x_clusters.append(current)
print(f"X-clusters: {len(x_clusters)}")

all_chars = []

for xi, xcl in enumerate(x_clusters):
    col_vids = set(vi for vi, p in vert_pos.items()
                   if xcl[0] <= p.x <= xcl[-1])
    if len(col_vids) < MIN_VERTS:
        continue

    col_zs = sorted(set(round(vert_pos[vi].z, 6) for vi in col_vids))
    z_clusters = []
    cz = [col_zs[0]]
    for i in range(1, len(col_zs)):
        if col_zs[i] - col_zs[i-1] > X_GAP:
            z_clusters.append(cz)
            cz = [col_zs[i]]
        else:
            cz.append(col_zs[i])
    z_clusters.append(cz)

    print(f"  Col {xi}: {len(col_vids)} verts, {len(z_clusters)} chars")

    for zi, zcl in enumerate(z_clusters):
        char_vids = set(vi for vi in col_vids if zcl[0] <= vert_pos[vi].z <= zcl[-1])
        if len(char_vids) >= MIN_VERTS:
            all_chars.append((f"{os.path.basename(SRC_PATH).replace('.glb','')}_{xi}_{zi}", char_vids, len(char_vids)))

print(f"\nTotal characters: {len(all_chars)}")

# Export by building new meshes from polygon indices
exported = 0
for name, char_vids, count in all_chars:
    # Find polygons that use only vertices from this character
    new_verts = []
    vert_map = {}  # old_index -> new_index
    new_polys = []
    
    for pv in poly_verts:
        if all(v in char_vids for v in pv):
            new_pv = []
            for v in pv:
                if v not in vert_map:
                    old_v = me.vertices[v]
                    vert_map[v] = len(new_verts)
                    new_verts.append((old_v.co.x, old_v.co.y, old_v.co.z))
                new_pv.append(vert_map[v])
            new_polys.append(tuple(new_pv))
    
    # Create new mesh
    new_me = bpy.data.meshes.new(name)
    new_me.from_pydata(new_verts, [], new_polys)
    new_me.validate()
    
    new_ob = bpy.data.objects.new(name, new_me)
    bpy.context.collection.objects.link(new_ob)
    
    out_path = os.path.join(OUT_DIR, f"{name}.glb")
    # Make this object active and selected
    bpy.ops.object.select_all(action='DESELECT')
    new_ob.select_set(True)
    bpy.context.view_layer.objects.active = new_ob
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True
    )
    exported += 1
    print(f"  {name}.glb ({len(new_verts)} verts, {len(new_polys)} faces)")
    
    # Remove temp object
    bpy.data.objects.remove(new_ob)

print(f"\nExported {exported} files to {OUT_DIR}")
