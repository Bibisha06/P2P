
export function selectTopology(peerCount, avgLatency, latencyThreshold, latencyTable) {
  
  if (latencyThreshold && avgLatency > latencyThreshold && peerCount > 3) {
    return {
      type: 'star',
      name: 'Star',
      reasoning: `Star forced — avg latency ${avgLatency.toFixed(1)}ms exceeds threshold ${latencyThreshold}ms, greedy hub re-election triggered`,
    };
  }

  if (peerCount <= 1) {
    return {
      type: 'none',
      name: 'Waiting',
      reasoning: 'Waiting for peers to connect...',
    };
  }

  if (peerCount <= 3) {
    const edgeCount = (peerCount * (peerCount - 1)) / 2;
    return {
      type: 'full_mesh',
      name: 'Full Mesh',
      reasoning: `Full Mesh selected — ${peerCount} peers, complete graph K${peerCount} with O(N²) = ${edgeCount} edges`,
    };
  }

  if (peerCount <= 7) {
    return {
      type: 'ring',
      name: 'Ring',
      reasoning: `Ring selected — ${peerCount} peers, sorted in O(N log N), each peer assigned 2 neighbors`,
    };
  }

  return {
    type: 'star',
    name: 'Star',
    reasoning: `Star selected — ${peerCount} peers, greedy O(N) scan electing hub with lowest avg latency`,
  };
}
