"use client";
import { Component, ReactNode } from "react";
import { v } from "../lib/theme";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: v('--color-bg'), fontFamily: v('--font-text'),
          color: v('--color-text-primary'), minHeight: "100vh", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              Berechnung konnte nicht geladen werden
            </div>
            <div style={{ fontSize: 13, color: v('--color-text-secondary'), marginBottom: 20, lineHeight: 1.5 }}>
              Die Daten in der URL sind ungültig. Starte eine neue Berechnung.
            </div>
            <a href="/rechner" style={{
              display: "inline-block", padding: "10px 32px", borderRadius: v('--radius-md'),
              fontSize: 14, fontWeight: 700, background: v('--color-accent'),
              color: v('--color-text-on-accent'), textDecoration: "none",
            }}>
              Neu berechnen
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
