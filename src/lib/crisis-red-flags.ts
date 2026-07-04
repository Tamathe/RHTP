export type CrisisDomain = 'vision' | 'self_harm' | 'acute_danger' | 'logistics'
export type CrisisMatchSource = 'deterministic' | 'model_backstop' | 'none'

export interface CrisisScreeningOptions {
  modelBackstopMatched?: boolean
}

export interface CrisisScreeningResult {
  matched: boolean
  source: CrisisMatchSource
  domain: CrisisDomain | null
  ruleIds: string[]
  requiresRuleGapTicket: boolean
}

export interface CrisisCorpusCase {
  id: string
  text: string
  expectedMatched: boolean
  domain: CrisisDomain
}

export interface CrisisRecallReport {
  recall: number
  totalExpectedPositive: number
  truePositives: string[]
  falseNegatives: string[]
  falsePositives: string[]
}

interface CrisisRule {
  id: string
  domain: Exclude<CrisisDomain, 'logistics'>
  pattern: RegExp
}

const CRISIS_RULES: CrisisRule[] = [
  {
    id: 'vision_sudden_loss',
    domain: 'vision',
    pattern: /sudden(?:ly)?\s+(?:lost|loss|lose|cannot|can't|cant).{0,32}(?:see|vision)/i,
  },
  {
    id: 'vision_loss',
    domain: 'vision',
    pattern: /(?:loss\s+of\s+vision|vision\s+loss|cannot\s+see|can't\s+see|cant\s+see)/i,
  },
  {
    id: 'vision_sudden_changes',
    domain: 'vision',
    pattern: /sudden(?:ly)?\s+vision\s+changes?/i,
  },
  {
    id: 'vision_curtain_shadow',
    domain: 'vision',
    pattern: /(?:curtain|shadow).{0,32}vision/i,
  },
  {
    id: 'vision_flashes_floaters',
    domain: 'vision',
    pattern: /(?:new\s+)?flashes?.{0,32}floaters?|(?:new\s+)?floaters?.{0,32}flashes?/i,
  },
  {
    id: 'vision_eye_pain',
    domain: 'vision',
    pattern: /(?:severe\s+)?eye\s+pain|eye\s+pain.{0,48}(?:worse|severe)|eye\s+pain\s+is\s+severe/i,
  },
  {
    id: 'self_harm_wake_up',
    domain: 'self_harm',
    pattern: /(?:do\s+not|don't|dont)\s+want\s+to\s+wake\s+up/i,
  },
  {
    id: 'self_harm_suicide',
    domain: 'self_harm',
    pattern: /(?:kill(?:ing)?\s+myself|suicid(?:e|al)|end\s+my\s+life|hurt\s+myself)/i,
  },
  {
    id: 'acute_chest_breathing',
    domain: 'acute_danger',
    pattern: /(?:crushing\s+)?chest\s+pain.{0,48}(?:cannot|can't|cant).{0,16}breathe/i,
  },
  {
    id: 'acute_stroke_signs',
    domain: 'acute_danger',
    pattern: /(?:face\s+is\s+drooping|facial\s+droop|speech\s+is\s+slurred|slurred\s+speech)/i,
  },
]

export function screenCrisisRedFlags(
  input: string,
  options: CrisisScreeningOptions = {},
): CrisisScreeningResult {
  const matchedRules = CRISIS_RULES.filter((rule) => rule.pattern.test(input))

  if (matchedRules.length > 0) {
    return {
      matched: true,
      source: 'deterministic',
      domain: matchedRules[0].domain,
      ruleIds: matchedRules.map((rule) => rule.id),
      requiresRuleGapTicket: false,
    }
  }

  if (options.modelBackstopMatched) {
    return {
      matched: true,
      source: 'model_backstop',
      domain: null,
      ruleIds: [],
      requiresRuleGapTicket: true,
    }
  }

  return {
    matched: false,
    source: 'none',
    domain: null,
    ruleIds: [],
    requiresRuleGapTicket: false,
  }
}

export function measureCrisisRecall(cases: CrisisCorpusCase[]): CrisisRecallReport {
  const expectedPositive = cases.filter((testCase) => testCase.expectedMatched)
  const truePositives: string[] = []
  const falseNegatives: string[] = []
  const falsePositives: string[] = []

  for (const testCase of cases) {
    const result = screenCrisisRedFlags(testCase.text)
    if (testCase.expectedMatched && result.matched) truePositives.push(testCase.id)
    if (testCase.expectedMatched && !result.matched) falseNegatives.push(testCase.id)
    if (!testCase.expectedMatched && result.matched) falsePositives.push(testCase.id)
  }

  return {
    recall: expectedPositive.length === 0 ? 1 : truePositives.length / expectedPositive.length,
    totalExpectedPositive: expectedPositive.length,
    truePositives,
    falseNegatives,
    falsePositives,
  }
}
