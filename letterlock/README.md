# Letterlock — Prototype 02
Standalone word puzzle for Evenwave's Arcade.

- index.html: markup; styles.css: presentation; engine.js: pure game rules; game.js: browser controls and animations.
- words.txt: 3–8 letter, ASCII lowercase entries filtered from [dolph/dictionary popular.txt](https://github.com/dolph/dictionary/blob/master/popular.txt), a common-English subset of ENABLE and Wiktionary frequency lists. 17,906 entries. Some legitimate words may be absent. No dictionary API or account needed.
- Letter weights approximate Scrabble's English distribution.
- Shift with arrow keys or buttons; drag to submit, click adjacent letters then submit, or type and press Enter. Board swipes are reserved for word selection.
- Strict alternating zipper entry lanes, up to three new letters. No colored obstacles.
- Only manually submitted words score. They clear in place without collapsing the board. Words may follow any eight-neighbor path without reusing a tile.
- Scores are stored locally using a separate letterlock-best-v2 key.
