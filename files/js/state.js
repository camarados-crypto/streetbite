// ─────────────────────────────────────────────────────
//  StreetBite — Central State
//  All app state lives here. Read via getState(),
//  write via setState(). Never mutate State directly.
// ─────────────────────────────────────────────────────

const State = {

  // ── AUTH ────────────────────────────────────────────
  auth: {
    user:   null,     // Supabase user object
    uid:    null,     // user id string
    token:  null,     // access token
  },

  // ── APP (navigation + current country) ─────────────
  app: {
    currentCountry: null,   // { id, name }
    countryId:      null,   // string
    unlockShown:    false,  // confetti / unlock moment shown this session
  },

  // ── DATA (server data + user progress) ─────────────
  data: {
    allCountries:  [],          // [{ id, name }]
    collections:   [],          // [{ id, name, dishes, collected, ... }]
    allDishes:     [],          // [{ id, name, rarity, image_url, ... }]
    userDishes:    new Set(),   // Set of dish ids the user has collected
    recentDishIds: [],          // last 8 collected dish ids
    passportData:  null,        // [{ id, name, tried, total, pct }]
  },

  // ── UI (transient interaction state) ───────────────
  ui: {
    activeColl:    null,   // collection currently open
    activeDish:    null,   // dish card currently open
    activeDishNum: 0,      // card number shown in modal
    flipped:       false,  // card flipped to back side
  },

};

// ─────────────────────────────────────────────────────
//  setState(path, value)
//  Write a value by dot-path, then trigger render().
//
//  setState("auth.uid", "abc-123")
//  setState("data.userDishes", new Set([...]))
//  setState("ui.activeDish", dishObject)
// ─────────────────────────────────────────────────────
function setState(path, value) {
  const keys = path.split('.');
  let cursor = State;
  for (let i = 0; i < keys.length - 1; i++) {
    cursor = cursor[keys[i]];
  }
  cursor[keys[keys.length - 1]] = value;
  render();
}

// ─────────────────────────────────────────────────────
//  getState(path)
//  Read a value by dot-path.
//
//  getState("auth.uid")          // "abc-123"
//  getState("data.userDishes")   // Set { ... }
//  getState("app.currentCountry") // { id, name }
// ─────────────────────────────────────────────────────
function getState(path) {
  return path.split('.').reduce((cursor, key) => cursor?.[key], State);
}

// ─────────────────────────────────────────────────────
//  render()
//  Central render dispatcher. Called after every
//  setState(). Decides what to re-render based on
//  which screen is currently visible.
// ─────────────────────────────────────────────────────
function render() {
  const homeVisible    = !document.getElementById('s-home')?.classList.contains('gone');
  const collVisible    = !document.getElementById('s-coll')?.classList.contains('gone');
  const profileVisible = !document.getElementById('s-profile')?.classList.contains('gone');

  if (homeVisible)    renderHome();
  if (collVisible  && State.ui.activeColl)  renderColl(State.ui.activeColl);
  if (profileVisible) renderProfile();
}
