# Personal Mathematics Study Plan
## NCEA Level 3 → Mathematics Graduate Equivalent

> **Starting point:** NCEA Level 3 Mathematics (differentiation, integration, algebra, statistics basics confirmed).
> **End goal:** Graduate-level mathematical competency, with synthesis towards AI, stochastic finance, and numerical computation.
> **Assumed pace:** ~15 hours/week self-study. All primary texts are free and open-source.
> **Estimated duration:** 28–36 months (can compress with heavier load or expand at a sustainable pace).

---

## How to Read This Plan

Each **module** has a code (e.g., `M1.2`), an estimated duration, a prerequisite list, and open-source resources. Modules within the same phase can often overlap; the **critical path** section identifies what must be done sequentially.

The plan is designed so this document can drive a website with:
- A **dependency tree** (prerequisites graph)
- A **Gantt chart** (module timeline table below)
- A **critical path** annotation
- Per-module pages with LOs, resources, and checkpoints
- AI integration hooks (flagged per module)

---

## Assumed Prior Knowledge (NCEA Level 3)

| Topic | Status |
|-------|--------|
| Single-variable differentiation (polynomials, trig, exp, log) | Known |
| Single-variable integration (basic techniques) | Known |
| Algebra (systems of equations, quadratics, sequences) | Known |
| Basic statistics (distributions, hypothesis testing concepts) | Known |
| Complex numbers (intro level) | Partial |
| Mathematical proof | Not yet started |

---

## Module Catalogue

---

### PRE-PHASE: Proof Readiness

---

#### M0.1 — Logic, Sets, and Mathematical Proof
**Phase:** Pre | **Duration:** 6 weeks | **Load:** 12 hrs/week
**Prerequisites:** NCEA Level 3 (assumed)
**Unlocks:** All Phase 1 modules; this is the most critical early investment.

**Description:** The single biggest shift from school maths to university maths is moving from *computing answers* to *proving statements*. This module builds the logical language and proof techniques used in every subsequent module. Without it, Phase 2 courses (Real Analysis, Abstract Algebra) will be inaccessible.

**Learning Outcomes:**
1. Construct and evaluate logical arguments using propositional and predicate logic.
2. Work fluently with set notation, power sets, Cartesian products, and cardinality.
3. Write correct direct proofs, proofs by contradiction, and proofs by contrapositive.
4. Apply mathematical induction (weak and strong) to prove statements about natural numbers.
5. Understand and negate quantified statements (∀, ∃) without logical error.
6. Recognise when a proof is incomplete or incorrect.

**Open Source Resources:**
- **Primary text (free PDF):** Hammack, R. *Book of Proof* (3rd ed.) — https://www.people.vcu.edu/~rhammack/BookOfProof/
- **Exercise solutions:** https://www.vaia.com/en-us/textbooks/math/book-of-proof-3-edition/
- **Supplementary (free):** Lebl, J. *Basic Analysis I* Ch. 0 — https://www.jirka.org/ra/
- **Video support:** MIT OCW 18.090 Introduction to Mathematical Reasoning — https://ocw.mit.edu/courses/18-090-introduction-to-mathematical-reasoning-spring-2023/

**Milestone Checkpoint:** Prove that √2 is irrational. Prove that there are infinitely many primes. Write proofs using ε-notation informally (warm-up for Analysis).

**Gantt position:** Weeks 1–6
**Critical path:** YES

---

### PHASE 1: Structural Foundations (~6–8 months)

*Goal: Fluency in the three pillars of undergraduate mathematics — calculus in multiple variables, linear algebra, and computation.*

---

#### M1.1 — Single Variable Calculus (Consolidation and Extension)
**Phase:** 1 | **Duration:** 10 weeks | **Load:** 15 hrs/week
**Prerequisites:** NCEA Level 3 Calculus, M0.1 (concurrent is fine)
**Unlocks:** M1.4 (Multivariable Calculus), M2.3 (Differential Equations), M2.4 (Probability)

**Description:** NCEA Level 3 covers the mechanics of differentiation and integration. This module extends and formalises that knowledge — L'Hôpital's rule, improper integrals, sequences, series, and Taylor polynomials — and introduces the *why* behind the techniques. It matches MIT 18.01 and Massey 160101.

**Learning Outcomes:**
1. Calculate limits rigorously, including indeterminate forms via L'Hôpital's rule.
2. Apply differentiation to related rates, optimisation, and curve analysis.
3. Evaluate definite and improper integrals using substitution, parts, and partial fractions.
4. Determine convergence/divergence of sequences and series using standard tests.
5. Construct Taylor and Maclaurin polynomials and use them for approximation.
6. Use polar coordinates and parametric equations.

**Open Source Resources:**
- **Primary (free):** OpenStax *Calculus Volume 1* — https://openstax.org/details/books/calculus-volume-1
- **Primary (free):** OpenStax *Calculus Volume 2* — https://openstax.org/details/books/calculus-volume-2
- **Video lectures (free):** MIT OCW 18.01SC — https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/
- **Free open text (alternative):** Strang, G. *Calculus* — https://ocw.mit.edu/resources/res-18-001-calculus-online-textbook-spring-2005/
- **Exercises:** OpenStax answer keys — https://openstax.org/books/calculus-volume-1/pages/chapter-1

**Milestone Checkpoint:** Evaluate ∫ x·ln(x) dx from scratch. Determine whether Σ(1/n²) converges and find its value. Write the Taylor series for sin(x) and prove convergence.

**Gantt position:** Weeks 1–10
**Critical path:** YES

---

#### M1.2 — Linear Algebra
**Phase:** 1 | **Duration:** 12 weeks | **Load:** 15 hrs/week
**Prerequisites:** M0.1 (concurrent), NCEA Level 3 Algebra
**Unlocks:** M1.4 (Multivariable Calculus), M2.2 (Abstract Algebra), M2.3 (Differential Equations), M3.2 (Advanced Linear Algebra), M3.5 (Numerical Analysis)

**Description:** Linear algebra is the language of AI, data science, physics, and virtually all quantitative fields. This module follows Strang's "Four Fundamental Subspaces" approach and builds towards SVD and eigenanalysis. Matches MIT 18.06 and ANU MATH1013/1014.

**Learning Outcomes:**
1. Solve systems of linear equations via Gaussian elimination; compute LU decomposition.
2. Define and identify vector spaces, subspaces, bases, and dimension.
3. Find the four fundamental subspaces (column space, null space, row space, left null space) of a matrix.
4. Apply the Gram-Schmidt process and construct orthogonal projections.
5. Solve least-squares problems for overdetermined systems.
6. Compute eigenvalues and eigenvectors; diagonalise matrices.
7. Understand and compute the Singular Value Decomposition (SVD).
8. Use linear algebra for geometric transformations, Markov chains, and network analysis.

