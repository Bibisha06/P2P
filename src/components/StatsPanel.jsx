
import React from 'react';

function shortId(id) {
  return id ? id.slice(0, 8) : '???';
}

function latencyClass(avg) {
  if (avg < 50) return 'latency-good';
  if (avg < 150) return 'latency-mid';
  return 'latency-bad';
}

export default function StatsPanel({ myId, connectedPeers, avgLatency, topology, latencyMap }) {
  const peerCount = connectedPeers.length + (myId ? 1 : 0);

  
  const entries = Array.from(latencyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="panel stats-panel" id="stats-panel">
      <div className="panel-title">Network Stats</div>

      <div className="stat-row">
        <span className="stat-label">Peers</span>
        <span className="stat-value">{peerCount}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Avg Latency</span>
        <span className="stat-value">{avgLatency.toFixed(1)} ms</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">Topology</span>
        <span className="stat-value">{topology.name}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">My ID</span>
        <span className="stat-value" style={{ color: '#fff' }}>{shortId(myId)}</span>
      </div>

      {entries.length > 0 && (
        <>
          <div className="panel-title" style={{ marginTop: '16px' }}>Latency Map</div>
          <table className="latency-table">
            <thead>
              <tr>
                <th>Peer</th>
                <th>RTT</th>
                <th>Samples</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([peerId, data]) => (
                <tr key={peerId}>
                  <td className="peer-id">{shortId(peerId)}</td>
                  <td className={data.stale ? 'latency-stale' : latencyClass(data.avg)}>
                    {data.stale ? '—' : `${data.avg.toFixed(1)}ms`}
                  </td>
                  <td style={{ color: 'var(--text-dim)' }}>{data.samples}</td>
                  <td>
                    <span
                      className={`connection-dot ${data.stale ? 'connecting' : 'connected'}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
