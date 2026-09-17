import { enumerateMonths, paletteFor, stationIcons, stationName } from "./model";
import type { TimetableDoc } from "./types";

/** Scoped HTML+CSS for a WordPress custom HTML block (prefix kwvr-tt). */
export function wordpressSnippet(doc: TimetableDoc): string {
  const months = enumerateMonths(doc.calendar.startMonth, doc.calendar.monthCount);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const vars = doc.palette
    .map((p) => `--kwvr-${p.letter}:${p.fill};--kwvr-${p.letter}-ink:${p.text}`)
    .join(";");

  const css = `.kwvr-tt{font-family:Gill Sans,Gill Sans MT,Calibri,sans-serif;color:#111}.kwvr-tt h2{letter-spacing:.2em;text-align:center}.kwvr-tt table{border-collapse:collapse;width:100%;font-size:12px}.kwvr-tt td,.kwvr-tt th{border:1px solid #ccc;padding:2px 4px;text-align:center}.kwvr-tt-panel{margin:12px 0;border:1px solid #333}.kwvr-tt-panel h3{margin:0;padding:4px 8px}.kwvr-tt-panel table{font-variant-numeric:tabular-nums}.kwvr-tt-dir{margin:6px 8px 0;font-weight:600}`;

  const calRows = months
    .map((m) => {
      const cells = days
        .map((d) => {
          if (d > m.daysInMonth) return `<td></td>`;
          const iso = `${m.id}-${String(d).padStart(2, "0")}`;
          const letter = doc.calendar.cells[iso];
          if (!letter) return `<td></td>`;
          return `<td class="kwvr-tt-cell" style="background:var(--kwvr-${letter});color:var(--kwvr-${letter}-ink)">${letter}</td>`;
        })
        .join("");
      return `<tr><th>${m.label}</th>${cells}</tr>`;
    })
    .join("");

  const panels = doc.panels
    .map((p) => {
      const pal = paletteFor(doc, p.letter);
      const block = (label: string, b: typeof p.outbound) => {
        const head = `<tr><td>Notes</td><td></td>${b.services.map((s) => `<td>${s.noteIconIds.map((id) => `<img src="/icons/brface3/${id}.svg" alt="" width="10" height="10"/>`).join("")}</td>`).join("")}</tr>`;
        const rows = b.rows
          .map((r) => {
            const icons = stationIcons(doc, r.stationId)
              .map((id) => `<img src="/icons/brface3/${id}.svg" alt="" width="10" height="10"/>`)
              .join("");
            const times = b.services
              .map((s) => `<td>${s.times[r.stationId]?.value ?? ""}</td>`)
              .join("");
            return `<tr><td>${stationName(doc, r.stationId)}${icons}</td><td>${r.dir}</td>${times}</tr>`;
          })
          .join("");
        return `<p class="kwvr-tt-dir">${label}</p><table>${head}${rows}</table>`;
      };
      return `<section class="kwvr-tt-panel"><h3 style="background:${pal?.fill ?? "#333"};color:${pal?.text ?? "#fff"}">${p.letter} ${pal?.name ?? ""}</h3>${block("Outbound", p.outbound)}${block("Inbound", p.inbound)}</section>`;
    })
    .join("");

  return `<!-- KWVR timetable embed: paste into a Custom HTML block. Host icons on the same origin or replace img src. -->
<style>${css}</style>
<div class="kwvr-tt" style="${vars}">
  <h2>${escapeHtml(doc.document.title)}</h2>
  <p><em>${escapeHtml(doc.document.intro)}</em></p>
  <p>${escapeHtml(doc.document.specialKey)}</p>
  <div style="overflow:auto"><table><thead><tr><th></th>${days.map((d) => `<th>${d}</th>`).join("")}</tr></thead><tbody>${calRows}</tbody></table></div>
  ${panels}
  <p>${escapeHtml(doc.document.footnote)}</p>
</div>
`;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
