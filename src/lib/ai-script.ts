export const FALLBACK =
  "I can't answer that one directly — but your care team can. Want me to send this to a navigator?"

export interface ScriptedAnswer {
  chip: string
  answer: string
}

export const PATIENT_CHIPS: ScriptedAnswer[] = [
  {
    chip: 'Why me?',
    answer:
      'You have diabetes, and there is no eye screening on record in the last 19 months. People with diabetes are due for a retinal screening about once a year, so the app is flagging it now.',
  },
  {
    chip: 'Can I wait?',
    answer:
      'Waiting is risky. Early diabetic eye disease usually has no symptoms, so it can progress silently. A quick screening now is the best way to catch anything early, while it is easy to treat.',
  },
  {
    chip: 'What is the test like?',
    answer:
      'It is quick and painless. A camera takes a photo of the back of your eye. No needles, and at the mobile-camera site you do not need your eyes dilated. It takes about 10-15 minutes.',
  },
  {
    chip: 'Will this cost money?',
    answer:
      'The nearby mobile-camera screening is low-cost and often covered. If cost is a worry, tap "worried about cost" in your plan and a navigator will confirm coverage before you go.',
  },
]

export const WHY_IT_MATTERS_ANSWER =
  'For you specifically: your last A1C was 8.4, which is elevated, and it has been 19 months since your last eye screening. Higher A1C over time raises the risk of diabetic retinopathy, and screening is how we catch it early. This does not diagnose eye disease - it explains why a screening is recommended for you now.'

export const WHY_CHIPS: ScriptedAnswer[] = [
  { chip: 'Why does this matter for me?', answer: WHY_IT_MATTERS_ANSWER },
  ...PATIENT_CHIPS,
]

export const resolveAnswer = (
  input: string,
  chips: ScriptedAnswer[] = PATIENT_CHIPS,
): string => {
  const key = input.trim().toLowerCase()
  const hit = chips.find((chip) => chip.chip.toLowerCase() === key)
  return hit ? hit.answer : FALLBACK
}
