"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { layoutGraph } from "@/lib/vizarch/layout-engine";
import { buildSvg } from "@/lib/vizarch/svg-builder";
import type { ArchGraph, ArchStyle } from "@/lib/vizarch/types";

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
}

export function useCollaboration() {
  const shareSlug = useDiagramStore((s) => s.shareSlug);
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!shareSlug) {
      // Disconnect if no slug
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        queueMicrotask(() => {
          setConnected(false);
          setCollaborators([]);
        });
        joinedRef.current = false;
      }
      return;
    }

    // Connect to collab service via Caddy gateway
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (!joinedRef.current) {
        joinedRef.current = true;
        socket.emit("join-room", {
          slug: shareSlug,
          name: diagramTitle?.slice(0, 20) || "Anonymous",
        });
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("room-state", (data: { collaborators: Collaborator[] }) => {
      setCollaborators(data.collaborators);
    });

    socket.on("user-joined", (collab: Collaborator) => {
      setCollaborators((prev) => {
        if (prev.find((c) => c.id === collab.id)) return prev;
        return [...prev, collab];
      });
    });

    socket.on("user-left", (data: { id: string }) => {
      setCollaborators((prev) => prev.filter((c) => c.id !== data.id));
    });

    socket.on("cursor-move", (data: { id: string; x: number; y: number; color: string; name: string }) => {
      setCollaborators((prev) =>
        prev.map((c) =>
          c.id === data.id ? { ...c, cursor: { x: data.x, y: data.y } } : c,
        ),
      );
    });

    socket.on("select-node", (data: { id: string; nodeId: string | null; color: string; name: string }) => {
      setCollaborators((prev) =>
        prev.map((c) =>
          c.id === data.id ? { ...c, selectedNodeId: data.nodeId } : c,
        ),
      );
    });

    socket.on("diagram-update", (data: { graphJson: string; author: string; timestamp: number }) => {
      // Another user changed the diagram — reload it
      try {
        const graph = JSON.parse(data.graphJson) as ArchGraph;
        const store = useDiagramStore.getState();
        const { svg, width, height } = renderClientSide(graph, store.style);
        store.applyGraph(graph, svg, width, height, {
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
          parseTimeMs: 0,
          layoutTimeMs: 0,
          exportTimeMs: 0,
          cacheHit: false,
          confidence: 1,
          ambiguities: [],
        });
      } catch {
        // ignore parse errors
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setCollaborators([]);
      joinedRef.current = false;
    };
  }, [shareSlug, diagramTitle]);

  function broadcastDiagram() {
    if (!socketRef.current || !shareSlug) return;
    const graph = useDiagramStore.getState().graph;
    if (!graph) return;
    socketRef.current.emit("diagram-update", {
      slug: shareSlug,
      graphJson: JSON.stringify(graph),
      author: diagramTitle || "Anonymous",
    });
  }

  function broadcastCursor(x: number, y: number) {
    if (!socketRef.current || !shareSlug) return;
    socketRef.current.emit("cursor-move", { slug: shareSlug, x, y });
  }

  function broadcastNodeSelection(nodeId: string | null) {
    if (!socketRef.current || !shareSlug) return;
    socketRef.current.emit("select-node", { slug: shareSlug, nodeId });
  }

  return {
    connected,
    collaborators,
    broadcastDiagram,
    broadcastCursor,
    broadcastNodeSelection,
  };
}

// Helper to render graph client-side
function renderClientSide(graph: ArchGraph, style: ArchStyle) {
  const layoutOpts = {
    orientation:
      style.layout === "vertical" || style.layout === "hierarchical"
        ? ("vertical" as const)
        : ("horizontal" as const),
  };
  const { width, height } = layoutGraph(graph, layoutOpts);
  const { svg } = buildSvg(graph, {
    theme: style.theme,
    showEdgeLabels: style.showEdgeLabels,
    showNodeLabels: style.showLabels,
    iconSize: style.iconSize,
  });
  return { svg, width, height };
}
