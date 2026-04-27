
export function electHub(peerIds, latencyTable) {
  let bestId = peerIds[0];
  let bestAvg = Infinity;

  
  for (const peerId of peerIds) {
    const entry = latencyTable.get(peerId);
    const avg = entry ? entry.avg : Infinity;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestId = peerId;
    }
  }

  return { hubId: bestId, hubAvgLatency: bestAvg };
}

export function computeStar(peerIds, hubId) {
  const edges = [];
  for (const peerId of peerIds) {
    if (peerId !== hubId) {
      edges.push({ source: hubId, target: peerId });
    }
  }
  return edges;
}
