declare module "@xyflow/react" {
  import * as React from "react";

  export type Node<T = any> = any;
  export type Edge<T = any> = any;
  export type NodeTypes = Record<string, any>;
  export const ReactFlow: React.ComponentType<any>;
  export const MiniMap: React.ComponentType<any>;
  export const Controls: React.ComponentType<any>;
  export const Background: React.ComponentType<any>;
  export const MarkerType: Record<string, any>;
  export function useNodesState<T = any>(nodes: Node<T>[]): [Node<T>[], any, any];
  export function useEdgesState<T = any>(edges: Edge<T>[]): [Edge<T>[], any, any];
}
