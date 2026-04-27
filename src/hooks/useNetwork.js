
import { useState, useEffect, useRef, useCallback } from 'react';
import { SignalingClient } from '../network/SignalingClient.js';
import { PeerManager } from '../network/PeerManager.js';
import { LatencyTracker } from '../network/LatencyTracker.js';
import { selectTopology } from '../algorithms/TopologySelector.js';
import { computeFullMesh } from '../algorithms/FullMesh.js';
import { computeRing } from '../algorithms/Ring.js';
import { electHub, computeStar } from '../algorithms/Star.js';
import { findUnreachable, computeHealingEdges } from '../algorithms/BFSHealer.js';

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function shortId(id) {
  return id ? id.slice(0, 6) : '???';
}

export function useNetwork() {
  const [myId, setMyId] = useState(null);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [edges, setEdges] = useState([]);
  const [topology, setTopology] = useState({ type: 'none', name: 'Waiting', reasoning: 'Connecting to signaling server...' });
  const [latencyMap, setLatencyMap] = useState(new Map());
  const [avgLatency, setAvgLatency] = useState(0);
  const [hubId, setHubId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [bfsVisitOrder, setBfsVisitOrder] = useState(null);
  const [dyingPeers, setDyingPeers] = useState(new Set());

  
  const [latencyThreshold, setLatencyThreshold] = useState(200);
  const [pingInterval, setPingInterval] = useState(1000);
  const [packetLoss, setPacketLoss] = useState(false);

  const signalingRef = useRef(null);
  const peerManagerRef = useRef(null);
  const latencyTrackerRef = useRef(null);
  const topoIntervalRef = useRef(null);
  const latencyUpdateRef = useRef(null);

  const addLog = useCallback((msg, type = 'info') => {
    setLogs(prev => {
      const entry = { time: timestamp(), msg, type, id: Date.now() + Math.random() };
      const next = [entry, ...prev];
      return next.slice(0, 8);
    });
  }, []);

  

  const evaluateTopology = useCallback(() => {
    const pm = peerManagerRef.current;
    const lt = latencyTrackerRef.current;
    if (!pm || !lt || !pm.myId) return;

    const connected = pm.getConnectedPeerIds();
    const allPeers = [pm.myId, ...connected];
    const peerCount = allPeers.length;
    const avg = lt.getAverageLatency();
    const table = lt.getTable();

    const topo = selectTopology(peerCount, avg, latencyThreshold, table);

    let newEdges = [];
    let newHubId = null;

    switch (topo.type) {
      case 'full_mesh':
        newEdges = computeFullMesh(allPeers);
        break;
      case 'ring': {
        const { edges: ringEdges } = computeRing(allPeers);
        newEdges = ringEdges;
        break;
      }
      case 'star': {
        const { hubId: elected, hubAvgLatency } = electHub(allPeers, table);
        newHubId = elected;
        newEdges = computeStar(allPeers, elected);
        topo.reasoning = `Star selected — greedy scan elected peer ${shortId(elected)} at ${hubAvgLatency.toFixed(1)}ms avg latency`;
        break;
      }
      default:
        newEdges = [];
    }

    setEdges(newEdges);
    setHubId(newHubId);

    setTopology(prev => {
      if (prev.type !== topo.type) {
        addLog(topo.reasoning, 'topology');
      }
      return topo;
    });

    setAvgLatency(avg);
    setLatencyMap(table);
  }, [latencyThreshold, addLog]);

  

  const triggerHealing = useCallback((deadPeerId) => {
    const pm = peerManagerRef.current;
    const lt = latencyTrackerRef.current;
    if (!pm || !lt || !pm.myId) return;

    const connected = pm.getConnectedPeerIds();
    const allPeers = [pm.myId, ...connected];

    
    const table = lt.getTable();
    const peerCount = allPeers.length;
    const topo = selectTopology(peerCount, lt.getAverageLatency(), latencyThreshold, table);

    let currentEdges = [];
    switch (topo.type) {
      case 'full_mesh': currentEdges = computeFullMesh(allPeers); break;
      case 'ring': currentEdges = computeRing(allPeers).edges; break;
      case 'star': {
        const { hubId: h } = electHub(allPeers, table);
        currentEdges = computeStar(allPeers, h);
        break;
      }
      default: currentEdges = computeFullMesh(allPeers);
    }

    
    const { unreachable, visitOrder } = findUnreachable(allPeers, currentEdges, pm.myId);

    
    setBfsVisitOrder(visitOrder);
    setTimeout(() => setBfsVisitOrder(null), 2000);

    if (unreachable.size > 0) {
      const { healingEdges, targetEdges, edgesAdded, log } = computeHealingEdges(
        allPeers, topo.type, table, currentEdges
      );
      addLog(`BFS found ${unreachable.size} unreachable peer${unreachable.size > 1 ? 's' : ''} — ${edgesAdded} edge${edgesAdded !== 1 ? 's' : ''} added to heal`, 'heal');
      setEdges(targetEdges);
    } else {
      addLog('BFS confirmed — all peers reachable', 'heal');
      setEdges(currentEdges);
    }

    setTopology(topo);
  }, [latencyThreshold, addLog]);

  

  useEffect(() => {
    const signaling = new SignalingClient();
    const peerManager = new PeerManager(signaling);
    const latencyTracker = new LatencyTracker(peerManager, { pingInterval });

    signalingRef.current = signaling;
    peerManagerRef.current = peerManager;
    latencyTrackerRef.current = latencyTracker;

    signaling.on('welcome', (id) => {
      setMyId(id);
      addLog(`Connected as peer ${shortId(id)}`, 'join');
    });

    peerManager.on('peer_connected', (peerId) => {
      setConnectedPeers(peerManager.getConnectedPeerIds());
      addLog(`Peer ${shortId(peerId)} connected`, 'join');
    });

    peerManager.on('peer_disconnected', (peerId) => {
      
      setDyingPeers(prev => new Set([...prev, peerId]));
      setTimeout(() => {
        setDyingPeers(prev => {
          const next = new Set(prev);
          next.delete(peerId);
          return next;
        });
      }, 800);

      setConnectedPeers(peerManager.getConnectedPeerIds());
      addLog(`Peer ${shortId(peerId)} disconnected`, 'leave');

      
      setTimeout(() => triggerHealing(peerId), 300);
    });

    
    latencyUpdateRef.current = setInterval(() => {
      setLatencyMap(latencyTracker.getTable());
      setAvgLatency(latencyTracker.getAverageLatency());
      setConnectedPeers(peerManager.getConnectedPeerIds());
    }, 500);

    signaling.connect('ws://localhost:8080');
    latencyTracker.start();

    
    topoIntervalRef.current = setInterval(() => {
      evaluateTopology();
    }, 3000);

    return () => {
      clearInterval(topoIntervalRef.current);
      clearInterval(latencyUpdateRef.current);
      latencyTracker.stop();
      peerManager.destroy();
      signaling.disconnect();
    };
  }, []); 

  

  useEffect(() => {
    latencyTrackerRef.current?.setPingInterval(pingInterval);
  }, [pingInterval]);

  useEffect(() => {
    latencyTrackerRef.current?.setPacketLoss(packetLoss);
  }, [packetLoss]);

  

  const killRandomPeer = useCallback(() => {
    const victim = peerManagerRef.current?.killRandomPeer();
    if (victim) {
      addLog(`Killed connection to peer ${shortId(victim)}`, 'leave');
    }
  }, [addLog]);

  const forceRecalculate = useCallback(() => {
    addLog('Force recalculate triggered', 'topology');
    evaluateTopology();
  }, [evaluateTopology, addLog]);

  return {
    myId,
    connectedPeers,
    edges,
    topology,
    latencyMap,
    avgLatency,
    hubId,
    logs,
    bfsVisitOrder,
    dyingPeers,
    
    latencyThreshold, setLatencyThreshold,
    pingInterval, setPingInterval,
    packetLoss, setPacketLoss,
    
    killRandomPeer,
    forceRecalculate,
  };
}
