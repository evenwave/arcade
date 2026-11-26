# Letterlock — Prototype 01
Standalone word puzzle for Evenwave's Arcade.

- index.html: markup; styles.css: presentation; engine.js: pure game rules; game.js: browser controls and animations.
- words.txt: 3–8 letter, ASCII lowercase entries filtered from [dolph/dictionary popular.txt](https://github.com/dolph/dictionary/blob/master/popular.txt), a common-English subset of ENABLE and Wiktionary frequency lists. 17,906 entries. Some legitimate words may be absent. No dictionary API or account needed.
- Letter weights approximate Scrabble's English distribution.
- Shift with arrow keys or buttons; drag to submit, click endpoints then submit, or type and press Enter. Board swipes are reserved for word selection.
- Strict alternating zipper entry lanes, up to three tiles. When fewer spaces are eligible, the letter is prioritized over obstacles.
- Only manually submitted words score. They clear in place without collapsing the board. Obstacle runs clear and collapse only on shifts; no score for obstacles.
- Scores are stored locally using a separate letterlock-best-v1 key.
