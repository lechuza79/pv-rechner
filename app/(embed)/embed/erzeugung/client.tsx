"use client";

// Das Widget selbst lebt in components/ — dieselbe Komponente rendert die
// Embed-Route hier UND den „Gerade im Netz"-Block der Strommix-Seite. Muster
// wie beim Grüngas-Widget: eine Quelle, zwei Einbettungen, keine Kopie.
export { default } from "../../../../components/ErzeugungWidget";
