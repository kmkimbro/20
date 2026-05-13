export function stripProcedureRichText(html) {
  if (html == null) return '';
  if (typeof document === 'undefined') {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const el = document.createElement('div');
  el.innerHTML = String(html);
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

export function hasRichTextContent(html) {
  return stripProcedureRichText(html).length > 0;
}
