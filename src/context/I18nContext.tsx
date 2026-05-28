import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  LANGUAGES,
  PHRASES,
  getPhraseTranslation,
  type LanguageCode,
} from '../i18n/translations';

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (source: string) => string;
};

const STORAGE_KEY = 'immersion-language';
const I18nContext = createContext<I18nContextValue | undefined>(undefined);
let translationFrameId: number | null = null;
let isApplyingTranslations = false;
const originalTextNodes = new WeakMap<
  Text,
  { original: string; translated: string }
>();

function isLanguageCode(value: string | null): value is LanguageCode {
  return Boolean(value && LANGUAGES.some((language) => language.code === value));
}

const reversePhraseMap = new Map<string, string>();
for (const [source, translations] of Object.entries(PHRASES)) {
  reversePhraseMap.set(normalizePhrase(source), source);
  for (const translation of Object.values(translations)) {
    reversePhraseMap.set(normalizePhrase(translation), source);
  }
}

const phraseSegments = Object.entries(PHRASES)
  .flatMap(([source, translations]) => [
    { text: source, source },
    ...Object.values(translations).map((text) => ({ text, source })),
  ])
  .filter((entry) => normalizePhrase(entry.text).length >= 4)
  .sort((a, b) => b.text.length - a.text.length);

function normalizePhrase(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function preserveWhitespace(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] ?? '';
  const trailing = original.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceKnownSegments(value: string, language: LanguageCode): string {
  let translatedValue = value;

  for (const entry of phraseSegments) {
    const translated = getPhraseTranslation(entry.source, language);
    if (!translated || translated === entry.text) continue;

    const expression = new RegExp(escapeRegExp(entry.text), 'g');
    translatedValue = translatedValue.replace(expression, translated);
  }

  return translatedValue;
}

function translateRawText(value: string, language: LanguageCode): string {
  const normalized = normalizePhrase(value);
  if (!normalized) return value;

  const source = reversePhraseMap.get(normalized) ?? normalized;
  const translated = getPhraseTranslation(source, language);
  if (translated && translated !== normalized) {
    return preserveWhitespace(value, translated);
  }

  const segmentTranslated = replaceKnownSegments(value, language);
  return segmentTranslated;
}

function shouldSkipTextNode(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(
    parent.closest(
      'script, style, textarea, [data-i18n-skip="true"], [contenteditable="true"]'
    )
  );
}

function translateElementAttributes(root: ParentNode, language: LanguageCode) {
  const elements = root.querySelectorAll<HTMLElement>(
    '[placeholder], [title], [aria-label]'
  );

  for (const element of elements) {
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      const value = element.getAttribute(attribute);
      if (!value) continue;

      const originalAttribute = `data-i18n-original-${attribute}`;
      const original = element.getAttribute(originalAttribute) ?? value;
      if (!element.hasAttribute(originalAttribute)) {
        element.setAttribute(originalAttribute, original);
      }
      const translated = translateRawText(original, language);
      if (element.getAttribute(attribute) !== translated) {
        element.setAttribute(attribute, translated);
      }
    }
  }
}

function translateTextNodes(root: ParentNode, language: LanguageCode) {
  if (typeof NodeFilter === 'undefined') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();

  while (current) {
    if (!shouldSkipTextNode(current)) {
      nodes.push(current as Text);
    }
    current = walker.nextNode();
  }

  for (const node of nodes) {
    const currentValue = node.nodeValue ?? '';
    const previous = originalTextNodes.get(node);
    const original =
      previous &&
      currentValue !== previous.original &&
      currentValue !== previous.translated
        ? currentValue
        : previous?.original ?? currentValue;

    const translated = translateRawText(original, language);
    originalTextNodes.set(node, { original, translated });

    if (translated !== currentValue) {
      node.nodeValue = translated;
    }
  }
}

function applyDomTranslations(language: LanguageCode) {
  if (!document.body || isApplyingTranslations) return;

  isApplyingTranslations = true;
  try {
    translateTextNodes(document.body, language);
    translateElementAttributes(document.body, language);
  } catch (error) {
    console.warn('[i18n] Translation pass skipped:', error);
  } finally {
    isApplyingTranslations = false;
  }
}

function scheduleDomTranslations(language: LanguageCode) {
  if (translationFrameId !== null) {
    window.cancelAnimationFrame(translationFrameId);
  }

  translationFrameId = window.requestAnimationFrame(() => {
    translationFrameId = null;
    applyDomTranslations(language);
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const stored =
        typeof window === 'undefined'
          ? null
          : window.localStorage.getItem(STORAGE_KEY);
      return isLanguageCode(stored) ? stored : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {
      // Storage can be unavailable in hardened browser modes.
    }
  }, []);

  const t = useCallback(
    (source: string) => getPhraseTranslation(source, language) ?? source,
    [language]
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.language = language;

    scheduleDomTranslations(language);
    const observer = new MutationObserver(() => scheduleDomTranslations(language));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });

    return () => {
      observer.disconnect();
      if (translationFrameId !== null) {
        window.cancelAnimationFrame(translationFrameId);
        translationFrameId = null;
      }
    };
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
