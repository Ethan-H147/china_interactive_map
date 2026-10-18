// EPSG:2056 (CH1903+ / LV95) needs the datum shift as well as the map projection.
// The source ESRI WKT omits TOWGS84; inferring it silently leaves ~150 m of offset.
// swisstopo: https://www.swisstopo.admin.ch/dam/en/sd-web/rbTNT25PXkEA/georef_d.pdf
export const swissLV95='+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346 +units=m +no_defs';
export const swissToWGS84='-proj wgs84 from="'+swissLV95+'"';
