"""Prepare the credited Metron3D scan for the collectible builder.

Requires trimesh==5.2.0 and fast-simplification==0.2.0, plus numpy.
Usage: python scripts/prepare-liberty-scan.py ORIGINAL.glb [--output PREPARED.glb]
The regular Node build reads the retained prepared source; it does not need Python.
"""
import argparse,hashlib,json,pathlib
import numpy as np
import trimesh

parser=argparse.ArgumentParser()
parser.add_argument('original',type=pathlib.Path)
parser.add_argument('--output',type=pathlib.Path,default=pathlib.Path(__file__).parent/'trophy-sources/liberty-metron-prepared.glb')
args=parser.parse_args()
provenance=json.loads((pathlib.Path(__file__).parent/'trophy-sources/liberty-metron.json').read_text(encoding='utf8'))
if hashlib.sha256(args.original.read_bytes()).hexdigest()!=provenance['originalSha256']:
 raise ValueError('Original scan checksum differs from its recorded provenance')
scene=trimesh.load(args.original,force='scene',process=False)
mesh=scene.to_mesh()
mesh.visual=trimesh.visual.ColorVisuals(mesh)
mesh.merge_vertices(digits_vertex=5)
mesh.remove_unreferenced_vertices()
mesh=mesh.simplify_quadric_decimation(face_count=90000,aggression=5)
# The source scene lies along Z with the torch toward positive Z. Rotate to Y up.
mesh.vertices=np.column_stack((mesh.vertices[:,0],mesh.vertices[:,2],-mesh.vertices[:,1]))
low,high=mesh.bounds
mesh.vertices-=np.array([(low[0]+high[0])/2,low[1],(low[2]+high[2])/2])
mesh.vertices*=2.6/(high[1]-low[1])
mesh.vertices[:,1]-=.9925
# Correct the scan's measured pedestal tilt; keep yaw and sculpture proportions.
rotation=np.array(provenance['levelCorrection']['rotation'])
mesh.vertices=mesh.vertices@rotation.T
mesh.vertices[:,1]+=-.9925-mesh.bounds[0,1]
mesh.vertices[mesh.vertices[:,1]<-.9825,1]=-.9925
if not np.isfinite(mesh.vertices).all() or len(mesh.faces)>90000:
 raise ValueError('Prepared mesh failed geometry checks')
args.output.write_bytes(trimesh.exchange.gltf.export_glb(mesh))
print(json.dumps({'triangles':len(mesh.faces),'bytes':args.output.stat().st_size,'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest()}))
