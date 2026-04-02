/**
 * Parse "Q1: ...\nA1: ..." text into [{index, question, answer}]
 */
export function parseQAPairs(text) {
  if (!text) return [];
  const pairs = [];
  const lines = text.split('\n');
  let currentQ = null;
  let lastPair = null;
  for (const line of lines) {
    const qMatch = line.match(/^Q(\d+):\s*(.+)/);
    const aMatch = line.match(/^A(\d+):\s*(.+)/);
    const imgMatch = line.match(/^\[IMG:(data:image\/.+)\]$/);
    if (qMatch) {
      currentQ = { index: parseInt(qMatch[1]), question: qMatch[2].trim() };
    } else if (aMatch && currentQ) {
      lastPair = { ...currentQ, answer: aMatch[2].trim(), image: null };
      pairs.push(lastPair);
      currentQ = null;
    } else if (imgMatch && lastPair) {
      lastPair.image = imgMatch[1];
    }
  }
  return pairs;
}

/**
 * Parse "- bullet\n- bullet" text into string[]
 */
export function parseNotes(text) {
  if (!text) return [];
  return text.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.substring(2));
}

/**
 * Format ISO date string to readable format
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
