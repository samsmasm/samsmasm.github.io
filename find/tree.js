// The /find flowchart. Each node is a question with options.
// An option either leads to another question (`next`) or ends at a short list of tools (`tools`, by url).
// A tool can sit at the end of more than one path. Keep end lists to about five tools.
// `id` becomes part of the URL (?p=teaching/general/responses), so keep ids short and stable.
window.TREE = {
  q: "What are you after?",
  opts: [
    { id: "teaching", label: "Teaching", hint: "Something for a lesson, a class or students", next: {
      q: "Subject-specific, or a general tool?",
      opts: [
        { id: "general", label: "A general tool", hint: "Works for any subject", next: {
          q: "What do you need it to do?",
          opts: [
            { id: "quiz", label: "Quiz or game", hint: "Questions, points, competition", next: {
              q: "What kind of quiz?",
              opts: [
                { id: "teams", label: "Teams on the big screen", hint: "Jeopardy-style board, you run it from the front", tools: ["/griz"] },
                { id: "devices", label: "Everyone on their own device", hint: "Students join with a PIN", tools: ["/uniquiz"] },
                { id: "marked", label: "Question set I can mark", hint: "Multiple choice marks itself, written answers come to you", tools: ["/checkin"] },
                { id: "times", label: "Times tables", hint: "Quick-fire maths as a team game", tools: ["/griz", "/multiplication-memory-v2.1"] },
                { id: "guess", label: "Guess the picture", hint: "Reveal an image a square at a time", tools: ["/reveal"] }
              ] } },
            { id: "responses", label: "Show student responses", hint: "Get what students think up on the screen", next: {
              q: "What kind of response?",
              opts: [
                { id: "written", label: "Written answers to a question", tools: ["/scrim", "/checkin"] },
                { id: "scale", label: "Agree or disagree with statements", hint: "Opinion on a scale", tools: ["/spectra"] },
                { id: "plot", label: "Where they stand on two things", hint: "Students plot themselves on your axes", tools: ["/pulse"] },
                { id: "sort", label: "Sort cards between two extremes", hint: "Good for 'to what extent' questions", tools: ["/lineup", "/aiorus"] },
                { id: "ideas", label: "Ideas on sticky notes", tools: ["/dowser"] },
                { id: "help", label: "Who's stuck right now", hint: "Students signal when they need help", tools: ["/flare"] }
              ] } },
            { id: "starter", label: "A starter or warm-up", hint: "Five minutes to get them going", tools: ["/newbiz", "/griz", "/reveal", "/lineup", "/spectra"] },
            { id: "think", label: "Plan or think on a board", next: {
              q: "What sort of board?",
              opts: [
                { id: "argument", label: "Build an argument", hint: "Claims, reasons, objections, evidence", tools: ["/argmap"] },
                { id: "brainstorm", label: "Brainstorm together", hint: "Moveable sticky notes and arrows", tools: ["/dowser"] },
                { id: "draw", label: "Just draw", tools: ["/wb"] }
              ] } },
            { id: "watch", label: "A simulation to watch", hint: "Something that runs on the screen", tools: ["/racecar", "/trees", "/stocksimulator"] },
            { id: "vocab", label: "Vocabulary practice", hint: "Flashcards with spaced repetition", tools: ["/cultivar"] }
          ] } },
        { id: "econ", label: "Economics", next: {
          q: "Economics: what for?",
          opts: [
            { id: "review", label: "Course notes and revision", tools: ["/ibecon", "/qreview", "/samples"] },
            { id: "answers", label: "Model answers and essay writing", tools: ["/samples", "/argmap"] },
            { id: "diagram", label: "Draw a diagram", tools: ["/graphs"] },
            { id: "ia", label: "The IA", tools: ["/econia", "/graphs"] },
            { id: "news", label: "News and current events", tools: ["/econnews"] },
            { id: "show", label: "Something to show the class", tools: ["/stocksimulator", "/graphs"] }
          ] } },
        { id: "bm", label: "Business Management", next: {
          q: "Business: what for?",
          opts: [
            { id: "review", label: "Course notes and revision", tools: ["/ibbm", "/qreview"] },
            { id: "finance", label: "Finance", hint: "Ratios, accounts, Unit 3", tools: ["/ratibro", "/slopstudy"] },
            { id: "cases", label: "Case studies", tools: ["/slopstudy", "/businews", "/newbiz"] },
            { id: "ia", label: "The IA", tools: ["/busia"] },
            { id: "news", label: "News and current events", tools: ["/businews"] }
          ] } },
        { id: "hist", label: "History / FMW", next: {
          q: "History: what for?",
          opts: [
            { id: "sort", label: "A card sort on a big question", hint: "Students weigh evidence between two extremes", tools: ["/lineup", "/aiorus"] },
            { id: "argument", label: "Build an argument", tools: ["/argmap"] }
          ] } },
        { id: "maths", label: "Maths", next: {
          q: "Maths: what for?",
          opts: [
            { id: "practice", label: "Exam-style practice", hint: "NCEA / secondary", tools: ["/algeqs", "/coordgeo-v1.1", "/runymxc", "/discountdash-v1.0"] },
            { id: "visual", label: "Something beautiful to show", hint: "Fractals, patterns, curves", next: {
              q: "What sort of maths picture?",
              opts: [
                { id: "fractal", label: "Fractals and chaos", tools: ["/mandelbrot-v2", "/chaos"] },
                { id: "pattern", label: "Patterns and networks", tools: ["/flowers", "/joinedpoints"] },
                { id: "function", label: "Functions and geometry", tools: ["/funcheatmap-v2", "/cinvert"] }
              ] } },
            { id: "younger", label: "Younger learners", hint: "Number facts and first ideas", tools: ["/fractions", "/multiplication-memory-v2.1", "/numbertiles", "/binary-game-v1.1", "/turtle"] }
          ] } }
      ] } },

    { id: "else", label: "Something else", hint: "Not for a lesson", next: {
      q: "What kind of thing?",
      opts: [
        { id: "docs", label: "PDFs and printing", next: {
          q: "What do you need to do?",
          opts: [
            { id: "merge", label: "Merge, split or extract a PDF", tools: ["/peedeeeffer"] },
            { id: "markup", label: "Write on a PDF", tools: ["/pdfwrite"] },
            { id: "covers", label: "Print a book cover", hint: "Big, for a classroom door", tools: ["/covers"] }
          ] } },
        { id: "kids", label: "For kids", hint: "Young children, roughly 4 to 9", next: {
          q: "What sort of thing for kids?",
          opts: [
            { id: "typing", label: "Learn to type", tools: ["/typurr"] },
            { id: "coding", label: "First coding", tools: ["/turtle"] },
            { id: "numbers", label: "Numbers and maths", tools: ["/fractions", "/multiplication-memory-v2.1", "/numbertiles", "/binary-game-v1.1"] },
            { id: "action", label: "Action games", tools: ["/catjump", "/kittymaze", "/unichase"] },
            { id: "quiet", label: "Puzzles and making things", tools: ["/sudoku", "/snowflake", "/guesswhoanimals", "/anipics"] }
          ] } },
        { id: "play", label: "Maths to play with", tools: ["/mandelbrot-v2", "/chaos", "/flowers", "/joinedpoints", "/funcheatmap-v2", "/cinvert"] },
        { id: "sims", label: "Simulations", hint: "Evolution and randomness", tools: ["/racecar", "/trees", "/stocksimulator"] },
        { id: "outside", label: "Walks, maps and photos", tools: ["/longcut", "/pinhole", "/photos"] },
        { id: "fun", label: "Just for fun", tools: ["/isluxonpm", "/anipics", "/sudoku"] }
      ] } }
  ]
};
