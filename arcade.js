(() => {
  const toggle = document.getElementById('toggle-upcoming');
  const upcoming = document.getElementById('upcoming');
  if (!toggle || !upcoming) return;
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    upcoming.hidden = !upcoming.hidden;
    toggle.setAttribute('aria-expanded', String(!upcoming.hidden));
    toggle.textContent = upcoming.hidden ? 'Show upcoming' : 'Hide upcoming';
  });
})();
