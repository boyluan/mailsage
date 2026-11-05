# MailSage Code Explainer — Evaluation Report (Tests A–Z)

**Status:** Evaluation closed · **Documentation updated:** 4 November 2026
**Project:** [MailSage](../../README.md) · **Agent skill:** [MailSage Code Explainer](../../.agents/skills/mailsage-code-explainer/SKILL.md)

## Executive summary

This report documents 26 recorded evaluations (Tests A–Z) conducted while developing and testing a reusable AI agent skill for explaining JavaScript code and identifying implementation defects. The MailSage application served as the initial source-code test environment; later benchmarks used synthetic JavaScript fixtures.

The central question was: **Does providing structured, reusable instructions through the MailSage Code Explainer skill improve the quality of an AI model's code explanations or defect discovery, compared with not providing the skill?**

Key observations:

- **A–H** were exploratory, unscored trials focused on skill invocation, discoverability, isolation and baseline conditions.
- **I–L** tested early scoring rubrics and revisions from Skill V2 to V3. Results varied by task; the comparisons do not isolate the skill's causal effect.
- **M–P** were four GPT-6 full-file explanations, all graded **48/50** using the accepted Explanation V2 rubric, both with and without Skill V3 at High and Medium thinking effort.
- **Q–R** each scored **12/12** on six explicitly asked technical questions. **S–T** each identified all six target issues (**12/12**) but also made one material overstatement apiece.
- **U–V** both found **7/7** seeded defects in Benchmark V1. That fixture contained intended-behaviour comments that could help the model.
- **W–Z** each found **8/8** deliberately seeded defects in frozen Benchmark V2. No improvement in *seeded-defect recall* attributable to Skill V3 was observed in these four runs.

**Overall conclusion:** The work demonstrates an end-to-end process for developing an agent skill, designing evaluation rubrics, creating controlled synthetic benchmarks, inspecting false claims and publishing evidence. It does **not** establish that Skill V3 consistently improves or fails to improve model performance. The experiments were small, frequently near ceiling, and not statistically conclusive.

## Contents and evidence

| Resource | Purpose |
| --- | --- |
| [Complete Evaluation Tracker (.xlsx)](results/MailSage%20Evaluation%20Tracker%20%28Tests%20A-Z%29.xlsx) | Full recorded register, scoring rubrics, comparisons, results and evidence index |
| [Test Register (.csv)](results/csv/test-register.csv) | Machine-readable record of all 26 tests |
| [Paired Comparisons (.csv)](results/csv/paired-comparisons.csv) | Seven recorded assisted/unassisted comparisons |
| [Benchmark Results (.csv)](results/csv/benchmark-results.csv) | Benchmark V1 and V2 summaries |
| [Seeded Defects (.csv)](results/csv/benchmark-seeded-defects.csv) | Eight known Benchmark V2 defects, traced across W–Z |
| [Issue Matrix (.csv)](results/csv/issue-matrix.csv) and [Q–T details (.csv)](results/csv/issue-matrix-q-t-details.csv) | Source-grounded issue assessments and overstatements |
| [Evidence Index (.csv)](results/csv/evidence-index.csv) | Source provenance and whether original evidence is publicly available |
| [Benchmark V1 summary](results/benchmark-v1-summary.md) | U/V evaluation record |
| [Benchmark V2 blind results](benchmark-v2/results/BLIND-RESULTS.md) | W–Z scoring, extra findings and limitations |

The workbook is the maintained tabular source. CSVs are exports of selected tables, not independent measurements.

## 1. Experimental design and evolution

The project developed through five phases, rather than one fixed research protocol:

| Phase | Tests | Main purpose | Measurement |
| --- | --- | --- | --- |
| Exploration | A–H | Understand whether instructions were available, invoked or absent | Unscored observations |
| Skill development and regression | I–L | Compare explanation quality while revising the skill | 12- and 18-point rubrics |
| Full-file and targeted source-code review | M–T | Examine skill/no-skill responses to the same source and focused tasks | 50-, 12- and issue-discovery rubrics |
| Benchmark V1 | U–V | Test discovery of seven deliberately seeded defects | 7-defect recall and false claims |
| Frozen Benchmark V2 | W–Z | Test discovery of eight seeded defects under two thinking-effort settings | 8-defect recall; additional findings separately recorded |

