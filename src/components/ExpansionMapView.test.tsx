import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExpansionMapView } from './hub/ExpansionMapView'

describe('ExpansionMapView', () => {
  it('marks retinopathy live and lists the next use cases', () => {
    render(<ExpansionMapView />)
    expect(screen.getByText(/diabetic retinopathy/i)).toBeInTheDocument()
    expect(screen.getByText(/A1C follow-up/i)).toBeInTheDocument()
    expect(screen.getByText(/medication adherence/i)).toBeInTheDocument()
  })
})
