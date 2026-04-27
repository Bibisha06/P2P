
import React from 'react';

export default function TopologyBanner({ topology }) {
  return (
    <div className="topology-banner" key={topology.type + topology.reasoning}>
      <h2>⬡ {topology.name} Topology</h2>
      <p>{topology.reasoning}</p>
    </div>
  );
}
