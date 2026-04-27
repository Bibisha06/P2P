
export function computeRing(peerIds) {
  
  const sorted = [...peerIds].sort();
  const edges = [];

  for (let i = 0; i < sorted.length; i++) {
    const next = (i + 1) % sorted.length;
    edges.push({ source: sorted[i], target: sorted[next] });
  }

  return { edges, sortedPeers: sorted };
}

export function getRingNeighbors(peerId, sortedPeers) {
  const idx = sortedPeers.indexOf(peerId);
  if (idx === -1) return { prev: null, next: null };
  const prev = sortedPeers[(idx - 1 + sortedPeers.length) % sortedPeers.length];
  const next = sortedPeers[(idx + 1) % sortedPeers.length];
  return { prev, next };
}
