import type { ReactNode } from 'react'

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-[390px] max-w-full overflow-hidden rounded-[2.5rem] border-8 border-slate-900 bg-white shadow-xl">
      <div className="h-[720px] overflow-y-auto p-5">{children}</div>
    </div>
  )
}
