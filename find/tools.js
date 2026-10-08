// The tools list for /find. One entry per tool; add new tools here.
//   for:  live (live in class) · revision · ia (assessment / IA) · planning · me (just me) · kids
//   subj: econ · bm · hist · maths · any
//   who:  me (teacher alone) · class (whole class at once) · solo (students on their own)
//   tags: extra search words, never shown
window.TOOLS = [
  // Economics
  { name: "IBecon", url: "/ibecon", desc: "Everything Econ: notes and review for the whole IB Economics course.", for: ["revision"], subj: ["econ"], who: ["solo", "class"], tags: "notes syllabus units review" },
  { name: "Samples", url: "/samples", desc: "Model answers revealed step by step, from hint to full paragraph.", for: ["revision", "ia"], subj: ["econ"], who: ["solo", "class"], tags: "model answer essay scaffold paper 1 paper 2" },
  { name: "Econia", url: "/econia", desc: "The Economics IA, stage by stage, from choosing an article to submitting.", for: ["ia"], subj: ["econ"], who: ["solo"], tags: "internal assessment commentary portfolio" },
  { name: "Graph Drawer", url: "/graphs", desc: "Draw economics diagrams and export them as images.", for: ["revision", "live", "ia"], subj: ["econ"], who: ["solo", "class", "me"], tags: "diagram supply demand curve draw" },
  { name: "EconNews", url: "/econnews", desc: "This week's economics news, picked for IB students.", for: ["revision", "planning"], subj: ["econ"], who: ["solo", "me"], tags: "news articles current events weekly" },
  { name: "Stock Simulator", url: "/stocksimulator", desc: "Dozens of random price paths, then pick the most convincing-looking one. Patterns in pure noise.", for: ["live"], subj: ["econ"], who: ["class"], tags: "random walk shares market finance chart" },

  // Business Management
  { name: "IBBM", url: "/ibbm", desc: "Everything BM: notes, case studies and exam technique.", for: ["revision"], subj: ["bm"], who: ["solo", "class"], tags: "notes syllabus units case studies" },
  { name: "RatIBro", url: "/ratibro", desc: "Learn IB finance: ratios, accounts and practice, with progress saved.", for: ["revision"], subj: ["bm"], who: ["solo"], tags: "finance ratios unit 3 accounts" },
  { name: "Slop Study", url: "/slopstudy", desc: "Spin the reels for a random company and theory terms, get a case study and exam questions.", for: ["revision", "live"], subj: ["bm"], who: ["class", "solo"], tags: "case study generator slot machine casegen practice" },
  { name: "Busia", url: "/busia", desc: "The BM IA, start to finish, one stage at a time.", for: ["ia"], subj: ["bm"], who: ["solo"], tags: "internal assessment research question" },
  { name: "BusiNews", url: "/businews", desc: "Weekly IB BM case studies built from real business news.", for: ["revision", "planning"], subj: ["bm"], who: ["solo", "me"], tags: "news case study weekly" },
  { name: "Newbiz", url: "/newbiz", desc: "Spin two or three unrelated words, and a constraint, to build a business case out of.", for: ["live"], subj: ["bm"], who: ["class"], tags: "starter random words spinner entrepreneur" },

  // Econ and BM
  { name: "Review Questions", url: "/qreview", desc: "Random practice from IB past papers. Reveal the answer and mark yourself.", for: ["revision"], subj: ["econ", "bm"], who: ["solo", "class"], tags: "past papers flashcards practice questions" },

  // History / FMW
  { name: "Lineup", url: "/lineup", desc: "Card sort for any topic: students line cards up between two extremes, then reveal the notes. Decks made with an AI prompt.", for: ["live", "planning"], subj: ["hist", "any"], who: ["class", "me"], tags: "card sort continuum spectrum deck extent discussion" },
  { name: "AI or us?", url: "/aiorus", desc: "Will AI mirror the Industrial Revolution? A card sort with a live class screen.", for: ["live"], subj: ["hist"], who: ["class"], tags: "industrial revolution card sort compelling question fmw grade 9" },

  // Any subject: live in class
  { name: "Griz", url: "/griz", desc: "Generate competitive class quizzes from your own content.", for: ["live", "revision"], subj: ["any"], who: ["class"], tags: "quiz jeopardy trivia teams game starter times tables" },
  { name: "UniQuiz", url: "/uniquiz", desc: "Run live quiz sessions. Students join with a PIN and answer on their device.", for: ["live", "revision"], subj: ["any"], who: ["class"], tags: "quiz kahoot pin devices" },
  { name: "Checkin", url: "/checkin", desc: "Question sets for a class you sign in to. Multiple choice marks itself, written answers come back to you.", for: ["live", "ia", "revision"], subj: ["any"], who: ["class", "solo"], tags: "concept check test marking quiz exit ticket assessment" },
  { name: "Scrim", url: "/scrim", desc: "Pose a question, get student answers projected on your screen from their devices.", for: ["live"], subj: ["any"], who: ["class"], tags: "responses board answers project" },
  { name: "Spectra", url: "/spectra", desc: "Post statements, students rate on a scale, see the full spectrum of class opinion.", for: ["live"], subj: ["any"], who: ["class"], tags: "poll opinion agree disagree vote" },
  { name: "Pulse", url: "/pulse", desc: "Students plot themselves on your variables and see the class spread in real time.", for: ["live"], subj: ["any"], who: ["class"], tags: "poll scatter response" },
  { name: "Flare", url: "/flare", desc: "Real-time help signals from students. See at a glance when your class needs support.", for: ["live"], subj: ["any"], who: ["class"], tags: "help lost signal alarm" },
  { name: "Picture Reveal", url: "/reveal", desc: "Click squares to reveal the hidden image underneath.", for: ["live", "kids"], subj: ["any"], who: ["class"], tags: "guess image starter tiles" },

  // Any subject: thinking and boards
  { name: "Argument Mapper", url: "/argmap", desc: "Build structured argument maps: claims, reasons, objections, rebuttals, evidence.", for: ["ia", "revision", "live"], subj: ["any"], who: ["solo", "class"], tags: "essay plan argument map debate" },
  { name: "Dowser", url: "/dowser", desc: "Freeform canvas of moveable post-its, lines, and arrows for brainstorming.", for: ["live"], subj: ["any"], who: ["class"], tags: "sticky notes brainstorm board post-it" },
  { name: "Whiteboard", url: "/wb", desc: "A basic, get-out-of-the-way whiteboard.", for: ["live"], subj: ["any"], who: ["class", "me"], tags: "draw board" },

  // Any subject: learn and review
  { name: "Cultivar", url: "/cultivar", desc: "Vocabulary flashcards with spaced repetition for language learners.", for: ["revision"], subj: ["any"], who: ["solo"], tags: "flashcards vocab language vietnamese spaced repetition" },

  // Just me: documents and odds
  { name: "PeeDeeEffer", url: "/peedeeeffer", desc: "Merge, split, and extract text from PDFs privately, entirely on your own device.", for: ["me", "planning"], subj: ["any"], who: ["me"], tags: "pdf merge split epub" },
  { name: "PDF Annotator", url: "/pdfwrite", desc: "Annotate a PDF and download your marked-up copy.", for: ["me", "planning"], subj: ["any"], who: ["me"], tags: "pdf draw mark up" },
  { name: "Covers", url: "/covers", desc: "Find a book's cover and print it big enough for a classroom door.", for: ["planning", "me"], subj: ["any"], who: ["me"], tags: "book cover print door poster" },
  { name: "Longcut", url: "/longcut", desc: "Find a walking or cycling route that favours quiet back streets and paths over main roads.", for: ["me"], subj: ["any"], who: ["me"], tags: "map route walk bike quiet" },
  { name: "Pinhole", url: "/pinhole", desc: "Design and test pinhole cameras.", for: ["me"], subj: ["any"], who: ["me"], tags: "camera photography" },
  { name: "Photos", url: "/photos", desc: "A photo gallery.", for: ["me"], subj: ["any"], who: ["me"], tags: "pictures gallery" },
  { name: "Is Luxon PM?", url: "/isluxonpm", desc: "A live answer to the question on everyone's lips.", for: ["me"], subj: ["any"], who: ["me"], tags: "prime minister nz joke" },

  // Simulations
  { name: "Evolutionary Race Cars", url: "/racecar", desc: "Watch cars evolve over generations to go faster or climb steeper terrain.", for: ["live", "me"], subj: ["any"], who: ["class", "me"], tags: "evolution simulation natural selection" },
  { name: "Forest Evolution", url: "/trees", desc: "A forest evolves under rainfall, wind, and fire. Height, girth, and seed strategy all compete.", for: ["live", "me"], subj: ["any"], who: ["class", "me"], tags: "evolution simulation natural selection trees" },

  // Maths: visual
  { name: "Chaos Visualisation", url: "/chaos", desc: "The hidden patterns that emerge from chaotic systems.", for: ["live", "me"], subj: ["maths"], who: ["class", "me"], tags: "fractal sierpinski chaos game" },
  { name: "Joined Points", url: "/joinedpoints", desc: "Watch connections form as nearby points are joined.", for: ["live", "me"], subj: ["maths"], who: ["class", "me"], tags: "network graph points" },
  { name: "Mandelbrot Set", url: "/mandelbrot-v2", desc: "Generate and zoom into the Mandelbrot set.", for: ["live", "me"], subj: ["maths"], who: ["class", "me"], tags: "fractal complex numbers" },
  { name: "Function Heat Map", url: "/funcheatmap-v2", desc: "Visualise two-variable functions as a colour heat map.", for: ["live", "me"], subj: ["maths"], who: ["class", "me"], tags: "formula contour graph" },
  { name: "Coordinate Inverter", url: "/cinvert", desc: "Invert points and shapes around a unit circle.", for: ["live", "me"], subj: ["maths"], who: ["class", "me"], tags: "circle inversion geometry" },
  { name: "Flower Generator", url: "/flowers", desc: "Generate flowers from mathematical patterns.", for: ["live", "me", "kids"], subj: ["maths"], who: ["class", "me"], tags: "phyllotaxis golden ratio spiral" },

  // Maths: practice
  { name: "Algebra Exam Questions", url: "/algeqs", desc: "Solve exam-style algebra with worked solutions.", for: ["revision"], subj: ["maths"], who: ["solo", "class"], tags: "ncea algebra equations achieved merit excellence" },
  { name: "Coordinate Geometry", url: "/coordgeo-v1.1", desc: "Practise midpoints and gradients with exam-style questions.", for: ["revision"], subj: ["maths"], who: ["solo", "class"], tags: "midpoint gradient graph" },
  { name: "Runners in Sync", url: "/runymxc", desc: "Adjust two runners' speeds so they finish at the same time.", for: ["live", "revision"], subj: ["maths"], who: ["class", "solo"], tags: "linear y = mx + c equations" },
  { name: "Discount Dash", url: "/discountdash-v1.0", desc: "Race to find the best deals using percentages.", for: ["live", "revision", "kids"], subj: ["maths"], who: ["class", "solo"], tags: "percentages money shopping" },

  // Kids
  { name: "Turtle Artist", url: "/turtle", desc: "Young learners stack simple commands to make a turtle draw: a first taste of sequencing, loops, and angles.", for: ["kids"], subj: ["maths", "any"], who: ["solo"], tags: "coding programming turtle logo" },
  { name: "Typurr", url: "/typurr", desc: "Type words to smash obstacles as Ty the cat. For young typists.", for: ["kids"], subj: ["any"], who: ["solo"], tags: "typing keyboard cat game" },
  { name: "Cat Jump", url: "/catjump", desc: "Dodge the cacti in a cat-themed endless runner.", for: ["kids"], subj: ["any"], who: ["solo"], tags: "game runner cat" },
  { name: "Kitty Maze", url: "/kittymaze", desc: "Guide Rainbow Cat through the maze.", for: ["kids"], subj: ["any"], who: ["solo"], tags: "game maze cat" },
  { name: "UniChase", url: "/unichase", desc: "Steer a unicorn to evade snakes across five difficulty levels.", for: ["kids"], subj: ["any"], who: ["solo"], tags: "game unicorn" },
  { name: "Sudoku", url: "/sudoku", desc: "Four difficulty levels, notes mode, and save strings to resume.", for: ["kids", "me"], subj: ["maths"], who: ["solo", "me"], tags: "puzzle logic" },
  { name: "Paper Snowflakes", url: "/snowflake", desc: "Fold and cut digital paper to make snowflakes.", for: ["kids"], subj: ["any"], who: ["solo"], tags: "craft paper cut symmetry" },
  { name: "Guess Who Strategy", url: "/guesswhoanimals", desc: "Find the optimal questions for the animal version of Guess Who.", for: ["kids"], subj: ["any"], who: ["solo"], tags: "game strategy animals" },
  { name: "AniPics", url: "/anipics", desc: "Browse and find animal emojis.", for: ["kids"], subj: ["any"], who: ["solo"], tags: "animals emoji" },
  { name: "Binary Counting", url: "/binary-game-v1.1", desc: "Practise binary number patterns and place values.", for: ["kids", "revision"], subj: ["maths"], who: ["solo"], tags: "binary place value" },
  { name: "Multiplication Memory", url: "/multiplication-memory-v2.1", desc: "Match multiplication facts in a memory card game.", for: ["kids"], subj: ["maths"], who: ["solo"], tags: "times tables memory game" },
  { name: "Fractions", url: "/fractions", desc: "Visualise fractions and their equivalent forms.", for: ["kids"], subj: ["maths"], who: ["solo"], tags: "pizza fractions equivalent" },
  { name: "Number Tiles", url: "/numbertiles", desc: "Arrange tiles to practise reading and ordering numbers.", for: ["kids"], subj: ["maths"], who: ["solo"], tags: "ordering counting" },
];
