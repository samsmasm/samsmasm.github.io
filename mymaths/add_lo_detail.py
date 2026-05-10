#!/usr/bin/env python3
import json

with open('modules.json', 'r') as f:
    data = json.load(f)

M01_LO_DETAIL = [
  {
    "subtopics": [
      {
        "name": "Propositions and logical connectives",
        "description": "A proposition is any statement that is definitively true or false. The five connectives — conjunction (∧), disjunction (∨), negation (¬), implication (→), and biconditional (↔) — combine propositions into compound statements. Mastering these is the foundation for all symbolic reasoning in pure mathematics.",
        "examples": [
          "Identify which are propositions: 'x > 0', '2 + 2 = 4', 'This sentence is false.'",
          "Write in symbols: 'Either n is odd, or n is divisible by 4, but not both.'",
          "Find the negation of: 'It is raining and the ground is wet.'"
        ]
      },
      {
        "name": "Truth tables",
        "description": "A truth table exhaustively lists the truth values of a compound statement across all possible combinations of its component propositions. They are the primary tool for deciding whether two logical expressions are equivalent. For n atomic propositions the table has 2^n rows.",
        "examples": [
          "Construct the truth table for (P → Q) ∧ (¬Q → ¬P) and determine whether it is a tautology.",
          "Show using a truth table that P → Q is not the same as Q → P.",
          "Use a truth table to verify De Morgan's law: ¬(P ∨ Q) ≡ ¬P ∧ ¬Q."
        ]
      },
      {
        "name": "Logical equivalence and the contrapositive",
        "description": "Two compound statements are logically equivalent if they share identical truth values in every row of their truth tables. The contrapositive equivalence — P → Q is equivalent to ¬Q → ¬P — appears constantly in proofs and is often easier to work with than the original implication.",
        "examples": [
          "Show that P → Q is logically equivalent to ¬P ∨ Q.",
          "Is (P → Q) → R equivalent to P → (Q → R)? Verify with a truth table.",
          "Rewrite 'If n² is odd then n is odd' as its contrapositive."
        ]
      },
      {
        "name": "Predicates and quantifiers",
        "description": "A predicate is a statement containing a variable, such as P(n): 'n is prime'. Universal (∀) and existential (∃) quantifiers bind variables to a domain. The domain of discourse is essential context — ∀n ∈ ℕ and ∀n ∈ ℤ can give very different truth values for the same predicate.",
        "examples": [
          "Let P(n): n² > n. Determine the truth value of ∀n ∈ ℕ P(n) and ∃n ∈ ℤ P(n).",
          "Translate: 'Every real number has a square root, but not every real number has a real square root.'",
          "For P(x,y): x + y = 10, is ∀x ∃y P(x,y) true over ℝ? What about ∃x ∀y P(x,y)?"
        ]
      }
    ]
  },
  {
    "subtopics": [
      {
        "name": "Set notation and membership",
        "description": "A set is an unordered collection of distinct objects. Standard notation includes roster form {1, 2, 3}, set-builder form {x ∈ ℝ : x > 0}, and the empty set ∅. The key judgment at this level is being precise about membership versus subset — 2 ∈ {1,2,3} but {2} ⊆ {1,2,3}.",
        "examples": [
          "Describe in set-builder notation the set of all integers n such that n² < 25.",
          "List the elements of {n ∈ ℤ : |n| ≤ 2}.",
          "Are {1, 2, 3} and {3, 2, 1, 2} equal as sets? Justify."
        ]
      },
      {
        "name": "Set operations",
        "description": "Union (∪), intersection (∩), set difference (\\), and complement are defined element-wise. Element-chasing proofs — showing A ⊆ B by taking an arbitrary x ∈ A and proving x ∈ B — are the standard technique for proving set equalities. Venn diagrams visualise relationships but do not constitute proofs.",
        "examples": [
          "Let A = {1,2,3,4}, B = {2,4,6}. Find A ∪ B, A ∩ B, A \\ B, and B \\ A.",
          "Prove by element-chasing that A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C).",
          "Prove or disprove: A \\ (A \\ B) = A ∩ B."
        ]
      },
      {
        "name": "Power sets and Cartesian products",
        "description": "The power set P(A) is the set of all subsets of A, including ∅ and A itself; if |A| = n then |P(A)| = 2^n. The Cartesian product A × B is the set of all ordered pairs (a, b) with a ∈ A, b ∈ B. These constructions underlie the definitions of relations and functions used throughout the course.",
        "examples": [
          "List all elements of P({a, b, c}) and verify the count formula 2^n.",
          "Let A = {1, 2}, B = {x, y, z}. Write out A × B explicitly.",
          "How many elements does P(A × B) have if |A| = 3 and |B| = 2?"
        ]
      },
      {
        "name": "Cardinality and countability",
        "description": "Two sets have the same cardinality if there exists a bijection between them. Countably infinite sets (like ℤ and ℚ) can be put into bijection with ℕ; the reals cannot — they are uncountably infinite. Cantor's diagonal argument shows no set can be put in bijection with its own power set.",
        "examples": [
          "Construct a bijection showing the even integers have the same cardinality as ℕ.",
          "Prove that the open interval (0,1) and ℝ have the same cardinality.",
          "Explain informally why P(A) always has strictly greater cardinality than A."
        ]
      }
    ]
  },
  {
    "subtopics": [
      {
        "name": "Direct proof",
        "description": "A direct proof of P → Q assumes P and logically derives Q using definitions, axioms, and algebra. Every step must be justified — 'it is obvious' is not a proof. Structure: state what you assume, chain logical steps, conclude Q. Clarity of language matters as much as correctness of logic.",
        "examples": [
          "Prove: if n is odd then n² is odd.",
          "Prove: for all integers a and b, if a | b then a | 3b.",
          "Prove: the sum of two even integers is even."
        ]
      },
      {
        "name": "Proof by contradiction",
        "description": "Assume ¬P and derive a statement that is provably false; this shows ¬P cannot hold, so P must be true. Contradiction is especially powerful when the conclusion is a negation or an existence statement is hard to prove directly. The two classic results here — √2 is irrational, and there are infinitely many primes — should become fluent.",
        "examples": [
          "Prove that √2 is irrational using proof by contradiction.",
          "Prove that there is no largest prime number.",
          "Prove by contradiction that log₂(3) is irrational."
        ]
      },
      {
        "name": "Proof by contrapositive",
        "description": "To prove P → Q, prove the logically equivalent ¬Q → ¬P instead. This is useful when the hypothesis P is hard to work with directly, but the negation of the conclusion ¬Q gives something concrete to assume. Always state explicitly at the start that you are proving the contrapositive.",
        "examples": [
          "Prove: if n² is even then n is even (use the contrapositive).",
          "Prove: if the product ab is odd then both a and b are odd.",
          "Which strategy — direct, contradiction, or contrapositive — is most natural for 'If n² is divisible by 3 then n is divisible by 3'? Write the proof."
        ]
      }
    ]
  },
  {
    "subtopics": [
      {
        "name": "Weak (simple) induction",
        "description": "To prove ∀n ≥ n₀, P(n) by induction: establish the base case P(n₀), then prove that assuming P(k) (the inductive hypothesis) forces P(k+1). The key discipline is using the inductive hypothesis explicitly in the inductive step — beginners often prove P(k+1) from scratch by accident, which is not an inductive proof.",
        "examples": [
          "Prove by induction: 1 + 2 + ⋯ + n = n(n+1)/2 for all n ≥ 1.",
          "Prove by induction: 3 | (4^n − 1) for all n ≥ 1.",
          "Prove by induction: n! > 2^n for all n ≥ 4."
        ]
      },
      {
        "name": "Strong induction",
        "description": "Strong induction allows the inductive step to assume P(n₀), P(n₀+1), …, P(k) all hold simultaneously, and deduce P(k+1). It is equivalent in power to weak induction but more convenient when P(k+1) depends on several earlier cases. Classic applications include prime factorisation and Fibonacci-type recurrences.",
        "examples": [
          "Prove by strong induction: every integer n ≥ 2 has a prime divisor.",
          "Prove by strong induction: every postage amount ≥ 8 cents can be made with 3-cent and 5-cent stamps.",
          "The Fibonacci sequence satisfies F₁ = 1, F₂ = 1, Fₙ = Fₙ₋₁ + Fₙ₋₂. Prove Fₙ < 2ⁿ for all n ≥ 1."
        ]
      }
    ]
  },
  {
    "subtopics": [
      {
        "name": "Negating quantified statements",
        "description": "The negation of ∀x P(x) is ∃x ¬P(x) — to disprove 'all x satisfy P', you need just one counterexample. The negation of ∃x P(x) is ∀x ¬P(x) — to disprove 'there exists an x', you must rule out every x. These rules extend to chains of quantifiers by pushing ¬ through each one in turn.",
        "examples": [
          "Negate: 'All continuous functions are differentiable.'",
          "Negate: 'There exists a prime number that is even.'",
          "Write the formal negation of: ∀ε > 0 ∃δ > 0 such that |x − a| < δ ⟹ |f(x) − L| < ε."
        ]
      },
      {
        "name": "Nested quantifiers and order",
        "description": "When ∀ and ∃ alternate, the order is critical: ∀x ∃y P(x,y) means 'for each x you can find a (possibly different) y', while ∃y ∀x P(x,y) means 'one fixed y works for all x simultaneously'. The second is strictly stronger. Misreading quantifier order is one of the most common errors in Analysis.",
        "examples": [
          "Explain the difference between ∀n ∃m (m > n) and ∃m ∀n (m > n) over ℤ.",
          "Is ∀x ∈ ℝ ∃y ∈ ℝ (y² = x) true? What about ∃y ∈ ℝ ∀x ∈ ℝ (y² = x)?",
          "Write the negation of: ∀ε > 0 ∃N ∈ ℕ ∀n > N, |aₙ − L| < ε."
        ]
      }
    ]
  },
  {
    "subtopics": [
      {
        "name": "Common proof fallacies",
        "description": "Classic erroneous proofs exploit division by zero, circular reasoning, or reversing an implication. Reading deliberately faulty proofs and locating the exact line of failure is one of the most effective ways to sharpen proof-writing instincts. The ability to distrust your own work is as important as the ability to produce it.",
        "examples": [
          "Find the error: 'Since a = b we have a² = ab, so a² − b² = ab − b², hence (a−b)(a+b) = b(a−b), dividing by (a−b) gives a+b = b, thus a = 0.'",
          "A student claims to prove that all triangles are isosceles using a geometric construction. Locate the hidden error.",
          "Identify the gap: 'f is increasing, so f(a) < f(b) whenever a < b, therefore f is injective.'"
        ]
      },
      {
        "name": "Completeness and rigour",
        "description": "A proof must justify every non-trivial step with a theorem, definition, or axiom. Phrases like 'clearly', 'obviously', and 'it follows easily' often mark exactly the steps that need the most justification. A complete proof convinces a sceptical but mathematically literate reader who takes nothing for granted.",
        "examples": [
          "A student writes: 'Since x² − 5x + 6 = 0, clearly x = 2 or x = 3.' Rewrite this as a complete proof.",
          "What is missing from: 'f is increasing, so f(a) < f(b) whenever a < b, therefore f is injective'?",
          "Evaluate this proof: 'To show √3 is irrational, assume √3 = p/q reduced. Then 3q² = p², so 3|p². Hence 3|p, write p = 3k. Then q² = 3k², so 3|q. Contradiction.' Is it complete?"
        ]
      }
    ]
  }
]

