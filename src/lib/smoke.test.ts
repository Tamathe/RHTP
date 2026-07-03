import { describe, expect, it } from 'vitest'
import { ping } from './smoke'

describe('smoke', () => {
  it('confirms the test runner is wired', () => {
    expect(ping()).toBe('pong')
  })
})
