// Emergency keyword detection utility
export const EMERGENCY_KEYWORDS = [
  // Cardiac
  'chest pain', 'chest tightness', 'heart attack', 'cardiac arrest', 'palpitations severe',
  // Neurological
  'stroke', 'paralysis', 'sudden numbness', 'face drooping', 'arm weakness', 'speech difficulty',
  // Respiratory
  'difficulty breathing', 'cant breathe', "can't breathe", 'shortness of breath severe',
  'breathing problem', 'choking',
  // Consciousness
  'unconscious', 'unresponsive', 'fainted', 'passed out', 'not breathing',
  // Other emergencies
  'heavy bleeding', 'severe allergic', 'anaphylaxis', 'poisoning', 'overdose',
  'severe head injury', 'broken bone severe', 'pregnancy emergency', 'seizure',
  // Hindi/regional (common phonetic spellings)
  'sine mein dard', 'dil ka dora', 'sans lena mushkil',
];

/**
 * Detects if the query contains emergency keywords
 * @param {string} query - The search query
 * @returns {boolean}
 */
export function detectEmergency(query) {
  if (!query || query.trim().length < 3) return false;
  const lower = query.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword => lower.includes(keyword));
}