**Open Source Resources:**
- **Primary (free video + notes):** MIT OCW 18.06SC — https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/
- **Problem sets:** https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/
- **GitHub course materials:** https://github.com/mitmath/1806
- **Free text:** Cherney, Denton, Thomas, Waldron — *Linear Algebra* — https://www.math.ucdavis.edu/~linear/linear-guest.pdf
- **AI/application supplement:** 3Blue1Brown *Essence of Linear Algebra* — https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab

**Milestone Checkpoint:** Given a matrix A, find all four fundamental subspaces, verify the rank-nullity theorem, compute eigenvalues/eigenvectors, and compute the SVD by hand for a 2×2 matrix.

**Gantt position:** Weeks 5–16
**Critical path:** NO (parallel with M1.1)

---

#### M1.3 — Multivariable Calculus
**Phase:** 1 | **Duration:** 10 weeks | **Load:** 15 hrs/week
**Prerequisites:** M1.1 (Single Variable Calculus), M1.2 (Linear Algebra — at least first 4 weeks)
**Unlocks:** M2.1 (Real Analysis), M2.4 (Probability), M3.1 (Complex Analysis), M3.3 (PDEs)

**Description:** Extends calculus to functions of several variables — the setting for virtually all real-world modelling. Green's, Stokes', and the Divergence Theorems are the climax. Matches MIT 18.02, Massey 160203, UoA MATHS 253/340.

**Learning Outcomes:**
1. Calculate partial derivatives, gradients, and directional derivatives.
2. Apply the multivariable chain rule and implicit differentiation.
3. Find and classify critical points of multivariable functions; apply Lagrange multipliers.
4. Evaluate double and triple integrals in rectangular, polar, cylindrical, and spherical coordinates.
5. Compute line and surface integrals.
6. State and apply Green's Theorem, Stokes' Theorem, and the Divergence Theorem.
7. Understand the gradient as the direction of steepest ascent (connection to gradient descent in ML).

**Open Source Resources:**
- **Primary (free):** OpenStax *Calculus Volume 3* — https://openstax.org/details/books/calculus-volume-3
- **Video lectures (free):** MIT OCW 18.02SC — https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/
- **Exercises:** https://openstax.org/books/calculus-volume-3/pages/2-exercises

**Milestone Checkpoint:** Reverse the order of integration in a double integral. Apply Stokes' Theorem to compute a surface integral. Derive the gradient descent update rule for a simple loss function.

**AI Integration:** Gradient descent, backpropagation chain rule, loss surface visualisation.

**Gantt position:** Weeks 11–20
**Critical path:** YES

---

#### M1.4 — Computation: Python for Mathematics
**Phase:** 1 | **Duration:** 6 weeks | **Load:** 10 hrs/week
**Prerequisites:** None (can start Week 1)
**Unlocks:** M3.5 (Numerical Analysis), M4.2 (Statistical Learning), M4.4 (ML Theory)

**Description:** Mathematical computation is the practical layer that sits alongside the theory throughout the programme. This module builds fluency in Python (NumPy, SciPy, Matplotlib, SymPy) for numerical and symbolic maths. Not a software engineering course — focused entirely on mathematical applications.

**Learning Outcomes:**
1. Set up a Python environment and use Jupyter notebooks for mathematical exploration.
2. Use NumPy for matrix operations, eigenvalue computation, and array broadcasting.
3. Use SciPy for integration, ODE solving, and optimisation.
4. Use SymPy for symbolic differentiation, integration, and algebra.
5. Visualise functions, vector fields, and surfaces with Matplotlib.
6. Write clean, mathematical code with appropriate documentation.

**Open Source Resources:**
- **Free course:** Python for Mathematics — https://www.learnpython.org/
- **NumPy docs:** https://numpy.org/doc/stable/user/quickstart.html
- **SciPy lectures (free):** https://scipy-lectures.org/
- **SymPy tutorial (free):** https://docs.sympy.org/latest/tutorial/
- **Jupyter for maths:** https://jupyter.org/try

**Milestone Checkpoint:** Write a Jupyter notebook that: (1) computes LU decomposition; (2) solves an ODE numerically; (3) plots a vector field and stream lines; (4) symbolically differentiates and integrates a multivariable function.

**Gantt position:** Weeks 4–10 (parallel, lighter load)

---

### PHASE 2: Mathematical Rigour (~9–11 months)

*Goal: The transition from using tools to proving they work. Real Analysis and Abstract Algebra are the intellectual core of university mathematics.*

---

#### M2.1 — Real Analysis
**Phase:** 2 | **Duration:** 16 weeks | **Load:** 15 hrs/week
**Prerequisites:** M0.1 (Proofs), M1.1 (Single Variable Calculus)
**Unlocks:** M3.1 (Complex Analysis), M3.4 (Metric Spaces/Topology), M4.1 (Measure Theory)

**Description:** The hardest and most important module in the programme. Real Analysis formalises everything from Phase 1: what *is* a limit? What does "continuous" really mean? Why does the integral work? Most people fail this once before understanding it — be patient. Matches MIT 18.100A/B, UoA MATHS 332, Massey 160301, Melbourne MAST20026.

