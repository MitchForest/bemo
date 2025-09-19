declare module "@xyflow/react" {
  import type * as React from "react";

  export type Node<T = unknown> = {
    id: string;
    position: { x: number; y: number };
    data: T;
    type?: string;
    [key: string]: unknown;
  };

  export type Edge<T = unknown> = {
    id: string;
    source: string;
    target: string;
    data?: T;
    type?: string;
    [key: string]: unknown;
  };

  export type NodeTypes = Record<string, React.ComponentType<unknown>>;
  export const ReactFlow: React.ComponentType<Record<string, unknown>>;
  export const MiniMap: React.ComponentType<Record<string, unknown>>;
  export const Controls: React.ComponentType<Record<string, unknown>>;
  export const Background: React.ComponentType<Record<string, unknown>>;
  export const MarkerType: Record<string, string>;
  export function useNodesState<T = unknown>(
    nodes: Node<T>[],
  ): [
    Node<T>[],
    (nodes: Node<T>[] | ((nodes: Node<T>[]) => Node<T>[])) => void,
    (id: string, nodeUpdate: Partial<Node<T>>) => void,
  ];
  export function useEdgesState<T = unknown>(
    edges: Edge<T>[],
  ): [
    Edge<T>[],
    (edges: Edge<T>[] | ((edges: Edge<T>[]) => Edge<T>[])) => void,
    (id: string, edgeUpdate: Partial<Edge<T>>) => void,
  ];
}
