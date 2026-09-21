// labels.ts — bilingual names of weapon classes and models (pure). CHANGED (S3-aa): new.
// Models keep the source's spelling as the key; English uses the usual transliteration (Kh-, S-).
import type { Lang, Localized } from '../../catalog/types';
import type { WeaponClass } from './data';

export const CLASS_LABEL: Readonly<Record<WeaponClass, Localized>> = {
  cruise: { en: 'Cruise missiles', uk: 'Крилаті ракети' },
  ballistic: { en: 'Ballistic & aeroballistic', uk: 'Балістичні й аеробалістичні' },
  antiship: { en: 'Anti-ship missiles', uk: 'Протикорабельні ракети' },
  other: { en: 'Other & type not given', uk: 'Інші й тип не вказано' },
  mixed: { en: 'Several classes in one report', uk: 'Кілька класів в одному звіті' },
  drones: { en: 'Shahed-type & decoy drones', uk: 'Дрони типу Shahed та імітатори' },
};

/** Short names for tight places (legend chips, tooltips on phones). */
export const CLASS_SHORT: Readonly<Record<WeaponClass, Localized>> = {
  cruise: { en: 'Cruise', uk: 'Крилаті' },
  ballistic: { en: 'Ballistic', uk: 'Балістичні' },
  antiship: { en: 'Anti-ship', uk: 'Протикорабельні' },
  other: { en: 'Other', uk: 'Інші' },
  mixed: { en: 'Mixed report', uk: 'Змішаний звіт' },
  drones: { en: 'Drones', uk: 'Дрони' },
};

export const CLASS_MEMBERS: Readonly<Record<WeaponClass, Localized>> = {
  cruise: { en: 'Kh-101/555, Kalibr, Iskander-K, Kh-59/69, Kh-35', uk: 'Х-101/555, «Калібр», «Іскандер-К», Х-59/69, Х-35' },
  ballistic: { en: 'Iskander-M, KN-23, S-300/S-400, Kinzhal', uk: '«Іскандер-М», KN-23, С-300/С-400, «Кинджал»' },
  antiship: { en: 'Kh-22/32, Oniks, Zircon', uk: 'Х-22/32, «Онікс», «Циркон»' },
  other: { en: 'Kh-31P anti-radiation, type not given', uk: 'протирадіолокаційні Х-31П, тип не вказано' },
  mixed: { en: 'one number for several classes', uk: 'одне число на кілька класів' },
  drones: { en: 'Shahed-136/131 (Geran-2), decoys, type not given', uk: 'Shahed-136/131 («Герань-2»), імітатори, тип не вказано' },
};

const MODEL: Readonly<Record<string, Localized>> = {
  'X-101/X-555': { en: 'Kh-101/Kh-555', uk: 'Х-101/Х-555' },
  Kalibr: { en: 'Kalibr', uk: '«Калібр»' },
  'Iskander-K': { en: 'Iskander-K', uk: '«Іскандер-К»' },
  'X-59': { en: 'Kh-59', uk: 'Х-59' },
  'X-69': { en: 'Kh-69', uk: 'Х-69' },
  'X-59/X-69': { en: 'Kh-59/Kh-69', uk: 'Х-59/Х-69' },
  'X-59MK2': { en: 'Kh-59MK2', uk: 'Х-59МК2' },
  'X-35': { en: 'Kh-35', uk: 'Х-35' },
  'X-35Y': { en: 'Kh-35U', uk: 'Х-35У' },
  Banderol: { en: 'Banderol', uk: '«Бандероль»' },
  'Iskander-M': { en: 'Iskander-M', uk: '«Іскандер-М»' },
  'KN-23': { en: 'KN-23', uk: 'KN-23' },
  'Iskander-M/KN-23': { en: 'Iskander-M/KN-23', uk: '«Іскандер-М»/KN-23' },
  'C-300': { en: 'S-300', uk: 'С-300' },
  'C-400': { en: 'S-400', uk: 'С-400' },
  'C-300/C-400': { en: 'S-300/S-400', uk: 'С-300/С-400' },
  'Ballistic Missile': { en: 'Ballistic missile, type not given', uk: 'Балістична ракета, тип не вказано' },
  'Intercontinental Ballistic Missile': { en: 'Intercontinental ballistic missile (as reported)', uk: 'Міжконтинентальна балістична ракета (як повідомлено)' },
  'X-47 Kinzhal': { en: 'Kh-47M2 Kinzhal', uk: 'Х-47М2 «Кинджал»' },
  'X-22': { en: 'Kh-22', uk: 'Х-22' },
  'X-32': { en: 'Kh-32', uk: 'Х-32' },
  'P-800 Oniks': { en: 'P-800 Oniks', uk: 'П-800 «Онікс»' },
  '3M22 Zircon': { en: '3M22 Zircon', uk: '3М22 «Циркон»' },
  'X-31': { en: 'Kh-31', uk: 'Х-31' },
  'X-31P': { en: 'Kh-31P', uk: 'Х-31П' },
  'X-31PD': { en: 'Kh-31PD', uk: 'Х-31ПД' },
  'Unknown Missile': { en: 'Missile, type not given', uk: 'Ракета, тип не вказано' },
  'Shahed-136/131': { en: 'Shahed-136/131 & decoys', uk: 'Shahed-136/131 та імітатори' },
  'Unknown UAV': { en: 'Drone, type not given', uk: 'Дрон, тип не вказано' },
};

/** 'X-101/X-555 and Kalibr' → 'Kh-101/Kh-555 + Kalibr'. Unknown parts pass through unchanged. */
export function modelLabel(model: string, lang: Lang): string {
  return model
    .split(' and ')
    .map((p) => MODEL[p.trim()]?.[lang] ?? p.trim())
    .join(' + ');
}

/** true when every part of a source model name has a label (a refresh with a new model fails the tests). */
export const hasModelLabel = (model: string): boolean => model.split(' and ').every((p) => p.trim() in MODEL);
