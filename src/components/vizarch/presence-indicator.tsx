"use client";

import { useCollaboration } from "@/hooks/use-collaboration";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Presence indicator: shows connected collaborators in the header area.
export function PresenceIndicator() {
  const { connected, collaborators } = useCollaboration();

  if (!connected && collaborators.length === 0) return null;

  const visibleCollabs = collaborators.slice(0, 4);
  const overflow = collaborators.length - visibleCollabs.length;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 h-7 rounded-md border border-border bg-background/80">
            {connected ? (
              <Wifi className="h-3 w-3 text-emerald-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-muted-foreground" />
            )}
            <div className="flex -space-x-1.5">
              {visibleCollabs.map((c) => (
                <div
                  key={c.id}
                  className="h-4 w-4 rounded-full border-2 border-background flex items-center justify-center text-[7px] font-bold text-white"
                  style={{ background: c.color }}
                  title={c.name}
                >
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
            {collaborators.length > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {collaborators.length}
              </span>
            )}
            {overflow > 0 && (
              <span className="text-[9px] text-muted-foreground">+{overflow}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {connected
            ? `${collaborators.length + 1} viewer${collaborators.length === 0 ? "" : "s"} online`
            : "Disconnected from collab service"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
