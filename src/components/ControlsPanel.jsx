
import React, { useState } from 'react';

export default function ControlsPanel({
  latencyThreshold, setLatencyThreshold,
  pingInterval, setPingInterval,
  packetLoss, setPacketLoss,
  killRandomPeer,
  forceRecalculate,
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`panel controls-panel ${collapsed ? 'collapsed' : ''}`} id="controls-panel">
      <button className="controls-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '◂ Controls' : '▸ Controls'}
      </button>

      {!collapsed && (
        <>
          <div className="control-group">
            <div className="control-label">
              <span>Latency Threshold</span>
              <span className="control-value">{latencyThreshold}ms</span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={latencyThreshold}
              onChange={(e) => setLatencyThreshold(Number(e.target.value))}
              id="latency-threshold-slider"
            />
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>Ping Interval</span>
              <span className="control-value">{pingInterval}ms</span>
            </div>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={pingInterval}
              onChange={(e) => setPingInterval(Number(e.target.value))}
              id="ping-interval-slider"
            />
          </div>

          <div className="control-group">
            <div className="toggle-row">
              <span className="control-label" style={{ marginBottom: 0 }}>Packet Loss (20%)</span>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={packetLoss}
                  onChange={(e) => setPacketLoss(e.target.checked)}
                  id="packet-loss-toggle"
                />
                <span className="toggle-track" />
              </label>
            </div>
          </div>

          <button className="btn btn-danger" onClick={killRandomPeer} id="kill-peer-btn">
            ☠ Kill Random Peer
          </button>

          <button className="btn" onClick={forceRecalculate} id="force-recalc-btn">
            ⟳ Force Recalculate
          </button>
        </>
      )}
    </div>
  );
}
