#!/bin/bash
# Inspect all GLB files and report their internal structure
MESH_DIR="/home/server/Pictures/avatar/meshes"
python3 /home/server/cheeky-app/scripts/inspect_glb.py "$1"