**Important:** Scores from different rubrics are not interchangeable. A score of 12/12 for teaching quality, 12/12 for six technical questions, and 8/8 for seeded-defect recall measures different things. Earlier exploratory runs were deliberately not assigned retrospective scores.

### Phase A — Exploratory tests A–H

All eight runs used `package.json`; they were designed to explore skill access and invocation, not to produce a reliable measured treatment effect.

| Test | Environment / model | Skill condition | Finding or methodological note |
| --- | --- | --- | --- |
| A | Cursor / Grok 4.6 Medium | V1, explicitly invoked | Initial direct skill invocation |
| B | Cursor / Grok 4.6 Medium | V1 available for agent use | Tested use without the same explicit invocation |
| C | Cursor / Grok 4.6 Medium | Renamed `SKILL.disabled.md` but still accessible | **Not a clean no-skill control:** the file could still be read |
| D | ChatGPT web / GPT-6 High | No skill supplied | Repository URL provided |
| E | ChatGPT web / GPT-6 High | Early instructions manually attached | Early skill version not independently verified; repository URL provided |
| F | Cursor / Grok 4.6 Medium | Skill removed from project | Cleaner no-skill baseline after moving file and reloading Cursor |
| G | Cursor / Grok 4.6 Medium | Skill V2 available/invoked | Reused baseline prompt following revision |
| H | Cursor / Grok 4.6 Medium | Skill V2 removed from project | Fresh no-skill comparison after reloading Cursor |

**Interpretation:** These runs exposed an important experimental-design problem: renaming a skill file does not guarantee that the AI agent cannot access its contents. They should not be converted into quantified evidence of effectiveness.

### Phase B — Formal rubrics and Skill V3 regression, I–L

| Test | Source file | Skill | Recorded score | What it tells us |
| --- | --- | --- | --- | --- |
| I | `src/app/layout.js` | V2 | **12/12** (teaching rubric) | Strong user-scored beginner-facing explanation |
| J | `src/app/api/emails/route.js` | V2 | **14/18** (expanded rubric) | Weaknesses in technical accuracy, completeness, data flow and visuals informed revision |
| K | `src/app/api/emails/route.js` | V3 | **16/18** (expanded rubric) | Better score than J in a single regression run |
| L | `src/app/layout.js` | V3 | **11/12** (teaching rubric) | User-confirmed result, one point below I |

These were Cursor/Grok 4.6 Medium runs using the local repository. **I versus L** and **J versus K** compare *different skill versions*, not a clean V3-versus-no-skill intervention. Each condition was tested only once. Test L's 11/12 is the confirmed recorded score; its original response was not independently rescored for the consolidated tracker.

### Phase C — GPT-6 full-file explanations, M–P

All four evaluations used the same uploaded `src/app/api/emails/route.js` source content within ChatGPT web. Unlike Tests D/E, they did not use a GitHub repository link for source access.

| Test | Thinking effort | Skill V3 supplied? | Explanation V1 | Accepted Explanation V2 |
| --- | --- | --- | --- | --- |
| M | High | Yes | 17/18 | **48/50** |
| N | High | No | 17/18 | **48/50** |
| O | Medium | No | 17/18 | **48/50** |
| P | Medium | Yes | 17/18 | **48/50** |

The final 25-criterion, 50-point rubric was the accepted basis for the paired comparisons. M/N and O/P tied on their total score, though the individual technical and presentation deductions differed. An identical total score does not imply identical responses, and one run per configuration does not establish equivalence.

### Phase D — Targeted questions and proactive discovery, Q–T

All four used GPT-6 at Medium thinking effort with the same uploaded `route.js` source.

| Test | Task | Skill V3 supplied? | Target score | Additional accuracy concern |
| --- | --- | --- | --- | --- |
| Q | Six explicitly asked technical questions | No | **12/12** | No material overstatement recorded |
| R | Same six questions | Yes | **12/12** | No material overstatement recorded |
| S | Proactively identify six known issues | No | **12/12** | One material timestamp-consequence overstatement |
| T | Same proactive discovery task | Yes | **12/12** | One material timestamp-consequence overstatement |

In S and T, both responses found all six targeted issues but also made an incorrect additional claim about invalid timestamps causing an error/discard consequence. **A perfect target-discovery score is not proof that the rest of an answer is correct.** The [Issue Matrix](results/csv/issue-matrix.csv) and [Q–T details](results/csv/issue-matrix-q-t-details.csv) preserve this distinction.

### Phase E — Benchmark V1, U–V

