export const AVATARS: { key: string; emoji: string }[] = [
  { key: 'fox', emoji: '🦊' },
  { key: 'panda', emoji: '🐼' },
  { key: 'tiger', emoji: '🐯' },
  { key: 'frog', emoji: '🐸' },
  { key: 'octopus', emoji: '🐙' },
  { key: 'owl', emoji: '🦉' },
  { key: 'shark', emoji: '🦈' },
  { key: 'unicorn', emoji: '🦄' },
  { key: 'robot', emoji: '🤖' },
  { key: 'alien', emoji: '👽' },
  { key: 'ghost', emoji: '👻' },
  { key: 'ninja', emoji: '🥷' },
  { key: 'astronaut', emoji: '🧑‍🚀' },
  { key: 'wizard', emoji: '🧙' },
  { key: 'cat', emoji: '🐱' },
  { key: 'dog', emoji: '🐶' },
];

export function avatarEmoji(key: string): string {
  return AVATARS.find((a) => a.key === key)?.emoji ?? '🙂';
}
