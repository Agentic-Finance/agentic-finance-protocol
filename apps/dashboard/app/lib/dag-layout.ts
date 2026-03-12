/**
 * DAG Layout Computation for A2A Orchestration Visualization
 *
 * Computes a layered DAG layout from orchestration plan steps.
 * Layer 0 = steps with no dependencies (roots)
 * Layer N = steps whose max dependency layer is N-1
 *
 * Returns node positions + edges for SVG rendering.
 */

export interface DAGNode {
  stepIndex: number;
  agentName: string;
  agentEmoji: string;
  category: string;
  prompt: string;
  budget: number;
  originalBudget?: number;
  status: string;
  dependsOn: number[];
  executionTime?: number;
  retryCount?: number;
  proofMatched?: boolean | null;
  // Layout position (px)
  x: number;
  y: number;
  layer: number;
}

export interface DAGEdge {
  from: number; // stepIndex
  to: number;   // stepIndex
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface DAGLayout {
  nodes: DAGNode[];
  edges: DAGEdge[];
  width: number;
  height: number;
}

// ── Layout Constants ──────────────────────────────────────

const NODE_WIDTH = 180;
const NODE_HEIGHT = 72;
const LAYER_GAP_X = 220;   // horizontal gap between layers
const NODE_GAP_Y = 90;     // vertical gap between nodes in same layer

// ── Main Function ─────────────────────────────────────────

export function computeDAGLayout(steps: {
  stepIndex: number;
  agentName: string;
  agentEmoji: string;
  category: string;
  prompt: string;
  budget: number;
  originalBudget?: number;
  status: string;
  dependsOn: number[];
  executionTime?: number;
  retryCount?: number;
  proofMatched?: boolean | null;
}[]): DAGLayout {
  if (steps.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  // ── 1. Compute layers via topological ordering ──
  const layerMap = new Map<number, number>();
  const stepMap = new Map(steps.map(s => [s.stepIndex, s]));

  function getLayer(idx: number): number {
    if (layerMap.has(idx)) return layerMap.get(idx)!;
    const step = stepMap.get(idx);
    if (!step || step.dependsOn.length === 0) {
      layerMap.set(idx, 0);
      return 0;
    }
    const maxDepLayer = Math.max(...step.dependsOn.map(d => getLayer(d)));
    const layer = maxDepLayer + 1;
    layerMap.set(idx, layer);
    return layer;
  }

  steps.forEach(s => getLayer(s.stepIndex));

  // ── 2. Group by layer ──
  const layers = new Map<number, number[]>();
  for (const [idx, layer] of layerMap) {
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(idx);
  }

  // Sort within each layer by stepIndex for consistency
  for (const [, idxs] of layers) {
    idxs.sort((a, b) => a - b);
  }

  const maxLayer = Math.max(...layerMap.values());
  const maxNodesInLayer = Math.max(...[...layers.values()].map(l => l.length));

  // ── 3. Compute positions ──
  const nodes: DAGNode[] = [];
  const PADDING_X = 40;
  const PADDING_Y = 30;

  for (let layer = 0; layer <= maxLayer; layer++) {
    const layerNodes = layers.get(layer) || [];
    const totalHeight = layerNodes.length * NODE_HEIGHT + (layerNodes.length - 1) * (NODE_GAP_Y - NODE_HEIGHT);
    const maxTotalHeight = maxNodesInLayer * NODE_HEIGHT + (maxNodesInLayer - 1) * (NODE_GAP_Y - NODE_HEIGHT);
    const offsetY = (maxTotalHeight - totalHeight) / 2; // center vertically

    layerNodes.forEach((stepIdx, i) => {
      const step = stepMap.get(stepIdx)!;
      const x = PADDING_X + layer * LAYER_GAP_X;
      const y = PADDING_Y + offsetY + i * NODE_GAP_Y;

      nodes.push({
        ...step,
        x,
        y,
        layer,
      });
    });
  }

  // ── 4. Compute edges ──
  const nodePositions = new Map(nodes.map(n => [n.stepIndex, n]));
  const edges: DAGEdge[] = [];

  for (const node of nodes) {
    for (const depIdx of node.dependsOn) {
      const dep = nodePositions.get(depIdx);
      if (!dep) continue;

      edges.push({
        from: depIdx,
        to: node.stepIndex,
        fromX: dep.x + NODE_WIDTH,    // right edge of source
        fromY: dep.y + NODE_HEIGHT / 2, // vertical center
        toX: node.x,                    // left edge of target
        toY: node.y + NODE_HEIGHT / 2,  // vertical center
      });
    }
  }

  // ── 5. Calculate canvas size ──
  const width = PADDING_X * 2 + (maxLayer + 1) * LAYER_GAP_X;
  const height = PADDING_Y * 2 + maxNodesInLayer * NODE_GAP_Y;

  return { nodes, edges, width, height };
}

export { NODE_WIDTH, NODE_HEIGHT };
