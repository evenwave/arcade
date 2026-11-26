# Letterlock — Prototype 03
Standalone word puzzle for Evenwave's Arcade.

- index.html: markup; styles.css: presentation; engine.js: pure game rules; game.js: browser controls and animations.
- words.txt: 3–8 letter, ASCII lowercase entries filtered from [dolph/dictionary popular.txt](https://github.com/dolph/dictionary/blob/master/popular.txt), a common-English subset of ENABLE and Wiktionary frequency lists. 17,906 entries. Some legitimate words may be absent. No dictionary API or account needed.
- Letter weights approximate Scrabble's English distribution.
- Shift with arrow keys or buttons; drag to submit, click adjacent letters then submit or press Enter; typed words disabled. Board swipes are reserved for word selection.
- Each valid shift adds four letters, prioritizing alternating zipper lanes, then other opposite-edge slots, then any empty cells. No colored obstacles.
- Only manually submitted words score. They clear in place without collapsing the board. Four new letters appear: two in cleared word cells and two in vacant perimeter cells where possible, with fallback to other vacant cells. Invalid submissions of at least three letters add four letters without clearing. Filling the board immediately ends the round. Scoring is 10/50/300/750/2000/5000 for lengths 3–8. Words may follow any eight-neighbor path without reusing a tile.
- Scores are stored locally using a separate letterlock-best-v3 key.
