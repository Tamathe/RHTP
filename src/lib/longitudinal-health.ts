export type HealthCompanionSectionId = 'blood-pressure' | 'glucose' | 'medications' | 'ask-sandy'

export interface HealthDevice {
  name: string
  status: 'available_to_connect' | 'simulated_connected'
  detail: string
}

export interface HealthInsight {
  label: string
  detail: string
  suggestedAction: string
}

export interface MedicationSummary {
  name: string
  schedule: string
  support: string
}

export interface HealthCompanionSection {
  id: HealthCompanionSectionId
  title: string
  eyebrow: string
  summary: string
  lessons: string[]
  device?: HealthDevice
  insights: HealthInsight[]
  medications?: MedicationSummary[]
  safety: string
  sandyPrompts: string[]
}

export const healthCompanionSections: HealthCompanionSection[] = [
  {
    id: 'blood-pressure',
    title: 'Blood pressure',
    eyebrow: 'Heart and kidney protection',
    summary:
      'Blood pressure is the pressure inside your arteries. Keeping it controlled lowers strain on the heart, brain, kidneys, and eyes.',
    lessons: [
      'Blood pressure is the pressure inside your arteries as blood moves through your body.',
      'High blood pressure often has no symptoms, so home readings can reveal risk earlier.',
      'Lower salt, regular movement, sleep, less tobacco exposure, and taking medicines as prescribed can help keep it down.',
    ],
    device: {
      name: 'Digital blood pressure cuff',
      status: 'available_to_connect',
      detail: 'Connect a home cuff or wearable so Sandy can notice trends and help prepare questions for your care team.',
    },
    insights: [
      {
        label: 'Morning readings run higher',
        detail: 'Recent simulated readings average 146/88 before breakfast and 132/80 later in the day.',
        suggestedAction: 'Keep measuring at the same times and ask your primary care team whether the pattern needs review.',
      },
    ],
    safety:
      'Sandy can teach, organize readings, and suggest follow-up questions. Sandy does not diagnose hypertension emergencies or change medication doses.',
    sandyPrompts: [
      'Why does blood pressure matter if I feel okay?',
      'What should I ask my doctor about my home readings?',
      'Can you help me make a lower-salt grocery plan?',
    ],
  },
  {
    id: 'glucose',
    title: 'Glucose',
    eyebrow: 'Diabetes pattern support',
    summary:
      'Glucose trends show how food, sleep, stress, medicines, and activity may be affecting blood sugar across the day.',
    lessons: [
      'Continuous glucose monitors can show patterns that single finger-stick checks may miss.',
      'Repeated highs or lows are more useful than one isolated reading when deciding what to discuss with a clinician.',
      'Food timing, evening snacks, missed medicines, illness, sleep, and steroid medicines can all affect nighttime glucose.',
    ],
    device: {
      name: 'Continuous glucose monitor',
      status: 'available_to_connect',
      detail: 'Sync a CGM so Sandy can summarize patterns and prepare a care-team follow-up note.',
    },
    insights: [
      {
        label: 'Nighttime hyperglycemia pattern',
        detail: 'Simulated CGM data shows glucose drifting above range between 11 PM and 3 AM on most nights this week.',
        suggestedAction:
          'Sandy would suggest follow-up with a primary care doctor or diabetes care team to review nighttime hyperglycemia patterns.',
      },
    ],
    safety:
      'Sandy can summarize glucose patterns and suggest follow-up. Sandy does not change insulin, diabetes medicines, or correction plans.',
    sandyPrompts: [
      'Why am I high overnight?',
      'What patterns should I show my primary care doctor?',
      'How can I log meals and sleep next to my CGM data?',
    ],
  },
  {
    id: 'medications',
    title: 'Medications',
    eyebrow: 'Adherence and appointment support',
    summary:
      'Medication support helps you keep track of what you take, notice missed-dose patterns, and prepare questions before appointments.',
    lessons: [
      'A medication list is safest when it includes prescriptions, over-the-counter medicines, supplements, and allergies.',
      'Smart pill bottles can help spot missed-dose patterns and remind you before refills run out.',
      'If side effects or costs get in the way, Sandy can help prepare a navigator or care-team question.',
    ],
    device: {
      name: 'Smart pill bottle',
      status: 'available_to_connect',
      detail: 'Connect a pill bottle to track openings, reminders, refill timing, and visit-prep questions.',
    },
    insights: [
      {
        label: 'Evening medicine is easier to miss',
        detail: 'Simulated bottle openings suggest the evening dose is missed more often than the morning dose.',
        suggestedAction: 'Ask Sandy to build a reminder plan or prepare a medication-adherence question for the care team.',
      },
    ],
    medications: [
      {
        name: 'Metformin',
        schedule: 'Twice daily',
        support: 'Track routine, side effects, and refill timing.',
      },
      {
        name: 'Lisinopril',
        schedule: 'Every morning',
        support: 'Pair with home blood pressure readings for visit prep.',
      },
    ],
    safety:
      'Sandy can remind, track, and help prepare questions. Sandy does not change medication doses, stop medicines, or replace pharmacist or clinician review.',
    sandyPrompts: [
      'Help me remember my evening medicine.',
      'What questions should I ask about side effects?',
      'Can you help me schedule a medication review appointment?',
    ],
  },
  {
    id: 'ask-sandy',
    title: 'Ask Sandy',
    eyebrow: 'Personal health knowledge base',
    summary:
      'Sandy answers from the patient-owned knowledge bundle: conditions, medicines, care gaps, device trends, source facts, and recent conversations.',
    lessons: [
      'The better the source bundle, the more specific Sandy can be about what changed and what to ask next.',
      'Sandy should show which facts or trends it used before recommending a follow-up step.',
      'Questions about urgent symptoms, diagnosis, or medication changes should move to a human reviewer.',
    ],
    insights: [
      {
        label: 'Knowledge bundle ready',
        detail: 'Sandy can use diabetes history, A1C, retinopathy gap evidence, BP pattern, CGM pattern, and medications.',
        suggestedAction: 'Ask Sandy for an explanation, a trend summary, or a visit-prep question list.',
      },
    ],
    safety:
      'Sandy is a coach and care-navigation agent. Urgent symptoms, diagnosis, and medication decisions need a clinician or navigator workflow.',
    sandyPrompts: [
      'What changed in my health this week?',
      'What should I ask at my next appointment?',
      'Why is my eye screening connected to diabetes and blood pressure?',
    ],
  },
]

export function getHealthCompanionSection(id: HealthCompanionSectionId): HealthCompanionSection {
  return healthCompanionSections.find((section) => section.id === id) ?? healthCompanionSections[0]
}
