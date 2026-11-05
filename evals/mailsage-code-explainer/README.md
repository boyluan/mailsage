# MailSage Code Explainer — AI Agent Skill Experiment

## Overview

A practical experiment in designing, implementing and evaluating a reusable AI agent skill for software development workflows.

The project uses [MailSage](../../README.md), an AI-powered email summarisation application, as an initial source-code testing environment. Later stages use deliberately synthetic JavaScript fixtures rather than personal Gmail data.

The central question was whether structured agent instructions could improve an AI model's ability to explain JavaScript code, understand application workflows and identify implementation defects compared with not providing the skill.

**Status: evaluation closed.** This is an exploratory engineering and AI evaluation project, not a production AI system or a statistically conclusive research study.

**Start here:** [Complete Evaluation Report — Tests A–Z](EVALUATION-REPORT.md). It covers all 26 recorded evaluations, experimental design, scoring, comparisons, findings, evidence and limitations.

## Objectives

1. Design and implement a reusable AI agent skill.
2. Evaluate AI-generated code explanations against defined criteria.
3. Compare responses with and without the skill, where experimental conditions allow.
4. Develop a controlled, reproducible defect-discovery benchmark.
5. Document findings, limitations and potential improvements without overstating their significance.

## Agent skill

The [MailSage Code Explainer skill](../../.agents/skills/mailsage-code-explainer/SKILL.md) provides structured instructions for analysing and explaining application source code.

It emphasises:

- Technical accuracy and source-grounded explanations.
- Clear descriptions of application data flow.
- Accessible explanations for beginner developers.
- Identification of relevant implementation behaviour and defects.
- Explicit acknowledgment of uncertainty.
- Structured explanations and useful visual reasoning.

The final evaluation used **Skill V3**. Earlier tests also explored V1 and V2; these versions should not be treated as identical conditions.

## Evaluation history — Tests A–Z

The experiment developed in stages rather than under one unchanged protocol. Different phases used different tasks and grading rubrics; their scores should **not** be pooled into a single performance metric.

| Tests | Phase | Recorded outcome |
| --- | --- | --- |
| A–H | Skill invocation, discoverability, availability and baseline exploration | Unscored exploratory observations |
| I–L | Teaching and source-code explanation rubrics; V2-to-V3 revisions | I: 12/12; J: 14/18; K: 16/18; L: 11/12 |
| M–P | GPT-6 full-file explanations, with and without Skill V3 at High and Medium thinking effort | All four: 48/50 on the accepted Explanation V2 rubric |
| Q–R | Answers to six explicit technical questions | Both: 12/12 |
| S–T | Proactive discovery of six known source-code issues | Both: 12/12 on the target issues; each also made one material overstatement |
| U–V | Benchmark V1, seven deliberately seeded defects | Both: 7/7 defects identified |
| W–Z | Frozen Benchmark V2, eight deliberately seeded defects | All four: 8/8 seeded defects identified |

**Important context:** A–H did not establish clean causal comparisons. I–L compared different skill revisions and tasks. M–T used source-grounded explanation and issue-discovery rubrics. U–Z used synthetic defect-discovery benchmarks. Read the [full report](EVALUATION-REPORT.md) for the exact test conditions and evidence boundaries.

### Recorded paired comparisons

Seven paired comparisons are recorded in the [paired comparisons dataset](results/csv/paired-comparisons.csv): N/M, O/P, Q/R, S/T, U/V, W/X and Z/Y. All pairs tied on their *specific measured headline outcome*. This does not mean their responses were identical, or that the skill has been proven generally equivalent to the unassisted model.

## Benchmark V2 — frozen synthetic inbox processing

Benchmark V2 uses a synthetic JavaScript inbox-processing workflow. It covers pagination, deduplication, concurrent message retrieval, filtering, sorting, result limits and error handling.

The benchmark includes:

- A [frozen requirements specification](benchmark-v2/requirements/inbox-processing-spec.md).
- A deliberately [defective implementation](benchmark-v2/fixtures/defective-inbox-processing.mjs) containing eight known behavioural defects.
- A separate [reference implementation](benchmark-v2/answer-key/reference-inbox-processing.mjs).
- An executable [Node.js test suite](benchmark-v2/tests/) for the specified reference behaviour.
- [Blind evaluation results](benchmark-v2/results/BLIND-RESULTS.md).

The benchmark does **not** connect to Gmail, access production credentials or operate on real email messages. The answer key was withheld from the models during the blind reviews.

### Automated verification

The reference implementation was checked using Node.js's built-in test runner. **All 55 automated tests passed** in the recorded verification.

These tests assess the reference implementation's specified behaviour. They do **not** independently grade the quality of AI responses, nor do they prove the reference is correct for every possible input. Test W identified a separate valid null-options issue affecting both the reference and defective implementations.

### Final blind evaluations

Four final blind evaluations used GPT-6 with frozen requirements, defective implementation and substantively equivalent evaluation instructions.

| Test | Thinking effort | Skill V3 supplied? | Seeded defects found | Additional note |
| --- | --- | --- | --- | --- |
| W | High | No | 8/8 | One valid, unseeded null-options issue |
| X | High | Yes | 8/8 | No additional confirmed issue |
| Y | Medium | Yes | 8/8 | Static source review reported |
| Z | Medium | No | 8/8 | Targeted local reproductions reported; withdrew an unsupported ninth candidate |

The primary measured outcome was **recall of the eight seeded defects**. All four configurations reached 8/8. Benchmark V2 precision and F1 were **not comprehensively scored**, so the results should not be described as 100% overall defect-detection accuracy.