M11_LO_DETAIL = [
  {
    "subtopics": [
      {
        "name": "Limit definition and algebraic computation",
        "description": "The ε-δ definition makes 'f(x) approaches L as x → a' precise: for every ε > 0 there exists δ > 0 such that 0 < |x − a| < δ implies |f(x) − L| < ε. In practice, limits are computed by factoring, rationalising, or applying limit laws; ε-δ arguments are reserved for theoretical proofs. One-sided limits, limits at infinity, and infinite limits each extend this framework.",
        "examples": [
          "Evaluate lim(x→3) (x² − 9)/(x − 3) without a calculator.",
          "Evaluate lim(x→∞) (3x² + 2x)/(5x² − 1).",
          "Using the ε-δ definition, prove lim(x→2) (3x − 1) = 5."
        ]
      },
      {
        "name": "L'Hôpital's rule",
        "description": "L'Hôpital's rule resolves indeterminate forms 0/0 and ∞/∞: if lim f = lim g = 0 (or ±∞) and g′ ≠ 0 near a, then lim f/g = lim f′/g′. Forms 0·∞, ∞ − ∞, 0⁰, 1^∞, and ∞⁰ must first be rewritten as 0/0 or ∞/∞ before applying the rule. It may need to be applied more than once.",
        "examples": [
          "Evaluate lim(x→0) sin(x)/x using L'Hôpital's rule.",
          "Evaluate lim(x→0⁺) x ln(x) by converting to 0/0 form first.",
          "Evaluate lim(x→∞) (1 + 1/x)^x and identify which indeterminate form it represents."
        ]
      },
      {
        "name": "Continuity and the Intermediate Value Theorem",
        "description": "A function is continuous at a if the limit equals the function value there. The Intermediate Value Theorem guarantees that a continuous function on [a,b] takes every value between f(a) and f(b), making it a powerful existence tool. Continuity is the entry condition for almost every major theorem in calculus.",
        "examples": [
          "Determine where f(x) = (x² − 1)/(x − 1) is discontinuous and classify each discontinuity.",
          "Use the IVT to show x³ − x − 1 = 0 has a root in [1, 2].",
          "Can f(x) = sin(1/x) be extended to a function continuous at x = 0?"
        ]
      }
    ]
  },
  {
    "subtopics": [
      {
        "name": "Differentiation rules",
        "description": "The power, product, quotient, and chain rules handle any combination of elementary functions. Implicit differentiation handles curves defined by equations like x² + y² = r² where y cannot be isolated. Fluency means recognising which rules compose and applying them without expanding unnecessarily.",
        "examples": [
          "Differentiate f(x) = (x³ + 1)⁵ · sin(x) using the product and chain rules.",
          "Use implicit differentiation to find dy/dx for x² + y² = 25.",
          "Find the derivative of arctan(x²), justifying each step."
        ]
      },
      {
        "name": "Related rates",
        "description": "Related rates problems use implicit differentiation with respect to time to connect the rates of change of two quantities. The technique: write a geometric or physical equation relating the quantities, differentiate both sides with respect to t using the chain rule, then substitute known values to find the unknown rate.",
        "examples": [
          "A spherical balloon is inflated at 100 cm³/s. How fast is its radius increasing when r = 5 cm?",
          "A 10 m ladder leans against a wall. The foot slides out at 1 m/s. How fast is the top falling when the foot is 6 m from the wall?",
          "Water drains from a conical tank (height 4 m, radius 2 m) at 2 m³/min. How fast is the water level dropping when h = 1 m?"
        ]
      },
      {
        "name": "Optimisation",
        "description": "Optimisation locates maxima and minima of a function. Critical points occur where f′ = 0 or f′ is undefined; classify them with the first or second derivative test. On a closed interval also check the endpoints. Practical problems require translating a word description into a function, then maximising or minimising it.",
        "examples": [
          "Find the dimensions of the rectangle of largest area inscribed in a circle of radius r.",
          "A farmer has 400 m of fencing and wants to enclose a rectangular field alongside a river (no fence on the river side). What dimensions maximise the area?",
          "Find and classify the local extrema of f(x) = 2x³ − 3x² − 12x + 1."
        ]
      },
      {
        "name": "Curve sketching and the Mean Value Theorem",
        "description": "A complete curve sketch uses: domain and symmetry, intercepts, vertical and horizontal asymptotes, critical points, intervals of increase/decrease from f′, and concavity/inflection points from f″. The Mean Value Theorem guarantees at least one interior point where the instantaneous rate equals the average rate over an interval.",
        "examples": [
          "Sketch f(x) = x⁴ − 8x², marking all critical points, inflection points, and asymptotes.",
          "Show using the Mean Value Theorem that |sin a − sin b| ≤ |a − b| for all real a, b.",
          "Find all inflection points of f(x) = x·eˣ."
        ]
      }
    ]
  },
  {
    "subtopics": [
      {
        "name": "The Fundamental Theorem of Calculus",
        "description": "The Fundamental Theorem connects differentiation and integration: Part 1 says d/dx ∫ₐˣ f(t) dt = f(x); Part 2 says ∫ₐᵇ f(x) dx = F(b) − F(a) where F′ = f. Together they explain why antiderivatives compute areas and are the reason integration is a tractable problem. The Riemann sum definition underpins the theory but is rarely used to evaluate integrals directly.",
        "examples": [
          "Differentiate F(x) = ∫₁ˣ t²sin(t) dt without computing the integral.",
          "Write the left Riemann sum for ∫₀¹ x² dx with n subintervals and evaluate the limit.",
          "Evaluate ∫₀^π sin(x) dx using the Fundamental Theorem."
        ]
      },
      {
        "name": "Substitution (u-substitution)",
        "description": "Substitution reverses the chain rule: if the integrand contains f(g(x))g′(x), substitute u = g(x) to reduce the integral to ∫ f(u) du. For definite integrals, either convert limits to u-values or back-substitute before evaluating. Pattern recognition — identifying the inner function and its derivative — is the core skill.",
        "examples": [
          "Evaluate ∫ x·cos(x²) dx.",
          "Evaluate ∫₀¹ 2x·e^(x²) dx.",
          "Evaluate ∫ sin(x)·cos(x) dx two ways (u = sin x and u = cos x) and verify both give equivalent answers."
        ]
      },
      {
        "name": "Integration by parts",
        "description": "Integration by parts reverses the product rule: ∫ u dv = uv − ∫ v du. The LIATE heuristic (Logs, Inverse trig, Algebraic, Trig, Exponential) guides the choice of u. Some integrals require two applications, or a cyclic pattern where you solve algebraically for the original integral.",
        "examples": [
          "Evaluate ∫ x·eˣ dx.",
          "Evaluate ∫ ln(x) dx.",
          "Evaluate ∫ eˣ·cos(x) dx, which requires two applications and solving algebraically for the answer."
        ]
      },
      {
        "name": "Partial fractions",
        "description": "Partial fractions decompose a proper rational function P(x)/Q(x) into a sum of simpler fractions whose antiderivatives are logarithms or arctangents. Factor the denominator completely into linear and irreducible quadratic factors, then match coefficients to determine the numerators. This is the primary technique for rational integrands.",
        "examples": [
          "Decompose (3x + 5)/((x+1)(x+2)) into partial fractions and integrate.",
          "Evaluate ∫ 1/(x² − 1) dx.",
          "Evaluate ∫ (x² + 1)/(x³ − x) dx."
        ]
      },
      {
        "name": "Improper integrals",
        "description": "An improper integral has an infinite limit or an integrand that is unbounded within the interval. Both are handled by replacing the problematic endpoint with a parameter t and taking the limit as t approaches it. The integral converges if this limit is finite, and diverges otherwise. The p-integral ∫₁^∞ x^(−p) dx converges iff p > 1 — a benchmark worth knowing.",
        "examples": [
          "Evaluate ∫₁^∞ 1/x² dx.",
          "Determine whether ∫₀¹ 1/√x dx converges and find its value.",
          "Show that ∫₁^∞ 1/x dx diverges."
        ]
      }
    ]
  },
  {
    "subtopics": [
      {
        "name": "Sequences",
        "description": "A sequence aₙ converges to L if |aₙ − L| can be made arbitrarily small for all sufficiently large n. Algebraic limit rules, the squeeze theorem, and continuity of standard functions (if aₙ → L and f is continuous then f(aₙ) → f(L)) cover most cases. A bounded monotone sequence always converges — this is used without proof in many series arguments.",
        "examples": [
          "Determine whether aₙ = (2n² + 1)/(n² − 3) converges, and find the limit.",
          "Show using the squeeze theorem that lim(n→∞) n^(1/n) = 1.",
          "Does aₙ = (−1)ⁿ converge? Justify rigorously."
        ]
      },
      {
        "name": "Series and convergence tests",
        "description": "A series Σaₙ converges if the sequence of partial sums converges. The divergence test, integral test, comparison and limit comparison tests, ratio test, root test, and alternating series test each apply in different situations. The ratio test is the most broadly useful for series involving factorials or exponentials — you should be able to apply all tests fluently.",
        "examples": [
          "Determine whether Σ 1/n² converges using the integral test.",
          "Test Σ n!/nⁿ for convergence using the ratio test.",
          "Does Σ (−1)ⁿ/√n converge? Justify using the alternating series test."
        ]
      },
      {
        "name": "Power series and radius of convergence",
        "description": "A power series Σ cₙ(x−a)ⁿ converges for |x − a| < R where R is the radius of convergence found by the ratio test on cₙ. At the endpoints ±R, convergence must be checked separately. Power series can be differentiated and integrated term-by-term within their radius of convergence, which is how most standard series are derived.",
        "examples": [
          "Find the radius of convergence of Σ xⁿ/n using the ratio test.",
          "Find the full interval of convergence (check endpoints) of Σ (x−1)ⁿ/2ⁿ.",
          "Use the geometric series 1/(1−x) = Σ xⁿ to derive the power series for 1/(1−x²)."
        ]
      }
    ]
  },
  {
    "subtopics": [
      {
        "name": "Taylor polynomials",
        "description": "The nth-degree Taylor polynomial Tₙ(x) for f centred at a is the unique degree-n polynomial matching f and its first n derivatives at a. It approximates f near a, with the Lagrange remainder |Rₙ(x)| ≤ M|x−a|^(n+1)/(n+1)! bounding the error, where M bounds the (n+1)th derivative on the interval. These bounds matter in numerical methods.",
        "examples": [
          "Find the degree-3 Taylor polynomial for eˣ centred at a = 0.",
          "Find the degree-4 Taylor polynomial for cos(x) at 0 and use it to approximate cos(0.1).",
          "Bound the error in approximating sin(0.2) using its degree-3 Maclaurin polynomial."
        ]
      },
      {
        "name": "Key Maclaurin series",
        "description": "The Maclaurin series for eˣ, sin(x), cos(x), ln(1+x), and 1/(1−x) should be memorised with their domains of convergence. eˣ converges on all of ℝ; ln(1+x) converges on (−1,1]; 1/(1−x) converges on (−1,1). Substituting into known series often generates new series far more efficiently than computing derivatives from scratch.",
        "examples": [
          "Derive the Maclaurin series for e^(−x²) from eˣ = Σ xⁿ/n!",
          "Find the first four non-zero terms of the Maclaurin series for sin(x²).",
          "Use the Maclaurin series for ln(1+x) to approximate ln(1.1) to 4 decimal places."
        ]
      },
      {
        "name": "Taylor's theorem and convergence",
        "description": "Taylor's theorem provides the Lagrange remainder formula that bounds approximation error explicitly. Proving that the Taylor series of a function actually converges to that function (not just to some other function) requires showing the remainder Rₙ(x) → 0. This holds for eˣ, sin, and cos on all of ℝ, but not for every smooth function.",
        "examples": [
          "Determine how many terms of the Maclaurin series for eˣ are needed to approximate e with error < 0.001.",
          "Prove that the Maclaurin series for sin(x) converges to sin(x) for all x ∈ ℝ using the Lagrange remainder.",
          "Find the Taylor series for ln(1+x) and prove it converges to ln(1+x) on (0,1]."
        ]
      }
    ]
  },
  {
    "subtopics": [
      {
        "name": "Polar coordinates",
        "description": "In polar coordinates (r, θ), r is the distance from the origin and θ is the angle from the positive x-axis. Conversion: x = r cos θ, y = r sin θ, r² = x² + y². Polar form is natural for curves with rotational symmetry such as circles, cardioids, and roses. Area enclosed by a polar curve is A = ½ ∫ r² dθ.",
        "examples": [
          "Convert the Cartesian point (−3, 4) to polar form.",
          "Sketch r = 2 cos θ and identify the curve it represents.",
          "Find the area enclosed by one petal of r = cos(2θ)."
        ]
      },
      {
        "name": "Parametric equations",
        "description": "A parametric curve (x(t), y(t)) describes motion or shape through a parameter t that often represents time. The slope is dy/dx = (dy/dt)/(dx/dt) wherever dx/dt ≠ 0. Arc length is ∫ √((dx/dt)² + (dy/dt)²) dt. Eliminating t recovers the Cartesian form, but many curves (spirals, cycloids) are most naturally expressed parametrically.",
        "examples": [
          "Find dy/dx for x = t², y = t³ at t = 1.",
          "Show x = cos t, y = sin t parametrises the unit circle and compute the arc length over [0, 2π].",
          "Find the arc length of x = t², y = ⅔ t³ from t = 0 to t = 1."
        ]
      }
    ]
  }
]

# Add lo_detail to M0.1 and M1.1
for m in data['modules']:
    if m['id'] == 'M0.1':
        m['lo_detail'] = M01_LO_DETAIL
    elif m['id'] == 'M1.1':
        m['lo_detail'] = M11_LO_DETAIL

with open('modules.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Done. Verifying...')
with open('modules.json') as f:
    d = json.load(f)
for m in d['modules']:
    if m['id'] in ('M0.1', 'M1.1'):
        print(f"{m['id']}: lo_detail has {len(m['lo_detail'])} entries (expected {len(m['learning_outcomes'])})")
        for i, lo in enumerate(m['lo_detail']):
            print(f"  LO {i+1}: {len(lo['subtopics'])} subtopics")
