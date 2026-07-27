function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHref(value) {
  // `value` is captured after the complete text has been HTML-escaped.
  // Decode only the entity we need to preserve query-string separators, then
  // escape the final attribute value exactly once.
  const href = value.trim().replace(/&amp;/g, "&");
  if (/^(?:https?:|mailto:|tel:|\/|#|\.?\.?(?:\/|$))/i.test(href)) {
    return href;
  }
  return "#";
}

function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) =>
    `<a href="${escapeHtml(safeHref(href))}">${label}</a>`
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return out;
}

export function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const htmlParts = [];
  let paragraphBuffer = [];
  let listBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      htmlParts.push(`<p>${paragraphBuffer.map(inline).join("<br>")}</p>`);
      paragraphBuffer = [];
    }
  }

  function flushList() {
    if (listBuffer.length > 0) {
      htmlParts.push(`<ul>${listBuffer.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      listBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      htmlParts.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
      continue;
    }

    const listMatch = line.match(/^-\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      listBuffer.push(listMatch[1]);
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return htmlParts.join("\n");
}
