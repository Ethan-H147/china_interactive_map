# Historical boundary inputs

The IBGE archives contain dated provinces/states and municipalities for 1872, 1900, 1933, 1940, 1960, 1980 and 1991. The DBFs use Windows-1252. Their native projection is converted to WGS84 by Mapshaper. Exact downloads and SHA-256 hashes are in manifest.json.

The Mexican SVGs retain their authors, original metadata and licenses: the 1821 map by Giggette (CC BY-SA 3.0), and the numbered 1865 map by Goran tek-en (CC BY-SA 4.0). See the source page links in the manifest and https://creativecommons.org/licenses/by-sa/3.0/ and https://creativecommons.org/licenses/by-sa/4.0/. The georeferenced JSONs are adaptations under those respective licenses. Each retains the fitted projection, affine transform and fitting residual, with the 1865 control points. Native SVG curves were sampled, ancestor transforms applied, and the numbered departments matched to the original legend. No claim is made that this generalized illustration supplies surveyed historical coordinates.

The builder retains internal historical strokes while fitting them to the current land outline. The northern Mexican exterior is reused from the already-retained Newberry US historical mosaic; the 1821 illustration supplies generalized northern provincial assignments. Before 1848, Texas after 1836 is separately marked disputed.

The normalized georeferenced JSONs are retained build inputs, so rebuilding the feature never depends on a browser, a live service, or changes to source pages.
