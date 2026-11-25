const storageKey = 'stack-shift-scores';

function rankScores(scores) {
  return scores.sort((a, b) => b.blocks - a.blocks || b.perfect - a.perfect).slice(0, 5);
}

function loadScores() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) {
      return rankScores(saved.filter(run =>
        run && Number.isSafeInteger(run.blocks) && run.blocks > 0 &&
        Number.isSafeInteger(run.perfect) && run.perfect >= 0 && run.perfect <= run.blocks
      ));
    }
  } catch {
    // The game works when browser storage is unavailable.
  }
  return [];
}

function saveScore(run) {
  try {
    const scores = rankScores([...loadScores(), run]);
    localStorage.setItem(storageKey, JSON.stringify(scores));
  } catch {
    // Gameplay can continue when browser storage is unavailable.
  }
}
