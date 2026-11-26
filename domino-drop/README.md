# Domino Drop — Prototype 03

Math-only gameplay experiment for Evenwave Arcade. No external libraries.

- 6 columns × 12 rows, empty start. Ivory tiles with uniformly random pips 1–5, independently generated per half.
- Falling two-block pieces rotate clockwise; wall kicks attempt nearby legal placements. A/D or arrows move, W/up rotates, S/down held soft-drops. Touch controls support holding. P/Escape pauses; losing focus pauses.
- Landed halves are independent and compact down their own columns before checking matches; no cavities.
- Next three pairs shown in order, horizontal above board on mobile, vertical beside board on desktop.
- Horizontal/vertical contiguous triples totaling ten earn 100 each. A maximal straight run of four or more fives earns 1,000 as one Mega Match and clears that run only. No color matching. Two or three fives alone do not clear. Simultaneous groups score independently; overlapping cells are removed once. Each cascade wave multiplies base score by wave number; simultaneous groups are labeled a match combo. Cascades repeat until stable.
- Start at 1000 ms per cell, 10% faster every 20 placed dominoes (floor 150 ms). Hold down for 15 cells/sec. 500 ms contact delay, 300 ms flash and 110 ms settling pause. No next piece during cascade. Game over if horizontal spawn is blocked.
- Separate local best-score key (domino-drop-best-v2); Prototype 01 scores remain intact. Local best score only. No shared leaderboard yet. Prototype settings are deliberately provisional.

Prototype 01 is preserved at commit 742ad30e06dd764d3cc191c83f4105919e9812d2. Board, controls, landing physics, preview queue and speed progression remain unchanged.

Prototype 03 is a visual-only revision of Prototype 02 (commit 990ca65903d3f1c157ea1c171a4d032ed183b564): no ghost landing preview, clearer individual tile borders and spacing, larger responsive pips. The existing best-score key, all gameplay rules, speed, controls, and upcoming-piece behavior remain unchanged.
