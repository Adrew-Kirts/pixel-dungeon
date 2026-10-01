import { replayEasy, ReplayError } from '../src/easy/engine.js';
import { createRealRun, apply, finalScore, InputError } from '../src/real/engine.js';
import { createDeepRun, apply as applyDeep, finalScore as finalDeepScore, InputError as DeepInputError } from '../src/deep/engine.js';

export class ValidationError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export const MAX_INPUTS = 600;

export const MAX_DEEP_INPUTS = 2500;

const ALLOWED_FIELDS = {
  hero: ['choice'],
  strike: ['ms'],
  potion: ['choice'],
  answer: ['choice', 'ms'],
  dodge: ['ms'],
  aim: ['ms'],
  chest: [],
};

const DEEP_FIELDS = {
  create: ['difficulty', 'cls', 'weapon', 'shield', 'first', 'epithet'],
  nav: ['action', 'to', 'potion', 'index'],
  strike: ['ms'],
  defend: ['taps'],
  potion: ['choice'],
  loot: ['choice'],
  dodge: ['taps'],
  horde: ['taps'],
};

export const DEFAULT_BOT_THRESHOLDS = {
  minStrikes: 6,
  strikesAloneMin: 10,
  minPerfectRatio: 0.9,
  maxDeviationMs: 6,
  maxDodgeDeviationMs: 1,
  maxAnswerDeviationMs: 30,
  minParries: 12,
  maxParryDeviationMs: 4,
  deepMinSamples: 20,
  deepStrikeDeviationMs: 11,
  deepParryDeviationMs: 9,
};

function sanitize(input, allowed = ALLOWED_FIELDS) {
  if (input === null || typeof input !== 'object' || Array.isArray(input) === true) throw new ValidationError('inputs');
  if (typeof input.type !== 'string' || Object.hasOwn(allowed, input.type) === false) throw new ValidationError('inputs');
  const fields = allowed[input.type];
  const clean = { type: input.type };
  for (const field of fields) clean[field] = input[field] === undefined ? null : input[field];
  return clean;
}

function deviation(values) {
  if (values.length < 2) return Number.POSITIVE_INFINITY;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

export function botCheck({ timing, counts, reactions }, thresholds = DEFAULT_BOT_THRESHOLDS) {
  if (counts.strikes < thresholds.minStrikes) return false;
  if (counts.perfects / counts.strikes < thresholds.minPerfectRatio) return false;
  if (deviation(timing) >= thresholds.maxDeviationMs) return false;
  if (counts.strikes >= thresholds.strikesAloneMin) return true;
  const roboticDodges = reactions.dodges.length >= 3 && deviation(reactions.dodges) < thresholds.maxDodgeDeviationMs;
  const roboticAnswers = reactions.answers.length >= 3 && deviation(reactions.answers) < thresholds.maxAnswerDeviationMs;
  return roboticDodges === true || roboticAnswers === true;
}

export function rebuildEasyHero(easy) {
  let replay;
  try {
    replay = replayEasy(easy.seed, easy.strikes);
  } catch (error) {
    if (error instanceof ReplayError) throw new ValidationError('easy');
    throw error;
  }
  if (replay.won !== true) throw new ValidationError('easy');
  return replay.hero;
}

export function validateRealRun({ realSeed, easy, inputs, elapsedMs, thresholds = DEFAULT_BOT_THRESHOLDS }) {
  if (Array.isArray(inputs) === false || inputs.length === 0 || inputs.length > MAX_INPUTS) throw new ValidationError('inputs');
  const easyHero = easy === null ? null : rebuildEasyHero(easy);
  const state = createRealRun({ seed: realSeed, easyHero });
  const events = [...state.initialEvents];
  for (const raw of inputs) {
    try {
      events.push(...apply(state, sanitize(raw)));
    } catch (error) {
      if (error instanceof InputError || error instanceof ValidationError) throw new ValidationError('inputs');
      throw error;
    }
  }
  if (state.phase !== 'done') throw new ValidationError('unfinished');
  if (elapsedMs < state.gameMs * 0.9) throw new ValidationError('too_fast');
  if (botCheck(state, thresholds) === true) return { human: false, state, events };
  return { human: true, state, events, score: finalScore(state) };
}

export function deepBotCheck({ timing, counts, parryErrors }, thresholds = DEFAULT_BOT_THRESHOLDS) {
  const minParries = thresholds.minParries ?? DEFAULT_BOT_THRESHOLDS.minParries;
  const maxParryDeviation = thresholds.maxParryDeviationMs ?? DEFAULT_BOT_THRESHOLDS.maxParryDeviationMs;
  const minSamples = thresholds.deepMinSamples ?? DEFAULT_BOT_THRESHOLDS.deepMinSamples;
  if (parryErrors.length >= minParries && deviation(parryErrors) < maxParryDeviation) return true;
  if (counts.strikes >= minSamples && deviation(timing) < (thresholds.deepStrikeDeviationMs ?? DEFAULT_BOT_THRESHOLDS.deepStrikeDeviationMs)) return true;
  if (parryErrors.length >= minSamples && deviation(parryErrors) < (thresholds.deepParryDeviationMs ?? DEFAULT_BOT_THRESHOLDS.deepParryDeviationMs)) return true;
  if (counts.strikes < thresholds.minStrikes) return false;
  if (counts.perfects / counts.strikes < thresholds.minPerfectRatio) return false;
  return deviation(timing) < thresholds.maxDeviationMs;
}

export function validateDeepRun({ seed, inputs, elapsedMs, thresholds = DEFAULT_BOT_THRESHOLDS }) {
  if (Array.isArray(inputs) === false || inputs.length === 0 || inputs.length > MAX_DEEP_INPUTS) throw new ValidationError('inputs');
  const state = createDeepRun({ seed });
  const events = [];
  for (const raw of inputs) {
    try {
      events.push(...applyDeep(state, sanitize(raw, DEEP_FIELDS)));
    } catch (error) {
      if (error instanceof DeepInputError || error instanceof ValidationError) throw new ValidationError('inputs');
      throw error;
    }
  }
  if (state.phase !== 'done') throw new ValidationError('unfinished');
  if (elapsedMs < state.gameMs * 0.9) throw new ValidationError('too_fast');
  if (deepBotCheck(state, thresholds) === true) return { human: false, state, events };
  return { human: true, state, events, score: finalDeepScore(state) };
}