Benchmark V1 used the local synthetic `fixtures/message-triage.js` source and seven seeded defects. Both GPT-6 Medium sessions were recorded as isolated comparisons.

| Test | Skill V3 supplied? | Seeded defects found | False positives recorded | False negatives |
| --- | --- | --- | --- | --- |
| U | No | **7/7** | 0 | 0 |
| V | Yes, explicitly attached | **7/7** | 0 | 0 |

The fixture included comments describing intended behaviour, which made the task less independent than desired. Skill V3 was manually attached in V; this does not demonstrate automatic skill discovery. See the [Benchmark V1 summary](results/benchmark-v1-summary.md) and the original U/V PDFs in `results/`.

### Phase F — Frozen Benchmark V2, W–Z

To make the defect-discovery task more controlled, Benchmark V2 introduced a separate written [requirements specification](benchmark-v2/requirements/inbox-processing-spec.md), a deliberately [defective synthetic implementation](benchmark-v2/fixtures/defective-inbox-processing.mjs), a [reference implementation](benchmark-v2/answer-key/reference-inbox-processing.mjs), and a [Node.js automated test suite](benchmark-v2/tests/). The specifications and defective code were shared with the evaluated model; the answer key was withheld.

| Test | Thinking effort | Skill V3 supplied? | Seeded defects found | Additional finding |
| --- | --- | --- | --- | --- |
| W | High | No | **8/8** | One valid null-options issue also present in the reference |
| X | High | Yes | **8/8** | No additional confirmed finding |
| Y | Medium | Yes | **8/8** | No additional confirmed finding; static analysis reported |
| Z | Medium | No | **8/8** | No additional confirmed finding; targeted Node.js reproductions reported |

The eight seeded behavioural defects concerned:

1. Pagination stopping prematurely after an empty intermediate page.
2. Incorrect case-insensitive deduplication of case-sensitive message IDs.
3. Failure to exclude `TRASH`-labelled messages.
4. Excluding messages exactly at the timestamp cutoff.
5. Incorrect `FETCH_FAILED` classification for invalid returned details.
6. Exceeding the configured detail-request concurrency limit.
7. Sorting oldest-first when newest-first was required.
8. Suppressing failure records when the final result limit was zero.

Test W also identified a valid `filterEligibleMessages([], null)` issue shared by the reference and defective implementations. Because it was **not introduced as one of the eight seeded defects**, it was recorded separately rather than treated as a ninth seeded finding or automatically classified as a false positive. This also means the reference is **not proven specification-compliant for every possible input**.

Test Z initially proposed nine candidates but explicitly withdrew the unsupported ninth, leaving eight findings in its corrected final result. **All W–Z configurations achieved 8/8 seeded-defect recall, but precision and F1 were not comprehensively scored.** Do not interpret these entries as 100% overall defect-detection accuracy.

The reference implementation passed **55 automated JavaScript tests** when verified. Those tests assess the specified reference behaviour; they do not themselves grade the AI-generated reports. See [BLIND-RESULTS.md](benchmark-v2/results/BLIND-RESULTS.md).

## 2. Controlled comparisons and interpretation

The [paired-comparisons dataset](results/csv/paired-comparisons.csv) contains seven recorded pairs:

| Without Skill V3 | With Skill V3 | Compared outcome | Result |
| --- | --- | --- | --- |
| N | M | GPT-6 High full-file explanation (V2 rubric) | 48/50 vs 48/50 |
| O | P | GPT-6 Medium full-file explanation (V2 rubric) | 48/50 vs 48/50 |
| Q | R | Six explicit technical questions | 12/12 vs 12/12 |
| S | T | Proactive six-issue discovery | 12/12 vs 12/12; both had one overstatement |
| U | V | Benchmark V1 seeded-defect recall | 7/7 vs 7/7 |
| W | X | Benchmark V2 High seeded-defect recall | 8/8 vs 8/8 |
| Z | Y | Benchmark V2 Medium seeded-defect recall | 8/8 vs 8/8 |

Each reported pair was tied on its **specified measured total**, corresponding to an observed 0 percentage-point difference on that metric. These ties do not establish statistical equivalence. Response quality can vary in dimensions the headline scores do not capture, including explanation style, unsupported claims and reproducibility.

## 3. What was measured — and what was not

