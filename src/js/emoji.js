import emojiRegex from 'emoji-regex';
import localEmoji from './json/localEmoji.json';

// TODO добавить возможность добавлять к эмодзи модификаторы, не ломая их
export const modifiers = {
  // Цвет
  light: '🏻',
  mediumLight: '🏼',
  medium: '🏽',
  mediumDark: '🏾',
  dark: '🏿',
  // Пол
  female: '♀️',
  male: '♂️'
}

// Преобразует эмодзи символ в hex-код
export function getEmojiCode(emoji) {
  let symbol = emoji
        .split('')
        .map((e) => e.charCodeAt(0).toString(16))
        .filter((e) => 'fe0f' != e.toLowerCase())
        .map((e) => String.fromCodePoint(parseInt(e, 16)))
        .join('');

  return encodeURIComponent(symbol).replace(/%/g, '').toLowerCase();
}

// TODO когда понадобится
export function getEmojiFromCode() {

}

// Генерирует из эмодзи картинку
export function generateEmojiImage(emoji) {
  let props = '';
  const code = getEmojiCode(emoji);
  const local = localEmoji[code];

  if(local) {
    let [id, x, y, posX, posY] = local.split('|'),
        style = `background: url('/dist/assets/emoji_sprites/sprite_${id}.png') ${x} ${y}`;

    if(devicePixelRatio >= 2) style += ` / ${posX} ${posY};`;

    props = `src="/dist/assets/blank.gif" style="${style}"`;
  } else props = `src="https://vk.com/emoji/e/${code}.png"`;

  return `<img class="emoji" ${props} alt="${emoji}">`;
}

// Преобразует текст с эмодзи символами в текст с эмодзи картинками
export default function(text = '') {
  return text.replace(/&nbsp;/g, ' ').replace(/\uFE0F/g, '')
             .replace(emojiRegex(), generateEmojiImage);
}
