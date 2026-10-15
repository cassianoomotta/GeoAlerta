export function countPresenceConnections(state: Record<string, unknown>): number {
  return Object.keys(state).length;
}

export function isPresenceTrackSuccessful(response: string): boolean {
  return response === 'ok';
}
