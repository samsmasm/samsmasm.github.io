# **Comprehensive Curricular Roadmap for Undergraduate Mathematics: A Pedagogical Transition from NCEA Level 3 to Advanced Synthesis in AI and Financial Engineering**

The structural evolution of a mathematical mind requires a deliberate transition from the procedural fluency characterized by secondary education to the abstract rigor of university-level inquiry. For students originating from an NCEA Level 3 baseline—the Year 13 standard in New Zealand—the initial challenge lies in shifting the cognitive focus from the pursuit of numerical solutions to the exploration of underlying mathematical structures.1 This report details a four-phase roadmap designed to mirror the rigorous 3-to-4-year progression found in premier Commonwealth institutions, specifically prioritizing a pure mathematical core that serves as the essential theoretical scaffolding for complex applications in artificial intelligence, stochastic finance, and numerical computation.2

## **Phase 1: The Transition and Foundations of Structural Mathematics**

The foundational phase serves as a bridge between the "calculating" mindset of NCEA Level 3 and the "proving" mindset required for higher mathematics. In the New Zealand context, students entering university typically possess a strong grasp of differentiation and integration techniques but may lack the formal logical framework and the high-dimensional geometric intuition necessary for advanced study.2 Phase 1 addresses these gaps through three primary threads: Multivariable Calculus, Linear Algebra, and an Introduction to Proofs and Logic.

### **Thread 1: Multivariable Calculus and Vector Calculus**

Multivariable calculus represents the natural extension of single-variable calculus into ![][image1]\-dimensional space, primarily ![][image2] and ![][image3]. While NCEA Level 3 focuses on the behavior of functions ![][image4], this thread introduces functions of several variables, where the conceptual hurdle involves visualizing surfaces and vector fields.6 The mastery of these tools is a prerequisite for understanding loss functions in machine learning and the spatial dynamics of physical systems.9

