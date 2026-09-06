/**
 * Natural Language Clause Segmenter
 * Decomposes multi-clause patient statements in Hindi, Marathi, Hinglish, and English
 * based on contrast connectors, conjunctions, and punctuation.
 */

// Connectors and contrast words across languages
const CONTRAST_CONNECTORS = [
  // Hindi contrast
  'लेकिन', 'मगर', 'परंतु', 'किंतु', 'फिर भी', 'हाँ लेकिन', 'नहीं लेकिन', 'हाँ, लेकिन', 'नहीं, लेकिन',
  // Marathi contrast
  'पण', 'मात्र', 'परंतु', 'तरी', 'तरीही', 'हो पण', 'नाही पण', 'हो, पण', 'नाही, पण',
  // Hinglish / English contrast
  'but', 'however', 'although', 'though', 'yet', 'lekin', 'magar', 'parantu', 'par'
];

const RESTRICTIVE_CONNECTORS = [
  // Hindi
  'बस', 'सिर्फ', 'केवल', 'बाकी',
  // Marathi
  'फक्त', 'केवळ', 'बाकी',
  // Hinglish / English
  'bas', 'sirf', 'only', 'just'
];

const CONJUNCTIONS = [
  // Hindi
  'और', 'तथा', 'एवं', 'साथ में', 'साथ ही',
  // Marathi
  'आणि', 'तसेच', 'व', 'सोबत',
  // English / Hinglish
  'and', 'aur', 'as well as', 'also'
];

// Combine all boundary markers into regex pattern
// Sort by length descending to match multi-word phrases like 'हाँ लेकिन' first
const ALL_CONNECTORS = [
  ...CONTRAST_CONNECTORS,
  ...RESTRICTIVE_CONNECTORS,
  ...CONJUNCTIONS,
].sort((a, b) => b.length - a.length);

const CONNECTOR_PATTERN = new RegExp(
  `(?<=^|\\s|[.,;!?])(${ALL_CONNECTORS.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=\\s|[.,;!?]|$)`,
  'gi'
);

/**
 * Segments a raw transcript into ordered semantic clauses.
 * @param {string} text - Raw patient utterance
 * @returns {Array<{ text: string, connector: string | null, isContrast: boolean }>}
 */
export function segmentClauses(text) {
  if (!text || typeof text !== 'string') return [];

  const raw = text.trim();
  if (!raw) return [];

  // 1. First split by punctuation boundaries (commas, semicolons, dashes, periods)
  // while preserving contrast words
  const initialSegments = raw.split(/[,;\n\r—\-]+/).map((s) => s.trim()).filter(Boolean);

  const clauses = [];

  for (const seg of initialSegments) {
    // Check if segment contains internal connectors
    const parts = seg.split(CONNECTOR_PATTERN);

    if (parts.length <= 1) {
      clauses.push({
        text: seg.trim(),
        connector: null,
        isContrast: false,
      });
      continue;
    }

    let currentConnector = null;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      const lowerPart = part.toLowerCase();
      const isConn = ALL_CONNECTORS.some((c) => c.toLowerCase() === lowerPart);

      if (isConn) {
        currentConnector = part;
      } else {
        const isContrast = currentConnector
          ? CONTRAST_CONNECTORS.some((c) => c.toLowerCase() === currentConnector.toLowerCase())
          : false;

        clauses.push({
          text: part,
          connector: currentConnector,
          isContrast,
        });
        currentConnector = null;
      }
    }
  }

  // Filter out empty or pure filler clauses
  const cleaned = clauses
    .map((c) => {
      // Strip leading/trailing connector words from clause text if any remain
      let t = c.text;
      for (const conn of ALL_CONNECTORS) {
        const startRegex = new RegExp(`^${conn}\\s+`, 'i');
        const endRegex = new RegExp(`\\s+${conn}$`, 'i');
        t = t.replace(startRegex, '').replace(endRegex, '').trim();
      }
      return {
        ...c,
        text: t,
      };
    })
    .filter((c) => c.text.length > 0);

  return cleaned.length > 0
    ? cleaned
    : [{ text: raw, connector: null, isContrast: false }];
}
