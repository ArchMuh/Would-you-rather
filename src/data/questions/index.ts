import type { Question } from '../../types';
import { CLASSIC } from './classic';
import { FRIENDS } from './friends';
import { COUPLES } from './couples';
import { DEEP } from './deep';
import { EXTREME } from './extreme';
import { FUNNY } from './funny';
import { ADULT } from './adult';
import { HEAT } from './heat';

export const ALL_QUESTIONS: Question[] = [
  ...CLASSIC,
  ...FRIENDS,
  ...COUPLES,
  ...DEEP,
  ...EXTREME,
  ...FUNNY,
  ...ADULT,
  ...HEAT,
];

export const QUESTION_COUNT = ALL_QUESTIONS.length;
