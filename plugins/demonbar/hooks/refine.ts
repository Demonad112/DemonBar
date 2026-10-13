const TRIGGER = /\s*!refine\s*$/i

// kept short: it is added to the prompt, so every word costs tokens
const INSTRUCTION = [
  '',
  '',
  '[refine] Do not act yet. Rewrite the request above as a task brief with precise terms:',
  'Goal / Context / Constraints / Deliverables / Success criteria / Assumptions / Open questions.',
  'Keep it tight. Show it, ask only the open questions that matter, then wait for my "go".',
].join('\n')

// A message ending in !refine loses the trigger and gains the instruction; anything else is returned as is.
// The prompt.submit handler and its toast live in register.tsx.
export const rewrite = (text: string) => (TRIGGER.test(text) ? text.replace(TRIGGER, '') + INSTRUCTION : text)
