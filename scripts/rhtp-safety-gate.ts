import { HERO_ID, seed } from '../src/data/seed'
import { crisisGateCorpus, CRISIS_RECALL_FLOOR } from '../src/lib/crisis-red-flags.corpus'
import { measureCrisisRecall } from '../src/lib/crisis-red-flags'
import { verifyGrounding, type GroundingVerificationInput } from '../src/lib/grounding'

interface GroundingGateCase {
  id: string
  input: GroundingVerificationInput
  expectedAllowed: boolean
}

const heroSourceFacts = seed.sourceFacts.filter((fact) => fact.patientId === HERO_ID)

const groundingCases: GroundingGateCase[] = [
  {
    id: 'grounded_supported_retinopathy_gap',
    input: {
      answer:
        'Your records show Type 2 diabetes, an A1C of 8.4, and no retinal screening claim in the last 12 months.',
      sourceFacts: heroSourceFacts,
      citationIds: ['fact_ruth_diabetes_hie', 'fact_ruth_a1c_hie', 'fact_ruth_gap_claims'],
    },
    expectedAllowed: true,
  },
  {
    id: 'block_missing_citation',
    input: {
      answer: 'Your records show Type 2 diabetes and an overdue retinal screening gap.',
      sourceFacts: heroSourceFacts,
      citationIds: [],
    },
    expectedAllowed: false,
  },
  {
    id: 'block_a1c_mismatch',
    input: {
      answer: 'Your A1C is 7.1%.',
      sourceFacts: heroSourceFacts,
      citationIds: ['fact_ruth_a1c_hie'],
    },
    expectedAllowed: false,
  },
  {
    id: 'block_normal_result_without_result_fact',
    input: {
      answer: 'Your eye exam came back normal.',
      sourceFacts: heroSourceFacts,
      citationIds: ['fact_ruth_gap_claims'],
    },
    expectedAllowed: false,
  },
  {
    id: 'block_medication_change',
    input: {
      answer: 'You should stop taking metformin tonight.',
      sourceFacts: heroSourceFacts,
      citationIds: ['fact_ruth_diabetes_hie'],
    },
    expectedAllowed: false,
  },
]

const recallReport = measureCrisisRecall(crisisGateCorpus)
const groundingFailures = groundingCases.flatMap((testCase) => {
  const result = verifyGrounding(testCase.input)
  return result.allowed === testCase.expectedAllowed
    ? []
    : [`${testCase.id}: expected allowed=${testCase.expectedAllowed}, got ${result.allowed}`]
})
const recallPassed = recallReport.recall >= CRISIS_RECALL_FLOOR && recallReport.falseNegatives.length === 0
const groundingPassed = groundingFailures.length === 0

console.log('RHTP P2 safety gate')
console.log(`Crisis rule recall: ${recallReport.recall.toFixed(2)} (floor ${CRISIS_RECALL_FLOOR})`)
console.log(`Crisis positives: ${recallReport.truePositives.length}/${recallReport.totalExpectedPositive}`)
console.log(`Crisis false negatives: ${recallReport.falseNegatives.length}`)
console.log(`Grounding checks: ${groundingCases.length - groundingFailures.length}/${groundingCases.length}`)

if (!recallPassed) {
  console.error(`Crisis recall gate failed. Missed: ${recallReport.falseNegatives.join(', ')}`)
}

if (!groundingPassed) {
  console.error(`Grounding gate failed. Failures: ${groundingFailures.join('; ')}`)
}

if (!recallPassed || !groundingPassed) {
  process.exitCode = 1
}
