/**
 * Ajoute une nouvelle langue avec auto-traduction via Google Translate.
 *
 * Usage (depuis le dossier frontend/) :
 *   node scripts/add-language.mjs <code> "<label>" "<flag>"
 *
 * Exemples :
 *   node scripts/add-language.mjs ru "Русский" "🇷🇺"
 *   node scripts/add-language.mjs es "Español" "🇪🇸"
 *   node scripts/add-language.mjs de "Deutsch" "🇩🇪"
 *   node scripts/add-language.mjs ar "العربية" "🇸🇦"
 */

import { translate } from '@vitalets/google-translate-api';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const [langCode, langLabel, langFlag] = process.argv.slice(2);

if (!langCode || !langLabel) {
  console.log('\nUsage : node scripts/add-language.mjs <code> "<label>" "<flag>"');
  console.log('Exemple : node scripts/add-language.mjs ru "Русский" "🇷🇺"\n');
  process.exit(1);
}

const LOCALES_DIR = 'public/locales';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function translateString(text, target) {
  if (!text || text.trim() === '') return text;
  try {
    await sleep(150);
    const result = await translate(text, { from: 'fr', to: target });
    return result.text;
  } catch {
    return text; // fallback : garde le texte français
  }
}

async function translateObj(obj, target) {
  if (typeof obj === 'string') {
    process.stdout.write('.');
    return translateString(obj, target);
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = await translateObj(value, target);
  }
  return result;
}

// Vérifie si la langue existe déjà
if (existsSync(`${LOCALES_DIR}/${langCode}/translation.json`)) {
  console.log(`\nLa langue "${langCode}" existe déjà. Supprime le dossier public/locales/${langCode}/ pour la régénérer.\n`);
  process.exit(0);
}

// Lit la base française
const frPath = `${LOCALES_DIR}/fr/translation.json`;
if (!existsSync(frPath)) {
  console.log('\nErreur : public/locales/fr/translation.json introuvable. Lance le script depuis le dossier frontend/.\n');
  process.exit(1);
}

const fr = JSON.parse(readFileSync(frPath, 'utf8'));

console.log(`\nTraduction en cours vers "${langLabel}" (${langCode})...\n`);

const translated = await translateObj(fr, langCode);

// Sauvegarde le fichier de traduction
mkdirSync(`${LOCALES_DIR}/${langCode}`, { recursive: true });
writeFileSync(
  `${LOCALES_DIR}/${langCode}/translation.json`,
  JSON.stringify(translated, null, 2),
  'utf8'
);

// Met à jour languages.json
const langsPath = `${LOCALES_DIR}/languages.json`;
const languages = JSON.parse(readFileSync(langsPath, 'utf8'));
if (!languages.find(l => l.code === langCode)) {
  languages.push({ code: langCode, label: langLabel, flag: langFlag || '🌐' });
  writeFileSync(langsPath, JSON.stringify(languages, null, 2), 'utf8');
}

console.log(`\n\nLa langue "${langLabel}" a été ajoutée avec succès !`);
console.log(`Fichier créé : ${LOCALES_DIR}/${langCode}/translation.json`);
console.log(`La langue apparaît automatiquement dans la navbar.\n`);
