
import { buildAdjacencyList, bfs } from './GraphUtils.js';
import { computeFullMesh } from './FullMesh.js';
import { computeRing } from './Ring.js';
import { electHub, computeStar } from './Star.js';

export function findUnreachable(peerIds, currentEdges, startNode) {
  const adj = buildAdjacencyList(peerIds, currentEdges);
  const { visited, visitOrder } = bfs(adj, startNode);

  const unreachable = new Set();
  for (const id of peerIds) {
    if (!visited.has(id)) {
      unreachable.add(id);
    }
  }

  return { unreachable, reachable: visited, visitOrder };
}

export function computeHealingEdges(survivingPeers, topologyType, latencyTable, currentEdges) {
  
  let targetEdges = [];

  switch (topologyType) {
    case 'full_mesh':
      targetEdges = computeFullMesh(survivingPeers);
      break;
    case 'ring': {
      const { edges } = computeRing(survivingPeers);
      targetEdges = edges;
      break;
    }
    case 'star': {
      const { hubId } = electHub(survivingPeers, latencyTable);
      targetEdges = computeStar(survivingPeers, hubId);
      break;
    }
    default:
      targetEdges = computeFullMesh(survivingPeers);
  }

  
  const currentSet = new Set(
    currentEdges.map(e => {
      const a = e.source < e.target ? e.source : e.target;
      const b = e.source < e.target ? e.target : e.source;
      return `${a}-${b}`;
    })
  );

  const healingEdges = targetEdges.filter(e => {
    const a = e.source < e.target ? e.source : e.target;
    const b = e.source < e.target ? e.target : e.source;
    return !currentSet.has(`${a}-${b}`);
  });

  const log = `BFS found unreachable peers — ${healingEdges.length} edge${healingEdges.length !== 1 ? 's' : ''} added to heal`;

  return { healingEdges, targetEdges, edgesAdded: healingEdges.length, log };
}
