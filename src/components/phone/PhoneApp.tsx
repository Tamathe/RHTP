import { useState } from 'react'
import { FindScreeningScreen } from './FindScreeningScreen'
import { PhoneFrame } from './PhoneFrame'
import { PlanBuilderScreen } from './PlanBuilderScreen'
import { ResultScreen } from './ResultScreen'
import { VoiceCompanionScreen } from './VoiceCompanionScreen'
import { TodayScreen } from './TodayScreen'
import { WhyItMattersScreen } from './WhyItMattersScreen'

export type PhoneScreen = 'voice' | 'today' | 'why' | 'find' | 'plan' | 'result'

const ORDER: PhoneScreen[] = ['voice', 'today', 'why', 'find', 'plan', 'result']
const LABEL: Record<PhoneScreen, string> = {
  voice: 'Voice',
  today: 'Today',
  why: 'Why',
  find: 'Find',
  plan: 'Plan',
  result: 'Result',
}

export function PhoneApp() {
  const [screen, setScreen] = useState<PhoneScreen>('voice')

  return (
    <div className="py-6">
      <PhoneFrame>
        {screen === 'voice' && <VoiceCompanionScreen />}
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
