from pathlib import Path
import zipfile, hashlib, json, sys

ROOT=Path(__file__).resolve().parents[1]
plain='--plain-folder' in sys.argv
archive=ROOT.parent/('BoundaryAtlas-iPad-Transfer.zip' if plain else 'BoundaryAtlas-China-iPad.zip')
project=ROOT/'BoundaryAtlas.swiftpm'
files=[*sorted(p for p in project.rglob('*') if p.is_file()),ROOT/'START-HERE.md',ROOT/'ARCHITECTURE.md',ROOT/'VALIDATION.md',ROOT/'asset-inventory.json']
def name(file):
    value=file.relative_to(ROOT).as_posix()
    return value.replace('BoundaryAtlas.swiftpm/','BoundaryAtlasProject/',1) if plain else value
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=7) as z:
    directories=set()
    for file in files:
        parent=Path(name(file)).parent
        while str(parent)!='.':
            directories.add(parent.as_posix()+'/')
            parent=parent.parent
    for directory in sorted(directories):
        entry=zipfile.ZipInfo(directory)
        entry.create_system=3
        entry.external_attr=(0o40755<<16)|0x10
        z.writestr(entry,b'')
    for file in files:
        entry=zipfile.ZipInfo(name(file))
        entry.create_system=3
        entry.external_attr=0o100644<<16
        entry.compress_type=zipfile.ZIP_DEFLATED
        data=file.read_bytes()
        if plain and file.name=='START-HERE.md':
            data=data.decode('utf-8').replace('BoundaryAtlas-China-iPad.zip','BoundaryAtlas-iPad-Transfer.zip').replace('4. Open the extracted folder and tap **BoundaryAtlas.swiftpm**.','4. Open the extracted folder. Open **BoundaryAtlasProject** and confirm it contains `Package.swift`, `Sources`, and `Tests`. Go back, long-press **BoundaryAtlasProject**, choose **Rename**, and rename it to **BoundaryAtlas.swiftpm**. Then tap **BoundaryAtlas.swiftpm**.').encode('utf-8')
        z.writestr(entry,data)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    project_name='BoundaryAtlasProject' if plain else 'BoundaryAtlas.swiftpm'
    assert project_name+'/Package.swift' in z.namelist()
    assert project_name+'/' in z.namelist()
    assert len([n for n in z.namelist() if n.endswith('.mp3')])==34
    assert not any('/tools/' in n or n.endswith('.pyc') for n in z.namelist())
print(json.dumps({'archive':str(archive),'files':len(files),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()},indent=2))
