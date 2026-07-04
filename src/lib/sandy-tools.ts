import type { ToolName } from '../types'

export const RETINOPATHY_PACK_ID = 'retinopathy'

export const RETINOPATHY_CONVERSATION_TOOLS = [
  'answer_education',
  'collect_barrier',
  'match_site',
  'confirm_plan',
] as const satisfies readonly ToolName[]

export interface SandyRealtimeToolSchema {
  type: 'function'
  name: ToolName
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
    additionalProperties: false
  }
}

const toolSet = new Set<string>(RETINOPATHY_CONVERSATION_TOOLS)

export function isRetinopathyConversationTool(toolName: string): toolName is ToolName {
  return toolSet.has(toolName)
}

export function sandyRealtimeToolSchemas(): SandyRealtimeToolSchema[] {
  return [
    {
      type: 'function',
      name: 'answer_education',
      description: 'Answer a retinopathy screening education question using protocol-approved context.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
        },
        required: ['question'],
        additionalProperties: false,
      },
    },
    {
      type: 'function',
      name: 'collect_barrier',
      description: 'Record a patient-reported screening barrier for navigator follow-up.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
        required: ['text'],
        additionalProperties: false,
      },
    },
    {
      type: 'function',
      name: 'match_site',
      description: 'Select a screening site using deterministic distance, timing, cost, and ride-support rules.',
      parameters: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['best', 'fastest', 'closest'] },
        },
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: 'function',
      name: 'confirm_plan',
      description: 'Confirm a patient screening plan after a site and time are known.',
      parameters: {
        type: 'object',
        properties: {
          siteId: { type: 'string' },
          when: { type: 'string' },
        },
        required: ['siteId', 'when'],
        additionalProperties: false,
      },
    },
  ]
}
