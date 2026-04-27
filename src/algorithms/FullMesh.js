
export function computeFullMesh(peerIds) {
  const edges = [];
  for (let i = 0; i < peerIds.length; i++) {
    for (let j = i + 1; j < peerIds.length; j++) {
      edges.push({ source: peerIds[i], target: peerIds[j] });
    }
  }
  return edges;
}