The controlled runs did not demonstrate an incremental seeded-defect-recall advantage from Skill V3. They also do not prove that Skill V3 is ineffective for other tasks, teaching quality, consistency, difficulty levels or models.

## Evaluation data and evidence

The maintained [Excel Evaluation Tracker (Tests A–Z)](results/MailSage%20Evaluation%20Tracker%20%28Tests%20A-Z%29.xlsx) contains the complete recorded register, scores, rubrics, comparisons, benchmark findings and evidence index.

GitHub may offer the `.xlsx` file as a download rather than a fully rendered spreadsheet. Selected tables have therefore also been exported as plain-text CSV files that can be inspected directly in the repository:

| Dataset | Description |
| --- | --- |
| [test-register.csv](results/csv/test-register.csv) | All 26 recorded tests A–Z |
| [paired-comparisons.csv](results/csv/paired-comparisons.csv) | Seven recorded comparisons |
| [benchmark-results.csv](results/csv/benchmark-results.csv) | U–Z benchmark result summaries |
| [benchmark-seeded-defects.csv](results/csv/benchmark-seeded-defects.csv) | Eight V2 seeded defects and their discovery across W–Z |
| [issue-matrix.csv](results/csv/issue-matrix.csv) | Six technical issues in the source-code evaluation |
| [issue-matrix-q-t-details.csv](results/csv/issue-matrix-q-t-details.csv) | Focused Q–T issue findings and overstatements |
| [evidence-index.csv](results/csv/evidence-index.csv) | Record provenance and public/private evidence status |

Supporting records include the [Benchmark V1 summary](results/benchmark-v1-summary.md), the original U/V PDFs in `results/`, and the [Benchmark V2 results](benchmark-v2/results/BLIND-RESULTS.md).

**Evidence boundary:** The test register covers A–Z, but not every original AI response or transcript is publicly included. The Evidence Index marks items retained in ChatGPT history or other private records. Some early trials are exploratory and cannot be independently reconstructed from the public repository alone.

### Regenerating the CSV exports

From the MailSage repository root, use a Python environment with `openpyxl` 3.1.x installed:

```bash
python evals/mailsage-code-explainer/scripts/export_tracker_csv.py
```

The [export script](scripts/export_tracker_csv.py) reads the maintained workbook and writes seven CSV files into `results/csv/`. It checks expected records and CSV read-back consistency. **It does not rerun AI evaluations or independently recalculate historical grading decisions.**

## Running the automated tests

From the MailSage repository root:

```bash
node --test evals/mailsage-code-explainer/benchmark-v2/tests/*.test.mjs
```

The expected result for the frozen reference implementation is **55 passing tests**.

## Limitations

- Only four final Benchmark V2 evaluations were conducted, one per configuration.
- The benchmark used a single synthetic defective implementation.
- The small sample cannot establish statistically reliable performance differences or equivalence.
- Strong baseline performance created ceiling effects that could conceal modest improvements.
- Earlier tests varied in skill availability, version, model or task; some were not clean controls.
- Benchmark V1 contained intended-behaviour comments that may have helped identify defects.
- Finding all known seeded defects does not demonstrate perfect accuracy or comprehensive defect detection.
- Not all original A–Z model responses are publicly archived in this repository.
- Results may not generalise to other models, repositories or engineering tasks.
- Passing reference tests does not guarantee specification compliance for all untested input cases.

This is a practical demonstration of evaluation design rather than a claim of proven model improvement.

## Project structure

```text
.agents/
  skills/
    mailsage-code-explainer/
      SKILL.md

evals/
  mailsage-code-explainer/
    README.md
    EVALUATION-REPORT.md
    answer-key/
    fixtures/
    benchmark-v2/
      requirements/
      fixtures/
      answer-key/
      tests/
      results/
        BLIND-RESULTS.md
    results/
      MailSage Evaluation Tracker (Tests A-Z).xlsx
      benchmark-v1-summary.md
      [original U/V evaluation PDFs]
      csv/
        test-register.csv
        paired-comparisons.csv
        benchmark-results.csv
        benchmark-seeded-defects.csv
        issue-matrix.csv
        issue-matrix-q-t-details.csv
        evidence-index.csv
    scripts/
      export_tracker_csv.py
```

## Key learning outcomes

This experiment provided hands-on experience with:

- Designing reusable AI agent instructions and managing skill versions.
- Creating evaluation criteria and interpreting rubric scores.
- Developing synthetic fixtures and executable reference implementations.
- Writing automated JavaScript tests.
- Running controlled comparisons across AI configurations.
- Distinguishing seeded-defect recall from false positives and unsupported claims.
- Identifying confounding factors, ceiling effects and evidence limitations.
- Maintaining an evaluation tracker and reproducible CSV exports.
- Documenting engineering experiments transparently for independent review.

## Conclusion

The MailSage Code Explainer experiment demonstrates an end-to-end process for developing an AI agent skill and evaluating its behaviour against explicit software-engineering requirements.

Its principal outputs are a reusable skill, an A–Z evaluation record, documented comparisons and limitations, and a verified synthetic benchmark with an executable reference test suite.

**The strongest outcome is the evaluation process itself—not a proven performance gain attributable to Skill V3.** Across the recorded paired comparisons, the measured headline outcomes were tied. Further work would require a separate experimental design, more independent test cases, repeated runs and prespecified scoring.

**Evaluation phase: closed.** See [EVALUATION-REPORT.md](EVALUATION-REPORT.md) for the full experimental history and results.