| Key Topics and Milestones | Specific Learning Outcomes | Best Practice Resources & Exercise Links |
| :---- | :---- | :---- |
| Vectors and the Geometry of Space | Calculate dot and cross products; determine equations of lines and planes in 3D; visualize quadric surfaces. 11 | OpenStax Calculus Vol 3: [Chapter 2 Exercises](https://openstax.org/books/calculus-volume-3/pages/2-exercises) |
| Vector-Valued Functions | Differentiate and integrate vector functions ![][image5]; compute arc length, curvature, and the TNB frame. 12 | OpenStax Calculus Vol 3: [Chapter 3 Exercises](https://openstax.org/books/calculus-volume-3/pages/3-exercises) |
| Partial Differentiation | Master the multivariable Chain Rule; compute gradients and directional derivatives; find local/global extrema. 7 | LibreTexts Calculus Exercises:(https://math.libretexts.org/Bookshelves/Calculus/Exercises\_(Calculus)/Exercises%3A\_Calculus\_(OpenStax)) |
| Multiple Integration | Evaluate double and triple integrals in rectangular, polar, cylindrical, and spherical coordinate systems. 7 | OpenStax Calculus Vol 3: [Chapter 5 Exercises](https://openstax.org/books/calculus-volume-3/pages/5-exercises) |
| Vector Calculus and Field Theory | Apply Green's Theorem, Stokes' Theorem, and the Divergence Theorem to solve line and surface integrals. 7 | OpenStax Calculus Vol 3: [Chapter 6 Exercises](https://openstax.org/books/calculus-volume-3/pages/6-exercises) |

The gradient vector ![][image6] provides a profound second-order insight: it represents the direction of steepest ascent on a scalar field, a concept that underpins the gradient descent algorithms utilized in training neural networks.9 Furthermore, the Divergence Theorem relates the flux of a vector field through a closed surface to the behavior of the field inside the volume, providing a critical link between local and global properties of physical systems.7  
**Checkpoint Problem (Multivariable Calculus):** Evaluate the double integral ![][image7] by reversing the order of integration. This tests the ability to visualize integration regions and apply transformation techniques beyond rote calculation.6

### **Thread 2: Linear Algebra as the Engine of Artificial Intelligence**

Linear algebra is the foundational language of modern data science. It shifts the focus from individual variables to systems and transformations, allowing for the manipulation of high-dimensional data as single entities (vectors and matrices).13 The pedagogical gold standard for this subject is the "Four Fundamental Subspaces" approach developed by Professor Gilbert Strang at MIT.13

| Key Topics and Milestones | Specific Learning Outcomes | Best Practice Resources & Exercise Links |
| :---- | :---- | :---- |
| Systems of Linear Equations | Solve ![][image8] using Gaussian elimination and ![][image9] decomposition; understand matrix inversion. 13 | MIT OCW 18.06:([https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/)) |
| Vector Spaces and Subspaces | Define basis and dimension; identify the Column Space ![][image10] and Nullspace ![][image11]. 13 | MIT OCW 18.06:([https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/)) |
| Orthogonality and Projections | Apply the Gram-Schmidt process; solve least-squares problems for overdetermined systems. 13 | MIT OCW 18.06:([https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/)) |
| Eigen-Analysis | Compute eigenvalues and eigenvectors; diagonalize symmetric and positive definite matrices. 13 | MIT OCW 18.06:([https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/)) |
| Singular Value Decomposition | Perform SVD for dimensionality reduction and understand its geometric interpretation. 13 | MIT OCW 18.06:([https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/)) |

A deep understanding of the Nullspace ![][image11] reveals the "hidden" dimensions that are mapped to zero by a transformation, an essential insight when performing feature selection in machine learning.13 The Singular Value Decomposition (SVD) further allows for the optimal low-rank approximation of a matrix, which is the mathematical basis for image compression and latent semantic analysis.13  
**Checkpoint Problem (Linear Algebra):** Given a matrix ![][image12], find a basis for its Column Space ![][image10] and its Nullspace ![][image11], and verify the Rank-Nullity Theorem. This tests the grasp of matrix structure and the fundamental relationship between dimensions of transformations.13

### **Thread 3: Introduction to Proofs and Logical Foundations**

This thread represents the most significant departure from secondary school mathematics. Its purpose is to initiate the student into the "esoteric world" of mathematical verification.2 Richard Hammack’s "Book of Proof" is specifically designed to facilitate this transition, moving from computational fluency to abstract reasoning.1

| Key Topics and Milestones | Specific Learning Outcomes | Best Practice Resources & Exercise Links |
| :---- | :---- | :---- |
| Fundamentals of Set Theory | Master set operations, power sets, and Cartesian products; understand set cardinality. 18 | Book of Proof: [Chapter 1 Exercises](https://www.people.vcu.edu/~rhammack/BookOfProof/index.html) |
| Propositional and Predicate Logic | Construct truth tables; evaluate logical equivalence; use quantifiers ![][image13] and ![][image14] correctly. 18 | Book of Proof: [Chapter 2 Exercises](https://www.people.vcu.edu/~rhammack/BookOfProof/index.html) |
| Direct and Contrapositive Proof | Prove conditional statements using deductive reasoning and contraposition. 20 | Book of Proof: [Chapter 4 & 5 Exercises](https://www.people.vcu.edu/~rhammack/BookOfProof/index.html) |
| Proof by Contradiction | Assume the negation of a statement to derive a logical impossibility. 20 | Book of Proof: [Chapter 6 Exercises](https://www.people.vcu.edu/~rhammack/BookOfProof/index.html) |
| Mathematical Induction | Apply weak and strong induction to prove statements about all natural numbers. 1 | Book of Proof: [Chapter 10 Exercises](https://www.people.vcu.edu/~rhammack/BookOfProof/index.html) |

Learning to negate a quantified statement—such as "Every prime number is odd"—is a vital skill that prevents logical fallacies in more advanced courses like Real Analysis.20 The concept of infinite cardinality, where ![][image15] but ![][image16], introduces the student to the counter-intuitive nature of the mathematical universe.1  
**Checkpoint Problem (Proofs):** Use proof by contradiction to show that ![][image17] is irrational. This classic problem requires the student to integrate logic, number theory, and formal writing conventions.20

## **Phase 2: The Core and the Pursuit of Mathematical Rigor**

In Phase 2, the curriculum pivots from using tools to justifying them. This stage is characterized by the study of Real Analysis and Abstract Algebra, which provide the formal proof-based foundations for the calculus and algebraic systems explored in Phase 1\.2

### **Thread 1: Real Analysis and the Formalization of the Limit**

Real Analysis is often cited as the "make or break" course for math majors.3 It replaces the intuitive notion of "getting close to a value" with the rigorous ![][image18] definition of a limit.4 Stephen Abbott’s "Understanding Analysis" is highly regarded for its focus on the "why" and its use of historical paradoxes to motivate the need for rigor.3  
The curriculum begins with the properties of the real number system, specifically the Completeness Axiom, which ensures that there are no "gaps" in the real line.4 This leads to the study of sequences, series, and the topology of ![][image19], including compactness and the Heine-Borel Theorem.4

| Topic Cluster | Theoretical Objective | Exercise Focus |
| :---- | :---- | :---- |
| Sequences and Series | Establish criteria for convergence; understand Cauchy sequences and the Bolzano-Weierstrass Theorem. 4 | Proving convergence of specific sequences using the ![][image20] definition. 4 |
| Continuity and Limits | Formalize functional limits; prove the Intermediate Value Theorem and the Extreme Value Theorem. 4 | Investigating the continuity of "pathological" functions like Dirichlet's function. 4 |
| Differentiation and Integration | Prove the Mean Value Theorem; define the Riemann integral through Darboux sums. 4 | Using the definition of the integral to prove the Fundamental Theorem of Calculus. 4 |

The second-order insight generated in analysis is the realization that continuity does not imply differentiability. The existence of functions that are continuous everywhere but differentiable nowhere (e.g., the Weierstrass function) underscores the necessity of formal definitions over visual intuition.4

### **Thread 2: Abstract Algebra and Universal Structures**

Abstract Algebra investigates the properties of mathematical operations by abstracting them from specific number systems to general structures: Groups, Rings, and Fields.8 Thomas Judson’s "Abstract Algebra: Theory and Applications" provides a best-practice framework that balances theoretical depth with applications in cryptography and coding theory.23

| Structure Type | Defining Properties | Exercise Focus |
| :---- | :---- | :---- |
| Groups | Sets under a single operation satisfying identity, inverse, and associativity. 23 | Finding subgroups, cyclic groups, and applying Lagrange’s Theorem. 23 |
| Rings and Ideals | Structures with two operations (addition/multiplication); study of quotient rings and homomorphisms. 23 | Verifying if a given set is an integral domain or a division ring. 23 |
| Field Theory | Exploration of field extensions and the basics of Galois theory. 23 | Calculating the degree of field extensions and identifying irreducible polynomials. 23 |

The study of Isomorphism Theorems provides a profound third-order insight: it allows mathematicians to identify when two seemingly different structures are functionally identical.23 This concept is crucial in computer science for understanding how data representations preserve or lose essential relational information.

### **Thread 3: Probability and Mathematical Statistics**

Moving beyond "descriptive statistics," this thread uses calculus to define the underlying mechanics of uncertainty.8 The curriculum explores probability spaces, random variables, and the rigorous derivation of distribution properties.29  
The pedagogical focus is on the Central Limit Theorem (CLT), which states that the sum of independent, identically distributed variables tends toward a normal distribution, regardless of the original distribution.9 This provides the theoretical justification for statistical inference and hypothesis testing.9

| Concept | Mathematical Mechanism | Application Context |
| :---- | :---- | :---- |
| Random Variables | Probability Density Functions (PDF) and Cumulative Distribution Functions (CDF). 29 | Modeling continuous and discrete phenomena in data science. 9 |
| Expectation and Variance | Derived via integration over probability spaces. 29 | Calculating risk and expected returns in finance. 32 |
| Statistical Inference | Maximum Likelihood Estimation (MLE) and Bayesian updating. 29 | Training machine learning models to maximize the likelihood of observed data. 9 |

A key insight here is the move from frequentist probability (long-term averages) to Bayesian probability (updating degrees of belief), which forms the mathematical basis for "learning" in modern AI architectures.10

## **Phase 3: Specialization and Mastery of Complex Systems**

Phase 3 utilizes the rigorous foundations of Phase 2 to explore specialized areas of mathematics that are essential for high-level research and engineering.34

### **Thread 1: Complex Analysis and the Beauty of Analyticity**

Complex Analysis studies functions of complex variables. Because complex differentiability is a much more restrictive condition than real differentiability, complex functions exhibit remarkable properties not found in real analysis.34 Russell Howell’s "Complex Analysis: An Open Source Textbook" is the recommended guide for this "beautiful" area of mathematics.34

| Milestone | Theoretical Significance | Practical Outcome |
| :---- | :---- | :---- |
| Analytic Functions | Satisfy the Cauchy-Riemann equations. 38 | Functions are infinitely differentiable and equal to their Taylor series. 38 |
| Cauchy’s Integral Formula | Relates values of a function on a boundary to its values inside. 38 | Allows for the exact calculation of integrals through local information. 38 |
| Residue Theorem | Provides a technique for evaluating difficult real integrals. 34 | Essential for frequency domain analysis in engineering and physics. 34 |

The insight generated in this thread is that the behavior of an analytic function is entirely determined by its values on any closed curve that encloses its domain.38 This "global" property arising from "local" differentiability is a central theme in modern geometry and physics.

### **Thread 2: Differential Equations as the Language of Dynamics**

Differential Equations (DEs) model systems that change over time.35 Jiří Lebl’s "Notes on Diffy Qs" provides a comprehensive curriculum that covers both Ordinary Differential Equations (ODEs) and the transition to Partial Differential Equations (PDEs).35

| Topic | Modeling Objective | Exercise Link |
| :---- | :---- | :---- |
| Systems of Linear ODEs | Model interconnected components; use matrix exponentials. 35 | ([https://web.uvic.ca/\~tbazett/diffyqsold/diffyqs.html](https://web.uvic.ca/~tbazett/diffyqsold/diffyqs.html)) |
| Fourier Series and PDEs | Solve boundary value problems like the Heat and Wave equations. 35 | ([https://web.uvic.ca/\~tbazett/diffyqsold/diffyqs.html](https://web.uvic.ca/~tbazett/diffyqsold/diffyqs.html)) |
| Laplace Transforms | Convert differential operators into algebraic ones for easier solving. 35 | ([https://web.uvic.ca/\~tbazett/diffyqsold/diffyqs.html](https://web.uvic.ca/~tbazett/diffyqsold/diffyqs.html)) |

A profound insight in this field is the concept of stability: determining if a system returns to equilibrium after a perturbation.35 This is the mathematical foundation for both engineering control systems and the modeling of financial market volatility.35

### **Thread 3: Topology and the Geometry of High-Dimensional Data**

Topology is the study of properties preserved under continuous deformations—often called "rubber-sheet geometry".36 It abstracts the notion of "nearness" and "continuity" to general spaces.36 While James Munkres’ "Topology" is the standard text, open-source resources like MIT OCW provide the necessary exercise sets to master the point-set basics.15

| Concept | Definition / Learning Outcome | Exercise Focus |
| :---- | :---- | :---- |
| Metric Spaces | Sets with a defined "distance" function ![][image21]. 46 | Proving the triangle inequality for various metric functions. 46 |
| Topological Spaces | Defined via a collection of "open sets" satisfying specific axioms. 45 | Identifying whether a given collection of subsets forms a topology. 45 |
| Compactness | A generalization of "finite" or "closed and bounded." 36 | Using the Heine-Borel Theorem to prove function properties. 48 |
| Homeomorphism | A continuous bijection with a continuous inverse. 46 | Showing that a donut and a coffee cup are topologically equivalent. 46 |

The emerging specialization of Topological Data Analysis (TDA) applies these pure concepts to identify the "shape" of data in AI, allowing researchers to find persistent structures in high-dimensional noise.49 This demonstrates how the most abstract branches of pure math eventually find utility in the most modern applied fields.

## **Phase 4: The Synthesis of Pure Core and Applied Mastery**

The final phase represents the culmination of the self-study journey, where the rigor of Phases 2 and 3 is applied to solve complex problems in Artificial Intelligence, Finance, and Computation.43

### **Thread 1: Statistical Learning and AI Theory**

AI theory is the synthesis of multivariable optimization, linear algebra, and probability.10 The curriculum focuses on the mathematical justification of learning algorithms.9

| AI Concept | Mathematical Foundation | Exercise Focus |
| :---- | :---- | :---- |
| Backpropagation | Multivariable Chain Rule \+ Matrix Calculus. 9 | Deriving the gradient of a loss function through network layers. 9 |
| Bias-Variance Tradeoff | Probability Theory \+ Functional Analysis. 10 | Analyzing the error decomposition of a regression model. 9 |
| Kernel Methods | Hilbert Spaces \+ Optimization Theory. 9 | Using the "kernel trick" to perform linear separation in high dimensions. 9 |

The deep insight here is that neural networks are essentially high-dimensional non-linear curve fitting tools. The "learning" is an optimization problem solved through the gradient descent principles mastered in Phase 1\.9

### **Thread 2: Financial Mathematics and Stochastic Calculus**

Financial Mathematics models the behavior of markets under uncertainty.32 It relies heavily on Stochastic Calculus, which extends the calculus of Phase 1 to random processes (Brownian motion).31

| Finance Topic | Core Mathematical Tool | Key Result |
| :---- | :---- | :---- |
| Option Pricing | Black-Scholes PDE. 43 | The fair value of an option based on underlying volatility. 43 |
| Stochastic Integration | Itô’s Lemma. 43 | The stochastic equivalent of the Chain Rule for random processes. 43 |
| Risk-Neutral Pricing | Martingale Theory \+ Measure Change. 43 | Pricing derivatives without assuming specific return rates. 43 |

The synthesis involves applying the PDE solving techniques of Phase 3 to equations where the "time" variable is influenced by random noise.43 This is the mathematical bridge to high-frequency trading and quantitative risk management.

### **Thread 3: Numerical Analysis and the Reality of Computation**

Numerical Analysis is the study of how to compute the "unsolvable".51 While Phases 2 and 3 focus on exact proofs, this thread focuses on stable, efficient algorithms for approximating those results.51

| Computing Task | Numerical Algorithm | Error Analysis |
| :---- | :---- | :---- |
| Large Linear Systems | LU/QR Decomposition & Iterative Solvers. 51 | Analyzing the condition number of a matrix. 49 |
| Solving ODEs/PDEs | Runge-Kutta & Finite Difference Methods. 51 | Ensuring the convergence of discrete approximations. 51 |
| Optimization | Stochastic Gradient Descent (SGD). 9 | Managing computational complexity for large data sets. 9 |

A critical insight in numerical analysis is that infinite-precision math does not exist in a computer. Understanding floating-point arithmetic and stability is the difference between a model that works in theory and one that crashes in production.51

## **Strategic Roadmap and Conclusion**

The transition from an NCEA Level 3 baseline to undergraduate mastery is a 4-phase journey from computation to synthesis. By grounding applied subjects like AI and Finance in a rigorous "Pure Core," the student builds a mental framework that is resilient to technological shifts.1

| Phase | Goal | Primary Outcome |
| :---- | :---- | :---- |
| Phase 1: Foundations | Structural Literacy | Fluency in Multivariable Calculus, Linear Algebra, and Logic. 2 |
| Phase 2: Rigor | Theoretical Integrity | Ability to prove fundamental results in Analysis and Algebra. 4 |
| Phase 3: Specialization | Advanced Modeling | Mastery of Complex Functions, Differential Equations, and Topology. 34 |
| Phase 4: Synthesis | Applied Innovation | Solving real-world problems in AI, Finance, and Computation. 43 |

This curriculum emphasizes the use of open-source, exercise-heavy materials to encourage active learning.6 By treating mathematics as a cohesive structure rather than a list of disparate topics, the student develops the nuanced understanding required to innovate at the frontiers of modern science and technology.1 The true "Best Practice" in mathematical education is the relentless pursuit of "why," ensuring that every calculated answer is supported by a robust structural proof.2

#### **Works cited**

1. Book of Proof by Richard Hammack | Goodreads, accessed on May 10, 2026, [https://www.goodreads.com/en/book/show/18060393-book-of-proof](https://www.goodreads.com/en/book/show/18060393-book-of-proof)  
2. This text provides an overview of the book "Book of Proof", which serves as an introduction to mathematical proof and language. It bridges computational courses like calculus to a more abstract outlook, laying a foundation for theoretical courses such as topology and analysis. The topics covered include sets, logic, relations, functions, and calculus \- Webflow, accessed on May 10, 2026, [https://uploads-ssl.webflow.com/6723af51326a4e144ce9ece8/6843154fe62d1b040318dd0b\_3128849169.pdf](https://uploads-ssl.webflow.com/6723af51326a4e144ce9ece8/6843154fe62d1b040318dd0b_3128849169.pdf)  
3. Ask HN: Resources to learn real analysis? \- Hacker News, accessed on May 10, 2026, [https://news.ycombinator.com/item?id=16667099](https://news.ycombinator.com/item?id=16667099)  
4. Stephen Abbott \- Understanding Analysis \- National Academic Digital Library of Ethiopia, accessed on May 10, 2026, [http://ndl.ethernet.edu.et/bitstream/123456789/88631/1/2015\_Book\_UnderstandingAnalysis.pdf](http://ndl.ethernet.edu.et/bitstream/123456789/88631/1/2015_Book_UnderstandingAnalysis.pdf)  
5. Anyone know of any self learning books for multivariable calculus that focuses on the conceptual parts of calculus and includes demanding practice problems. Conceptual stuff as in Greene's theorem, legranges multiplier. : r/learnmath \- Reddit, accessed on May 10, 2026, [https://www.reddit.com/r/learnmath/comments/v2aj6m/anyone\_know\_of\_any\_self\_learning\_books\_for/](https://www.reddit.com/r/learnmath/comments/v2aj6m/anyone_know_of_any_self_learning_books_for/)  
6. Answer Key Chapter 1 \- Calculus Volume 3 | OpenStax, accessed on May 10, 2026, [https://openstax.org/books/calculus-volume-3/pages/chapter-1](https://openstax.org/books/calculus-volume-3/pages/chapter-1)  
7. Exercises: Calculus (OpenStax) \- Mathematics LibreTexts, accessed on May 10, 2026, [https://math.libretexts.org/Bookshelves/Calculus/Exercises\_(Calculus)/Exercises%3A\_Calculus\_(OpenStax)](https://math.libretexts.org/Bookshelves/Calculus/Exercises_\(Calculus\)/Exercises%3A_Calculus_\(OpenStax\))  
8. Open textbooks for undergraduate mathematics. \- Open Access Texts, accessed on May 10, 2026, [https://openaccesstexts.com/math/](https://openaccesstexts.com/math/)  
9. An Introduction to Statistical Learning, accessed on May 10, 2026, [https://www.statlearning.com/](https://www.statlearning.com/)  
10. 20+ Best Free Machine Learning Courses \- DataTalks.Club, accessed on May 10, 2026, [https://datatalks.club/blog/free-machine-learning-courses.html](https://datatalks.club/blog/free-machine-learning-courses.html)  
11. Answer Key Chapter 2 \- Calculus Volume 3 | OpenStax, accessed on May 10, 2026, [https://openstax.org/books/calculus-volume-3/pages/chapter-2](https://openstax.org/books/calculus-volume-3/pages/chapter-2)  
12. Answer Key Chapter 3 \- Calculus Volume 3 | OpenStax, accessed on May 10, 2026, [https://openstax.org/books/calculus-volume-3/pages/chapter-3](https://openstax.org/books/calculus-volume-3/pages/chapter-3)  
13. Gil Strang's Final 18.06 Linear Algebra Lecture \- MIT OpenCourseWare, accessed on May 10, 2026, [https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/gil-strang-final-lecture/](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/gil-strang-final-lecture/)  
14. Problem Sets \- Linear Algebra | Mathematics | MIT OpenCourseWare, accessed on May 10, 2026, [https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/resources/problem-sets/)  
15. rossant/awesome-math: A curated list of awesome mathematics resources \- GitHub, accessed on May 10, 2026, [https://github.com/rossant/awesome-math](https://github.com/rossant/awesome-math)  
16. mitmath/1806: 18.06 course at MIT \- GitHub, accessed on May 10, 2026, [https://github.com/mitmath/1806](https://github.com/mitmath/1806)  
17. Syllabus | Linear Algebra | Mathematics | MIT OpenCourseWare, accessed on May 10, 2026, [https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/syllabus/](https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/syllabus/)  
18. Richard hammack book of proof solutions, accessed on May 10, 2026, [https://cdn.prod.website-files.com/6755af173c5e3c505245fb5f/67aeca892ed0dcfb43819011\_80958756535.pdf](https://cdn.prod.website-files.com/6755af173c5e3c505245fb5f/67aeca892ed0dcfb43819011_80958756535.pdf)  
19. Book of Proof | Open Textbook Initiative, accessed on May 10, 2026, [https://textbooks.aimath.org/textbooks/approved-textbooks/hammack/](https://textbooks.aimath.org/textbooks/approved-textbooks/hammack/)  
20. Book of Proof \- Third Edition \- Open Textbook Library, accessed on May 10, 2026, [https://open.umn.edu/opentextbooks/textbooks/7](https://open.umn.edu/opentextbooks/textbooks/7)  
21. Book of Proof, accessed on May 10, 2026, [https://jdhsmith.math.iastate.edu/class/BookOfProof.pdf](https://jdhsmith.math.iastate.edu/class/BookOfProof.pdf)  
22. Free solutions & answers for Book of Proof \- \[step by step\] | Vaia, accessed on May 10, 2026, [https://www.vaia.com/en-us/textbooks/math/book-of-proof-3-edition/](https://www.vaia.com/en-us/textbooks/math/book-of-proof-3-edition/)  
23. Abstract Algebra: Theory and Applications \- Open Textbook Library, accessed on May 10, 2026, [https://open.umn.edu/opentextbooks/textbooks/abstract-algebra-theory-and-applications](https://open.umn.edu/opentextbooks/textbooks/abstract-algebra-theory-and-applications)  
24. Real Analysis Solution Manual \- sciphilconf.berkeley.edu, accessed on May 10, 2026, [https://sciphilconf.berkeley.edu/index.jsp/mL4AB1/602358/Real%20Analysis%20Solution%20Manual.pdf](https://sciphilconf.berkeley.edu/index.jsp/mL4AB1/602358/Real%20Analysis%20Solution%20Manual.pdf)  
25. Are there any analysis textbooks like Charles Pinter's A book of abstract algebra? \[duplicate\], accessed on May 10, 2026, [https://math.stackexchange.com/questions/2608827/are-there-any-analysis-textbooks-like-charles-pinters-a-book-of-abstract-algebr](https://math.stackexchange.com/questions/2608827/are-there-any-analysis-textbooks-like-charles-pinters-a-book-of-abstract-algebr)  
26. Books similar to Pinter's Abstract Algebra in style but not subject matter? \- Reddit, accessed on May 10, 2026, [https://www.reddit.com/r/learnmath/comments/1sv6ay3/books\_similar\_to\_pinters\_abstract\_algebra\_in/](https://www.reddit.com/r/learnmath/comments/1sv6ay3/books_similar_to_pinters_abstract_algebra_in/)  
27. Casual book on abstract algebra \- Math Stack Exchange, accessed on May 10, 2026, [https://math.stackexchange.com/questions/78286/casual-book-on-abstract-algebra](https://math.stackexchange.com/questions/78286/casual-book-on-abstract-algebra)  
28. limitless-100/Mathematics-Mastery-Resources---from-high-school-to-graduate-level \- GitHub, accessed on May 10, 2026, [https://github.com/limitless-100/Mathematics-Mastery-Resources---from-high-school-to-graduate-level](https://github.com/limitless-100/Mathematics-Mastery-Resources---from-high-school-to-graduate-level)  
29. Free solutions & answers for APEX Calculus \- Math \- Vaia, accessed on May 10, 2026, [https://www.vaia.com/en-us/textbooks/math/apex-calculus-4-edition/](https://www.vaia.com/en-us/textbooks/math/apex-calculus-4-edition/)  
30. GitHub \- openlists/MathStatsResources, accessed on May 10, 2026, [https://github.com/openlists/MathStatsResources](https://github.com/openlists/MathStatsResources)  
31. STOCHASTIC CALCULUS \- MA 598 1\. Probability preliminaries Problem 1\. A restaurant can serve 75 meals. In practice, it has been e \- Purdue Math, accessed on May 10, 2026, [https://www.math.purdue.edu/\~stindel/teaching/stoch-calc/stoch-calc-problems.pdf](https://www.math.purdue.edu/~stindel/teaching/stoch-calc/stoch-calc-problems.pdf)  
32. Problem Set 8: Stochastic Calculus | Topics in Mathematics with Applications in Finance, accessed on May 10, 2026, [https://ocw.mit.edu/courses/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013/resources/mit18\_s096f13\_pset8/](https://ocw.mit.edu/courses/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013/resources/mit18_s096f13_pset8/)  
33. Free Machine Learning Books for Data Science \- Chi-Squared Innovations, accessed on May 10, 2026, [https://www.chi2innovations.com/blog/free-machine-learning-books/](https://www.chi2innovations.com/blog/free-machine-learning-books/)  
34. Complex Analysis: An Open Source Textbook, accessed on May 10, 2026, [https://textbooks.aimath.org/complex-analysis-an-open-source-textbook/](https://textbooks.aimath.org/complex-analysis-an-open-source-textbook/)  
35. DIFFYQS Notes on Diffy Qs, accessed on May 10, 2026, [https://web.uvic.ca/\~tbazett/diffyqsold/diffyqs.html](https://web.uvic.ca/~tbazett/diffyqsold/diffyqs.html)  
36. Introduction to Metric Spaces | Mathematics \- MIT OpenCourseWare, accessed on May 10, 2026, [https://ocw.mit.edu/courses/18-s190-introduction-to-metric-spaces-january-iap-2023/](https://ocw.mit.edu/courses/18-s190-introduction-to-metric-spaces-january-iap-2023/)  
37. Complex Analysis: A Visual and Interactive Introduction \- GitHub, accessed on May 10, 2026, [https://github.com/complex-analysis/complex-analysis.github.io](https://github.com/complex-analysis/complex-analysis.github.io)  
38. Open-Source Complex Analysis Textbook | PDF | Euclidean Vector | Mathematics \- Scribd, accessed on May 10, 2026, [https://www.scribd.com/document/926417640/Howell-Complex-Analysis-Copy](https://www.scribd.com/document/926417640/Howell-Complex-Analysis-Copy)  
39. May | 2025 \- Open Textbook Initiative, accessed on May 10, 2026, [https://textbooks.aimath.org/2025/05/](https://textbooks.aimath.org/2025/05/)  
40. Notes on Diffy Qs: Differential Equations for Engineers \- MAA.org, accessed on May 10, 2026, [https://old.maa.org/press/maa-reviews/notes-on-diffy-qs-differential-equations-for-engineers](https://old.maa.org/press/maa-reviews/notes-on-diffy-qs-differential-equations-for-engineers)  
41. Notes on Diffy Qs \- Open Textbook Initiative, accessed on May 10, 2026, [https://textbooks.aimath.org/textbooks/approved-textbooks/lebl-de/](https://textbooks.aimath.org/textbooks/approved-textbooks/lebl-de/)  
42. Notes on Diffy Qs: Differential Equations for Engineers \- Open Textbook Library, accessed on May 10, 2026, [https://open.umn.edu/opentextbooks/textbooks/notes-on-diffy-qs-differential-equations-for-engineers](https://open.umn.edu/opentextbooks/textbooks/notes-on-diffy-qs-differential-equations-for-engineers)  
43. Problems and Solutions in Mathematical Finance Vol.1: Stochastic Calculus \[1 ed.\] 1119965837, 978-1-119-96583-1, 978-1-119-96607-4, 978-1-119-96608-1, 978-1-118-84514-1 \- DOKUMEN.PUB, accessed on May 10, 2026, [https://dokumen.pub/problems-and-solutions-in-mathematical-finance-vol1-stochastic-calculus-1nbsped-1119965837-978-1-119-96583-1-978-1-119-96607-4-978-1-119-96608-1-978-1-118-84514-1.html](https://dokumen.pub/problems-and-solutions-in-mathematical-finance-vol1-stochastic-calculus-1nbsped-1119965837-978-1-119-96583-1-978-1-119-96607-4-978-1-119-96608-1-978-1-118-84514-1.html)  
44. textbook recommendation \- A book in topology \- MathOverflow, accessed on May 10, 2026, [https://mathoverflow.net/questions/83881/a-book-in-topology](https://mathoverflow.net/questions/83881/a-book-in-topology)  
45. 1 Topological spaces In-class Exercises, accessed on May 10, 2026, [https://websites.umich.edu/\~jchw/2024Math490Material/Worksheet9-Math490-F2024.pdf](https://websites.umich.edu/~jchw/2024Math490Material/Worksheet9-Math490-F2024.pdf)  
46. Introduction to Topology. Exercise sheet 0: Metric spaces, accessed on May 10, 2026, [https://wiki.math.ntnu.no/\_media/tma4190/ex0top.pdf](https://wiki.math.ntnu.no/_media/tma4190/ex0top.pdf)  
47. Metric and Topological Spaces \- Tartarus.org, accessed on May 10, 2026, [https://tartarus.org/gareth/maths/Metric\_and\_Topological\_Spaces/MetTop\_\_Korner\_201404.pdf](https://tartarus.org/gareth/maths/Metric_and_Topological_Spaces/MetTop__Korner_201404.pdf)  
48. A Course in Metric Spaces and Point-Set Topology, accessed on May 10, 2026, [https://pages.uoregon.edu/adding/courses/431/431notes.pdf](https://pages.uoregon.edu/adding/courses/431/431notes.pdf)  
49. numerical-analysis · GitHub Topics, accessed on May 10, 2026, [https://github.com/topics/numerical-analysis?l=tex](https://github.com/topics/numerical-analysis?l=tex)  
50. Open Education Overview | NYU CDS, accessed on May 10, 2026, [https://cds.nyu.edu/open-education/](https://cds.nyu.edu/open-education/)  
51. Numerical Analysis Using R \- Assets \- Cambridge University Press, accessed on May 10, 2026, [https://assets.cambridge.org/97811071/15613/frontmatter/9781107115613\_frontmatter.pdf](https://assets.cambridge.org/97811071/15613/frontmatter/9781107115613_frontmatter.pdf)  
52. Understanding Machine Learning: From Theory to Algorithms \- CS \- Huji, accessed on May 10, 2026, [https://www.cs.huji.ac.il/\~shais/UnderstandingMachineLearning/understanding-machine-learning-theory-algorithms.pdf](https://www.cs.huji.ac.il/~shais/UnderstandingMachineLearning/understanding-machine-learning-theory-algorithms.pdf)  
53. 18.S096 Problem Set Fall 2013 \- Stochastic Calculus \- MIT OpenCourseWare, accessed on May 10, 2026, [https://ocw.mit.edu/courses/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013/20348102bc927284425e6d505495eb30\_MIT18\_S096F13\_pset8.pdf](https://ocw.mit.edu/courses/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013/20348102bc927284425e6d505495eb30_MIT18_S096F13_pset8.pdf)  
54. Report 4: Stochastic Calculus Exercises, accessed on May 10, 2026, [https://www.math.nagoya-u.ac.jp/\~richard/teaching/s2024/Risan\_4.pdf](https://www.math.nagoya-u.ac.jp/~richard/teaching/s2024/Risan_4.pdf)  
55. First Course In Numerical Methods Solution Manual \- sciphilconf.berkeley.edu, accessed on May 10, 2026, [https://sciphilconf.berkeley.edu/index.jsp/mL9AD5/604663/First%20Course%20In%20Numerical%20Methods%20Solution%20Manual.pdf](https://sciphilconf.berkeley.edu/index.jsp/mL9AD5/604663/First%20Course%20In%20Numerical%20Methods%20Solution%20Manual.pdf)  
56. GitHub \- luca-heltai/numerical-analysis-2022-2023: Applied Mathematics, accessed on May 10, 2026, [https://github.com/luca-heltai/numerical-analysis-2022-2023](https://github.com/luca-heltai/numerical-analysis-2022-2023)  
57. Gallery and Catalog of PreTeXt Projects, accessed on May 10, 2026, [https://pretextbook.org/gallery.html](https://pretextbook.org/gallery.html)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAYCAYAAADOMhxqAAAAk0lEQVR4XmNgGAUjC9QB8WEg3g7EwkDcDMTLoWKbgZgPoZSBwRCIpwKxMhD/B+KbQGwBleOBihVA+ShgEhB/BWI2JLFEBogGkKEY4DoDxEnIYA8Q30ATAwMZBohJRWhif4G4FIjZgXgVkhxDPANEgzaSWAhUTA2I84A4DUmOoRqIjyELAIEgEJ8E4h0MEPlRQDsAAO3JGl7xvmbLAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAYCAYAAAD+vg1LAAABfklEQVR4Xu3USyvEURjH8Sf3y8Y1li4LKYodZSULCws7KySXFZK8Agp7CQvJpVxyi7JRKGyIkmQheQFegI3i+8x5pjnzb9T8Z2t+9anzf56Zp5kz54zIf0oWZrCGBwzEt1PPGGZt3YhvtMbaqWcSl97zB6a9ZxnCNd6wj0e84kTci+8wj7LoGxIkB18YDDbyxe2VZgGVti7AIZpxhDqrBzOKJ3Fz4pKHLVsvodjrTYnbwyJsePVo6nGDimBDkyuxwcvihkTTjw5b73h1jW7PLkqQga74tki2/D14HE1W2/bq+mEO0CnuNPRixOtHomcy0WDd63N04xYtVtfoGf4JaPf6kejgTVvr4As8izspn1artX6oBAeX4xSF4r6J/2OGip5Df7BuRRvmUI0V64WO/hDRo+Tvsa4bxF3fHquFip7jdVv7g0txjEzsocbqSUdv2KqtFyX++vZhWNwFOJMQ+633+0rc/4NegBdx/x0T3mv0EmjvHu+o8nrppJNkfgFpCkPJ4+O06QAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAYCAYAAAD+vg1LAAABfElEQVR4Xu3UyytFURTH8ZX3Y4AQGXlFeRRlICkTf4CZGQOUEhlI8g+QgYmEJHmUR0JeJSUlA5SJPEoylrmBCd9l7+Puc7rqnjvlV5/a1tp3YZ99rshfyygmcIC+QC/utOAeaajBJ6p9O+JMFU6RjgoxgxvdDd04xxO2cIMH7OEFVxhHnveBKBnGJRKCDf2ti3Y9hUK7zsA26rGDSlv3kolJPKIh0PuOntOqXc8gx+kNoRbZWHbqbsrxjqZgI1Uig2fFDPHSiVa7XnfqWut1fn4V80f5kiy/Dx5Ana2tOfV5HNp1Fj7QE2mbJEn0wXrWJ2jDhfifepGY56L7jzHi9H6ig1fsWjfqNboVc1PebK3M9kMlODgf+2Keuv4n7sMMlRTxD9ajaMYYSjBne6Gjt8K7Su4Z61pf136021qo6D1esmt3cC52kYhNlNp6zNE3bMGup8X/+naIuUYFOJIQ592FMzHfD/oC3In57hh09mzY3jWeUez0/vOfGPMFWzNDmCq8t28AAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFYAAAAZCAYAAACrWNlOAAACXklEQVR4Xu2YS8hNURiGXwOElHuZoshchiL3REoMJLlmokykGDDAUGSCksvEdSBFKIpEMlEIQxkgA4qBicv79q2ddVb/OXtt+ztOaT311D7rO2ef999nr7W+/QOFQqFQKBRqOUpf0Uf0Kn1HH9Bb9CO9TXfS4dUHBox73lH0HL0BO/HMznIrltGN4VhhK6bTk3R5GB8d1QaJa97j9CU9SH/Q+Z3lViylW8PxxbgA+zHFArorLgwQt7y6W7/CpsEIOqWz3Jol6B70DGxajaWnklpbJtKV6WAGbnl19X/R1WmhBxPoeuStNYvQO6hQht1xwYGR9HE6mEHrvFpLntNPsAv7IrxeGL+pC1dgn9FCXofON1TQObC1ajt9QsdFNS+OwaZ2E9zyXqLv08Ea9tLPdF5aGAIF3RKOFeghfQb7zjf0AGxq9QOdV983NS30wC3va3ozHXQkDqo7YBo9C1sDz4fxfjID1jItTgtdcMmrjUtdwKG04Ij+oDio2AebomvptjBWxyTYBdId1NQP9BtdgXpc8s6FrZVr0oIj2mU3h+MqqLoP9cxV/6wesV+sgs3I3G7HJe8O2IWtfWOCpkVuV6BfelM4jjcDrc+aKZPpddgu7s0seg92YXJxyasniS90WFqoQbtjblegJ5UN4VgbZcwJOhsW+jSa56hDOXX+JrjkfUrvpIMZ5HYFR2BPdPdhv7521mv4s5GoH65qb+ld9AjbELVDesZvgkteTY/vdE9a+E8YA1sK/hnrYI+vanh/wtqJggO6veV+eiGpFVpwGPb/xst0fFIrFAqFwt/xG8gOoIvEIcjjAAAAAElFTkSuQmCC>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAWCAYAAAAxSueLAAABpUlEQVR4Xu2VvyuFURjHHz8y+DlKUhQxyI/8AX6kLG5KYmIhk0nEbBDJZJDJ4maRSUlMksWqKIOiKJklhO/jOadz7tN57/u+FotPfXTf53u6z+v8ukT//CFl8BDW6CDAApzWxTQcwAldjKAInsI+HSRhEp7oYgwt8EkX4yiBdzCjAwNP7wzJOM2RLsQxDB9hoQ4Ms/CLwms5ogtx7MA9XfQ4hte6aKjmP3Mkb8O+wlF4D5/hJiy2o8ENnPeefXjqXuCGDnwa4TJJs0+SL+Q1sS8waMaVm3zIPFt6Sf6bB5Lxt+aZXzpIM7kvX4SVJE15ferNmAaTd5tnzRL8gFU60DSRa9bv1Qu8zx0kebtX8zmHF7oYgqfSNmtTmYWbRDWrgO9wVQch/GatKrPUUfQ08rpyNqCDEEmalZLkeoMw6/CN5FAza7DTxY5aOEau2ThFDCTZaaGtn4VX5nMP3HJRLv45s17mjHBsU/hQd5Fs9324QnL5an4OdRp4Bvg8RV1X+Uh9XfFtwlMZdRHnI/VFzEyR3IFp4J8YnpFfsUuykZLA63cGM9+vkFiW64TLGgAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAZCAYAAAAiwE4nAAABfElEQVR4Xu3TPShFYRjA8QdFCZEUi0GiDAwGKYVBMrGYzFI2A0pRFJNsJpPBR75iEWKzGQgLi6R8FaV8RT7+r/fgnueec+51u7b7r1+573POPe97ryuSKFEMpeEU9380bW6OtX584BqLyoJ6vYRnVH/d6V8x1rDlMAf7KRt3eEBe6MAj8yDzBpHaxzi2cSv2Ga5GxJ5yWA9Uq6jTi6oase/VgixHWOZk5oTmpGG7caoUu+NIDeEduXqgGxO7M/OderWMJr0Y0gAO8Ch28+bvPeSEXhRaAZ5wgww1q8COWvPrEjN60S/zRZtT9qj1eTSrNa/yxft+3wrxgiukO2tl2EXS90UBNYp9YIMeBDUh9qYu5/UUWn/HgfWKvTfSz8tVEV5xjnIcItl1hX+zONOL0TQpdqcXaFOzoI6wohejqQRvOEaKmvmVKfb316cH0daJer0YUK3YT6VKD+LdINrRjROJ7r855krFnmoOm+hwj+NfKjawjlH559MlCusT9NNYey+v+OoAAAAASUVORK5CYII=>

[image7]: <data:image/png;base64,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>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAAVCAYAAAAJiM14AAABZUlEQVR4Xu2VPSiFURjH/6JI+YhNugsZFQZlEeWj7mAySJll8rHJqISFlEk2KaHroyzKSiQjGxKjycz/8Rze5x6XXOW+vXV+9atzzv/cOs/7vOe+QCAQCASAAfrsLyaVGnpNX2mFlyWSQboOLajJyxJHF03ROWhBndlxsqiiw248BS1oKIo/6ab79IQe0Ra6SQ/pmtmXiz56lYcX0HP9iXFa4sYj0IImo/idNrpDy9z8nL7QRmhR8ptal8VKD+0w8zT0cItmTVih9WZ+SzNuPEOnoyg+Kuklslt9Ay1ow+zzka7InlE/iJsFfH1NpAtyWLkn3zEG3dPgBz/QC70Xv/UUed6hfjrhL5JS6GGlUxZ5pebd+IDem6yOLpt5wZF/pwfk/ngWQS+7+EE5tMg9aFckO3OZ/Els0VY3Lyjt0CcrhxMfabXJl+iTye/orMtWoZ3Zpc302LmNGL9Z8vSL/cVA4H94AwBEVK3sMRiiAAAAAElFTkSuQmCC>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAVCAYAAACzK0UYAAABXElEQVR4Xu2UPSiFYRiG75RFohQZTBZlUAab38VIBoPSmZlMymowMLCIQUaTMlhEKVIGBmLwT7JTMiB/99Pzns5z7j6DxXSuuvrO+9zv+/2c9/k+oESJ/6KHntJn+p2OZ3Q9TkpM0GP6CZ97SQ9oVcrb6FXKMtmEhy0aCHbCD3qvQWBXC0Y5faEPGmTQD7+ZRQ0Sdq5bLRrt8IXLGmSwAJ/bp0Gik65o0ZiELxzSIINr+kYrNUhM0ZwWjX36Res0EBrhN7OtQeCQ1muxGr6RRxpkMAK/yLgGiVr8cp4B+MIZDRLWtg3p9xp8bmshLmKYTmvRsC6xhb0awNt1L4zP4e9RWahFtmizFo0b+EZWaEDm6VgYb9DHMI6M0lktGk3wp9iRum2cteorrQn1bvoO35s81ixzdAnyhB3wz8MT/CJ2tPEJvUPhs7GaXxDogneX/XUX8Ld7sGhGib/yA8DRS5BEpTyQAAAAAElFTkSuQmCC>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAZCAYAAACl8achAAACiklEQVR4Xu2XS6hNURjHP+9nZKBIlJkZEQMGJFFKioE8S0QiSkkoBsqAjIyMvJNHkTzyLBl4pZRCoesRBiLFwJv/v29tZ53/3uvcfc89547Or37dc75vr7PX2vtbj2vWokWXMQBegsM10UGmwMOwmyaawXm4TIN1sgdu12CjWQGvabAT9IZt5k+9FEPgengTvoSP4QO4MuT3wpnhM+ENXsM5UawMo+AnOF4TgS3wigaLYMc+wjPmo+we4r3gPngbfoP9Q5zMg++tcm1ZTsC/lh7sUPgHjtVEBot+P/wFl0sugx1/By9L/Cg8LbH2mAXXmXd6leRinsJNGszYZf4DmzUh8HVtkNgzq/HDBYyAM8w7znvuqE5XcQhe0CCZBH/DV+ZPsxZ8G6Oj7wPNX+HcKNYea8PfCead5m+m2GY+r3KcMm+8URMl4ADYdqomEsy3yqA5Edn2XCWdgyX0RYPks3njcZooAduwbXKyRAyDq6Pv3IzY9n4UU5aYX8MV6j8sBwZ/wB5xooBFcKTE2NmynT4GH8GHkSzLt/FFQtbpvppgI9YlR55iELxu+a2VgyhTHovhdA2C5+YrVmq5ZHl81yDZaX7jBZoIcJQn4URNmK/XbFtrIvIsclCDgTvm7VPnFU7ENxok/eAN801loVVWED7VafCs1X6SbZZe8rhB3IKzNRHgAYud5gpWBJe85ETtA9fAu+blcs98Tea6PTi6rogDlt9cOHGewJ/mnfpq1eXBcnkRcvSDFW/Z3Fy2arARsKy4U2pd9pTvHSXbxsdoohGwcyyR1BmiXnhgYtk2DR60rmqwE2RH08maaDTH4VIN1gn/CditwWbAVeiipZevsvBIfMTyc6RFl/IPKqF8qSfnHDcAAAAASUVORK5CYII=>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC8AAAAZCAYAAAChBHccAAACnklEQVR4Xu2XS6hNURjHP+88o5DXQDFRDLwTMVBSiqmibopSXqWUDIiBiWeRR14lkYGBvOpmwEDKK8WEPAt55pqQ8vr/z7dXe+3/3fvcc4676w7Or361z/fttffaa+/1rXXMmjTpUuyHizRYJ4PhdThEE2WyCZ7UYINwAFphD02UwQT4Hg7UxH9wDm7RoDIfPoVf4V94M5uucB/+Mc9/h8eyaTsP90isFnbDixpMmAW/wAGayOMyfGHeQTZU1sCzsLvEh8Nf5qNfD5PhT/OBKeIxXK9BpRe8B5ead/5CNl3hoPlbUlbCzxrsgL7m3zUH653kYo7AKxpU5sAD5hPkJfwNx2fO8IfrIzHCT6jDGwjLze912/ytFU3MFfCbFecrbIeLk+N15qN/KE3bKHgt+h1zB+7TYBWmwxnJ8SXze41M0xlmm+fHSjzDDUsrRT/zz4ATc2gSa4Ebk2PlNdymwQL45jg4AZZWdm5KFIuZaJ6fqonAIPPOx+wwb7Q1+c2yNSlNZ2iDGzRYAM/jIhTYZX6fooVtjHl+gSYCS6z9yA2DP+BH2B8+yqYzsMTW0vlp8Bl8GPnWvHOrovNiQucXaiLAKsJvSzls3vA4PC25mOfW/uGV3padQwFOXN6jqH34bPJKd4UHsKcGzasNqw4b8yZF1DJhd1r+d8sR5fWPaiIhTNhxmiBz4V0NRrDes/EITUScsuqlcpl5Scxjpvn1r2oiIZTKbnGQE+CVpUv+GzgvPiGBF6+2ApIW+EmDYK358s7rUy21fCBOduZY65+Yz78YLlLcoJXGaMvfHnBh0a1EvXB7sFqDnc0Za2xjVg1OUlYylvJS4ah/sM7fEm/WYFnw9Z7QYINw0bpl+VWwNPZa8WpZK+FvYNiaNOkS/AO/DYbJPSTxdgAAAABJRU5ErkJggg==>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAYCAYAAAAlBadpAAAAtUlEQVR4XmNgGAWDD/gD8Xt0QWKAEBDfAOL/QMyLJkcQhALxPAaIZjU0ObzAEYjlgLidAaLZHlUaN+AH4mgou5gBojkSIY0fFAAxC5QdxwDRXISQxg74gPgcEF9AwjcZIJqXIqnDCrqAWBhNTIYBonk/mjgK8ADiQnRBIGBngGgGuQArMATiJwzY45IRiL9CMQowB+JHDBCTQfgZEAsgyU8A4udI8g+BuAUmCTKVGcYZBYMVAAAGniK5/JKk4gAAAABJRU5ErkJggg==>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAVCAYAAACUhcTwAAAApklEQVR4XmNgGJxAG10AGzgMxGzoguigHIhD0QXRgRQQb0IXRAIWMMZGBohibGAmjBECxFeA+AAWfAqihEhFIN+BOCCaFYhZoHQCEBfDFIFAPxDbIwsAwQ4gFkMW0APiBUh8BSBeh8SHgwNAzAtlNwGxH0IKATKBOAWImRggbgS5DQMIAPEeIHYD4m40ORSwBIhPArEmugQycATio+iC2IAwugBBAAA/fRwCVDfWMwAAAABJRU5ErkJggg==>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAVCAYAAACUhcTwAAAAPklEQVR4XmNgGOKgGoiP4MAnkNThBCLoAtjAoFbkBsQHcOCjYBUEAGnW4QM0UFTJgOmr/UC8D4gPQdVQAQAAyE4R+1wEemEAAAAASUVORK5CYII=>

[image15]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEsAAAAYCAYAAACyVACzAAADUUlEQVR4Xu2YS6iNURTHFyKvPMrbwM1bUeSRR9gmGCp5TtzLQN4iA4Rb3krIIyUUecszkjz26GYgSZiZokxkYmLgv87e+571rXP2cc93j51yf/Xr7m/tc9Y5a9/97b2/Q9RGG238Q3TVgZzUKk9euuhAKymb74kO5KRWefIwHe7WwVYQzfdcXc+Cr+F3+INc/114B36Bt2ATPBLe4NF5UjITNuqgZyQ8BT/Ap/AhfANPwD7idZJoPl3kCvgRboKdRHwjXOTbt2Ff0cfoPCmJFbeB3Hd9BSeIeH/4Di6F82EH0cfE8tELdb0TblWxAfCmby+Da0RfQOdJCd8NjSpWT272zIXrs10FpsIHsDNcp/rK5Sugi1wOe6vYeTgc9iD3Ae2z3QV0npTo4rpBCzvC01RaT4BnHLMQThRxna+ZlzqgmEPFNx6Dk4tdGf6U528ym7LF8e0VZv9lEddcJzeQ3eFBEdf5mqlUJK9ZvCDyVB0PT2a7M1TKE5gH31YhbzQ9C++sjC7uMBzj21dFXHMcDvHtCyKu8zVjdUCwg1yB7cjdfrHpzFgdSIihbHFnYS/frjRYB+Aw3+ZdPmCoysGqgxd9ezW5XbISVgcSYihb3CE40LdviLjmKOxHbjLwHRQwVOVgXYGDyB0R7qk+ZhIcKq6taKfGULa4JeQOlswjEdfwrcebFb92v4gbqmKwFsDNvn0OjhV9AR7MceLainYM3sZ5HWqpvFu1ZM0yVLobbvdtXj7CLam55v9egqNE3FALB4s/iKckH9T4cMaLpYYPeD/J7SIBK9qpMVRaHB8268itu3yg1syAW2AD3Kv6DJXmK2DVNT/GTCN3RnlMbvAk/CX4v/VMxa26Tomh8sXxHTEFfvN/A7yeNcEzcJeIBwyVz5cpkpN8JreDcPw9ubMIy7vFJ/iL3BrGAyax6jolhiLFkbtD6qn4nMtr2Fe4D44oviyDoUg+qwM5sTqQEEOR4gTbyJ3UGR4oflKJYSiSz+pATqwOJMRQpDgBHw94/eWT+mC4h9xuuAquJLeGBQxF8lkdyInVgYQYihRXBn4G5AdsPn/dJ/erxFrK/opiKJLP6kBOrA4kxFCkuJwYiuTj6VgLapUnD6PhYh1sBbXO9//wG+mtpJP6n87/AAAAAElFTkSuQmCC>

[image16]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEoAAAAYCAYAAABdlmuNAAADfElEQVR4Xu2XSeiOXxTHv8g8ZEhhJZQh87CgcMm8sqEoyZxkKNlQ/DYWLFA2hmSK/uZZlOGSlLKwMGRhIUV2/2xsLJzvc+/jve95nvsb7vv2Wvh96tvv3nN+z3nuOe+dHqCddtr5y/TQhkTqFSeV7tpQA6WxHmhDIvWKk8IM0V5tTCQa67HqzxK9Fv0v+gHnvyG6LvomuiJ6KTqYP+DRcRrJTFFT0D8i+gA3zquiL6LncD/md9FD0VZR5/yBAB3rDzrB1aL3ou2iLoF9m2iZb/PlAwMf0XFqZaRotjZGKEtuMVwuhOPNGS46Llri7XrLKIuV8UT194h2Ktsg0WXfXiHaHPhydJxUJsLNWs7g0coXg6ugSdkWidb79n+hQzjr/84V7QgdKI+VoRNcKeqnbKdEI0R9RLdFHavdGTpOW5kiuuk1Sflaoiy5hYgX6jTcsustOqF8ZbEynmqDYg4qDx4WTau4qmgpTgzGY/E5g9paoBwu0SZlm4/mC0U4o3aFDpTHymguQe5Rd0Td4JbE0Wp3Fc3FKSMvEPeJCcrXVsqSm4fyQvG9fOdG0StR38BHymJlWG0I2A03hTvAJaWXZIjVhghcYox1TTRe+VIxKCbHQq3zbRbkhegN3Mn9Ee7/ufQ0BsVYGVYbPENRmaKbUDlBYlhtiHAe7vpR6ywKMSgmFxaKM2qY6IxogOict5dhUIyVYbXBc0E0BO4awA1WMxXu5Tk2aLcEn70Lty9xSdeKQTG5BaguFOGJztNwuWiDt2kMirEyrDYIS1E5Nk+Kxga+HBZyXNC3Qbu1cL/gHlhrwQyKyXHLWOvbeaG4596D+0ThFYF3Ko1BMVaGVf2ecIPvBHf5OlDtzuDp9FPUK7DZoN1WOMNuwX0BpJx8BsXkOHPW+Ha4mXOz3g+3UrhXdg18xKAYK8OqPj9NpsPdM+7DFS6EA+ALHim7Vf0UJsPNLhaM7dZiUEyON+9Vvn0pdAjHRGPgisY7Ig+rHINirAwbtAeLvoouevtbuF+D4m35k+gX3J7FYoVY1a8FLmku7S3aEcGgOrlDoneiZ3Bj50nHMXPfIv0D32e4z6+8WAatKFQtWG1oIAaR5BIwiMSy2pCI1YYGYhBJLgGDSCyrDYlYbWggBpHkEjCIxLLakIjVhgZiEEkuAYNIrH3akEi94qQwCu4SWQ/qGevf4TfnVKQRXE0qrQAAAABJRU5ErkJggg==>

[image17]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAXCAYAAAAV1F8QAAABiUlEQVR4Xu2UyysFcRTHj2cWHhsLLFhR/AFKUUg2QkpRbFCUtZRHoUiyICXZKBuWspNHXbJQrEReWfgTvLKQ+J7OXPfcM3OZO9yF8qnP4nzPrzkz8/vNEP0RcuG4T3/EEhyE1T4MDD/NqQ0TwQhsVnUp3IMP8BbOwkzVD0Qq3FV1HryB5TAddsFXGIIpkWXx0wlbVT0Nx1TNrMJ3krWBSILbMFll+/AJVqisg2TQusriogn2mWyT5KI9Kmt0Mu4FYotkHzT5sA2mqWyYZNCUynxTCwds6AG/1kv4AotMjzLgGsmxjUUI5tjQg16Sp+m2jQJ4CJ/hnemFqYGLNvSAv6dHkj+GixZYCSdJ7oQ33MIfI+/FV2TBCzhkGxa+EA86NjnvzXdPw8d+A06oLBvOqDqKZZJhdSo7gIWq9mIUzpuMX/ecyT4pIRm049T1cCXS9qQBvsFzeOZ4De9hv1rngl8BD+OhfEiKo9sujkjWe8k3GpMqkkUnJEc+oVyRDCuzjd+mHS7Y8J8wHxn8UwlJH9tjAAAAAElFTkSuQmCC>

[image18]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAZCAYAAACsGgdbAAABQUlEQVR4Xu2VPSuGURjHL0SRRZkwKgOjbFgMVpNPwGI1KgbZvHwBZWBRiiSlvAxCBoXPYPBuJIXf9VzP4ZxDepb7fu7h/OpXz/2/Tt1X9/Wcc0QSicR/dOMZPuAJzoblYrCFrdiO+3gZlovBEfbGYdHQ8Z5iXVwoEp34gXNxwVGL43iB93iDHcGK7BnAW7FGB6Oa1OM2nmNPVMuDBlzDTRzFTzwOVsA0vortqmqgDR6KTVO5Evua2nwJ/fGM7/jiOewWZMyQ2JfTUTuWy1mTC7rKwbwLKqBfbByVeCDey/5gBe+wxssW8NF7lj6xJif9MEf0yNmJsg2xg/2bFnzDRT/MkV1c954b8QlHvKzEktjWdxunDcd+ypmiu1nfrdehMiPW+C/0hJ/Ca7GraU/sf5cXE2L3tI5+FZvDciKRSFSNL9dZQa08HYgLAAAAAElFTkSuQmCC>

[image19]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAYCAYAAADKx8xXAAABHklEQVR4Xu3Su0pDQRDG8QGNl9goKqZMtLBR0M7C0gews9PCWCakyDtoL6IWIl7AC6JBwUYQQWwUbEQsRHwAX8L/nJ1znI2XyjIf/GCYPQO7e1aklT9Txi1ecYJHvOAc77jHCgbSAZ9ubFu9ioLVeZxiEmcYtX6WLuxbvY4+t1bHOHqx6/pJOuVrcEPCR2kWMGP1oesnycnvg1VMWO/A9ZO0y8+DetYrzOIOU9bPooN7VuvgNZ4k3PSH9UZsPUrz4CAu0CNhJ/6yonRIPKhbncYySti0tW/RW02v2p9R6zFUMGe9KPofd6z2g/1ooA3HGLZ+Fn0hW1avSfy85rGEIVyKO+8ibiS8T/3BzxLebi39gBzZ2gPeUHRrrfxbPgHtCTEO0B/k9QAAAABJRU5ErkJggg==>

[image20]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAVCAYAAADfLRcdAAAAm0lEQVR4Xu3ToQrCUBSH8YOiYc2qdot5ze6LzCdYFPYEQ9/FZpAFk8HiMywMg0aHQT+4YdtBRLCccD74pf8d3HAn4nme53kf6mGFM64oMe2cMNIAO5wwV5u5Mjww0YO1hrjhiXvLsn3ISjO8kOvhSwscf3RAFD77v1jCZVM9WGyEGhs9WG2LSpofbIykmW3VxxoXFNhLeJeeZ6032BceKe9HNKQAAAAASUVORK5CYII=>

[image21]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAVCAYAAAAAY20CAAACiUlEQVR4Xu2WW4iNURiGX+QQF5RjTiliUGLQFIpMUa4kJUrT3EnKoMhhSm7M5MooyqGpoQwxOUtkJIm4VNw55kbiwiCHeN/51r/3t9fsPXt2W/xq3nqa/b1r/WvW+tZa3/8DverVP9N0cik2/7IWxkZPNZw8JRVxw/+ik2RPbKZNS8lr8os8cP4M8pmMdF5qpUlqAY3OayJnXJxqrYMtoNp5b8gmF6daOusdZGCIx8EWND/TI0UaQOrJTVh5PEDekWuuzwrYAoY6z0v3Rs+2k+tkDjlNrpDjrl8xKWEnyF3YeP1d215yx8WdGgzrfAPZbB+DTXZz0omqJT9JH+clmkvOk0EhfgTbvSmwRWgsld+eSPdsCVkJe262a3tJzrm4U4fIDzLJedthD/taX0c+uNhLY4x38QtyIfxWyd2VbepWfZEtEs3kPbJJ0Vw0J80jo1HkG7ntTeoWbLVe2o1CC/BS1vWPNsQNJWgI+QTbjUQqHhq30nlYFcwdztOKv5CjzpPWo/AR8toIG3Ny3FCC1sDGWOA87ehH2C5llJyzZc5T2ZS3miyCTUjq7hLriCTvi8vklWsbSw66WAmqIWOcF2s/+Ur6hViT1u5r7ByNhmV7bYgnkCewiU6EncNpoU2x/LiMqgjIvwjLui7vw9CmyZ5F7rZvg/VX0SikLeQ7bGxpJ+yZrZkeTsvJPdJGWshM2B1oR9fL9xz5X2SHYdnRGLNgzwtVjMWun6Ryq2y+jXwvTVzVS4lQSX4MW4BKc1k6gj/3KXE1NoJ0XOaFv4nuw74Cit2/opoKOyLlfswNg+12Pu2DZTv5hKkKcU75LEenyO7YLFENsKOUT3pr6x6OgJX5Z6QVUfWRfgNRFYPqX2vWDAAAAABJRU5ErkJggg==>