export const KEY_POOLS = {
  home: ['a','s','d','f','g','h','j','k','l',';'],
  top:  ['q','w','e','r','t','y','u','i','o','p'],
  bottom:['z','x','c','v','b','n','m',',','.','/']
};
KEY_POOLS.mixed = [...new Set([...KEY_POOLS.home, ...KEY_POOLS.top, ...KEY_POOLS.bottom])];
const SHIFT_MAP = { ':': ';', '<': ',', '>': '.', '?': '/' };
export function normalizeKey(k) {
  if (!k) return '';
  if (SHIFT_MAP[k]) return SHIFT_MAP[k];
  return (k.length === 1) ? k.toLowerCase() : '';
}
export function isAllowedChar(k) { return KEY_POOLS.mixed.includes(k); }
export const IGNORE_KEYS = new Set([
  'Shift','Control','Alt','Meta','CapsLock','Tab','Escape','Enter','Backspace',
  'ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown',
  'Insert','Delete','ContextMenu','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'
]);
