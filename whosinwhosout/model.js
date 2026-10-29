/* Who's In, Who's Out: the model.
   Plain functions with no DOM access, so they run in the browser and in Node tests.
   Steps: poll average -> seats each party is entitled to -> who wins each electorate
   -> fill each party's seats with electorate winners first, then its list. */
(function (root) {
  'use strict';

  // ---- Poll average settings (documented on the page) ----
  const WINDOW_DAYS = 60;     // only polls whose fieldwork ended in the last 60 days
  const HALF_LIFE_DAYS = 14;  // a poll 14 days older counts half as much
  const DEFAULT_SAMPLE = 1000; // used when a poll's sample size is not published

  // ---- Electoral rules ----
  const SEATS = 120;     // seats shared out by party vote
  const THRESHOLD = 5;   // % of party vote needed, unless the party wins an electorate

  const DAY = 86400000;
  const days = (a, b) => (Date.parse(a) - Date.parse(b)) / DAY;

  function slug(s) {
    return String(s).replace(/[^A-Za-z0-9]/g, '');
  }

  // Normalise a person's name for matching: strip macrons/accents, case, punctuation.
  function norm(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /* Weighted poll-of-polls.
     Only each pollster's latest poll counts, so a pollster that polls more often
     does not get more say. Each poll is rescaled to 100% (this removes undecideds),
     then weighted by recency (exponential decay) and by the square root of its
     sample size. The window is anchored on the newest poll in the data, not today's
     date, so an old shared link reproduces the same average. */
  function pollAverage(polls, parties, excluded) {
    const ex = new Set(excluded || []);
    if (!polls.length) return null;
    const newest = polls.reduce((m, p) => (p.end > m ? p.end : m), polls[0].end);
    const latest = {};
    for (const p of polls) {
      if (ex.has(slug(p.pollster)) || days(newest, p.end) > WINDOW_DAYS) continue;
      const cur = latest[p.pollster];
      if (!cur || p.end > cur.end) latest[p.pollster] = p;
    }
    const used = Object.values(latest).sort((a, b) => (a.end < b.end ? 1 : -1));
    if (!used.length) return { avg: null, used, newest };
    const sums = Object.fromEntries(parties.map(k => [k, 0]));
    let sumOther = 0, sumW = 0;
    for (const p of used) {
      const listed = parties.reduce((s, k) => s + (p.pct[k] || 0), 0);
      const other = p.other != null ? p.other : Math.max(0, 100 - listed);
      const total = listed + other;
      const w = Math.pow(0.5, days(newest, p.end) / HALF_LIFE_DAYS) * Math.sqrt(p.sample || DEFAULT_SAMPLE);
      for (const k of parties) sums[k] += w * 100 * (p.pct[k] || 0) / total;
      sumOther += w * 100 * other / total;
      sumW += w;
    }
    const avg = {};
    for (const k of parties) avg[k] = sums[k] / sumW;
    avg.OTH = sumOther / sumW;
    return { avg, used, newest, latest: used[0].end };
  }

  /* Sainte-Laguë: divide each party's votes by 1, 3, 5, 7, ... and hand out
     seats one at a time to the largest quotient. */
  function sainteLague(votes, seats) {
    const out = Object.fromEntries(Object.keys(votes).map(k => [k, 0]));
    for (let i = 0; i < seats; i++) {
      let best = null, bestQ = -1;
      for (const k in votes) {
        const q = votes[k] / (2 * out[k] + 1);
        if (q > bestQ) { bestQ = q; best = k; }
      }
      if (best == null) break;
      out[best]++;
    }
    return out;
  }

  /* MMP allocation.
     partyVote: {code: %}, electorates: {code: number of electorates won}. */
  function allocate(partyVote, electorates, opts) {
    const seats = (opts && opts.seats) || SEATS;
    const threshold = (opts && opts.threshold != null) ? opts.threshold : THRESHOLD;
    const codes = Object.keys(partyVote).filter(k => k !== 'OTH');
    // Threshold and coat-tail rule: 5% of the party vote OR at least one electorate.
    // Votes for parties that miss both are discarded (Sainte-Laguë ignores them).
    const qualifying = {};
    for (const k of codes) {
      if (partyVote[k] >= threshold || (electorates[k] || 0) >= 1) qualifying[k] = partyVote[k];
    }
    const entitled = sainteLague(qualifying, seats);
    const rows = {};
    let house = 0;
    const all = new Set([...codes, ...Object.keys(electorates)]);
    for (const k of all) {
      const e = electorates[k] || 0;
      const ent = entitled[k] || 0;
      // Overhang: a party keeps every electorate it wins even if that is more than
      // its party-vote entitlement. The House grows; nobody else loses seats.
      const total = Math.max(ent, e);
      rows[k] = {
        vote: partyVote[k] || 0, qualifies: k in qualifying, entitlement: ent,
        electorates: e, list: Math.max(0, ent - e), total, overhang: Math.max(0, e - ent),
      };
      house += total;
    }
    return { parties: rows, house, overhang: house - seats };
  }

  /* Who wins each electorate.
     'hold':  the party that won the closest 2023 predecessor keeps it.
     'swing': uniform swing on the predecessor's 2023 electorate (candidate) vote,
              except seats called by hand (e.swingCall) from electorate polls or news. */
  function electorateWinners(electorates, model, avg, national2023) {
    return electorates.map(e => {
      let party, lead = null, shares = null, call = null;
      if (model === 'swing' && e.swingCall) {
        party = e.swingCall.party;
        call = e.swingCall.reason;
      } else if (model === 'swing' && e.shares2023.length) {
        shares = e.shares2023.map(c => {
          const sw = (c.party in national2023 && avg && c.party in avg)
            ? avg[c.party] - national2023[c.party] : 0; // independents and minor parties get no swing
          return { party: c.party, cand: c.cand, pct: c.pct, adj: Math.max(0, c.pct + sw) };
        }).sort((a, b) => b.adj - a.adj);
        party = shares[0].party;
        lead = shares.length > 1 ? shares[0].adj - shares[1].adj : null;
      } else {
        party = e.win2023.party;
      }
      // The named person is the winning party's 2026 candidate in this seat.
      const cand = e.candidates.find(c => c.party === party);
      return {
        name: e.name, pred: e.pred, confidence: e.confidence, notes: e.notes, maori: e.maori,
        party, candidate: cand ? cand.name : null, lead, shares, call,
        held2023: e.win2023.party, majority2023: e.win2023.majority,
      };
    });
  }

  /* Fill each party's seats: electorate winners first, then down the party list,
     skipping anyone already elected in an electorate. */
  function fillSeats(alloc, winners, lists, nextCount) {
    const out = {};
    for (const k in alloc.parties) {
      const row = alloc.parties[k];
      const elected = winners.filter(w => w.party === k).map(w => ({
        name: w.candidate || 'Candidate TBC', how: 'electorate', seat: w.name, tbc: !w.candidate,
      }));
      const taken = new Set(elected.map(m => norm(m.name)));
      const list = (lists[k] || []).filter(r => !taken.has(norm(r.name)));
      const fromList = list.slice(0, row.list).map(r => ({ name: r.name, how: 'list', rank: r.rank }));
      const next = list.slice(row.list, row.list + (nextCount == null ? 3 : nextCount))
        .map(r => ({ name: r.name, how: 'next', rank: r.rank }));
      out[k] = { mps: elected.concat(fromList), next, shortBy: Math.max(0, row.list - fromList.length) };
    }
    return out;
  }

  // Whole pipeline from data + assumptions.
  function run(data, state) {
    const pa = pollAverage(data.polls, data.pollParties, state.excl);
    if (!pa || !pa.avg) return { poll: pa, empty: true };
    const winners = electorateWinners(data.electorates, state.model, pa.avg, data.national2023);
    const counts = {};
    for (const w of winners) counts[w.party] = (counts[w.party] || 0) + 1;
    const alloc = allocate(pa.avg, counts);
    const seats = fillSeats(alloc, winners, data.lists);
    return { poll: pa, winners, alloc, seats };
  }

  const api = { WINDOW_DAYS, HALF_LIFE_DAYS, DEFAULT_SAMPLE, SEATS, THRESHOLD,
    slug, norm, pollAverage, sainteLague, allocate, electorateWinners, fillSeats, run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WIWO = api;
})(typeof window !== 'undefined' ? window : this);
