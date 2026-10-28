"""Prepare JuanG3D's CC BY 4.0 Christ sculpture for the collectible builder.

Requires numpy and trimesh==5.2.0. The regular Node build reads the retained
prepared source and does not require Python or an asset download.

Usage: python scripts/prepare-christ-model.py ORIGINAL.glb [--output PREPARED.glb]
"""
import argparse,hashlib,json,logging,pathlib
import numpy as np
import trimesh

parser=argparse.ArgumentParser()
parser.add_argument('original',type=pathlib.Path)
parser.add_argument('--output',type=pathlib.Path,default=pathlib.Path(__file__).parent/'trophy-sources/christ-juan-prepared.glb')
args=parser.parse_args()
provenance=json.loads((pathlib.Path(__file__).parent/'trophy-sources/christ-juan.json').read_text(encoding='utf8'))
if hashlib.sha256(args.original.read_bytes()).hexdigest()!=provenance['originalSha256']:
 raise ValueError('Original Christ model checksum differs from its recorded provenance')
logging.getLogger('trimesh').setLevel(logging.ERROR)
mesh=trimesh.load(args.original,force='scene',process=False).to_mesh()
mesh.visual=trimesh.visual.ColorVisuals(mesh)
mesh.remove_unreferenced_vertices()
mesh.merge_vertices(digits_vertex=6)
mesh.update_faces(mesh.unique_faces())
mesh.update_faces(mesh.nondegenerate_faces())

# Remove the tall signed print plinth, preserving the source's authored sculpture.
cut=-4.115
vertices=[]
faces=[]
for triangle in mesh.triangles:
 polygon=[]
 for index in range(3):
  a,b=triangle[index],triangle[(index+1)%3]
  inside_a,inside_b=a[1]>=cut,b[1]>=cut
  if inside_a:
   polygon.append(a)
  if inside_a!=inside_b:
   polygon.append(a+(b-a)*((cut-a[1])/(b[1]-a[1])))
 if len(polygon)>=3:
  start=len(vertices)
  vertices.extend(polygon)
  for index in range(1,len(polygon)-1):
   faces.append([start,start+index,start+index+1])
mesh=trimesh.Trimesh(np.array(vertices),np.array(faces),process=False)
mesh.remove_unreferenced_vertices()
mesh.merge_vertices(digits_vertex=6)

# Close the single convex footprint left by the cut through the original footplate.
boundary=np.nonzero(np.abs(mesh.vertices[:,1]-cut)<1e-6)[0]
if len(boundary)>2:
 center=mesh.vertices[boundary].mean(axis=0)
 angles=np.arctan2(mesh.vertices[boundary,2]-center[2],mesh.vertices[boundary,0]-center[0])
 boundary=boundary[np.argsort(angles)]
 vertices=np.vstack([mesh.vertices,center])
 center_id=len(mesh.vertices)
 cap=np.array([[center_id,int(boundary[index]),int(boundary[(index+1)%len(boundary)])] for index in range(len(boundary))])
 mesh=trimesh.Trimesh(vertices,np.vstack([mesh.faces,cap]),process=False)

low,high=mesh.bounds
mesh.vertices-=np.array([(low[0]+high[0])/2,cut,(low[2]+high[2])/2])
mesh.vertices*=2.2/(high[1]-cut)
mesh.vertices[:,1]-=.4225
if not np.isfinite(mesh.vertices).all() or len(mesh.faces)>90000:
 raise ValueError('Prepared Christ sculpture failed geometry checks')
args.output.write_bytes(trimesh.exchange.gltf.export_glb(mesh,include_normals=True))
print(json.dumps({'triangles':len(mesh.faces),'bytes':args.output.stat().st_size,'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest()}))
