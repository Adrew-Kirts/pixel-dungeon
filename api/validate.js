import { replayEasy, ReplayError } from '../src/easy/engine.js';
import { createRealRun, apply, finalScore, InputError } from '../src/real/engine.js';

export class ValidationError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export const MAX_INPUTS = 600;

const ALLOWED_FIELDS = {
  hero: ['choice'],
  strike: ['ms'],
  potion: ['choice'],
  answer: ['choice', 'ms'],
  dodge: ['ms'],
  aim: ['ms'],
  chest: [],
};

export const DEFAULT_BOT_THRESHOLDS = {
  minStrikes: 6,
  strikesAloneMin: 10,
  minPerfectRatio: 0.9,
  maxDeviationMs: 6,
  maxDodgeDeviationMs: 1,
  maxAnswerDeviationMs: 30,
};

function sanitize(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input) === true) throw new ValidationError('inputs');
  if (typeof input.type !== 'string' || Object.hasOwn(ALLOWED_FIELDS, input.type) === false) throw new ValidationError('inputs');
  const fields = ALLOWED_FIELDS[input.type];
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
  for (const raw of inputs) {
    try {
      apply(state, sanitize(raw));
    } catch (error) {
      if (error instanceof InputError || error instanceof ValidationError) throw new ValidationError('inputs');
      throw error;
    }
  }
  if (state.phase !== 'done') throw new ValidationError('unfinished');
  if (elapsedMs < state.gameMs * 0.9) throw new ValidationError('too_fast');
  if (botCheck(state, thresholds) === true) return { human: false, state };
  return { human: true, state, score: finalScore(state) };
}
