"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createPopper } from "@popperjs/core";

export function CardPreviewPopover({
  anchorElement,
  cardName,
  imageUrl
}: {
  anchorElement: HTMLElement | null;
  cardName: string | null;
  imageUrl: string | null;
}) {
  const popoverRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!anchorElement || !popoverRef.current) {
      return;
    }

    const popperInstance = createPopper(anchorElement, popoverRef.current, {
      placement: "top",
      modifiers: [
        {
          name: "offset",
          options: {
            offset: [0, 8]
          }
        },
        {
          name: "flip",
          options: {
            fallbackPlacements: ["bottom", "right", "left"]
          }
        },
        {
          name: "preventOverflow",
          options: {
            padding: 8
          }
        }
      ]
    });

    return () => {
      popperInstance.destroy();
    };
  }, [anchorElement, cardName, imageUrl]);

  if (!anchorElement || !cardName || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <span ref={popoverRef} className="card-preview" role="tooltip">
      {imageUrl ? <img src={imageUrl} alt={`${cardName} preview`} /> : <span className="card-preview-loading">Loading...</span>}
    </span>,
    document.body
  );
}
