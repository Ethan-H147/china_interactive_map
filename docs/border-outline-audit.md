# Border outline audit, 2026-10-31

The reported Yuncheng–Sanmenxia and Jincheng–Jiyuan/Jiaozuo gaps came from small cracks between separate province source surveys. The full Shanxi–Shaanxi and Shanxi–Henan edges now share the retained detailed Shanxi outline (397 and 520 vertices). Adjacent prefectures and 162 county identities across 14 parents follow those same edges. Names, identifiers and population values are retained.

The geometry check probes 4,052 shared-edge points and 1,438 two-sided offsets. It verifies 12.3801 km² of closed source cracks, zero outer land loss, no province overlap, and unchanged unrelated province and subdivision geometry. Retained pre-repair source snapshots and hashes live in scripts/boundary-sources/shanxi-seams/.

The worldwide comparison covers 155 pre-existing national international-border datasets: 127 remain byte-identical, and 28 changed datasets were compared against the pre-addition baseline at cb41d47034780ebe11a433fd683dba4dff778904. It examined 182,558 original segments and cross-checked candidate omissions against existing neighbors, current global borders and intentional new-country replacements. The audit restored missing original stretches on Ethiopia–Kenya and small Jordan–Syria fragments, extending recovery to the original reference-guide corridors. These changes preserve administrative polygons. The final audit found no remaining confirmed baseline omissions under this check; it is not a claim that every source boundary worldwide is geographically exact.

Regressions: npm run audit:world-outlines; npm run test:shanxi-seams. The browser scenarios cover desktop and phone views at zooms 8, 12 and 15 around five Shanxi landmarks, load affected county views, and verify single restored international strokes from both neighboring countries at zooms 8 and 11. Existing completion checks separately validate the new world and Americas shared arcs.

Changes remain local. No commit, push, source synchronization or deployment was performed.

Additional regression note: the existing Inner Mongolia validator passes its ten shared-arc checks but fails its older northern outer-edge assertion on both HEAD and this working copy. The current repair leaves that northern province geometry byte-for-byte unchanged. Its validator was retained without relaxing that assertion.
