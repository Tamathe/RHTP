import { useState } from 'react'
import { FindScreeningScreen } from './FindScreeningScreen'
import { HealthCompanionScreen } from './HealthCompanionScreen'
import { AfterVisitExplainerScreen } from './AfterVisitExplainerScreen'
import { PhoneFrame } from './PhoneFrame'
import { PlanBuilderScreen } from './PlanBuilderScreen'
import { ResultScreen } from './ResultScreen'
import { VoiceCompanionScreen } from './VoiceCompanionScreen'
import { TodayScreen } from './TodayScreen'
import { WhyItMattersScreen } from './WhyItMattersScreen'
import { HERO_ID } from '../../data/seed'
import { accessibilityProfileForPatient } from '../../lib/accessibility-policy'
import { useStore } from '../../store/useStore'

export type PhoneScreen = 'voice' | 'health' | 'visit' | 'today' | 'why' | 'find' | 'plan' | 'result'

const ORDER: PhoneScreen[] = ['voice', 'health', 'visit', 'today', 'why', 'find', 'plan', 'result']
const LABEL: Record<PhoneScreen, string> = {
  voice: 'Voice',
  health: 'Health',
  visit: 'Visit',
  today: 'Today',
  why: 'Why',
  find: 'Find',
  plan: 'Plan',
  result: 'Result',
}

export function PhoneApp() {
  const [screen, setScreen] = useState<PhoneScreen>('voice')
  const patient = useStore((state) => state.patients.find((candidate) => candidate.id === HERO_ID) ?? state.patients[0])
  const accessibilityProfile = accessibilityProfileForPatient(patient)

  return (
    <div
      aria-label={accessibilityProfile.ariaLabel}
      className={`py-6 ${accessibilityProfile.className}`}
      data-keyboard-navigation={accessibilityProfile.keyboardNavigation}
      data-min-touch-target-px={accessibilityProfile.minTouchTargetPx}
      data-read-aloud={accessibilityProfile.readAloud}
      data-screen-reader={accessibilityProfile.screenReader}
    >
      <PhoneFrame>
        {screen === 'voice' && <VoiceCompanionScreen />}
        {screen === 'health' && <HealthCompanionScreen />}
        {screen === 'visit' && <AfterVisitExplainerScreen />}
        {screen === 'today' && <TodayScreen onNext={() => setScreen('find')} />}
        {screen === 'why' && <WhyItMattersScreen />}
        {screen === 'find' && <FindScreeningScreen onSelect={() => setScreen('plan')} />}
        {screen === 'plan' && <PlanBuilderScreen onDone={() => setScreen('result')} />}
        {screen === 'result' && <ResultScreen />}
      </PhoneFrame>
      <div className="mx-auto mt-4 flex w-[390px] max-w-full justify-between gap-1">
        {ORDER.map((item) => (
          <button
            key={item}
            onClick={() => setScreen(item)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${
              screen === item ? 'bg-teal-700 text-white' : 'bg-stone-200 text-slate-700'
            }`}
          >
            {LABEL[item]}
          </button>
        ))}
      </div>
    </div>
  )
}
