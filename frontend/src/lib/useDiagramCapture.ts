import { useCallback, useRef } from "react";

/**
 * Hook that provides a ref for the 3D diagram container and a capture function
 * to grab a base64 PNG screenshot from the R3F canvas for PDF export.
 */
export function useDiagramCapture() {
  const diagramRef = useRef<HTMLDivElement>(null);

  const captureDiagram = useCallback(async (): Promise<string | undefined> => {
    if (!diagramRef.current) return undefined;

    const canvas = diagramRef.current.querySelector("canvas");
    if (!canvas) return undefined;

    try {
      return canvas.toDataURL("image/png");
    } catch {
      console.warn("Could not capture 3D diagram — canvas may be tainted");
      return undefined;
    }
  }, []);

  return { diagramRef, captureDiagram };
}
