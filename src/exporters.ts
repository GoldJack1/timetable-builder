import { toJpeg, toPng } from "html-to-image";

function download(filename: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export async function exportPng(node: HTMLElement, name: string, transparent = false) {
  const data = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    ...(transparent ? {} : { backgroundColor: "#ffffff" }),
  });
  download(`${name}.png`, data);
}

export async function exportJpg(node: HTMLElement, name: string) {
  const data = await toJpeg(node, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff", quality: 0.92 });
  download(`${name}.jpg`, data);
}

export function downloadJson(data: unknown, name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  download(`${name}.json`, URL.createObjectURL(blob));
}

export function downloadText(text: string, name: string, type: string) {
  const blob = new Blob([text], { type });
  download(name, URL.createObjectURL(blob));
}
