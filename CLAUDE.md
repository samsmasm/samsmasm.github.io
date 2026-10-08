# CLAUDE.md — samsmasm.github.io (unisam.nz)

## What this is

The GitHub Pages repo for **unisam.nz** — a teacher-built site for IB students. Static HTML/CSS/JS deployed directly from this repo. No bundler at the root level. Individual subdirectory projects may have their own build steps (Astro for `ibbm-src` → `ibbm/` and `ibecon-src` → `ibecon/`).

---

## Repo layout

```
/                         ← root, deploys as unisam.nz
  index.html              ← homepage with tab nav and news feed
  AESTHETIC.md            ← visual language reference — READ BEFORE BUILDING ANYTHING
  ibbm-src/               ← Astro source for IBBM site (npm run build → ibbm/)
  ibecon-src/             ← Astro source for IBecon site (npm run build → ibecon/)
  ibbm/                   ← built output, do not edit directly
  ibecon/                 ← built output, do not edit directly
  econnews/               ← weekly economics news feed
  businews/               ← weekly IB BM case studies (see CLAUDE.md inside)
  ibnews/                 ← IB News Finder (Cloudflare Worker + frontend)
  ratibro/                ← IB Finance revision app (Firebase auth + Firestore)
  moa/                    ← MOA: Modern Origin Archive (retro Windows 9x aesthetic)
  fmwskills/              ← FMW skills-sequencing planning docs + collaborative Kanban tool (Firebase, see CLAUDE.md inside)
  longcut/                ← Quiet-route A* pathfinder (Leaflet + OSM, single HTML)
  turtle/                 ← Turtle Artist: kids' turtle-graphics tool (single HTML, see CLAUDE.md inside)
  graphs/                 ← Economics Graph Drawer (see CLAUDE.md inside)
  pulse/                  ← Live classroom response tool (Firebase Realtime DB)
  checkin/                ← Checkin: class question sets and marking (Google sign-in + Firestore in coldwar-d8109, see SETUP.md inside)
                             NOTE: deliberately does NOT follow AESTHETIC.md. It is styled after ratibro/
                             (Fraunces + Nunito, amber on navy, sidebar shell, dark mode) because it is a
                             standalone concept meant to be migrated to a school GitHub. Keep it self-contained:
                             no site logo, no unisam.nz references, relative paths only.
  aiorus/                 ← "AI or us?" Grade 9 History card sort + live class screen (anonymous Firestore in
                             coldwar-d8109; its rules live at the end of checkin/firestore.rules; see SETUP.md).
                             Run `python3 stamp.py` inside it before committing (4h cache).
  aiorus2/                ← first version of aiorus (machines-vs-humans task sort), kept as-is
  lineup/                 ← Lineup: aiorus generalised to any topic. Teachers sign in, make decks with an AI prompt
                             (copy prompt → chatbot → paste reply), share decks, run sessions. Firestore lineupDecks +
                             lineupRooms in coldwar-d8109; rules at the end of checkin/firestore.rules (Sam re-pastes
                             them into the console). See CLAUDE.md + SETUP.md inside. Run `python3 stamp.py` before committing.
  covers/                 ← Covers (was Door Cover): find and print book covers, page sizes, multi-cover sheet with
                             auto arrange and drag to rearrange. Single HTML, linked from /tools (see CLAUDE.md inside)
  ai/                     ← "How I Use AI": landing, full statement, Click-on-me bobblehead (see CLAUDE.md inside;
                             NEVER commit ai/me.jpg, ai/id.jpg or the bobble-* mockups)
  find/                   ← Find: "which tool do I want?" filter page over every public tool. The tools list is find/tools.js;
                             add new public tools there (see CLAUDE.md inside)
  qreview/                ← IB continual revision / flashcard tool
  reports/                ← automated student report tools (see CLAUDE.md inside)
  cultivar/               ← genetics/cultivar tool (see CLAUDE.md inside)
  mymaths/                ← mymaths integration (see CLAUDE.md inside)
  [many other small tools]
```

### Other projects with their own CLAUDE.md

Read the folder's own CLAUDE.md before working in any of these.

