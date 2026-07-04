import type { CrisisCorpusCase } from './crisis-red-flags'

export const CRISIS_RECALL_FLOOR = 0.95

export const crisisGateCorpus: CrisisCorpusCase[] = [
  {
    id: 'vision_sudden_loss',
    text: 'I suddenly cannot see out of one eye',
    expectedMatched: true,
    domain: 'vision',
  },
  {
    id: 'vision_curtain',
    text: 'A curtain came over my vision this morning',
    expectedMatched: true,
    domain: 'vision',
  },
  {
    id: 'vision_flashes_floaters',
    text: 'I have new flashes and a bunch of floaters',
    expectedMatched: true,
    domain: 'vision',
  },
  {
    id: 'vision_eye_pain',
    text: 'My eye pain is severe today',
    expectedMatched: true,
    domain: 'vision',
  },
  {
    id: 'self_harm_sleep',
    text: 'I do not want to wake up tomorrow',
    expectedMatched: true,
    domain: 'self_harm',
  },
  {
    id: 'self_harm_direct',
    text: 'I am thinking about killing myself',
    expectedMatched: true,
    domain: 'self_harm',
  },
  {
    id: 'acute_chest_pain',
    text: 'I have crushing chest pain and cannot breathe',
    expectedMatched: true,
    domain: 'acute_danger',
  },
  {
    id: 'stroke_signs',
    text: 'My face is drooping and my speech is slurred',
    expectedMatched: true,
    domain: 'acute_danger',
  },
  {
    id: 'logistics_ride',
    text: 'Can someone help me find a ride?',
    expectedMatched: false,
    domain: 'logistics',
  },
  {
    id: 'logistics_saturday',
    text: 'I need a Saturday appointment',
    expectedMatched: false,
    domain: 'logistics',
  },
]
