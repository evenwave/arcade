const scoreRows = document.querySelector('#scores');

function showScores() {
  const highScores = loadScores();
  scoreRows.replaceChildren();
  if (!highScores.length) {
    const row = scoreRows.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 3;
    cell.textContent = 'No scores yet';
    return;
  }
  highScores.forEach((run, index) => {
    const row = scoreRows.insertRow();
    for (const value of [index + 1, run.blocks, run.perfect]) {
      row.insertCell().textContent = value;
    }
  });
}

window.addEventListener('pageshow', showScores);
window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) showScores();
});
