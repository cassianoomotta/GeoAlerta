import { parseStatusPresentations, parseTransitionInput } from '../domain/status-configuration';

export async function configureStatusPresentations(value: unknown, saveAtomically: (items: ReturnType<typeof parseStatusPresentations>) => Promise<void>) {
  const items = parseStatusPresentations(value);
  await saveAtomically(items);
}

export async function configureStatusTransition(value: unknown, saveAtomically: (input: ReturnType<typeof parseTransitionInput>) => Promise<void>) {
  const update = parseTransitionInput(value);
  await saveAtomically(update);
}
