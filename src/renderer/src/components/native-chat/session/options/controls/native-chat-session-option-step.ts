import type { SessionOptionDescriptor } from '../../../../../../../shared/native-chat/input/native-chat-session-options'
import { orderEffortLevels } from '../../../../../../../shared/agent-session/options/view/effort-level-order'

export type SessionOptionStep = 1 | -1

// Same order the model list shows when not searching: main rows, then legacy; hidden ones only by search.
function modelStepOrder(descriptor: SessionOptionDescriptor, current: string): string[] {
  if (descriptor.kind.type !== 'select') {
    return []
  }
  const listed = descriptor.kind.choices.filter(
    (choice) => !choice.hidden || choice.value === current
  )
  return [
    ...listed.filter((choice) => !choice.legacy),
    ...listed.filter((choice) => choice.legacy)
  ].map((choice) => choice.value)
}

/** The neighbouring choice of a model or effort descriptor, clamped at the ends; null when there is none. */
export function steppedSessionOptionValue(
  descriptor: SessionOptionDescriptor,
  step: SessionOptionStep
): string | null {
  if (descriptor.kind.type !== 'select' || descriptor.valueSource === 'unknown') {
    return null
  }
  const current =
    descriptor.category === 'model'
      ? (descriptor.fallbackModel ?? descriptor.kind.currentValue)
      : descriptor.kind.currentValue
  if (current === undefined) {
    return null
  }
  const order =
    descriptor.category === 'model'
      ? modelStepOrder(descriptor, current)
      : orderEffortLevels(descriptor.kind.choices).map((choice) => choice.value)
  const index = order.indexOf(current)
  if (index === -1) {
    return null
  }
  return order[index + step] ?? null
}