- **Explanation quality:** Assessed with rubric-based human or assistant grading. Scores reflect the criteria and judgement used at that stage, not an objective universal quality score.
- **Known-issue identification:** Assessed by comparing findings against defined issue sets. Additional incorrect claims were documented separately where observed.
- **Seeded-defect recall:** The share of deliberately planted defects correctly found. An 8/8 score means all eight planted defects were found; it does not imply that every possible defect was found.
- **Precision and F1:** Not comprehensively measured for Benchmark V2. Blank values in the exported results should remain blank, not be filled in as perfect scores.
- **Statistical reliability:** Not established. Many conditions were run only once; no repeated-run confidence intervals or significance tests were conducted.

## 4. Reproducibility and evidence boundaries

### Publicly inspectable materials

The repository includes the skill instructions, synthetic fixtures, benchmark requirements, reference implementation, automated tests, Benchmark V1/V2 summaries, an Excel tracker and exported CSV tables. Original U/V evaluation PDFs are in `results/`.

From the repository root, the reference test suite can be run using:

```bash
node --test evals/mailsage-code-explainer/benchmark-v2/tests/*.test.mjs
```

The CSVs can be regenerated from the workbook using `scripts/export_tracker_csv.py` after installing `openpyxl` 3.1.x in a Python environment:

```bash
python evals/mailsage-code-explainer/scripts/export_tracker_csv.py
```

The exporter reads the workbook; it does **not** execute the AI evaluations or recalculate the experiment's historical scoring judgements.

### Evidence retained outside the repository

The [Evidence Index](results/csv/evidence-index.csv) distinguishes published evidence from original responses and transcripts retained in ChatGPT history. In particular, not all original A–T or W–Z model-response PDFs are publicly included. The consolidated test register therefore documents historical observations, but not every response can be independently reconstructed from the public repository alone. Some early configurations were exploratory and may lack frozen prompts or complete source snapshots.

The original A–T tracker was retained as a historical baseline; the current A–Z tracker supersedes it for the public summary. Original response filenames for W–Z sometimes contain legacy `test-u` or `test-v` fragments; the test IDs and configurations in the Evidence Index provide the intended mapping.

## 5. Limitations and lessons

1. **Sample size:** One run per condition in many comparisons; insufficient to support robust performance claims.
2. **Ceiling effects:** Both skill and no-skill models frequently achieved the maximum measured outcome, limiting sensitivity to incremental differences.
3. **Different tasks and rubrics:** Teaching, technical explanation and defect-recall scores must not be pooled as one metric.
4. **Confounded early tests:** A–H changed skill availability, version, access and sometimes environment; C was not a clean no-skill control.
5. **Benchmark V1 leakage risk:** Comments describing intended behaviour made the seven-defect task easier to infer.
6. **Synthetic scope:** Benchmark V2 used one artificial inbox-processing problem and cannot establish general performance on diverse real repositories.
7. **Unscored extra findings:** Benchmark V2 measured seeded recall, not comprehensive precision, F1, or correctness of every additional claim.
8. **Reference caveat:** W identified a valid issue shared by both versions, so passing the scripted tests is not blanket proof of full specification compliance.
9. **Model and grading variance:** Model responses, versions, environments and human/assistant scoring can vary, and not all original outputs are publicly available.

### Practical lessons

- Version agent instructions and source fixtures explicitly.
- Keep a **no-skill** control genuinely free of accessible skill instructions.
- Define the target behaviour and grading rubric before testing where practical.
- Distinguish **finding known issues** from **avoiding false or overstated claims**.
- Use executable specifications and a frozen synthetic fixture for stronger comparisons.
- Preserve raw evidence, provenance, score corrections and negative results.
- Report null results and methodological limitations clearly rather than asserting an unproven improvement.

## 6. Final conclusion

The MailSage Code Explainer experiment produced a reusable agent skill, an A–Z evaluation register, seven exported datasets, an audited evidence index, and a frozen synthetic benchmark with an executable reference test suite.

**Its strongest demonstrated outcome is the evaluation workflow itself**—from exploratory prompts and rubric revisions to issue matrices, blind tests, reproducible fixtures and disciplined interpretation. Across the seven recorded paired comparisons, no advantage on the particular measured headline outcome was observed for Skill V3. The available evidence is too limited to conclude that the skill is generally better, worse or equivalent across software-development tasks.

**Evaluation status: closed.** Any future claim of generalizable improvement would require a separate study with additional tasks, independent responses, more runs and a pre-specified scoring plan.