**Learning Outcomes:**
1. Work with the axioms of the real number system, especially the Completeness Axiom.
2. Prove convergence and divergence of sequences using the ε-N definition.
3. Prove continuity of functions using the ε-δ definition; apply the Intermediate Value Theorem and Extreme Value Theorem.
4. Prove differentiability; apply the Mean Value Theorem rigorously.
5. Construct the Riemann integral via Darboux sums; prove the Fundamental Theorem of Calculus.
6. Analyse uniform vs. pointwise convergence of sequences and series of functions.
7. Construct proofs about "pathological" functions (e.g., Dirichlet's function, Weierstrass function).

**Open Source Resources:**
- **Primary (free PDF):** Lebl, J. *Basic Analysis I* — https://www.jirka.org/ra/
- **Video lectures (free):** MIT OCW 18.100A — https://ocw.mit.edu/courses/18-100a-real-analysis-fall-2020/
- **Highly recommended (many free library copies):** Abbott, S. *Understanding Analysis* — ISBN 9781493927111 (check your library)
- **Alternative free text:** Trench, W. *Introduction to Real Analysis* — https://digitalcommons.trinity.edu/mono/7/
- **Problem sets:** MIT 18.100B — https://ocw.mit.edu/courses/18-100b-analysis-i-fall-2010/pages/assignments/

**Milestone Checkpoint (Mastery indicators):**
- Prove: a bounded monotone sequence converges.
- Prove: the composition of continuous functions is continuous.
- Prove: the uniform limit of continuous functions is continuous.
- Show there exists a continuous function that is nowhere differentiable.

**AI Integration:** Convergence guarantees for gradient descent; Lipschitz continuity in neural networks.

**Gantt position:** Weeks 21–36
**Critical path:** YES

---

#### M2.2 — Abstract Algebra
**Phase:** 2 | **Duration:** 14 weeks | **Load:** 15 hrs/week
**Prerequisites:** M0.1 (Proofs), M1.2 (Linear Algebra — eigenvectors, subspaces)
**Unlocks:** M3.2 (Advanced Linear Algebra), M3.1 (Complex Analysis — field extensions), M4.1 (Measure Theory — σ-algebras)

**Description:** Identifies the structural patterns that appear across all of mathematics. Groups abstract the notion of symmetry; rings abstract arithmetic; fields abstract number systems. Applications in cryptography, coding theory, and geometry. Matches MIT 18.701, Massey 160302, UoA MATHS 320.

**Learning Outcomes:**
1. Define groups, subgroups, cosets, and normal subgroups; apply Lagrange's Theorem.
2. Classify finite abelian groups; apply the Sylow Theorems.
3. Understand and apply group homomorphisms and the Isomorphism Theorems.
4. Work with rings, ideals, and quotient rings.
5. Understand fields, field extensions, and basic Galois theory.
6. Apply abstract algebra to concrete examples: symmetry groups, modular arithmetic, polynomial rings.

**Open Source Resources:**
- **Primary (free):** Judson, T. *Abstract Algebra: Theory and Applications* — http://abstract.ups.edu/
- **Video lectures (free):** MIT OCW 18.701 — https://ocw.mit.edu/courses/18-701-algebra-i-fall-2010/
- **Textbook (free):** Pinter, C. *A Book of Abstract Algebra* (Dover — very cheap, widely available)
- **MIT 18.702 sequel:** https://ocw.mit.edu/courses/18-702-algebra-ii-spring-2011/

**Milestone Checkpoint:** Classify all groups of order ≤ 8. Find all subgroups of Z/12Z. Prove the First Isomorphism Theorem. Show Z[√−1] is a Euclidean domain.

**Gantt position:** Weeks 21–34
**Critical path:** NO (parallel with M2.1)

---

#### M2.3 — Ordinary Differential Equations
**Phase:** 2 | **Duration:** 10 weeks | **Load:** 15 hrs/week
**Prerequisites:** M1.1 (Calculus), M1.2 (Linear Algebra — first 8 weeks)
**Unlocks:** M3.3 (Partial Differential Equations), M4.3 (Stochastic Calculus)

**Description:** The language of dynamics in physics, biology, economics, and engineering. Begins with exact solution methods and moves to qualitative and numerical approaches. Phase plane analysis reveals the geometry of solutions. Matches MIT 18.03, Massey 160204, UoA MATHS 260.

**Learning Outcomes:**
1. Solve first-order ODEs (separable, linear, Bernoulli, exact).
2. Solve second-order linear ODEs with constant coefficients (homogeneous and inhomogeneous).
3. Use Laplace transforms to convert and solve IVPs.
4. Solve systems of linear ODEs via matrix methods and matrix exponentials.
5. Construct phase portraits; classify critical points by stability.
6. Model real-world problems as ODEs and interpret solutions.
7. Apply Euler's method and Runge-Kutta numerically.

**Open Source Resources:**
- **Primary (free):** Lebl, J. *Notes on Diffy Qs* — https://www.jirka.org/diffyqs/
- **Video lectures (free):** MIT OCW 18.03SC — https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/
- **Interactive notes:** https://web.uvic.ca/~tbazett/diffyqsold/diffyqs.html
- **Supplementary free text:** Trench, W. *Elementary Differential Equations* — https://digitalcommons.trinity.edu/mono/8/

**Milestone Checkpoint:** Solve a damped harmonic oscillator completely (find general solution, particular solution for sinusoidal forcing, amplitude-frequency diagram). Sketch the phase portrait for a nonlinear system and classify all critical points.

**AI Integration:** Stability of gradient flows; neural ODEs; dynamical systems perspective on learning.

**Gantt position:** Weeks 17–26
**Critical path:** NO (partially parallel with M1.3 end and M2.1 start)

---

#### M2.4 — Probability and Mathematical Statistics
**Phase:** 2 | **Duration:** 12 weeks | **Load:** 15 hrs/week
**Prerequisites:** M1.1 (Calculus — integration), M1.3 (Multivariable Calculus — partial derivatives, multiple integrals)
**Unlocks:** M4.2 (Statistical Learning), M4.3 (Stochastic Calculus), M4.4 (ML Theory)

**Description:** Probability is the mathematical framework for uncertainty; statistics is the machinery for inference. This goes well beyond NCEA — full measure-theoretic foundations are deferred to M4.1, but this module develops the calculus-based treatment thoroughly. Matches Harvard Stat 110, ANU STAT2001, Melbourne MAST20004.

**Learning Outcomes:**
1. Work with probability spaces, events, and σ-algebras at an informal level.
2. Compute probabilities using combinatorial methods and conditional probability; apply Bayes' Theorem.
3. Define and work with discrete and continuous random variables via PMFs, PDFs, and CDFs.
4. Calculate expectation, variance, covariance, and moment generating functions via integration.
5. State and apply the Central Limit Theorem and the Law of Large Numbers.
6. Perform maximum likelihood estimation and Bayesian inference.
7. Understand the frequentist vs. Bayesian perspectives.

**Open Source Resources:**
- **Primary (free PDF):** Blitzstein, J. & Hwang, J. *Introduction to Probability* — https://drive.google.com/file/d/1VmkAAGOYCTORq1wxSQqy255qLJjTNvBI/view
- **Video lectures (free):** Harvard Stat 110 — https://projects.iq.harvard.edu/stat110/home
- **Free text alternative:** Grinstead & Snell *Introduction to Probability* — https://www.dartmouth.edu/~chance/teaching_aids/books_articles/probability_book/amsbook.mac.pdf
- **Problem sets:** https://projects.iq.harvard.edu/stat110/strategic-practice-problems

**Milestone Checkpoint:** Derive the distribution of the sum of two independent exponential random variables. Prove the CLT for iid variables with finite variance (via MGFs). Compute a Bayesian update for a Beta-Binomial model.

**AI Integration:** MLE for neural networks; Bayesian deep learning; probabilistic graphical models.

**Gantt position:** Weeks 27–38
**Critical path:** NO (parallel with M2.1 end)

---

### PHASE 3: Advanced Core (~9–11 months)

*Goal: The specialisation tier. These modules correspond to final-year BSc and early graduate content at top universities.*

---

#### M3.1 — Complex Analysis
**Phase:** 3 | **Duration:** 10 weeks | **Load:** 15 hrs/week
**Prerequisites:** M2.1 (Real Analysis), M1.3 (Multivariable Calculus)
**Unlocks:** M4.1 (Measure Theory / Functional Analysis), M4.3 (Stochastic Calculus — Laplace transforms)

**Description:** One of the most beautiful areas of mathematics. Complex differentiability is far more restrictive than real differentiability, which makes complex functions remarkably well-behaved. The Residue Theorem gives a powerful method for evaluating difficult real integrals. Matches Massey 160301, MIT 18.04, UoA MATHS 340.

**Learning Outcomes:**
1. Work with complex numbers in Cartesian, polar, and exponential form.
2. Define and verify analyticity via the Cauchy-Riemann equations.
3. Integrate complex functions along curves; apply Cauchy's Integral Theorem and Formula.
4. Classify and compute residues at isolated singularities.
5. Evaluate difficult real integrals using the Residue Theorem.
6. Understand conformal mappings and their geometric interpretation.
7. Represent functions as Laurent series and determine regions of convergence.

**Open Source Resources:**
- **Primary (free):** Lebl, J. *A First Course in Complex Analysis* — https://www.jirka.org/ca/
- **Interactive visual intro (free):** https://complex-analysis.com/
- **Video lectures (free):** MIT OCW 18.04 — https://ocw.mit.edu/courses/18-04-complex-variables-with-applications-spring-2018/
- **Free text (approved):** Howell, R. *Complex Analysis: An Open Source Textbook* — https://textbooks.aimath.org/complex-analysis-an-open-source-textbook/

**Milestone Checkpoint:** Evaluate ∫_{-∞}^{∞} 1/(1+x²)² dx using the Residue Theorem. Prove the Fundamental Theorem of Algebra using complex analysis. Show an analytic function on a disk is determined by its boundary values.

**Gantt position:** Weeks 37–46
**Critical path:** NO (parallel with M3.4)

---

#### M3.2 — Advanced Linear Algebra
**Phase:** 3 | **Duration:** 10 weeks | **Load:** 12 hrs/week
**Prerequisites:** M1.2 (Linear Algebra), M2.1 (Real Analysis), M2.2 (Abstract Algebra — first 6 weeks)
**Unlocks:** M4.1 (Functional Analysis — infinite-dimensional generalisation), M4.4 (ML Theory)

**Description:** Revisits linear algebra at a deeper, proof-based level. Jordan canonical form, spectral theorems, bilinear forms, and inner product spaces. This is the algebraic foundation for functional analysis and quantum mechanics. Matches MIT 18.700, Warwick MA251, ANU MATH2301.

**Learning Outcomes:**
1. Classify linear operators via the Jordan canonical form.
2. Work with inner product spaces; prove the Gram-Schmidt theorem rigorously.
3. State and prove the Spectral Theorem for self-adjoint operators.
4. Classify bilinear and quadratic forms via signature.
5. Understand the connection between linear algebra over ℝ, ℂ, and general fields.
6. Apply results to least-squares, PCA, and operator theory.

**Open Source Resources:**
- **Primary (free):** Axler, S. *Linear Algebra Done Right* (4th ed., free online) — https://linear.axler.net/
- **Video lectures (free):** MIT OCW 18.700 — https://ocw.mit.edu/courses/18-700-linear-algebra-fall-2013/
- **MIT OCW 18.701 (algebra view):** https://ocw.mit.edu/courses/18-701-algebra-i-fall-2010/

**Milestone Checkpoint:** Prove the Cayley-Hamilton Theorem. Find the Jordan form of a given matrix. State and prove the Real Spectral Theorem. Explain geometrically why symmetric matrices always have orthogonal eigenvectors.

**Gantt position:** Weeks 42–51
**Critical path:** NO

---

#### M3.3 — Partial Differential Equations
**Phase:** 3 | **Duration:** 12 weeks | **Load:** 15 hrs/week
**Prerequisites:** M2.3 (ODEs), M1.3 (Multivariable Calculus), M2.1 (Real Analysis — first 8 weeks for Fourier analysis)
**Unlocks:** M4.3 (Stochastic Calculus — Black-Scholes PDE), M4.1 (Functional Analysis — PDE operators)

**Description:** PDEs govern heat, waves, diffusion, fluid flow, and — critically — the Black-Scholes equation of financial mathematics. Fourier series and transforms are the central tools. Matches MIT 18.03 extension, Massey 160318, UoA MATHS 361, ANU MATH2306.

**Learning Outcomes:**
1. Classify second-order PDEs (elliptic, parabolic, hyperbolic).
2. Apply separation of variables to the heat equation, wave equation, and Laplace equation.
3. Compute Fourier series and Fourier transforms; apply the convolution theorem.
4. Solve boundary value problems using Sturm-Liouville theory.
5. Understand the method of characteristics for first-order PDEs.
6. Apply Fourier transforms to solve the heat equation on ℝ.
7. Implement explicit finite difference schemes numerically in Python.

**Open Source Resources:**
- **Primary (free):** Lebl, J. *Notes on Diffy Qs* (Ch. 4–6 on PDEs) — https://www.jirka.org/diffyqs/
- **Video lectures (free):** MIT OCW 18.303 — https://ocw.mit.edu/courses/18-303-linear-partial-differential-equations-fall-2006/
- **Advanced free text:** Evans, L. *Partial Differential Equations* intro chapters — available via many university libraries

**Milestone Checkpoint:** Solve the heat equation on [0, L] with Dirichlet boundary conditions using Fourier series. Solve the wave equation via d'Alembert's formula. Implement a finite difference scheme for the 2D Laplace equation in Python.

**AI Integration:** Diffusion models in generative AI are literally reverse-time stochastic heat equations.

**Gantt position:** Weeks 37–48
**Critical path:** NO (parallel with M3.1)

---

#### M3.4 — Metric Spaces and Topology
**Phase:** 3 | **Duration:** 12 weeks | **Load:** 12 hrs/week
**Prerequisites:** M2.1 (Real Analysis — essential)
**Unlocks:** M4.1 (Measure Theory and Functional Analysis — required)

**Description:** Metric spaces generalise the notion of distance to abstract settings; topology generalises metric spaces further. This is the language used to state results in Analysis, Functional Analysis, and Differential Geometry. Not as hard as it sounds once Real Analysis is solid. Matches Warwick MA222, UoA MATHS 333, MIT 18.100B extension.

**Learning Outcomes:**
1. Define metric spaces; verify the triangle inequality for examples (L¹, L², L∞, discrete).
2. Work with open sets, closed sets, and neighbourhoods in metric spaces.
3. Prove continuity via the open-set definition and compare to ε-δ definition.
4. Define and prove compactness; apply the Heine-Borel Theorem.
5. Define connected and path-connected spaces; give examples and non-examples.
6. Understand complete metric spaces and the Baire Category Theorem.
7. Define topological spaces as a generalisation and identify when a metric is topologically useful.

**Open Source Resources:**
- **Primary (free PDF):** Lebl, J. *Basic Analysis I* (Ch. 7 on metric spaces) — https://www.jirka.org/ra/
- **Free course notes:** MIT OCW 18.S190 Introduction to Metric Spaces — https://ocw.mit.edu/courses/18-s190-introduction-to-metric-spaces-january-iap-2023/
- **Free text:** Waldmann, S. *Topology* (lecture notes, free) — many versions available via arXiv
- **Exercises:** https://wiki.math.ntnu.no/_media/tma4190/ex0top.pdf

**Milestone Checkpoint:** Prove that a closed subset of a compact metric space is compact. Prove the Banach Contraction Mapping Theorem. Show that C[0,1] with the sup norm is complete but not with the L¹ norm.

**Gantt position:** Weeks 37–48
**Critical path:** YES

---

#### M3.5 — Numerical Analysis
**Phase:** 3 | **Duration:** 10 weeks | **Load:** 12 hrs/week
**Prerequisites:** M1.2 (Linear Algebra), M2.3 (ODEs), M1.4 (Python computation)
**Unlocks:** M4.4 (ML Theory — optimisation algorithms)

**Description:** Bridges pure mathematics with computation. All analytical solutions are exact; all computations are approximate. Understanding when and why algorithms fail is critical for anyone using mathematics in practice. Matches MIT 18.335, UoA MATHS 270.

**Learning Outcomes:**
1. Analyse floating-point arithmetic and understand sources of numerical error.
2. Apply and compare iterative solvers for linear systems (Gauss-Seidel, conjugate gradient).
3. Implement polynomial interpolation (Lagrange, Newton) and splines.
4. Compute numerical derivatives and integrals with error bounds.
5. Apply Runge-Kutta methods for ODE initial value problems; analyse stability.
6. Understand the condition number of a matrix and its implications for linear system solving.
7. Implement QR decomposition via Householder reflections.

**Open Source Resources:**
- **Primary (free):** Driscoll & Braun *Fundamentals of Numerical Computation* (Julia, but concepts universal) — https://fncbook.com/
- **Video lectures (free):** MIT OCW 18.335 — https://ocw.mit.edu/courses/18-335j-introduction-to-numerical-methods-spring-2019/
- **Free alternative text:** Burden, Faires, Burden *Numerical Analysis* (many free PDFs online)
- **Python implementations:** https://github.com/luca-heltai/numerical-analysis-2022-2023

**Milestone Checkpoint:** Implement Gaussian elimination with partial pivoting. Implement RK4 and compare to Euler for a stiff ODE. Use SVD to compress an image to rank 10 and plot the error vs. rank curve.

**Gantt position:** Weeks 43–52
**Critical path:** NO

---

### PHASE 4: Synthesis and Specialisation (~8–10 months)

*Goal: Graduate-level integration. Choose your specialisation track (or do both). Each track requires Phase 3 completion.*

---

#### M4.1 — Measure Theory and Functional Analysis
**Phase:** 4 | **Duration:** 16 weeks | **Load:** 15 hrs/week
**Prerequisites:** M2.1 (Real Analysis), M3.4 (Metric Spaces/Topology), M3.1 (Complex Analysis)
**Unlocks:** M4.3 (Stochastic Calculus — Itô theory requires measure-theoretic probability)

**Description:** The rigorous foundation for probability theory, quantum mechanics, and PDE theory. Measure theory replaces the informal notion of "area" with a precise framework. Functional Analysis studies infinite-dimensional vector spaces — the natural setting for PDEs and machine learning theory. This is where self-study reaches true graduate level.

**Learning Outcomes:**
1. Define σ-algebras, measures, and Lebesgue integration; compare with the Riemann integral.
2. Prove the Monotone Convergence Theorem and Dominated Convergence Theorem.
3. Define L^p spaces and prove completeness (Riesz-Fischer Theorem).
4. Work with Banach spaces; prove the Hahn-Banach Theorem and Open Mapping Theorem.
5. Define Hilbert spaces; prove the Riesz Representation Theorem.
6. Understand spectral theory for bounded self-adjoint operators.
7. Connect measure theory to rigorous probability (probability spaces, conditional expectation).

**Open Source Resources:**
- **Primary (free):** Cohn, D. *Measure Theory* lecture notes — https://math.bu.edu/people/dcohn/ (check for free notes)
- **Free text:** Tao, T. *An Introduction to Measure Theory* — https://terrytao.files.wordpress.com/2011/01/measure-book1.pdf
- **Video lectures (free):** MIT OCW 18.125 — https://ocw.mit.edu/courses/18-125-measure-and-integration-fall-2003/
- **Functional Analysis (free):** Young, N. *An Introduction to Hilbert Space* — widely available via libraries; supplemented by free notes

**Milestone Checkpoint:** Construct the Lebesgue integral from scratch. Prove that L²[0,1] is a Hilbert space. Prove the Riesz Representation Theorem. Show a measurable function is the pointwise limit of simple functions.

**Gantt position:** Weeks 49–64
**Critical path:** YES (for M4.3 track)

---

#### M4.2 — Statistical Learning Theory
**Phase:** 4 | **Duration:** 12 weeks | **Load:** 12 hrs/week
**Prerequisites:** M2.4 (Probability/Stats), M3.5 (Numerical Analysis), M1.2 (Linear Algebra)
**Unlocks:** M4.4 (ML Theory)

**Description:** The mathematical foundations of machine learning — the "why" behind the algorithms. Regularisation, the bias-variance tradeoff, kernel methods, and PAC learning. Matches MIT 18.657, Stanford CS229.

**Learning Outcomes:**
1. Formalise supervised learning as empirical risk minimisation.
2. Derive and interpret the bias-variance decomposition.
3. Analyse regularisation (ridge, lasso) through a probabilistic (MAP) lens.
4. Understand kernel methods and the kernel trick geometrically and algebraically.
5. State and apply PAC learning bounds (VC dimension, Rademacher complexity).
6. Implement gradient descent variants and analyse convergence.
7. Understand the mathematical structure of neural networks as function approximators.

**Open Source Resources:**
- **Primary (free):** James et al. *Introduction to Statistical Learning* (with Python) — https://www.statlearning.com/
- **Advanced (free PDF):** Hastie et al. *Elements of Statistical Learning* — https://hastie.su.domains/ElemStatLearn/
- **Free theory text:** Shalev-Shwartz & Ben-David *Understanding Machine Learning* — https://www.cs.huji.ac.il/~shais/UnderstandingMachineLearning/
- **Video lectures (free):** Stanford CS229 — https://cs229.stanford.edu/

**Milestone Checkpoint:** Derive the closed-form solution for ridge regression and show it as MAP estimation with a Gaussian prior. Prove the VC dimension of halfspaces in ℝ^d is d+1. Implement gradient descent with momentum and compare convergence to plain SGD.

**AI Integration:** This is the primary AI module.

**Gantt position:** Weeks 53–64
**Critical path:** NO (parallel with M4.1)

---

#### M4.3 — Stochastic Calculus and Mathematical Finance (Specialisation Track A)
**Phase:** 4 | **Duration:** 14 weeks | **Load:** 15 hrs/week
**Prerequisites:** M4.1 (Measure Theory), M2.3 (ODEs), M3.3 (PDEs)
**Unlocks:** Graduate study in quantitative finance, stochastic analysis

**Description:** The mathematics of random processes evolving in time. Brownian motion, Itô's lemma (the stochastic chain rule), stochastic differential equations, and the Black-Scholes model. This is the frontier of applied mathematics as applied to finance.

**Learning Outcomes:**
1. Define Brownian motion and prove its key properties (nowhere differentiable, quadratic variation).
2. Construct the Itô integral and derive Itô's formula (stochastic chain rule).
3. Solve basic stochastic differential equations (geometric Brownian motion, Ornstein-Uhlenbeck).
4. Derive the Black-Scholes PDE from a replication argument.
5. Understand risk-neutral pricing and martingale measures.
6. Apply Girsanov's theorem for change of measure.
7. Simulate stochastic processes numerically in Python.

**Open Source Resources:**
- **Primary (free problem sets):** MIT OCW 18.S096 — https://ocw.mit.edu/courses/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013/
- **Free lecture notes:** Steele, J.M. *Stochastic Calculus and Financial Applications* — chapter previews free
- **Free intro notes:** Friz, P. Stochastic Calculus lecture notes (search: "Friz stochastic calculus notes PDF" — multiple free versions)
- **Exercises:** https://www.math.purdue.edu/~stindel/teaching/stoch-calc/stoch-calc-problems.pdf

**Milestone Checkpoint:** Derive the Black-Scholes formula from the PDE using a change of variables. Simulate geometric Brownian motion and price a European call option by Monte Carlo. Prove that discounted asset prices are martingales under the risk-neutral measure.

**Gantt position:** Weeks 65–78
**Critical path:** NO

---

#### M4.4 — Machine Learning Theory (Specialisation Track B)
**Phase:** 4 | **Duration:** 12 weeks | **Load:** 12 hrs/week
**Prerequisites:** M4.2 (Statistical Learning), M3.2 (Advanced Linear Algebra), M2.4 (Probability)
**Unlocks:** Graduate study in AI/ML research

**Description:** The theoretical foundations of modern deep learning: universal approximation theorems, optimisation landscape analysis, information theory, and the mathematics of attention mechanisms. Bridges the gap between "using ML tools" and understanding what they actually compute.

**Learning Outcomes:**
1. State and prove (simplified versions of) the Universal Approximation Theorem for neural networks.
2. Analyse optimisation landscapes of neural networks (saddle points, overparameterisation).
3. Understand information-theoretic foundations (entropy, mutual information, the data processing inequality).
4. Analyse attention mechanisms and transformers from a linear algebraic perspective.
5. Apply concentration inequalities (Markov, Chebyshev, Hoeffding) to generalisation bounds.
6. Understand the Neural Tangent Kernel and infinite-width networks.

**Open Source Resources:**
- **Primary (free):** Tishby, N. & colleagues, Information Bottleneck theory papers — https://arxiv.org/abs/1503.02406
- **Free book:** *Mathematics for Machine Learning* — https://mml-book.github.io/
- **Free lectures:** MIT 6.S898 Deep Learning Theory — https://people.csail.mit.edu/madry/6.S898/
- **Concentration inequalities (free):** Wainwright, M. *High-Dimensional Statistics* — intro chapters

**Milestone Checkpoint:** Prove that a two-layer network with sigmoid activations can approximate any continuous function on [0,1]^d. Derive the gradient of the cross-entropy loss for a softmax classifier. Implement a transformer attention mechanism from scratch in Python and verify the output dimensions.

**Gantt position:** Weeks 65–76

---

## Dependency Tree

```
NCEA Level 3
    │
    ▼
M0.1 Logic & Proofs ──────────────────────────┐
    │                                          │
    ├──→ M1.1 Single Variable Calculus         │
    │        │                                 │
    │        ├──→ M1.3 Multivariable Calc      │
    │        │        │                        │
    │        │        ├──→ M2.4 Probability    │
    │        │        └──→ M3.3 PDEs ──────────┼─→ M4.3 Stochastic Calc
    │        │                                 │
    │        └──→ M2.3 ODEs ──────────────────┤
    │                                          │
    └──→ M2.1 Real Analysis ◄─────────────────┘
             │
             ├──→ M3.1 Complex Analysis ──────→ M4.1 Measure Theory
             │                                        │
             └──→ M3.4 Metric Spaces ────────────────→ M4.3
    
M1.2 Linear Algebra (concurrent with M1.1)
    │
    ├──→ M2.2 Abstract Algebra
    ├──→ M2.3 ODEs (system methods)
    ├──→ M3.2 Advanced Linear Algebra ────────→ M4.4 ML Theory
    └──→ M3.5 Numerical Analysis

M2.4 Probability + M3.5 Numerical ──────────→ M4.2 Statistical Learning
                                                     │
                                                     └──→ M4.4 ML Theory

M1.4 Python Computation (runs throughout, supports all modules)
```

---

## Gantt Chart

> Each column = 4 weeks. Total programme = ~88 weeks (~22 months with aggressive parallel study; ~36 months at a sustainable pace).

| Module | W1–4 | W5–8 | W9–12 | W13–16 | W17–20 | W21–24 | W25–28 | W29–32 | W33–36 | W37–40 | W41–44 | W45–48 | W49–52 | W53–56 | W57–60 | W61–64 | W65–68 | W69–72 | W73–76 | W77–80 | W81–84 | W85–88 |
|--------|------|------|-------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|
| **M0.1** Proofs | ████ | ████ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **M1.1** Single Var Calc | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **M1.2** Linear Algebra | — | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **M1.3** Multivariable Calc | — | — | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **M1.4** Python/Computation | ▒▒▒▒ | ▒▒▒▒ | ▒▒▒▒ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **M2.1** Real Analysis | — | — | — | — | — | ████ | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **M2.2** Abstract Algebra | — | — | — | — | — | ████ | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **M2.3** ODEs | — | — | — | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| **M2.4** Probability | — | — | — | — | — | — | — | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — | — | — | — |
| **M3.1** Complex Analysis | — | — | — | — | — | — | — | — | — | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — | — |
| **M3.2** Advanced Lin Alg | — | — | — | — | — | — | — | — | — | — | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — |
| **M3.3** PDEs | — | — | — | — | — | — | — | — | — | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — | — |
| **M3.4** Metric Spaces/Topo | — | — | — | — | — | — | — | — | — | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — | — |
| **M3.5** Numerical Analysis | — | — | — | — | — | — | — | — | — | — | ████ | ████ | ████ | — | — | — | — | — | — | — | — | — |
| **M4.1** Measure Theory | — | — | — | — | — | — | — | — | — | — | — | — | ████ | ████ | ████ | ████ | — | — | — | — | — | — |
| **M4.2** Statistical Learning | — | — | — | — | — | — | — | — | — | — | — | — | — | ████ | ████ | ████ | — | — | — | — | — | — |
| **M4.3** Stochastic Calc *(A)* | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | ████ | ████ | ████ | ████ | — | — |
| **M4.4** ML Theory *(B)* | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | ████ | ████ | ████ | — | — | — |

> ████ = Active. ▒▒▒▒ = Light/parallel (half load). — = Not yet started.

---

## Critical Path Analysis

The **critical path** is the longest sequence of dependent modules — the minimum time to reach graduate level assuming you could parallelise everything else optimally.

```
Critical Path (Pure Analysis → Measure Theory):

M0.1 (6 wks) → M1.1 (10 wks) → M1.3 (10 wks) → M2.1 (16 wks)
→ M3.4 (12 wks) → M4.1 (16 wks) → M4.3 (14 wks)

Total critical path length: 84 weeks = ~21 months
```

```
Critical Path (Applied → ML):

M0.1 (6 wks) → M1.1 (10 wks) → M1.3 (10 wks) → M2.4 (12 wks)
→ M4.2 (12 wks) → M4.4 (12 wks)

Total: 62 weeks = ~15 months (runs parallel to the pure path)
```

**Bottleneck modules** (on the critical path, cannot be skipped or reordered):
1. M0.1 — Logic and Proofs
2. M1.1 — Single Variable Calculus
3. M1.3 — Multivariable Calculus
4. M2.1 — Real Analysis *(hardest and longest)*
5. M3.4 — Metric Spaces/Topology
6. M4.1 — Measure Theory

**Safe to delay** (important but not on the critical path):
- M1.2 Linear Algebra (start Week 5, not Week 1 — but don't delay further)
- M2.2 Abstract Algebra (can start any time after M0.1 + M1.2)
- M3.5 Numerical Analysis (can sit between Phase 2 and Phase 4)
- M4.3/M4.4 (specialisation — choose one or both)

---

## Suggested Weekly Rhythm

A sustainable **15 hrs/week** structure when working on one primary + one secondary module:

| Day | Activity | Time |
|-----|----------|------|
| Mon | Primary module: read new section (textbook) | 2 hrs |
| Tue | Primary module: work exercises from reading | 2 hrs |
| Wed | Secondary module: lecture video or notes | 1.5 hrs |
| Thu | Primary module: harder problems / proof writing | 2 hrs |
| Fri | Secondary module: exercises | 1.5 hrs |
| Sat | Primary module: review week, attempt milestone problem | 3 hrs |
| Sun | Rest or light reading (history of math, recreational problems) | 1 hr |

**When stuck on a proof:** write down exactly what you know, what you need to show, and where you're stuck. Leave it for 24 hours. Return to it. If still stuck after 3 attempts over 3 days, look at a solution — but write your own version from scratch.

---

## Total Open Source Resource Index

### Free Textbooks (PDF)
| Book | Author | Module | URL |
|------|--------|--------|-----|
| Book of Proof (3rd ed.) | Hammack | M0.1 | https://www.people.vcu.edu/~rhammack/BookOfProof/ |
| Calculus Vols 1–3 | OpenStax | M1.1, M1.3 | https://openstax.org/subjects/math |
| Gilbert Strang's Calculus | Strang | M1.1 | https://ocw.mit.edu/resources/res-18-001-calculus-online-textbook-spring-2005/ |
| Linear Algebra (UCD) | Cherney et al. | M1.2 | https://www.math.ucdavis.edu/~linear/linear-guest.pdf |
| Linear Algebra Done Right (4th ed.) | Axler | M3.2 | https://linear.axler.net/ |
| Basic Analysis I | Lebl | M2.1, M3.4 | https://www.jirka.org/ra/ |
| Introduction to Real Analysis | Trench | M2.1 | https://digitalcommons.trinity.edu/mono/7/ |
| Abstract Algebra: Theory and Applications | Judson | M2.2 | http://abstract.ups.edu/ |
| Notes on Diffy Qs | Lebl | M2.3, M3.3 | https://www.jirka.org/diffyqs/ |
| Elementary Differential Equations | Trench | M2.3 | https://digitalcommons.trinity.edu/mono/8/ |
| Introduction to Probability | Blitzstein & Hwang | M2.4 | https://drive.google.com/file/d/1VmkAAGOYCTORq1wxSQqy255qLJjTNvBI/view |
| Introduction to Probability (Grinstead) | Grinstead & Snell | M2.4 | https://www.dartmouth.edu/~chance/teaching_aids/books_articles/probability_book/amsbook.mac.pdf |
| Complex Analysis (Lebl) | Lebl | M3.1 | https://www.jirka.org/ca/ |
| Measure Theory | Tao | M4.1 | https://terrytao.files.wordpress.com/2011/01/measure-book1.pdf |
| Introduction to Statistical Learning | James et al. | M4.2 | https://www.statlearning.com/ |
| Elements of Statistical Learning | Hastie et al. | M4.2 | https://hastie.su.domains/ElemStatLearn/ |
| Understanding Machine Learning | Shalev-Shwartz | M4.2, M4.4 | https://www.cs.huji.ac.il/~shais/UnderstandingMachineLearning/ |
| Mathematics for Machine Learning | Deisenroth et al. | M4.4 | https://mml-book.github.io/ |
| Fundamentals of Numerical Computation | Driscoll & Braun | M3.5 | https://fncbook.com/ |

### Free Video Lecture Series (MIT OCW and others)
| Course | Institution | Module | URL |
|--------|-------------|--------|-----|
| 18.01SC Single Variable Calculus | MIT | M1.1 | https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/ |
| 18.02SC Multivariable Calculus | MIT | M1.3 | https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/ |
| 18.06SC Linear Algebra | MIT | M1.2 | https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/ |
| 18.03SC Differential Equations | MIT | M2.3 | https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/ |
| 18.100A Real Analysis | MIT | M2.1 | https://ocw.mit.edu/courses/18-100a-real-analysis-fall-2020/ |
| 18.701 Algebra I | MIT | M2.2 | https://ocw.mit.edu/courses/18-701-algebra-i-fall-2010/ |
| 18.702 Algebra II | MIT | M2.2 | https://ocw.mit.edu/courses/18-702-algebra-ii-spring-2011/ |
| 18.04 Complex Variables | MIT | M3.1 | https://ocw.mit.edu/courses/18-04-complex-variables-with-applications-spring-2018/ |
| 18.700 Linear Algebra | MIT | M3.2 | https://ocw.mit.edu/courses/18-700-linear-algebra-fall-2013/ |
| 18.303 Linear PDEs | MIT | M3.3 | https://ocw.mit.edu/courses/18-303-linear-partial-differential-equations-fall-2006/ |
| 18.S190 Intro to Metric Spaces | MIT | M3.4 | https://ocw.mit.edu/courses/18-s190-introduction-to-metric-spaces-january-iap-2023/ |
| 18.335 Numerical Methods | MIT | M3.5 | https://ocw.mit.edu/courses/18-335j-introduction-to-numerical-methods-spring-2019/ |
| 18.125 Measure and Integration | MIT | M4.1 | https://ocw.mit.edu/courses/18-125-measure-and-integration-fall-2003/ |
| 18.S096 Math for Finance | MIT | M4.3 | https://ocw.mit.edu/courses/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013/ |
| Stat 110 Probability | Harvard | M2.4 | https://projects.iq.harvard.edu/stat110/home |
| CS229 Machine Learning | Stanford | M4.2 | https://cs229.stanford.edu/ |
| Essence of Linear Algebra | 3Blue1Brown | M1.2 | https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab |
| Complex Analysis (visual) | Complex Analysis Guide | M3.1 | https://complex-analysis.com/ |

---

## AI Integration Points

These are the modules where integrating an AI assistant (e.g., Claude) adds most value:

| Module | AI Use Case |
|--------|-------------|
| M0.1 Proofs | Proof checking: paste a proof draft and ask for logical gaps |
| M2.1 Real Analysis | ε-δ proof feedback: ask AI to verify or critique your epsilon-delta arguments |
| M2.2 Abstract Algebra | Counterexample generation: ask for concrete examples of abstract definitions |
| M3.1 Complex Analysis | Visualisation prompts: ask AI to generate Python code to plot complex mappings |
| M3.5 Numerical Analysis | Error analysis: ask AI to explain why a specific numerical scheme is unstable |
| M4.2 Statistical Learning | Model comparison: ask AI to explain the tradeoffs between specific algorithms |
| M4.4 ML Theory | Paper reading: use AI to summarise or explain key theoretical ML papers |

**Suggested AI workflow per module:**
1. Read the text yourself first — do not use AI as a first resort.
2. Attempt every problem set question independently.
3. After attempting (even if stuck), describe your attempt to AI and ask what's missing.
4. Ask AI to generate similar problems at the same difficulty level.
5. Ask AI to explain *why* a key theorem matters — what breaks without it?

---

## Milestones by Phase

### Phase 1 Exit Criteria (Week ~20)
- [ ] Compute and interpret the SVD of a 3×4 matrix
- [ ] Evaluate a double integral by changing to polar coordinates
- [ ] Prove that a power series converges uniformly on a closed sub-interval of its radius of convergence
- [ ] Write a Python notebook that solves Ax = b numerically and plots the error vs. condition number

### Phase 2 Exit Criteria (Week ~38)
- [ ] Give an ε-δ proof that x² is continuous at x = √2
- [ ] State and prove the Bolzano-Weierstrass Theorem
- [ ] Find all subgroups of S₄ and determine which are normal
- [ ] Solve a system of 3 coupled ODEs using matrix exponentials
- [ ] Derive the distribution of the maximum of n iid Uniform[0,1] random variables

### Phase 3 Exit Criteria (Week ~52)
- [ ] Evaluate ∫_{-∞}^∞ cos(x)/(1+x²) dx using the Residue Theorem
- [ ] Prove the Banach Contraction Mapping Theorem and give an application
- [ ] Solve the heat equation on [0,π] with u(0,t) = u(π,t) = 0 and u(x,0) = sin(x)
- [ ] Implement Gaussian quadrature in Python and compare to the exact result
- [ ] Prove that C[0,1] with the sup norm is a Banach space

### Phase 4 Exit Criteria (Week ~80)
- [ ] Construct the Lebesgue integral and prove the Dominated Convergence Theorem
- [ ] Derive the Black-Scholes formula starting from geometric Brownian motion
- [ ] Prove a generalisation bound using Rademacher complexity
- [ ] Implement a transformer attention layer from scratch and test on a toy sequence task

---

## Notes for the Website Implementation

**Suggested data structure (per module, parseable for frontend):**
```json
{
  "id": "M2.1",
  "name": "Real Analysis",
  "phase": 2,
  "duration_weeks": 16,
  "load_hrs_week": 15,
  "prerequisites": ["M0.1", "M1.1"],
  "unlocks": ["M3.1", "M3.4", "M4.1"],
  "critical_path": true,
  "gantt_start_week": 21,
  "gantt_end_week": 36,
  "resources": [
    {"type": "text", "title": "Basic Analysis I", "author": "Lebl", "url": "https://www.jirka.org/ra/", "free": true},
    {"type": "video", "title": "MIT OCW 18.100A", "url": "https://ocw.mit.edu/courses/18-100a-real-analysis-fall-2020/", "free": true}
  ],
  "learning_outcomes": [7],
  "milestone": "Prove Bolzano-Weierstrass. Give ε-δ proof of continuity.",
  "ai_integration": "Proof checking and counterexample generation"
}
```

**Recommended website features:**
- **Dependency tree view:** Force-directed graph (D3.js or Cytoscape.js) showing module prerequisites. Node colour = phase, thickness = critical path.
- **Gantt chart view:** Horizontal bar chart by week; modules grouped by phase; critical path highlighted.
- **Module detail pages:** Description, LOs, resources table, milestone checklist, progress tracking.
- **Progress tracker:** Checkbox per LO; milestone checkbox unlocks next module in the tree.
- **AI chat integration:** Per-module Claude API call with module context pre-loaded in system prompt.
- **Resource library:** Filterable table of all free texts and videos, sortable by module/phase/type.
