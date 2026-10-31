"""Extract census cells from the supplied XLSX without executing workbook content.

Usage: python scripts/extract-china-census.py path/to/original.xlsx
Uses only the Python standard library. The XLSX is never modified.
"""
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def extract(path):
    with zipfile.ZipFile(path) as archive:
        strings = ["".join(si.itertext()) for si in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("s:si", ns)]
        root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in root.findall("s:sheetData/s:row", ns):
            number = int(row.get("r"))
            if number < 6:
                continue
            cells = {}
            for cell in row.findall("s:c", ns):
                if cell.find("s:f", ns) is not None:
                    raise ValueError(f"Unexpected formula at {cell.get('r')}")
                v = cell.find("s:v", ns)
                if v is None or not v.text:
                    continue
                value = strings[int(v.text)] if cell.get("t") == "s" else float(v.text)
                if isinstance(value, float) and value.is_integer():
                    value = int(value)
                cells[cell.get("r").rstrip("0123456789")] = value
            rows.append({"row": number, "record": cells["U"], "province": cells["A"], "name": cells["B"],
                         "total": cells.get("C"), "male": cells.get("D"), "female": cells.get("E"),
                         "towns": cells.get("H"), "rural": cells.get("I"), "urbanCore": cells.get("J"),
                         "pdfPages": [cells["S"], cells["T"]], "note": cells.get("V")})
    if len(rows) != 3363:
        raise ValueError(f"Unexpected source row count: {len(rows)}")
    return {"filename": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "title": "中国人口普查分县资料—2020，表1 人口基本状况（全部数据）",
            "sheet": "人口基本状况", "date": "2020-11-01", "boundaryYear": 2020,
            "sourceLabel": "2020 census: Table 1",
            "sourceUrl": "https://www.stats.gov.cn/zs/tjwh/tjkw/tjzl/202302/t20230220_1913738.html",
            "columns": {"total": "C", "towns": "H", "urbanCore": "J"},
            "blankMeaning": "Blank in source: no figure or a very small figure; never converted to zero.", "rows": rows}


if __name__ == "__main__":
    source = Path(sys.argv[1])
    target = Path(__file__).parent / "boundary-sources/china-population/census-2020.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    result = extract(source)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"records": len(result["rows"]), "sha256": result["sha256"]}))
