
# MailSage Code Explainer — Benchmark V1 Results

## Overview

Benchmark: V1 — Synthetic Message Triage
Fixture: message-triage.js
Answer key: message-triage-answer-key.md
Model: GPT-6
Thinking effort: Medium
Evaluation: Tests U and V

## Experimental configurations

### Test U — Without skill

- Environment: ChatGPT
- Model: GPT-6 Medium
- Memory: Project-only
- Skill V3: Not provided
- Source: message-triage.js
- Ground-truth answer key: Withheld

### Test V — With skill

- Environment: ChatGPT
- Model: GPT-6 Medium
- Memory: Project-only
- Skill V3: Attached as instructions
- Source: Identical message-triage.js
- Ground-truth answer key: Withheld

## Quantitative results

| Metric | Test U | Test V |
|---|---:|---:|
| Predefined defects | 7 | 7 |
| True positives | 7 | 7 |
| False positives | 0 | 0 |
| False negatives | 0 | 0 |
| Precision | 100% | 100% |
| Recall | 100% | 100% |
| F1 score | 100% | 100% |

Scores are based on the initial manual evaluation
against the seven predefined defects.

Additional potential risks were considered separately.

## Qualitative observations

### Test U

- Identified all seven predefined defects.
- Demonstrated strong technical understanding.
- Distinguished correct behaviours from defects.
- Included useful workflow explanations.
- Explained asynchronous processing separately.

### Test V

- Identified all seven predefined defects.
- Demonstrated strong technical understanding.
- Provided beginner-friendly explanations.
- Included explicit recommended corrections.
- Explained important JavaScript concepts.
- Did not consistently provide detailed everyday analogies.

## Interpretation

Both configurations achieved perfect defect-discovery
scores on this single synthetic benchmark.

No measurable improvement in precision or recall
was demonstrated by including Skill V3.

Differences in explanation style were observed,
but one run per configuration is insufficient
to establish a consistent skill advantage.

## Limitations

- Only one fixture was evaluated.
- Each configuration was run once.
- The fixture contained explicit intended-behaviour comments.
- The experiment exhibited a ceiling effect.
- Manual scoring may contain evaluator judgement.
- Skill V3 was explicitly supplied, not automatically discovered.

## Next steps

1. Preserve Benchmark V1 without modifying its ground truth.
2. Design a more challenging Benchmark V2.
3. Introduce interacting functions and subtle failure paths.
4. Include legitimate behaviours to test false-positive resistance.
5. Independently verify the new ground truth.
6. Repeat with-skill and without-skill comparisons.
7. Assess whether improvements justify Skill V4.