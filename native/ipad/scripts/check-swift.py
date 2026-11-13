from pathlib import Path
import re, sys
HERE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE/'tools/python'))
from tree_sitter import Language, Parser
import tree_sitter_swift
parser=Parser(Language(tree_sitter_swift.language()))
failed=[]
for file in sorted((HERE/'BoundaryAtlas.swiftpm').rglob('*.swift')):
    source=file.read_bytes()
    tree=parser.parse(source)
    def walk(node):
        if node.type=='ERROR' or node.is_missing:
            failed.append((str(file.relative_to(HERE)),node.start_point,source[node.start_byte:node.end_byte][:120]))
        for child in node.children:walk(child)
    walk(tree.root_node)
for row in failed:print(row)
print('Swift syntax:', 'FAILED' if failed else 'all files parsed without errors')
sys.exit(bool(failed))
