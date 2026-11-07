# Tracker, `/tracker`

Sam's private wall of projects: plain black and white panels with just the name and days since last touched, grouped under small headings (Needs work, Works, To check, Ideas). Click one and it **expands in place** across the full row (summary, link, last thing done, what it needs to work at all, next features); click again to close, one open at a time. **No pop-ups or modals**: Sam rejected the first version's dialog. Built 2026-11-07 because Sam starts projects, gets distracted and forgets them. Noindex, not linked from any index.

## Pieces

- `index.html`: public static shell, **no project data in it**. Google sign-in through Firebase Auth (project coldwar-d8109, same as Checkin), then fetches the list with the ID token.
- `worker/`: Cloudflare Worker `unisam-tracker` at `unisam.nz/tracker/api/*`, KV `TRACKER_KV`, key `projects`. It verifies the Firebase ID token itself and only answers for `ALLOWED_EMAIL` (samgetsstuffdone@gmail.com). Deploy: `npx wrangler@4 deploy --config tracker/worker/wrangler.jsonc`.
- `projects.md`: **the private list, never committed** (in `.git/info/exclude` and blocked by the pre-commit and pre-push hooks). Format is explained at its top.
- `publish.py`: parses `projects.md`, adds each project's last git commit date (`folder` in this repo, or `note` in ~/notes, ignoring pure renames) and PUTs it to the Worker. `--dry-run` prints the JSON.
- **Adding and deleting on the page** (2026-11-07): "Add project" in the header opens an inline form (name, status, link, summary, features); an open panel has a Delete button that needs a second click (no dialog). The Worker (POST/DELETE `/tracker/api/projects`, ID token) changes the KV list at once and logs the change in KV key `changes`. `publish.py` fetches that log first (`GET /changes`, admin key), writes the adds/deletes into `projects.md`, then uploads with `applied` ids so the Worker clears them. So **always run publish.py before editing projects.md by hand**, or a web change could be missed until the next run (it is never lost, it stays in the log).
- `test/verify.test.mjs` and `test/edit.test.mjs`: tests for the token check and the add/delete helpers. Run both after touching the Worker.
- Checking `index.html` without signing in: headless Chrome never gets past Firebase's "Loading.". Copy the page to the scratchpad, add an import map pointing the two gstatic Firebase URLs at stub modules (fake signed-in user with `getIdToken`), serve a sample JSON at `tracker/api/projects`, and screenshot with `google-chrome --headless=new --screenshot`.
- Admin key: Worker secret `ADMIN_KEY`, value only in `~/.config/unisam-tracker-admin-key` (mode 600).

## Keeping it up to date

1. **After any change to a project in this repo**: update its entry in `projects.md` (`last`, `functional`, `features`, `status`), then run `python3 tracker/publish.py`. Dates come from git automatically, so commit first.
2. **New project**: add an entry. Finished and nothing planned: remove it (Sam does not want finished sites on the wall).
3. **Occasionally** (when Sam asks, or when working on the tracker): look through `~/notes/Projects/` in the Obsidian vault for new or changed project notes and bring the list in line.
4. Statuses: `needs-work` (not functional yet), `works` (has next steps), `check` (Sam to look at and decide), `idea` (not started).

Sam's choices (2026-11-07): You're the Boss and the colouring book pipeline are off the list; Report comments is "check" (paid version undecided); Talkonomics stays as a project; the tracker itself is not on its own list. Has it popped? added the same day.

## E-paper board (later)

Browser first; buy the board once the layout has been used for a while. Sam wants an all-in-one ESP32 e-paper board from Shopee Vietnam (not "raw display" or "without PCB"). It can't do Google sign-in, so it fetches `GET /tracker/api/board?key=<DEVICE_KEY>`, a names-only page. Turn it on with `npx wrangler@4 secret put DEVICE_KEY`; until then it returns 401. Fallback: an old Android tablet or Kindle in kiosk mode.

## Look

Deliberately not AESTHETIC.md: Sam asked for really plain, black and white, minimalist. No logo, system font, 1px black borders.
