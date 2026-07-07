// Shared heuristics for turning messy free-text slot entries (both the historical
// spreadsheet rows and quick manual entry) into { names[], pieces, isBreak, flagged, notes }.

const BREAK_RE = /^\s*break\s*$/i;
const MC_RE = /^\s*mc\b/i;
const WAITLIST_RE = /wait\s*list/i;
const NO_SHOW_RE = /no\s*show/i;

// Trailing/standalone piece-count patterns: "John 2", "John (2)", "John(1or2)", "John ++"
const TRAILING_NUM_RE = /(?:^|\s)\(?(\d)\)?\s*$/;
const PLUS_RE = /\++\s*$/; // "+", "++" ~ used ad hoc by the organiser, not a reliable count
const UNCERTAIN_RE = /\(\s*\d\s*(?:or|\/)\s*\d\s*\)|poss(?:ible)?\??|\?/i;

function stripAnnotations(s) {
  return s
    .replace(/\*+/g, "")
    .replace(/\++/g, "")
    .trim();
}

function splitNames(s) {
  return s
    .split(/\s*(?:&|\/|,|\band\b)\s*/i)
    .map(n => n.trim())
    .filter(Boolean);
}

/**
 * Parse one raw cell/entry from the sheet or a quick-add box.
 * Never guesses silently: anything ambiguous comes back flagged:true with raw kept intact.
 */
export function parseEntry(raw) {
  const original = String(raw ?? "").trim();
  if (!original) return null;

  if (BREAK_RE.test(original)) {
    return { isBreak: true, names: [], pieces: null, flagged: false, raw: original, notes: "" };
  }
  if (MC_RE.test(original)) {
    return { isBreak: false, isMc: true, names: splitNames(original.replace(MC_RE, "")), pieces: null,
      flagged: false, raw: original, notes: "MC" };
  }
  if (WAITLIST_RE.test(original) || NO_SHOW_RE.test(original)) {
    return { isBreak: false, names: [], pieces: null, flagged: true, raw: original,
      notes: WAITLIST_RE.test(original) ? "wait list" : "no show" };
  }

  const uncertain = UNCERTAIN_RE.test(original);
  let working = stripAnnotations(original);

  let pieces = null;
  const trailingMatch = working.match(TRAILING_NUM_RE);
  if (trailingMatch) {
    pieces = parseInt(trailingMatch[1], 10);
    working = working.slice(0, trailingMatch.index).trim();
  }

  const hadPlusOnly = PLUS_RE.test(original) && pieces === null;
  const names = splitNames(working).filter(n => n && !/^\(?\d\)?$/.test(n));

  const flagged = uncertain || hadPlusOnly || pieces === null || names.length === 0;

  return {
    isBreak: false,
    names,
    pieces: pieces === null ? 1 : pieces,
    flagged,
    raw: original,
    notes: uncertain ? "uncertain count in original" : (hadPlusOnly ? "'+' count, guessed 1" : "")
  };
}

export function timeToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
