'use client';

import React, { useState } from 'react';
import { HRPClusterNode } from '@/analytics/hrp';

interface HrpDendrogramChartProps {
  tree: HRPClusterNode;
  height?: number;
}

interface DendrogramPath {
  id: number;
  d: string;
  distance: number;
  symbols: string[];
  parentX: number;
  parentY: number;
}

interface LeafMarker {
  id: number;
  symbol: string;
  x: number;
  y: number;
}

export const HrpDendrogramChart: React.FC<HrpDendrogramChartProps> = ({
  tree,
  height = 300,
}) => {
  const [hoveredNode, setHoveredNode] = useState<{
    distance: number;
    symbols: string[];
    x: number;
    y: number;
  } | null>(null);

  const svgWidth = 700;
  const svgHeight = height;
  const paddingBottom = 40;
  const paddingTop = 25;
  const paddingX = 40;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingTop - paddingBottom;

  // Flatten tree to paths and leaves
  const paths: DendrogramPath[] = [];
  const leaves: LeafMarker[] = [];

  function collectNodes(node: HRPClusterNode): { x: number; y: number; symbols: string[] } {
    if (node.isLeaf) {
      // Map percent x (0..100) to svg pixel
      const px = paddingX + ((node.x ?? 50) / 100) * usableWidth;
      const py = svgHeight - paddingBottom;
      leaves.push({
        id: node.id,
        symbol: node.symbol ?? `Asset ${node.id}`,
        x: px,
        y: py,
      });
      return { x: px, y: py, symbols: [node.symbol ?? ''] };
    }

    const left = node.left ? collectNodes(node.left) : { x: paddingX, y: svgHeight - paddingBottom, symbols: [] };
    const right = node.right ? collectNodes(node.right) : { x: svgWidth - paddingX, y: svgHeight - paddingBottom, symbols: [] };

    const parentX = (left.x + right.x) / 2;
    // Map percent y (0..100) to svg pixel
    const pyNorm = (node.y ?? 50) / 100;
    const parentY = paddingTop + pyNorm * usableHeight;

    // Dendrogram orthogonal branch path:
    // Up from left (left.x, left.y) -> (left.x, parentY)
    // Horizontal to right (right.x, parentY)
    // Down to right (right.x, parentY) -> (right.x, right.y)
    const d = `M ${left.x} ${left.y} L ${left.x} ${parentY} L ${right.x} ${parentY} L ${right.x} ${right.y}`;

    const clusterSymbols = [...left.symbols, ...right.symbols];
    paths.push({
      id: node.id,
      d,
      distance: node.distance,
      symbols: clusterSymbols,
      parentX,
      parentY,
    });

    return { x: parentX, y: parentY, symbols: clusterSymbols };
  }

  collectNodes(tree);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            Hierarchical Cluster Tree Dendrogram
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono">
              Average-Linkage Tree
            </span>
          </h4>
          <p className="text-xs text-slate-500">
            Graph-theoretic clustering: lower height branches indicate closely co-moving risk clusters
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-indigo-600 rounded" />
            Cluster Linkage
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Asset Leaf
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[500px]"
          style={{ height: `${height}px` }}
        >
          {/* Background grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
            const y = paddingTop + ratio * usableHeight;
            return (
              <line
                key={idx}
                x1={paddingX - 10}
                y1={y}
                x2={svgWidth - paddingX + 10}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            );
          })}

          {/* Dendrogram Branch Lines */}
          {paths.map((p) => {
            const isHovered = hoveredNode && hoveredNode.distance === p.distance;
            return (
              <g key={p.id}>
                <path
                  d={p.d}
                  fill="none"
                  stroke={isHovered ? '#4f46e5' : '#6366f1'}
                  strokeWidth={isHovered ? 2.5 : 1.75}
                  className="transition-colors duration-150 cursor-pointer"
                  onMouseEnter={() =>
                    setHoveredNode({
                      distance: p.distance,
                      symbols: p.symbols,
                      x: p.parentX,
                      y: p.parentY,
                    })
                  }
                  onMouseLeave={() => setHoveredNode(null)}
                />
                {/* Cluster merge joint circle */}
                <circle
                  cx={p.parentX}
                  cy={p.parentY}
                  r={isHovered ? 4.5 : 3}
                  fill={isHovered ? '#4338ca' : '#818cf8'}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() =>
                    setHoveredNode({
                      distance: p.distance,
                      symbols: p.symbols,
                      x: p.parentX,
                      y: p.parentY,
                    })
                  }
                  onMouseLeave={() => setHoveredNode(null)}
                />
              </g>
            );
          })}

          {/* Asset Leaf Markers */}
          {leaves.map((leaf) => (
            <g key={leaf.id}>
              <circle
                cx={leaf.x}
                cy={leaf.y}
                r={4}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth={2}
              />
              <text
                x={leaf.x}
                y={leaf.y + 18}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#1e293b"
                className="font-mono select-none"
              >
                {leaf.symbol}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/90 text-white px-2.5 py-1.5 rounded-lg text-xs shadow-lg backdrop-blur-xs border border-slate-700 font-sans"
            style={{
              left: `${(hoveredNode.x / svgWidth) * 100}%`,
              top: `${hoveredNode.y - 10}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-semibold text-[11px] text-indigo-300">
              Cluster Distance: {hoveredNode.distance.toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-300 font-mono">
              Assets: {hoveredNode.symbols.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
