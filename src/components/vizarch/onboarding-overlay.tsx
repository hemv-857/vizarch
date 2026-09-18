"use client";

import { useEffect, useState } from "react";
import { useDiagramStore } from "@/hooks/use-diagram-store";
import { Button } from "@/components/ui/button";
import { Boxes, Sparkles, Wand2, Download, Share2, Keyboard, X } from "lucide-react";

const ONBOARDED_KEY = "vizarch:onboarded";

export function OnboardingOverlay() {
  const [show, setShow] = useState(false);
  const setDescription = useDiagramStore((s) => s.setDescription);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onboarded = localStorage.getItem(ONBOARDED_KEY);
    if (!onboarded) {
      // Show after a short delay so the initial diagram loads first
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleDismiss() {
    setShow(false);
    localStorage.setItem(ONBOARDED_KEY, "true");
  }

  function handleTryExample() {
    setDescription(
      "React frontend on Vercel, Node.js API on Lambda, PostgreSQL on RDS, Redis cache, S3 storage, CloudFront CDN, SNS notifications, Datadog monitoring",
    );
    handleDismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative max-w-md w-[90vw] rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-300">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Welcome to vizarch</h2>
            <p className="text-[11px] text-muted-foreground">AI System Architecture Diagram Generator</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe your system architecture in plain English. Claude AI parses it into a structured
          diagram with 188+ cloud service icons, auto-laid-out in seconds.
        </p>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-2">
          <FeatureItem icon={Wand2} text="AI-powered parsing" />
          <FeatureItem icon={Sparkles} text="188+ service icons" />
          <FeatureItem icon={Download} text="Export SVG/PNG/JSON" />
          <FeatureItem icon={Share2} text="Shareable links" />
          <FeatureItem icon={Keyboard} text="Keyboard shortcuts" />
          <FeatureItem icon={Boxes} text="13 templates" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1 h-9 bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
            onClick={handleTryExample}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Try an example
          </Button>
          <Button variant="outline" className="h-9" onClick={handleDismiss}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5">
      <Icon className="h-3.5 w-3.5 text-teal-600 shrink-0" />
      <span className="text-[11px] font-medium">{text}</span>
    </div>
  );
}
