# Domino Drop — Prototype 01

Initial gameplay experiment for Evenwave Arcade. No external libraries.

- 6 columns × 12 rows, empty start. Four uniformly random colors and pips 1–5, independently generated per half.
- Falling two-block pieces rotate clockwise; wall kicks attempt nearby legal placements. A/D or arrows move, W/up rotates, S/down held soft-drops. Touch controls support holding. P/Escape pauses; losing focus pauses.
- Landed halves are independent and compact down their own columns before checking matches; no cavities. Ghost previews both final positions.
- Next three pairs shown in order, horizontal above board on mobile, vertical beside board on desktop.
- Horizontal/vertical color runs of 3+ earn 25 per maximal run. Every contiguous triple totaling ten earns 100; triples satisfying both earn 250 instead. A color run containing a double earns no extra color score, but its full length clears. Other simultaneous matches score independently; overlapping cells removed once. Each wave multiplies base score by wave number; simultaneous scored groups are labeled a match combo. Cascades repeat until stable.
- Start at 1000 ms per cell, 10% faster every 20 placed dominoes (floor 150 ms). Hold down for 15 cells/sec. 500 ms contact delay, 300 ms flash and 110 ms settling pause. No next piece during cascade. Game over if horizontal spawn is blocked.
- Local best score only. No shared leaderboard yet. Prototype settings are deliberately provisional.
