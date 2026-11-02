# MailSage Code Explainer — AI Agent Skill Experiment

## Overview

A practical experiment in designing, implementing and evaluating a reusable AI agent skill for software development workflows.

The project uses MailSage, an AI-powered email summarisation application, as a testing environment.

The objective was to investigate whether a structured agent skill could improve an AI model's ability to explain JavaScript code, understand application workflows and identify implementation defects.

This is an exploratory engineering and AI evaluation project, not a production AI system or a statistically conclusive research study.

## Objectives

1. Design and implement a reusable AI agent skill.
2. Evaluate AI-generated code explanations against defined criteria.
3. Compare responses with and without the skill.
4. Develop a controlled, reproducible defect-discovery benchmark.
5. Document findings, limitations and potential improvements.

## Agent skill

The MailSage Code Explainer skill provides structured instructions for analysing and explaining application source code.

It emphasises:

- Technical accuracy and source-grounded explanations.
- Clear descriptions of application data flow.
- Accessible explanations for beginner developers.
- Identification of relevant implementation behaviour.
- Explicit acknowledgment of uncertainty.
- Structured reasoning and useful visual explanations.

The skill is located at:

`.agents/skills/mailsage-code-explainer/SKILL.md`

## Evaluation methodology

The project included exploratory comparisons of AI-generated code explanations, followed by a more controlled defect-discovery benchmark.

### Benchmark V2

Benchmark V2 uses a synthetic JavaScript inbox-processing workflow.

The workflow covers pagination, deduplication, concurrent message retrieval, filtering, sorting, result limits and error handling.

A deliberately defective implementation contains eight known behavioural defects.

A separate reference implementation and automated test suite provide a basis for verifying the intended behaviour.

The benchmark does not connect to Gmail or access production application data.

### Automated verification

The reference implementation was validated using Node.js's built-in test runner.

All 55 automated tests passed.

These tests verify the reference implementation's specified behaviour. They do not independently measure the quality of AI model responses.

### Blind evaluations

Four final blind evaluations were performed:

| Test | Thinking effort | Agent skill |
|---|---|---|
| W | High | Without Skill V3 |
| X | High | With Skill V3 |
| Y | Medium | With Skill V3 |
| Z | Medium | Without Skill V3 |

Each evaluation used:

- GPT-6.
- The same frozen requirements specification.
- The same frozen defective implementation.
- The same review instructions.
- A fresh, isolated evaluation session.
- No access to the benchmark answer key during the review.

The primary measurement was recall of the eight deliberately seeded defects.

## Results and interpretation

The final blind evaluations demonstrated successful identification of the seeded defects under both skill and no-skill conditions.

The supplementary Medium-effort evaluations were included to examine whether the comparison behaved differently at a lower thinking-effort setting.

These limited results did not establish a measurable defect-recall advantage attributable to Skill V3.

The experiment therefore should not be interpreted as evidence that the skill consistently outperforms the unassisted model.

Detailed results are available in:

`benchmark-v2/results/BLIND-RESULTS.md`

## Limitations

- Only four final Benchmark V2 evaluations were conducted.
- The benchmark used a single synthetic defective implementation.
- The small sample cannot establish statistically reliable performance differences.
- Strong baseline performance can make additional improvements difficult to detect.
- Results may not generalise to other models, repositories or engineering tasks.
- Exposing benchmark answers to future evaluations would invalidate their blind conditions.

The experiment is a practical demonstration of evaluation design rather than a claim of proven model improvement.

## Project structure

```text
.agents/
  skills/
    mailsage-code-explainer/
      SKILL.md

evals/
  mailsage-code-explainer/
    README.md
    benchmark-v2/
      requirements/
      fixtures/
      answer-key/
      tests/
      results/
        BLIND-RESULTS.md
```

## Running the automated tests

From the MailSage repository root:

```bash
node --test evals/mailsage-code-explainer/benchmark-v2/tests/*.test.mjs
```

The expected result for the frozen reference implementation is 55 passing tests.

## Key learning outcomes

This experiment provided hands-on experience with:

- Designing reusable AI agent instructions.
- Creating evaluation criteria and scoring approaches.
- Developing synthetic test fixtures.
- Constructing an executable reference implementation.
- Writing automated JavaScript tests.
- Running controlled comparisons across AI configurations.
- Distinguishing observed performance from statistically supported conclusions.
- Documenting engineering experiments for reproducibility.

## Conclusion

The MailSage Code Explainer experiment demonstrates an end-to-end process for developing an AI agent skill and evaluating its behaviour against explicit engineering requirements.

Its principal outcome is a reusable skill, a documented evaluation methodology and a verified synthetic benchmark.

The evaluation phase is closed. Further work would require a separate experimental design and additional independent test cases.