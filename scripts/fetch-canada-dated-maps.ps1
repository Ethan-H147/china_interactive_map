# Run from the atlas root with PowerShell. The source caches stay in artifacts/.
$ErrorActionPreference = 'Stop'
$cache = 'artifacts/canada-history'
New-Item -ItemType Directory -Force $cache | Out-Null

function Get-Source($Url, $Name) {
  $file = Join-Path $cache $Name
  if ((Test-Path -LiteralPath $file) -and (Get-Item -LiteralPath $file).Length) { return }
  curl.exe --fail --location --silent --show-error --retry 2 --max-time 600 $Url -o "$file.download"
  if ($LASTEXITCODE) { throw "Could not download $Name" }
  Move-Item -LiteralPath "$file.download" -Destination $file -Force
}

$territorial = 'https://maps-cartes.services.geo.ca/server_serveur/rest/services/NRCan/territorial_evolution_en/MapServer/8/query'
Get-Source "$($territorial)?where=1%3D1&outFields=OBJECTID,HISTO&returnGeometry=false&f=json" 'nrcan-index.json'
$dated = (Get-Content "$cache/nrcan-index.json" -Raw | ConvertFrom-Json).features
foreach ($group in ($dated.attributes | Group-Object HISTO)) {
  $ids = $group.Group.OBJECTID -join ','
  Get-Source "$($territorial)?objectIds=$ids&outFields=OBJECTID,PROV_NAME,HISTO,Period_Group&outSR=4326&maxAllowableOffset=0.001&geometryPrecision=6&f=geojson" "territory-$($group.Name).json"
}

$borealis = 'https://borealisdata.ca/api/access/datafile/'
Get-Source "${borealis}449024" 'correspondence.tsv'
Get-Source "${borealis}449032" 'fed.tsv'
Get-Source "${borealis}449029" 'ridings.zip'
if ((Get-FileHash "$cache/ridings.zip" -Algorithm MD5).Hash -ne '56BB2C53EFAF82D028FA61A35474B5F4') { throw 'Riding archive checksum mismatch' }
Get-Source 'https://open.canada.ca/data/dataset/ea8f2c37-90b6-4fee-857e-984d3060184e/resource/5c8ab22c-4a5e-494b-879a-e0611bc10a95/download/hfer_e.csv' 'results.csv'
Get-Source 'https://www.elections.ca/scripts/OVR2011/34/data_donnees/table_tableau12.csv' '2011.csv'
Get-Source 'https://www.elections.ca/res/rep/off/ovr2015app/41/data_donnees/table_tableau12.csv' '2015.csv'
Get-Source 'https://www.elections.ca/res/rep/off/ovr2019app/51/data_donnees/table_tableau12.csv' '2019.csv'
Get-Source 'https://www.elections.ca/res/rep/off/ovr2021app/53/data_donnees/table_tableau12.csv' '2021.csv'
Get-Source 'https://www.elections.ca/res/cir/mapsCorner/edb/FederalElectoralDistricts_SHP.zip' '2025.zip'
Get-Source 'https://www.elections.ca/res/rep/off/ovrGE45/62/data_donnees/table_tableau12.csv' '2025.csv'

if (!(Test-Path "$cache/fedshapes_cbf_20221003")) { tar.exe -xf "$cache/ridings.zip" -C $cache; if ($LASTEXITCODE) { throw 'Could not unpack historical riding archive' } }
if (!(Test-Path "$cache/FederalElectoralDistricts_SHP")) { tar.exe -xf "$cache/2025.zip" -C $cache; if ($LASTEXITCODE) { throw 'Could not unpack 2025 riding archive' } }
$files = @(Get-ChildItem "$cache/fedshapes_cbf_20221003" -Filter '*.shp') + @(Get-Item "$cache/FederalElectoralDistricts_SHP/ED_CF.shp")
foreach ($f in $files) {
  $year = if ($f.BaseName -match 'RO(\d{4})') { $Matches[1] } else { '2025' }
  $file = "$cache/riding-$year.json"
  if (Test-Path -LiteralPath $file) { continue }
  node node_modules/mapshaper/bin/mapshaper $f.FullName -clean -simplify interval=24m keep-shapes -proj wgs84 -o $file precision=0.000001
  if ($LASTEXITCODE) { throw "Could not convert riding order $year" }
}
