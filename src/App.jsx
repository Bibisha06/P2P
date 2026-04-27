
import React from 'react';
import { useNetwork } from './hooks/useNetwork.js';
import MeshGraph from './components/MeshGraph.jsx';
import TopologyBanner from './components/TopologyBanner.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import EventLog from './components/EventLog.jsx';
import ControlsPanel from './components/ControlsPanel.jsx';

export default function App() {
  const {
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
  } = useNetwork();

  return (
    <div className="app-container">
      <MeshGraph
        myId={myId}
        connectedPeers={connectedPeers}
        edges={edges}
        latencyMap={latencyMap}
        hubId={hubId}
        dyingPeers={dyingPeers}
        bfsVisitOrder={bfsVisitOrder}
      />

      <TopologyBanner topology={topology} />

      <StatsPanel
        myId={myId}
        connectedPeers={connectedPeers}
        avgLatency={avgLatency}
        topology={topology}
        latencyMap={latencyMap}
      />

      <EventLog logs={logs} />

      <ControlsPanel
        latencyThreshold={latencyThreshold}
        setLatencyThreshold={setLatencyThreshold}
        pingInterval={pingInterval}
        setPingInterval={setPingInterval}
        packetLoss={packetLoss}
        setPacketLoss={setPacketLoss}
        killRandomPeer={killRandomPeer}
        forceRecalculate={forceRecalculate}
      />
    </div>
  );
}
