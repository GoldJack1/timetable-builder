import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PICKER_ICONS } from "./iconCatalog";

export function iconSrc(id: string) {
  return `/icons/brface3/${id}.svg`;
}

export function IconPicker({
  open,
  selected,
  onClose,
  onPick,
}: {
  open: boolean;
  selected: string[];
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filterRef = useRef<HTMLInputElement>(null);
  const icons = useMemo(() => {
    const n = q.trim().toLowerCase();
    return PICKER_ICONS.filter((icon) =>
      n ? `${icon.label} ${icon.id}`.toLowerCase().includes(n) : true,
    );
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => filterRef.current?.focus());
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label="Icon picker" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <strong>Leaflet icons</strong>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <input
          ref={filterRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter icons"
          aria-label="Filter icons"
        />
        <div className="icon-grid">
          {icons.map((icon) => (
            <button
              key={icon.id}
              type="button"
              className={selected.includes(icon.id) ? "icon-btn on" : "icon-btn"}
              title={icon.label}
              aria-pressed={selected.includes(icon.id)}
              onClick={() => onPick(icon.id)}
            >
              <span className="icon-tile">
                <img className="leaflet-icon" src={iconSrc(icon.id)} alt="" />
              </span>
              <span>{icon.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
