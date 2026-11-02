# MailSage Code Explainer — Benchmark V2 Blind Results

Date: 2026-11-02

## Status

**Evaluation phase closed.**

All four planned blind evaluations (W, X, Y and Z) have been completed. No additional experimental runs are planned.

## Objective

Evaluate whether Skill V3 improves GPT-6's ability to identify substantive JavaScript implementation defects against a written requirements specification.

The primary measurement is recall of the eight deliberately seeded behavioural defects in frozen Benchmark V2.

## Experimental controls

- Model: GPT-6
- Thinking effort: High or Medium
- Treatment: Skill V3 provided or omitted
- Benchmark: Frozen Benchmark V2
- Input: Synthetic defective inbox-processing implementation
- Reference: Frozen requirements specification
- Review task: Identical substantive evaluation instructions
- Sessions: Fresh, isolated, unpersonalized temporary chats
- Grading: Comparison against eight known seeded defects
- No access to the benchmark answer key during blind reviews

## Results

| Test | Effort | Skill V3 | Seeded defects found | Missed | Additional findings |
|---|---|---|---|---|---|
| W | High | No | 8/8 | 0 | 1 valid shared issue |
| X | High | Yes | 8/8 | 0 | None |
| Y | Medium | Yes | 8/8 | 0 | None |
| Z | Medium | No | 8/8 | 0 | None |

Every configuration achieved 100% recall of the eight seeded defects.

There was no measured improvement in seeded-defect recall from Skill V3 at either thinking-effort level.

## Seeded defects

1. Premature pagination termination after an empty intermediate page.
2. Case-insensitive deduplication of case-sensitive message IDs.
3. Failure to exclude messages labelled TRASH.
4. Exclusion of messages exactly at the timestamp cutoff.
5. Incorrect FETCH_FAILED classification for invalid returned details.
6. Exceeding the configured maximum number of concurrent detail requests.
7. Sorting eligible messages oldest-first instead of newest-first.
8. Suppressing failure records when the final result limit is zero.

All eight defects were identified in Tests W, X, Y and Z.

## Additional findings

Test W identified a null-options validation issue involving `filterEligibleMessages([], null)`.

The issue affects both the reference implementation and the deliberately defective implementation.

It is recorded separately from the eight seeded defects because it is not an introduced benchmark defect.

The reference implementation therefore should not be described as proven fully specification-compliant for every possible input.

## Test Y — Medium with Skill V3

- Eight seeded defects identified.
- Six classified as high severity.
- Two classified as medium severity.
- No additional confirmed defects.
- The report describes static, source-grounded analysis.
- No runtime test execution was reported.

## Test Z — Medium without Skill V3

- Eight seeded defects identified.
- Six classified as high severity.
- Two classified as medium severity.
- No additional confirmed defects.
- The report documents targeted local Node.js reproductions.

Test Z initially reported nine findings, then explicitly corrected its total to eight after ruling out a suspected pagination-validation defect.

The corrected final count of eight is used for scoring.

## Interpretation

Both configurations detected every seeded defect at both thinking-effort levels.

The results do not demonstrate an incremental defect-detection benefit from Skill V3 on this benchmark.

They also do not establish that Skill V3 is ineffective for other tasks, difficulty levels, teaching quality, response consistency or evaluation environments.

The findings are descriptive rather than statistically conclusive.

## Limitations

1. Each configuration was evaluated only once in the final blind comparison.
2. The benchmark contained eight deliberately seeded defects.
3. Perfect recall creates a ceiling effect that prevents distinguishing stronger detection performance between configurations.
4. The benchmark does not measure performance across a representative distribution of real-world codebases.
5. Severity labels and explanatory quality were not independently scored in this final comparison.
6. Test Y used static analysis, while Test Z also reported local test execution.
7. Thinking-effort settings and isolation procedures are recorded from the evaluation setup rather than independently established by the PDF reports.
8. An additional unseeded null-options issue was found in both reference and defective implementations.
9. The results should not be interpreted as proof of statistical equivalence between configurations.

## Conclusion

The MailSage Code Explainer experiment successfully developed and exercised a reusable AI review skill and a controlled, requirements-based evaluation workflow.

Frozen Benchmark V2 provided a consistent comparison target.

Across four final blind evaluations, GPT-6 identified all eight seeded defects, with and without Skill V3, at both Medium and High thinking effort.

No incremental seeded-defect recall benefit was observed.

The experiment is closed regardless of outcome. Further development is outside the agreed evaluation scope.

## Publication

The final project documentation should explain:

- The purpose and design of Skill V3.
- The Benchmark V2 methodology.
- The controlled blind evaluations.
- The observed results.
- The experimental limitations.
- The distinction between successful evaluation engineering and demonstrated skill effectiveness.

The findings should be presented without claims of statistical significance or unsupported performance improvements.