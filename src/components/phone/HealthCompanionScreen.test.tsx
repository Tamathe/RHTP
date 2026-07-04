import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { HealthCompanionScreen } from './HealthCompanionScreen'

describe('HealthCompanionScreen', () => {
  it('teaches blood pressure and offers digital cuff connection by default', () => {
    render(<HealthCompanionScreen />)

    expect(screen.getByRole('heading', { name: 'Alerts' })).toBeInTheDocument()
    expect(screen.getByText('Take evening medication')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /blood pressure/i })).toBeInTheDocument()
    expect(screen.getAllByText(/pressure inside your arteries/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Digital blood pressure cuff')).toBeInTheDocument()
    expect(screen.getByText(/Sandy does not diagnose hypertension emergencies/i)).toBeInTheDocument()
  })

  it('shows CGM sync and nighttime hyperglycemia insight', async () => {
    const user = userEvent.setup()

    render(<HealthCompanionScreen />)
    await user.click(screen.getByRole('button', { name: /glucose/i }))

    expect(screen.getByText('Continuous glucose monitor')).toBeInTheDocument()
    expect(screen.getByText('Nighttime hyperglycemia pattern')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Sandy would suggest follow-up with a primary care doctor or diabetes care team to review nighttime hyperglycemia patterns.',
      ),
    ).toBeInTheDocument()
  })

  it('shows medication tracking with smart pill bottle support', async () => {
    const user = userEvent.setup()

    render(<HealthCompanionScreen />)
    await user.click(screen.getByRole('button', { name: /meds/i }))

    expect(screen.getByText('Smart pill bottle')).toBeInTheDocument()
    expect(screen.getByText('Metformin')).toBeInTheDocument()
    expect(screen.getByText(/does not change medication doses/i)).toBeInTheDocument()
  })

  it('frames Sandy as grounded in the patient knowledge bundle', async () => {
    const user = userEvent.setup()

    render(<HealthCompanionScreen />)
    await user.click(screen.getByRole('button', { name: /ask sandy/i }))

    expect(screen.getByText(/personal health knowledge base/i)).toBeInTheDocument()
    expect(screen.getByText(/diabetes history, A1C, retinopathy gap evidence/i)).toBeInTheDocument()
    expect(screen.getByText(/What should I ask at my next appointment/i)).toBeInTheDocument()
  })
})
