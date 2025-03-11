// Sample questions for each level, with LaTeX encoding for math expressions

const achievedQuestions = [
    "Solve \\( x^2 + 4 = 0 \\).",
    "Simplify \\( (3 + 2i) - (4 - 5i) \\).",
    "Convert the complex number \\( z = -1 + i \\) to polar form.",
    "Expand and simplify \\( (2 - 3i)^2 \\).",
    "If \\( z = 2\\,\\text{cis}\\frac{\\pi}{3} \\), express \\( z \\) in rectangular form.",
    "Rationalize and simplify \\( \\frac{5}{2 - i} \\).",
    "Find the modulus and argument of \\( z = -3 + 3i\\sqrt{3} \\).",
    "Solve the quadratic equation \\( x^2 - 2x + 5 = 0 \\).",
    "Simplify the product: \\( (1 - i)(1 + i) \\).",
    "Convert \\( z = 4\\,\\text{cis}\\frac{\\pi}{2} \\) into rectangular form.",
    "Rationalize the denominator of \\( \\frac{2}{3 - i} \\).",
    "If \\( z = 2(\\cos 45^\\circ + i \\sin 45^\\circ) \\), express in rectangular form.",
    "Simplify: \\( \\frac{5 + i}{2 - i} \\).",
    "Find all complex solutions to \\( x^2 = -9 \\).",
    "Express \\( -2\\sqrt{3} + 2i \\) in polar form.",
    "Simplify: \\( (2 + 3i)^2 \\).",
    "Rationalize the denominator: \\( \\frac{7}{3 + 4i} \\).",
    "Solve for \\( z \\): \\( z + 2i = 3 - i \\).",
    "Expand and simplify: \\( (1 + 2i)^2 \\).",
    "Express \\( 4\\operatorname{cis}\\frac{\\pi}{3} \\) in rectangular form."
  ];
  
  const meritQuestions = [
    "Solve for \\( z \\): \\( z^2 + 2z + 5 = 0 \\), and express solutions in polar form.",
    "If \\( 2 + i \\) is a root of a polynomial with real coefficients, what is another root?",
    "Given \\( z = 3 - 3i \\), find \\( z^4 \\) using De Moivre's theorem.",
    "Find the complex number \\( z \\) if \\( \\frac{z}{1 - i} = 2 - i \\).",
    "Determine the modulus and argument of \\( z = \\frac{1 + i}{1 - i} \\).",
    "Solve the equation \\( z^3 = 8i \\) and give all solutions in polar form.",
    "Find the locus defined by \\( |z - (1 + i)| = 3 \\) and sketch it.",
    "Given \\( z = x + yi \\), find \\( z \\) if \\( \\frac{z - i}{z + i} \\) is purely real.",
    "Solve \\( z^2 - (4 - 2i)z + 5 - i = 0 \\).",
    "If \\( z = \\frac{3 - 2i}{2 + i} \\), find the argument of \\( z \\).",
    "Find all roots of the equation \\( x^2 - 4x + 8 = 0 \\).",
    "Solve \\( z^2 = -8i \\) and plot solutions.",
    "Expand and simplify \\( (1 - i)^4 \\).",
    "Solve the equation: \\( |z - 3i| = 2|z + 1| \\).",
    "Given \\( z = 1 - i\\sqrt{3} \\), express \\( z^3 \\) in rectangular form.",
    "Determine \\( a \\) and \\( b \\) if \\( a + bi = (1 + i)^3 \\).",
    "Solve \\( |z| = |z - 4| \\) algebraically and describe the locus geometrically.",
    "If \\( z = 2(\\cos 120^\\circ + i\\sin 120^\\circ) \\), simplify \\( z^4 \\).",
    "Solve for \\( z \\) given \\( iz + \\bar{z} = 4 - 2i \\).",
    "Express in polar form: \\( z = (1 - i)^5 \\)."
  ];
  
  const excellenceQuestions = [
    "Prove algebraically that if \\( z + \\frac{1}{z} \\) is real, then \\( |z| = 1 \\) or \\( z \\) is real.",
    "Show that if \\( z + \\frac{1}{z} \\) is real, then either \\( z \\) is real or \\( |z| = 1 \\).",
    "Prove that for real values \\( a \\) and \\( b \\), the number \\( \\frac{a + bi}{a - bi} \\) always has modulus 1.",
    "Show algebraically why the equation \\( z + \\bar{z} = 2|z| \\) describes a straight line in the Argand diagram.",
    "Given \\( z = x + iy \\), prove that \\( z + \\frac{1}{z} \\) is real if and only if \\( |z| = 1 \\) or \\( z \\) is real.",
    "Find the general solution to \\( z^4 = -16 \\) and express all solutions in polar form.",
    "Show algebraically that \\( (1 + i\\sqrt{3})^6 \\) is a real number.",
    "Prove that if \\( z \\) satisfies \\( |z - 1| = |z + 1| \\), then the locus is the line \\( x = 0 \\).",
    "Find all complex solutions to \\( z^3 + 8 = 0 \\) and express them in both polar and rectangular form.",
    "Show algebraically why \\( z = 1 - i \\) is not a root of \\( z^3 - z + 1 = 0 \\).",
    "Given complex roots \\( 1 + i \\) and \\( 2 - i \\), find a quadratic polynomial with real coefficients.",
    "If \\( |z - 1| = |z + 1| \\), prove algebraically that the locus is the line \\( x = 0 \\).",
    "Prove De Moivre’s theorem for \\( n=4 \\).",
    "Given \\( z \\) satisfies \\( |z - i| = |z + i| \\), prove that \\( z \\) is real.",
    "Prove algebraically that the product of conjugate complex numbers is always real.",
    "Show algebraically that the locus described by \\( \\arg(z - 2) = \\frac{\\pi}{4} \\) is a straight line.",
    "Find all solutions of \\( z^3 + 27 = 0 \\) using De Moivre’s theorem.",
    "If \\( z = x + yi \\), prove that \\( |z|^2 = z\\overline{z} \\).",
    "Prove that \\( z^n + \\bar{z}^n \\) is always real for integer \\( n \\).",
    "Show algebraically that the modulus of \\( \\frac{z - 1}{z + 1} \\) equals 1 if and only if \\( z \\) is purely imaginary."
  ];
  
  // Utility function to get a random integer from 0 to max - 1
  function getRandomIndex(max) {
    return Math.floor(Math.random() * max);
  }
  
  // Function to choose a question based on level
  function getQuestion(level) {
    let question = "";
    if (level === "achieved") {
      question = achievedQuestions[getRandomIndex(achievedQuestions.length)];
    } else if (level === "merit") {
      question = meritQuestions[getRandomIndex(meritQuestions.length)];
    } else if (level === "excellence") {
      question = excellenceQuestions[getRandomIndex(excellenceQuestions.length)];
    }
    return question;
  }
  
  // Function to update the page with the selected question and buttons
  function showQuestion(level) {
    const question = getQuestion(level);
    const contentDiv = document.getElementById("content");
    contentDiv.innerHTML = `
      <div class="question-area">
        <p class="question">${question}</p>
        <h2>Give me another at:</h2>
        <div class="buttons">
          <button data-level="achieved">achieved</button>
          <button data-level="merit">merit</button>
          <button data-level="excellence">excellence</button>
        </div>
      </div>
    `;
    // Reattach the click event listeners to the new buttons
    const buttons = document.querySelectorAll("button[data-level]");
    buttons.forEach(button => {
      button.addEventListener("click", () => {
        const level = button.getAttribute("data-level");
        showQuestion(level);
      });
    });
    // Trigger MathJax to re-render the new math
    if (window.MathJax) {
      MathJax.typesetPromise();
    }
  }
  
  // Attach event listeners on initial load
  document.querySelectorAll("button[data-level]").forEach(button => {
    button.addEventListener("click", () => {
      const level = button.getAttribute("data-level");
      showQuestion(level);
    });
  });
  