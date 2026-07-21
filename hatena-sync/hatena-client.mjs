function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildEntryXml({ title, contentHtml, updated, draft }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom" xmlns:app="http://www.w3.org/2007/app">
  <title>${escapeXml(title)}</title>
  <content type="text/html">${escapeXml(contentHtml)}</content>
  <updated>${updated}</updated>
  <app:control>
    <app:draft>${draft ? "yes" : "no"}</app:draft>
  </app:control>
</entry>`;
}

export async function postEntry(credentials, { title, contentHtml, draft = false }) {
  const url = `${credentials.rootEndpoint}/entry`;
  const auth = Buffer.from(`${credentials.hatenaId}:${credentials.apiKey}`).toString("base64");
  const updated = new Date().toISOString();
  const body = buildEntryXml({ title, contentHtml, updated, draft });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/atom+xml;type=entry;charset=utf-8",
    },
    body,
  });

  const text = await res.text();

  if (!res.ok) {
    const err = new Error(`Hatena API error (${res.status}): ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const editUrlMatch = text.match(/<link rel="edit" href="([^"]+)"/);
  const altUrlMatch = text.match(/<link rel="alternate"[^>]*href="([^"]+)"/);

  return {
    editUrl: editUrlMatch?.[1] ?? null,
    publicUrl: altUrlMatch?.[1] ?? null,
    raw: text,
  };
}
