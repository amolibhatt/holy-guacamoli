export function getGameSession(storageKey: string) {
  try {
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function saveGameSession(storageKey: string, roomCode: string, playerName: string, playerId: string, avatar: string, reconnectToken?: string) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ roomCode, playerName, playerId, avatar, reconnectToken }));
  } catch {}
}

export function clearGameSession(storageKey: string) {
  try { localStorage.removeItem(storageKey); } catch {}
}
