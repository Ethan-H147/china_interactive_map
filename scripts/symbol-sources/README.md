# Philippine sun geometry

The Philippine flag and loading sun use the vector geometry from [Flag of the Philippines.svg on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Flag_of_the_Philippines.svg), retrieved 6 October 2026. The file's source description attributes its construction and colors to the Philippine government's Official Gazette and identifies it as public domain.

`philippine-flag.svg` retains the original downloaded SVG. `dist/vendor/flag-ph.svg` uses that artwork for the national flag. The loader uses the same `a` path, repeated at 45-degree intervals around the original radius-9 disk. Only its outer viewport and rotation wrapper differ. It does not approximate the rays with rectangles or change the sun's proportions. The loader remains inline, avoiding an additional asset request during startup or camera movement.