**Teaching tools (IB / classroom)**
- `econia/`: step-by-step IB Economics IA commentary guide with stage progress tracking
- `ibeconinequality/`: tax and redistribution simulation (Lorenz curve, Gini)
- `slopstudy/`: Slop Study (CaseGen), slot-machine IB BM case study + exam question generator
- `argmap/`: Argument Mapper, freeform canvas for essay argument maps
- `dowser/`: live collaborative sticky-note board (predecessor to Pulse)
- `spectra/`: live opinion poll, students place themselves on an agree/disagree spectrum
- `wb/`: minimal whiteboard, drawing layer + grid layer, no backend
- `pdfwrite/`: upload a PDF and annotate it freehand
- `newbiz/`: random-word business case generator with 3D drum spinner (chrome-free by design)

**Personal tools** (`sayso`, `moderntranslation`, `tote` are meant for the future private page; keep them off the public index)
- `sayso/`: marking transcription app (Cloudflare Worker, live)
- `moderntranslation/`: password-gated classic-text modernizer (Cloudflare Worker)
- `tote/`: tiny shared notes, Firebase Realtime DB, notes expire after 96h
- `mortgage/`: mortgage payoff calculator built from Sam's tracking spreadsheet
- `fnl/`: Friday Night Live open mic scheduler
- `cluitar/`: classical guitar practice path
- `wc26/`: World Cup 2026 office sweepstake leaderboard, scored from ESPN's API

**Kids' games**
- `typurr/`: Typurr typing game for ages 4 to 8, starring Ty the cat (branched from `catjump`)
- `catjump/`: Cat Jump runner game

**Evolution simulations**
- `amoeba/`: organisms with four heritable genes compete for food
- `trees/`: forest evolution, 11 genes, climate controls
- `walker/`: bone-and-muscle creatures learn to walk (custom Verlet physics)
- `racecar/`: evolving polygon cars on Planck.js tracks

### Smaller projects (each has a brief CLAUDE.md)

**Hub pages**
- `experiments/`: The /experiments hub page: links to evolution sims, visual maths toys, make-and-build tools and kids' games.
- `tools/`: The /tools hub page: quizzes and games, reading the room, thinking and boards, PDFs and more.

