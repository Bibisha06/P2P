
export function buildAdjacencyList(peerIds, edges) {
  const adj = new Map();
  for (const id of peerIds) {
    adj.set(id, new Set());
  }
  for (const { source, target } of edges) {
    if (adj.has(source)) adj.get(source).add(target);
    if (adj.has(target)) adj.get(target).add(source);
  }
  return adj;
}

export function bfs(adjacencyList, startNode) {
  const visited = new Set();
  const visitOrder = [];
  const queue = [startNode];
  visited.add(startNode);

  while (queue.length > 0) {
    const node = queue.shift();
    visitOrder.push(node);

    const neighbors = adjacencyList.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return { visited, visitOrder };
}

export function isConnected(adjacencyList, allPeers) {
  if (allPeers.length === 0) return true;
  const { visited } = bfs(adjacencyList, allPeers[0]);
  return visited.size === allPeers.length;
}

export function edgeId(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
