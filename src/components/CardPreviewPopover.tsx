"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createPopper, type Instance } from "@popperjs/core";

export function CardPreviewPopover({
  anchorElement,
  cardName,
  imageUrl
}: {
  anchorElement: HTMLElement | null;
  cardName: string | null;
  imageUrl: string | null;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const popperInstanceRef = useRef<Instance | null>(null);

  useEffect(() => {
    if (!anchorElement || !popoverRef.current) {
      return;
    }

    const popperInstance = createPopper(anchorElement, popoverRef.current, {
      strategy: "fixed",
      placement: "top",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 12]
          }
        },
        {
          name: "flip",
          options: {
            fallbackPlacements: ["bottom", "right", "left"],
            padding: 12,
            rootBoundary: "viewport"
          }
        },
        {
          name: "preventOverflow",
          options: {
            mainAxis: true,
            altAxis: true,
            padding: 12,
            rootBoundary: "viewport",
            tether: true
          }
        }
      ]
    });
    popperInstanceRef.current = popperInstance;

    return () => {
      popperInstanceRef.current = null;
      popperInstance.destroy();
    };
  }, [anchorElement, cardName, imageUrl]);

  useEffect(() => {
    if (!anchorElement || !cardName) {
      return;
    }

    void popperInstanceRef.current?.update();
  }, [anchorElement, cardName, imageUrl]);

  if (!anchorElement || !cardName || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div ref={popoverRef} className="card-preview" role="tooltip">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${cardName} preview`}
          onLoad={() => {
            void popperInstanceRef.current?.update();
          }}
        />
      ) : (
        <span className="card-preview-loading">Loading...</span>
      )}
    </div>,
    document.body
  );
}