**Teaching tools**
- `ask-v1.0/`: Early student question-submission tool with a teacher login.
- `busia/`: Student guide to the IB Business Management Internal Assessment, start to finish, one page per stage.
- `causation/`: Practise explaining how one event caused another: random sentence pairs, with an optional checking mode for typed answers.
- `causation2/`: Levelled version of the causation trainer with AI checking of answers.
- `coldwar/`: Cold War classroom role-play game: nations, team goals, individual missions, live scoreboard.
- `flare/`: Students press a button to signal the teacher (e.g. 'I'm lost'); when enough do, the teacher's screen plays a sound.
- `flippinghard/`: Live coin-flip betting game: teacher runs flips, students join a session and bet their balance.
- `griz/`: **in use.** Jeopardy-style team quiz board from CSV (questions via Sam's custom GPT), point decay, pass/steal mode, times-table boards. Full notes in its CLAUDE.md.
- `hippiesandspies/`: FMW (Grade 9) question-tree for choosing a 1960s research topic: spies, counterculture, civil rights.
- `inflation/`: NZ inflation by household group: headline CPI vs household living-cost price indexes, by demographic, income and housing.
- `marketinghub/`: IB BM Unit 4 Marketing notes: one page per subtopic (4.1 to 4.6, including each of the 7 Ps).
- `printergoesbrrr/`: Classroom simulation of rate setting and lending rounds.
- `quiz/`: The Talkonomics weekly economics quiz: latest edition plus archive.
- `samples/`: Proof of concept: IB model answers revealed step by step from hint to full paragraph.
- `stocksimulator/`: **in use.** Many random-walk price paths, then pick the 'most interesting' one to show patterns in noise. `index.html` (simple ±1 walk) and `index2.html` (log returns, drift, price mode). Full notes in its CLAUDE.md.
- `supplyanddemand/`: Shift supply and demand curves and see the changes.
- `uniquiz/`: Kahoot-style live quiz: teacher creates a quiz (CSV import), students join with a PIN.
- `wingeometer/`: NZ parliamentary speech analyser: language patterns by party from Hansard (future/past, positive/negative, fear, we/they).

**General tools**
- `peedeeeffer/`: In-browser PDF split, merge, extract and EPUB tool with a heavy-file mode.
- `pinhole/`: Pinhole camera design calculator: film format, focal length, optimal pinhole diameter, exposure.
- `reveal/`: Upload an image, cover it in tiles, click to reveal it bit by bit (classroom guessing game).
- `scrim/`: Collaborative note/web canvas with pan/zoom, connectors, JPG/TXT export and password-protected rooms.
- `spin/`: Word spinner with saved word lists, temporary sets, dice and a timer.
- `turnright/`: Generates walking routes by always turning one way (left- or right-hand rule) from a start pin for a target distance, on OSM streets.

**Maths toys and practice**
- `algeqs/`: Generates NCEA-style algebra questions at Achieved, Merit or Excellence level.
- `binary-game-v1.1/`: Toggle bits to hit a target number. Includes an 'Age in Binary' page.
- `chaos/`: Chaos game fractal explorer: polygon presets or click to place vertices, colour modes, exclusion rules, speed.
- `cinvert/`: Draw circles and lines, see their inversions and equations.
- `coordgeo-v1.1/`: Generates coordinate geometry problems with a Chart.js plot.
- `discountdash-v1.0/`: Pick the cheaper supermarket basket over six timed rounds.
- `findtreasure/`: Hidden-treasure guessing game inside a shape (triangles, squares, countries), with adjustable win radius and click count.
- `flowers/`: Sunflower-style seed spirals from a rotation fraction, with animated sweeps through decimal places.
- `funcheatmap-v2/`: Heatmap and contour of any formula in a and b, with log scale option.
- `joinedpoints/`: Random points joined to nearest neighbours, with motion, rainbow and polygon fill options.
- `mandelbrot-v2/`: Mandelbrot set explorer with pan, zoom and iteration controls.
- `runymxc/`: Predict where Bob should start so he finishes with Amber; teaches linear equations.
- `treethree/`: Build a sequence of coloured trees under TREE(3)-style rules by drag and drop.

**Kids' games**
- `anipics/`: Type an animal name, get its emoji.
- `cookiejar-v2.0/`: Kids' addition game: answer to collect cookies.
- `flyswat/`: 60-second fly-swatting game.
- `fractions/`: Kids' fraction games with Mr. Pizza: order pizzas, match equivalents, build a fraction; three difficulty levels and player profiles.
- `guesswhoanimals/`: Suggests the best yes/no question to ask at each step of an animal Guess Who game.
- `ipmemory/`: Timed card-matching memory game.
- `kittymaze/`: Mobile-friendly cat maze game with difficulty levels and sounds.
- `mousechase-v2/`: Pick a hunter and prey emoji and chase.
- `multiplication-memory-v2.1/`: Memory-match game for chosen times tables.
- `numbertiles/`: Put number (or emoji) tiles in order.
- `snowflake/`: Fold paper three times, cut while folded, unfold to reveal the snowflake; save PNG.
- `sudoku/`: Sudoku with four levels, notes mode, and save/load as a string.
- `unichase/`: Joystick-controlled unicorn chase game with a best-time record.

**Simulations**
- `racecar2/`: Variant of `racecar/` where the whole population races at once: tournament selection, crossover, evolvable drivetrain.
- `spiral/`: Factions claim numbers on a square spiral by turn; watch the patterns that emerge.

**Jokes**
- `heresy/`: Joke page in Ancient Greek with a 'reveal the truth' button and heretical quotes.
- `isluxonpm/`: Answers whether Christopher Luxon is still NZ Prime Minister, using the Wikipedia REST summary.

**Personal**
- `mymaths/`: Sam's personal roadmap from NCEA Level 3 to graduate-level mathematics.
- `photos/`: Sam's photo gallery with tags.
- `typeit/`: Photos or PDFs of pages to faithful text (handwriting or print), password-gated, nothing stored.

**Pipelines and workers (no public page)**
- `businews_scripts/`: Python pipeline that generates the BusiNews IB BM case studies.
- `econnews_scripts/`: Python pipeline for the weekly EconNews feed (RSS to Claude to GitHub Pages).
- `quiz_scripts/`: `quiz_generate.py` builds each weekly Talkonomics quiz into `quiz/`.
- `talkonomics/`: Cloudflare Worker and design handoff for Talkonomics. No public page here; the quiz itself is at `quiz/`.

**Old versions and placeholders (do not edit unless asked)**
- `catjumpold/`: Original simple Cat Jump. Superseded by `catjump/`; kept for reference.
- `copythisone/`: Empty placeholder (blank `index.html`, `script.js`, `styles.css`). Nothing to work on here unless Sam asks.
- `econnewsbackup/`: Old snapshot of EconNews (a handful of March 2026 posts). Live version is `econnews/`. Do not edit.
- `fractions-classic/`: Earlier Pizza Fractions with the cat theme. Superseded by `fractions/`.
- `treethree-v2.1/`: Iteration of `treethree/`.
- `treethree-v2.2/`: Latest iteration of `treethree/`.

---

## Design system

**Always read `AESTHETIC.md` before creating or editing any frontend.** Key rules:
- Pastel watercolour header gradient (multi-radial). Never flat or linear.
- Subject colours: Economics green (`#145c34`), BM blue (`#1a3a7a`), History orange (`#7a2d0a`), Tools purple (`#4a1a7a`), Experiments pink (`#7a1a4a`).
- Georgia or system sans-serif. No Inter, no DM Sans, no Tailwind aesthetics.
- No drop shadows, no pill buttons, no neutral grey card backgrounds, no dark mode toggle.
- Logo: `/unisamsq.png`, 56–72px, border-radius 12–16px.

---

## GitHub Actions / automation

- `econnews_scripts/` — Python scripts for the EconNews pipeline (RSS → Claude → GitHub Pages)
- `businews_scripts/` — Python scripts for the BusiNews pipeline (see `businews/CLAUDE.md`)
- `.github/workflows/` — workflow definitions
- `generate-feeds.py` / `generate-manifest.js` — feed generation utilities

---

## Deployment

Every push to `main` deploys via GitHub Pages. The repo root is the site root. Subdirectory `ibbm/` and `ibecon/` are built Astro outputs — never edit those files directly; edit `ibbm-src/` and `ibecon-src/` then rebuild.

---

## Homepage index — planned future changes

The homepage nav (`index.html`) currently exposes: This week, Economics (IBecon, Samples), Business (IBBM, RatIBro, Slop Study), Tools dropdown, Experiments, Old site. A sweep in August 2026 found ~46 top-level directories with a working `index.html` that are not linked from `index.html`, `/tools`, or `/experiments`. Outstanding decisions:

- **Games and toys.** A large batch of small games sits unlinked (`amoeba`, `walker`, `racecar2`, `spiral`, `flyswat`, `ipmemory`, `cookiejar-v2.0`, `findtreasure`, `mousechase-v2`, `flippinghard`, `turnright`, `spin`, `fnl`, `wc26`, `copythisone`, and old duplicates like `catjumpold`, `fractions-classic`, `treethree*`). Sam needs to go through these and check which are still live and worth surfacing before any get added to `/experiments`. Do not bulk-link them.
- **Unlinked teaching resources** also pending review: `quiz` (Talkonomics weekly quiz), `ibeconinequality`, `inflation`, `supplyanddemand`, `stocksimulator`, `printergoesbrrr`, `causation`/`causation2`, `coldwar`, `hippiesandspies`, `heresy`, `mymaths`, `ask-v1.0`, `marketinghub`, `samples` sub-pages, `wingeometer`, `typeit`, `reports`, `ibnews`, `fmwskills`, `moa`, `mortgage`.
- **Private resources page.** Sam may add a password-protected page for personal, non-public tools — `sayso`, `moderntranslation`, and `tote` are the intended contents. These should stay off the public index until that page exists.

## What to avoid at the root level

- Never use `git add -A` or `git add .` — too many generated files in `ibbm/`, `ibecon/`, `node_modules` etc.
- Never commit `node_modules/` or `.env` files.
- The `dist/` folders inside `ibbm-src/` and `ibecon-src/` do not exist — Astro builds directly to the output dirs above.
