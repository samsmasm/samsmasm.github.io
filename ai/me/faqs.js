// Short answers for the "Click on me" page. AI-adapted from Sam's full statement (/ai/full/).
// Edit freely: each item is a clickable thing on the bobblehead; it can hold one or more questions.
// Wrap a glossary word as {{iterative}} to make it a pop-up (see GLOSSARY below).
// `more` is the section id in the full statement that "Read the full statement" links to.

const FAQS = {
  pen: [{
    q: "Does AI mark my work?",
    a: ["No. I decide every mark, and I never report a mark that AI has given."],
    more: "feedback-and-marking"
  }],

  phone: [{
    q: "Is my feedback written by AI?",
    a: ["Sometimes AI helps, but I always read your work and form my own view first.",
        "I might talk my notes into an AI on my phone and have it tidy them into a format like ‘start, stop, continue’, or ask it for a second opinion after I’ve marked. Then I read what it gives me, check it says what I mean, and rework it. It’s an {{iterative}} process.",
        "It doesn’t save me time, but the feedback ends up more detailed and more useful to you."],
    more: "feedback-and-marking"
  }],

  id: [{
    q: "Does AI know who I am?",
    a: ["Your name sometimes goes into Gemini, which the school has an education licence for, for admin tasks like sorting lists. Your name is never attached to your work there.",
        "Nothing else personal about you goes into any AI, and your name never goes into any other AI."],
    more: "data-protection"
  }, {
    q: "Do your classroom tools collect my data?",
    a: ["Tools that need a login follow school policy. Tools without a login never link what you type to who you are."],
    more: "classroom-tool-production"
  }],

  laptop: [{
    q: "Did AI make our slides and resources?",
    a: ["Some of them. Most are made by me and AI together, and it is never a case of asking for something and handing it straight to you.",
        "It’s an {{iterative}} back-and-forth: I ask, it drafts, I push back, it redrafts, and we go round until I’m happy. Then I edit it myself. It often takes me just as long as making it all myself, but the result fits our course and our class much better.",
        "Some things are entirely mine. The mix is too blurry to label each one, but where AI has filled larger gaps on the course websites, those parts are tagged.",
        "Here’s what that back-and-forth looks like:"],
    chat: [
      ["me", "I need an activity on deadweight loss on externality diagrams."],
      ["ai", "[three generic ideas: a worksheet, a quiz, a card sort]"],
      ["me", "More specific. My IB1s keep shading the wrong triangle. They point the welfare loss at the market equilibrium instead of the social optimum."],
      ["ai", "[a set of diagrams to label]"],
      ["me", "Closer, but they’re all negative production externalities, so they’ll just learn the shape. Mix in positive consumption ones, where the triangle ends up on the other side."],
      ["ai", "[revised set]"],
      ["me", "Question 4 draws the triangle for them, so take that out. And use the IB labels: MSC, MPC, MSB, MPB."],
      ["ai", "[revised again]"],
      ["note", "Then I edit it myself, try it on a blank diagram, and check it against the syllabus."]
    ],
    rounds: 4,
    more: "co-creation-not-abdication"
  }],

  magnifier: [{
    q: "Can I trust them?",
    a: ["I check everything before you see it. If I can’t check something, I flag it as AI-generated.",
        "The AI also works from the course guide, examiner reports and sources I trust, not the open internet."],
    more: "checking-my-work"
  }],

  clipboard: [{
    q: "Does AI plan our lessons?",
    a: ["No. I sometimes ask it for activity ideas when mine are running thin, then adapt them to fit our class. It’s usually ideas for single activities, not whole lessons."],
    more: "planning-classes"
  }],

  envelope: [{
    q: "Are your emails written by AI?",
    a: ["No. When I write to you or your parents, it’s in my own words."],
    more: "communication-with-students-and-parents"
  }],

  dumbbell: [{
    q: "Why is it OK for you to use AI so much when we’re told to use it sparingly?",
    a: ["Because we’re trying to get different things out of it.",
        "My job is to give you the best resources I can, so the finished product is what matters. Your job is to learn, and the learning happens while you do the work. If AI writes your essay, you have an essay but haven’t learned anything from writing it.",
        "It’s like the gym: the point of lifting weights is to build your muscles, not to move the weight."],
    more: "do-as-i-say-not-as-i-do"
  }],

  controller: [{
    q: "Isn’t that just lazy?",
    a: ["I ask myself that every time: is this improving your learning, and am I only doing it because I’m lazy?",
        "The answer to the first question has to be yes, and the answer to the second has to be no."],
    more: "purpose-and-overview-of-this-statement"
  }],

  head: [{
    q: "Is AI making you worse at your job?",
    a: ["It might be in some ways, and I’m watching for that.",
        "Marking your work myself before AI sees it is one way I keep my own skills sharp."],
    more: "is-ai-rotting-my-brain"
  }],

  heart: [{
    q: "If AI gets better than you, what are teachers for?",
    a: ["Being human together: wondering, taking risks, failing, and working out what’s worth sticking with.",
        "I hope that as AI does more of the other work, I get more time for that with you."],
    more: "whats-left-when-ai-is-better-than-me"
  }]
};

// Order used for the "All the questions" list.
const ORDER = ["pen", "phone", "id", "laptop", "magnifier", "clipboard", "envelope",
               "dumbbell", "controller", "head", "heart"];

const GLOSSARY = {
  iterative: {
    title: "Iterative",
    text: "Going round in loops until it’s right, instead of asking once and taking what comes back. It often takes me just as long as doing it all myself.",
    steps: ["I ask", "I read it", "I push back", "It redrafts", "↻ again", "I edit it myself", "I check it"]
  }
};
