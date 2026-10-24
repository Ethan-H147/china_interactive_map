# Loading symbol artwork

## United States crest

`us-great-seal.svg` retains the public-domain US Government artwork from [Great Seal of the United States (obverse).svg](https://commons.wikimedia.org/wiki/File:Great_Seal_of_the_United_States_(obverse).svg), downloaded 23 October 2026. Commons identifies the original source as the US Government publication *Our Flag*. This is the drawing in the user's reference.

Run `node scripts/prepare-us-crest.mjs` to extract group `g308` and its referenced gradient and clipping definitions into `dist/vendor/us-crest.svg`. The output contains only the thirteen stars, gold rays and surrounding clouds. It excludes the eagle, ribbon, shield and outer seal. Original paths and colors are preserved; the square viewport adds clearance for rotation. The existing image-emblem animation rotates the isolated crest and stops under reduced motion.

## Philippine sun geometry

The Philippine flag and loading sun use the vector geometry from [Flag of the Philippines.svg on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Flag_of_the_Philippines.svg), retrieved 6 October 2026. The file's source description attributes its construction and colors to the Philippine government's Official Gazette and identifies it as public domain.

`philippine-flag.svg` retains the original downloaded SVG. `dist/vendor/flag-ph.svg` uses that artwork for the national flag. The loader uses the same `a` path, repeated at 45-degree intervals around the original radius-9 disk. Only its outer viewport and rotation wrapper differ. It does not approximate the rays with rectangles or change the sun's proportions. The loader remains inline, avoiding an additional asset request during startup or camera movement.
