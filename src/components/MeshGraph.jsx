
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { edgeId } from '../algorithms/GraphUtils.js';

function latencyColor(avg) {
  if (avg == null || avg === Infinity) return '#555577';
  if (avg < 50) return '#00e676';
  if (avg < 150) return '#ffca28';
  return '#ff4444';
}

function latencyWidth(avg) {
  if (avg == null || avg === Infinity) return 1;
  
  return Math.max(1, Math.min(4, 4 - (avg / 100) * 2));
}

export default function MeshGraph({
  myId,
  connectedPeers,
  edges,
  latencyMap,
  hubId,
  dyingPeers,
  bfsVisitOrder,
}) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const prevNodesRef = useRef(new Set());

  useEffect(() => {
    if (!svgRef.current || !myId) return;

    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    svg.attr('viewBox', [0, 0, width, height]);

    
    if (!simRef.current) {
      svg.selectAll('*').remove();

      
      const defs = svg.append('defs');

      const selfGlow = defs.append('filter').attr('id', 'glow-self');
      selfGlow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
      selfGlow.append('feMerge').selectAll('feMergeNode')
        .data(['blur', 'SourceGraphic']).join('feMergeNode')
        .attr('in', d => d);

      const peerGlow = defs.append('filter').attr('id', 'glow-peer');
      peerGlow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
      peerGlow.append('feMerge').selectAll('feMergeNode')
        .data(['blur', 'SourceGraphic']).join('feMergeNode')
        .attr('in', d => d);

      const hubGlowFilter = defs.append('filter').attr('id', 'glow-hub');
      hubGlowFilter.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
      hubGlowFilter.append('feMerge').selectAll('feMergeNode')
        .data(['blur', 'SourceGraphic']).join('feMergeNode')
        .attr('in', d => d);

      svg.append('g').attr('class', 'edges-layer');
      svg.append('g').attr('class', 'nodes-layer');
      svg.append('g').attr('class', 'labels-layer');

      simRef.current = d3.forceSimulation()
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30))
        .force('link', d3.forceLink().id(d => d.id).distance(120).strength(0.3))
        .alphaDecay(0.02)
        .velocityDecay(0.3);
    }

    const simulation = simRef.current;

    // Include dying peers so D3 can still find them if old edges reference them
    const allPeerIds = Array.from(new Set([myId, ...connectedPeers, ...dyingPeers]));
    const prevNodes = prevNodesRef.current;
    const currentNodes = new Set(allPeerIds);

    const nodes = allPeerIds.map(id => ({
      id,
      isSelf: id === myId,
      isHub: id === hubId,
      isDying: dyingPeers.has(id),
      isNew: !prevNodes.has(id),
    }));

    prevNodesRef.current = currentNodes;

    
    const links = edges.map(e => {
      const srcLatency = latencyMap.get(e.source) || latencyMap.get(e.target);
      const avg = srcLatency ? srcLatency.avg : null;
      return {
        source: e.source,
        target: e.target,
        id: edgeId(e.source, e.target),
        latency: avg,
      };
    });

    

    const edgesLayer = svg.select('.edges-layer');
    const edgeSelection = edgesLayer.selectAll('line')
      .data(links, d => d.id);

    edgeSelection.exit()
      .transition().duration(400)
      .attr('stroke-opacity', 0)
      .remove();

    const edgeEnter = edgeSelection.enter()
      .append('line')
      .attr('stroke-opacity', 0)
      .attr('stroke-linecap', 'round');

    edgeEnter.transition().duration(600)
      .attr('stroke-opacity', 0.6);

    const edgeMerged = edgeEnter.merge(edgeSelection);

    edgeMerged
      .transition().duration(300)
      .attr('stroke', d => latencyColor(d.latency))
      .attr('stroke-width', d => latencyWidth(d.latency))
      .attr('stroke-opacity', 0.6);

    

    const nodesLayer = svg.select('.nodes-layer');
    const nodeSelection = nodesLayer.selectAll('circle')
      .data(nodes, d => d.id);

    nodeSelection.exit()
      .classed('node-dying', true)
      .transition().duration(800)
      .attr('r', 0)
      .style('opacity', 0)
      .remove();

    const nodeEnter = nodeSelection.enter()
      .append('circle')
      .attr('r', 0)
      .attr('cx', width / 2 + (Math.random() - 0.5) * 100)
      .attr('cy', height / 2 + (Math.random() - 0.5) * 100)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    nodeEnter.transition().duration(600)
      .attr('r', d => d.isSelf ? 10 : 8);

    const nodeMerged = nodeEnter.merge(nodeSelection);

    nodeMerged
      .transition().duration(300)
      .attr('fill', d => {
        if (d.isDying) return '#ff4444';
        if (d.isSelf) return '#ffffff';
        if (d.isHub) return '#ffd700';
        return '#4a6cf7';
      })
      .attr('r', d => {
        if (d.isDying) return 0;
        if (d.isHub) return 12;
        if (d.isSelf) return 10;
        return 8;
      })
      .attr('filter', d => {
        if (d.isSelf) return 'url(#glow-self)';
        if (d.isHub) return 'url(#glow-hub)';
        return 'url(#glow-peer)';
      });

    

    const labelsLayer = svg.select('.labels-layer');
    const labelSelection = labelsLayer.selectAll('text')
      .data(nodes, d => d.id);

    labelSelection.exit().transition().duration(400).style('opacity', 0).remove();

    const labelEnter = labelSelection.enter()
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.isHub ? -22 : -16)
      .attr('font-size', '10px')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('fill', 'rgba(255,255,255,0.6)')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    labelEnter.transition().duration(600).style('opacity', 1);

    const labelMerged = labelEnter.merge(labelSelection);

    labelMerged
      .text(d => {
        let label = d.id.slice(0, 6);
        if (d.isSelf) label += ' (you)';
        if (d.isHub) label = '👑 ' + label;
        return label;
      })
      .attr('fill', d => {
        if (d.isSelf) return 'rgba(255,255,255,0.9)';
        if (d.isHub) return '#ffd700';
        return 'rgba(255,255,255,0.5)';
      });

    

    simulation.nodes(nodes);
    simulation.force('link').links(links);
    simulation.alpha(0.4).restart();

    simulation.on('tick', () => {
      edgeMerged
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeMerged
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      labelMerged
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

  }, [myId, connectedPeers, edges, latencyMap, hubId, dyingPeers]);

  

  useEffect(() => {
    if (!bfsVisitOrder || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const edgesLayer = svg.select('.edges-layer');

    
    bfsVisitOrder.forEach((nodeId, i) => {
      setTimeout(() => {
        edgesLayer.selectAll('line')
          .filter(d => d.source.id === nodeId || d.target.id === nodeId)
          .transition().duration(200)
          .attr('stroke', '#00d4ff')
          .attr('stroke-width', 4)
          .attr('stroke-opacity', 1)
          .transition().duration(600)
          .attr('stroke', d => latencyColor(d.latency))
          .attr('stroke-width', d => latencyWidth(d.latency))
          .attr('stroke-opacity', 0.6);
      }, i * 150);
    });
  }, [bfsVisitOrder]);

  

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.attr('viewBox', [0, 0, window.innerWidth, window.innerHeight]);
        if (simRef.current) {
          simRef.current.force('center', d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2));
          simRef.current.alpha(0.1).restart();
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="graph-canvas" id="mesh-graph">
      <svg ref={svgRef} />
    </div>
  );
}
