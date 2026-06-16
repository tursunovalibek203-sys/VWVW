// O'zbek tilini lotin yozuvidan kirill yozuviga transliteratsiya qilish

export type UiScript = 'latin' | 'cyrillic';
const SCRIPT_STORAGE_KEY = 'uiScript';
export const SCRIPT_CHANGE_EVENT = 'uiscriptchange';

// Saytda ishlatiladigan joriy yozuv turini olish (lotin yoki krilcha)
export function getScript(): UiScript {
  if (typeof window === 'undefined') return 'cyrillic';
  return (localStorage.getItem(SCRIPT_STORAGE_KEY) as UiScript) || 'cyrillic';
}

// Joriy yozuv turini o'rnatish va shu haqida butun saytga xabar berish
export function setScript(script: UiScript): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SCRIPT_STORAGE_KEY, script);
  window.dispatchEvent(new CustomEvent(SCRIPT_CHANGE_EVENT, { detail: script }));
}

// Kod ichida qattiq yozilgan (hardcoded) lotincha matnni joriy yozuvda ko'rsatish.
// Sayt bo'ylab minglab joyda shu funksiya bilan o'ralgan matnlar bor — script
// 'latin' bo'lsa matn o'zgarishsiz qoladi, 'cyrillic' bo'lsa krilchaga o'giriladi.
export function latinToCyrillic(text: string): string {
  if (!text) return text;
  if (getScript() === 'latin') return text;

  let result = text;

  // O' va G' ni oldin almashtirish (bitta belgi) - o'zbekcha maxsus harflar
  result = result.replace(/o'/g, 'ў');
  result = result.replace(/O'/g, 'Ў');
  result = result.replace(/g'/g, 'ғ');
  result = result.replace(/G'/g, 'Ғ');

  // Maxsus kombinatsiyalar
  result = result.replace(/sh/g, 'ш');
  result = result.replace(/Sh/g, 'Ш');
  result = result.replace(/SH/g, 'Ш');
  result = result.replace(/ch/g, 'ч');
  result = result.replace(/Ch/g, 'Ч');
  result = result.replace(/CH/g, 'Ч');
  result = result.replace(/ng/g, 'нг');
  result = result.replace(/Ng/g, 'Нг'); 










  
  result = result.replace(/NG/g, 'НГ');

  // Harflar xaritasi
  const charMap: Record<string, string> = {
    'a': 'а', 'b': 'б', 'd': 'д', 'e': 'е', 'f': 'ф', 'g': 'г', 'h': 'ҳ',
    'i': 'и', 'j': 'ж', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н',
    'o': 'о', 'p': 'п', 'q': 'қ', 'r': 'р', 's': 'с', 't': 'т',
    'u': 'у', 'v': 'в', 'x': 'х', 'y': 'й', 'z': 'з',
    'A': 'А', 'B': 'Б', 'D': 'Д', 'E': 'Е', 'F': 'Ф', 'G': 'Г', 'H': 'Ҳ',
    'I': 'И', 'J': 'Ж', 'K': 'К', 'L': 'Л', 'M': 'М', 'N': 'Н',
    'O': 'О', 'P': 'П', 'Q': 'Қ', 'R': 'Р', 'S': 'С', 'T': 'Т',
    'U': 'У', 'V': 'В', 'X': 'Х', 'Y': 'Й', 'Z': 'З',
  };

  // Qolgan harflarni almashtirish
  let cyrillicResult = '';
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    cyrillicResult += charMap[char] || char;
  }

  return cyrillicResult;
}

// Kirilldan lotinga
export function cyrillicToLatin(text: string): string {
  if (!text) return text;

  const charMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
    'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l',
    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's',
    'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'ъ': "'", 'ы': 'y', 'ь': "'", 'э': 'e', 'ю': 'yu',
    'я': 'ya', 'ў': "o'", 'ҳ': 'h', 'қ': 'q', 'ғ': "g'",
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E',
    'Ж': 'J', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L',
    'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S',
    'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'X', 'Ц': 'Ts', 'Ч': 'Ch',
    'Ш': 'Sh', 'Ъ': "'", 'Ы': 'Y', 'Ь': "'", 'Э': 'E', 'Ю': 'Yu',
    'Я': 'Ya', 'Ў': "O'", 'Ҳ': 'H', 'Қ': 'Q', 'Ғ': "G'",
  };

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += charMap[char] || char;
  }

  return result;
}

// Bazadan kelgan dinamik matnlar (mijoz, mahsulot, yetkazib beruvchi nomlari va h.k.)
// uchun. Bu ma'lumotlar krilcha holatda saqlanadi — script 'latin' bo'lganda
// lotinga o'giriladi, 'cyrillic' bo'lganda o'zgarishsiz qoladi.
export function trData(text: string): string {
  if (!text) return text;
  return getScript() === 'latin' ? cyrillicToLatin(text) : text;
}

// Qisqa nom bilan export
export const t = latinToCyrillic;

// Default export
export default {
  latinToCyrillic,
  cyrillicToLatin,
  t: latinToCyrillic
};
