export async function postTimetable(path: "/api/save-timetable" | "/api/publish-timetable", doc: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  let payload: { ok?: boolean; message?: string; error?: string } = {};
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    payload = {};
  }
  if (!res.ok || payload.ok === false) {
    throw new Error(payload.error || payload.message || `Request failed (${res.status})`);
  }
  return payload.message || "Done.";
}
