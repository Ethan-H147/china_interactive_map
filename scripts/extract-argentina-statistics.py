"""Extract official tables; fail if their headers, units or province totals change.

Requires pypdf and openpyxl. Run after fetch-argentina-statistics.mjs.
The compact extraction is retained so the website build needs only Node.js.
"""
import csv
import hashlib
import json
import re
from pathlib import Path

import openpyxl
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent / "statistics-sources" / "argentina"
CODES = ["02", "06", "10", "14", "18", "22", "26", "30", "34", "38", "42", "46", "50", "54", "58", "62", "66", "70", "74", "78", "82", "86", "90", "94"]
NAMES = ["Buenos Aires City", "Buenos Aires", "Catamarca", "Córdoba", "Corrientes", "Chaco", "Chubut", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tucumán", "Tierra del Fuego"]


def pages(file):
    return [p.extract_text() for p in PdfReader(ROOT / file).pages]


population_pages = pages("population.pdf")
area_pages = pages("area.pdf")
assert "2022" in area_pages[0]
result = {"retrieved": "2026-10-07", "populationYear": 2026, "regions": {}, "evidence": {}}
for i, (code, name) in enumerate(zip(CODES, NAMES)):
    first_page = 33 + i * 5
    population = {}
    for page, years in [(first_page, range(2022, 2026)), (first_page + 1, range(2026, 2030))]:
        text = population_pages[page - 1]
        assert all(str(y) in text for y in years)
        values = [int(n.replace(".", "")) for n in re.search(r"^Total (.+)$", text, re.M).group(1).split()]
        assert len(values) == 12
        for j, year in enumerate(years):
            if year <= 2026:
                assert values[j * 3] == values[j * 3 + 1] + values[j * 3 + 2]
                population[str(year)] = values[j * 3]
    # The report's Table 12 separates the Americas, South Atlantic and Antarctica.
    area_row = re.search(r"\b" + code + r" ([0-9 ]+) ([0-9]+\.[0-9]) ([0-9]+\.[0-9])", area_pages[25])
    assert area_row, code
    result["regions"]["AR-" + code] = {"name": name, "population": population, "area": float(area_row.group(2)), "populationPages": [first_page, first_page + 1], "areaPage": 26}
national = int(re.search(r"^Total ([\d.]+)", population_pages[28], re.M).group(1).replace(".", ""))
assert sum(r["population"]["2026"] for r in result["regions"].values()) == national == 46466688
result["nationalPopulation2026"] = national

real = openpyxl.load_workbook(ROOT / "real-gva.xlsx", data_only=True)["VABpb"]
assert "millones" in real["B3"].value and "2004" in real["B3"].value
assert real["W6"].value == "2024 (2)"
for i, code in enumerate(CODES):
    row = 7 + i
    result["regions"]["AR-" + code]["realGva"] = real.cell(row, 23).value * 1e6
    result["regions"]["AR-" + code]["realGvaSourceName"] = real.cell(row, 2).value
result["evidence"]["realGva"] = {"file": "real-gva.xlsx", "sheet": "VABpb", "unit": real["B3"].value, "year": real["W6"].value, "notes": [real.cell(i, 2).value for i in range(31, 36)]}


def nominal(code, file, sheet, header_row, total_row, column, multiplier, basis, status):
    table = openpyxl.load_workbook(ROOT / file, data_only=True)[sheet]
    units = " ".join(str(c.value).lower() for row in table.iter_rows(min_row=1, max_row=10) for c in row if c.value)
    assert "corrientes" in units
    assert ("millones" if multiplier == 1e6 else "miles") in units
    header = str(table.cell(header_row, column).value)
    assert "2024" in header
    value = table.cell(total_row, column).value
    assert isinstance(value, (int, float)) and value > 0
    result["regions"]["AR-" + code]["nominal"] = {"value": value * multiplier, "year": 2024, "basis": basis, "status": status, "file": file}
    result["evidence"][file] = {"sheet": sheet, "headerCell": table.cell(header_row, column).coordinate, "header": header, "valueCell": table.cell(total_row, column).coordinate, "sourceValue": value, "unitMultiplier": multiplier, "title": table.cell(1, 1).value}


nominal("02", "caba.xlsx", "PGB_C_04_09 ", 3, 4, 22, 1e6, "basic", "provisional")
nominal("18", "corrientes.xlsx", "Cuadro 4", 3, 4, 24, 1e3, "basic", "provisional")
nominal("30", "entre-rios.xlsx", "VA C", 12, 13, 24, 1e3, "basic", "provisional")
nominal("38", "jujuy.xlsx", "a Precios Corrientes", 3, 5, 22, 1e3, "basic", "provisional")
tucuman = openpyxl.load_workbook(ROOT / "tucuman.xlsx", data_only=True).active
row = next(i for i in range(1, tucuman.max_row + 1) if tucuman.cell(i, 1).value == 2024)
assert "millones" in tucuman["B1"].value and "mercado" in tucuman["AN3"].value
result["regions"]["AR-90"]["nominal"] = {"value": tucuman.cell(row, 40).value * 1e6, "year": 2024, "basis": "market", "status": "preliminary", "file": "tucuman.xlsx"}
result["evidence"]["tucuman.xlsx"] = {"sheet": tucuman.title, "valueCell": f"AN{row}", "sourceValue": tucuman.cell(row, 40).value, "unitMultiplier": 1e6, "title": tucuman["B1"].value}

rows = list(csv.DictReader((ROOT / "buenos-aires.csv").open(encoding="utf-8-sig")))
last = [r for r in rows if r["anio"].startswith("2024")]
assert len(last) == 17 and len({r["actividad_sector_letra"] for r in last}) == 17
assert last[-1]["actividad_detalle"] == "Impuestos"
# The CSV lists the 16 value-added categories plus net product taxes, not a total row.
result["regions"]["AR-06"]["nominal"] = {"value": sum(float(r["valor_precios_corrientes"]) for r in last) * 1e6, "year": 2024, "basis": "market", "status": "preliminary", "file": "buenos-aires.csv"}
result["evidence"]["buenos-aires.csv"] = {"sourceRows": last, "unitMultiplier": 1e6, "calculation": "Sum 16 industry categories plus IVA and other product taxes; units confirmed by official dataset catalogue."}

for code, file, page_number, pattern, basis in [
    ("82", "santa-fe.pdf", 7, r"PBG a precios básicos \(1\) \+ \(2\) [\d.]+ [\d.]+ ([\d.]+)", "basic"),
    ("94", "tierra-del-fuego.pdf", 6, r"2024 fue de ([\d.]+) miles de pesos", "basic"),
]:
    text = pages(file)[page_number - 1]
    match = re.search(pattern, text)
    assert match, file
    source_value = int(match.group(1).replace(".", ""))
    result["regions"]["AR-" + code]["nominal"] = {"value": source_value * 1000, "year": 2025 if code == "82" else 2024, "basis": basis, "status": "preliminary", "file": file}
    result["evidence"][file] = {"page": page_number, "sourceValue": source_value, "unitMultiplier": 1000, "excerpt": text[match.start():match.end()]}

# IPEC also publishes its own 2025 per-capita value; preserve it and its denominator.
assert "$19.870.307" in pages("santa-fe.pdf")[19]
result["regions"]["AR-82"]["nominal"]["publishedPerCapita"] = 19870307

used = ["population.pdf", "area.pdf", "real-gva.xlsx", "caba.xlsx", "buenos-aires.csv", "corrientes.xlsx", "entre-rios.xlsx", "jujuy.xlsx", "tucuman.xlsx", "santa-fe.pdf", "tierra-del-fuego.pdf", "exchange-rates.json"]
manifest = json.loads((ROOT / "manifest.json").read_text())
for file in used:
    assert hashlib.sha256((ROOT / file).read_bytes()).hexdigest() == manifest["files"][file]["sha256"]
result["files"] = {file: manifest["files"][file] for file in used}
(ROOT / "tables.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Extracted 24 populations, 24 reported areas, 24 real-output values and 8 nominal accounts.")
