import type { Achievement, AnsweredRecord, GameModeId } from '../types';
import { useProgress } from '../store/progress';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', icon: '🎯', title: { en: 'First Pick', ar: 'أول اختيار' }, description: { en: 'Answer your first question', ar: 'جاوب أول سؤال' } },
  { id: 'mind_reader', icon: '🔮', title: { en: 'Mind Reader', ar: 'قارئ الأفكار' }, description: { en: 'Agree with the majority 10 times', ar: 'اتفق مع الأغلبية 10 مرات' } },
  { id: 'contrarian', icon: '🌊', title: { en: 'Contrarian', ar: 'عكس التيار' }, description: { en: 'Choose the minority answer 10 times', ar: 'اختار إجابة الأقلية 10 مرات' } },
  { id: 'no_hesitation', icon: '⚡', title: { en: 'No Hesitation', ar: 'من غير تفكير' }, description: { en: 'Answer 20 questions in under 5 seconds each', ar: 'جاوب 20 سؤال في أقل من 5 ثواني' } },
  { id: 'diplomat', icon: '🕊️', title: { en: 'The Diplomat', ar: 'الدبلوماسي' }, description: { en: 'Play 50 rounds without skipping', ar: 'العب 50 جولة من غير تخطي' } },
  { id: 'night_owl', icon: '🦉', title: { en: 'Night Owl', ar: 'بومة الليل' }, description: { en: 'Answer a question after midnight', ar: 'جاوب سؤال بعد نص الليل' } },
  { id: 'century', icon: '💯', title: { en: 'Century', ar: 'المية' }, description: { en: 'Answer 100 questions', ar: 'جاوب 100 سؤال' } },
  { id: 'five_hundred', icon: '🏆', title: { en: 'Dilemma Veteran', ar: 'محارب المعضلات' }, description: { en: 'Answer 500 questions', ar: 'جاوب 500 سؤال' } },
  { id: 'host_with_most', icon: '👑', title: { en: 'Host with the Most', ar: 'أفضل مضيف' }, description: { en: 'Host 5 online games', ar: 'استضف 5 ألعاب أونلاين' } },
  { id: 'social_butterfly', icon: '🦋', title: { en: 'Social Butterfly', ar: 'فراشة اجتماعية' }, description: { en: 'Play with 10 different players', ar: 'العب مع 10 لاعبين مختلفين' } },
  { id: 'author', icon: '✍️', title: { en: 'The Author', ar: 'المؤلف' }, description: { en: 'Create 5 custom questions', ar: 'اعمل 5 أسئلة مخصصة' } },
  { id: 'collector', icon: '❤️', title: { en: 'Collector', ar: 'الجامع' }, description: { en: 'Favorite 20 questions', ar: 'ضيف 20 سؤال للمفضلة' } },
  { id: 'streak_7', icon: '🔥', title: { en: 'On Fire', ar: 'نار' }, description: { en: 'Keep a 7-day daily challenge streak', ar: 'حافظ على سلسلة 7 أيام في تحدي اليوم' } },
  { id: 'deep_thinker', icon: '🌌', title: { en: 'Deep Thinker', ar: 'المفكر العميق' }, description: { en: 'Answer 25 Deep mode questions', ar: 'جاوب 25 سؤال من نمط عميق' } },
  { id: 'risk_taker', icon: '🎲', title: { en: 'Risk Taker', ar: 'المغامر' }, description: { en: 'Answer 25 Extreme mode questions', ar: 'جاوب 25 سؤال من النمط المتطرف' } },
];

export interface EvalContext {
  answered: AnsweredRecord[];
  favoritesCount: number;
  customCount: number;
  dailyStreak: number;
  distinctPlayers: number;
  hostedGames: number;
  roundsWithoutSkip: number;
}

export function evaluateAchievements(ctx: EvalContext): string[] {
  const newly: string[] = [];
  const unlocked = useProgress.getState().unlockedAchievements;
  const check = (id: string, ok: boolean) => {
    if (ok && !unlocked[id] && !newly.includes(id)) newly.push(id);
  };

  const withMajority = ctx.answered.filter((a) => a.majorityChoice === a.choice && a.majorityChoice != null).length;
  const against = ctx.answered.filter((a) => a.majorityChoice != null && a.majorityChoice !== a.choice).length;
  const fast = ctx.answered.filter((a) => a.timeToAnswerMs < 5000).length;
  const deep = ctx.answered.filter((a) => a.mode === 'deep').length;
  const extreme = ctx.answered.filter((a) => a.mode === 'extreme').length;
  const night = ctx.answered.some((a) => new Date(a.at).getHours() < 4);

  check('first_blood', ctx.answered.length >= 1);
  check('mind_reader', withMajority >= 10);
  check('contrarian', against >= 10);
  check('no_hesitation', fast >= 20);
  check('diplomat', ctx.roundsWithoutSkip >= 50);
  check('night_owl', night);
  check('century', ctx.answered.length >= 100);
  check('five_hundred', ctx.answered.length >= 500);
  check('host_with_most', ctx.hostedGames >= 5);
  check('social_butterfly', ctx.distinctPlayers >= 10);
  check('author', ctx.customCount >= 5);
  check('collector', ctx.favoritesCount >= 20);
  check('streak_7', ctx.dailyStreak >= 7);
  check('deep_thinker', deep >= 25);
  check('risk_taker', extreme >= 25);

  return newly;
}
