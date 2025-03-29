import { extractKeys } from '../src/vite';
import * as acorn from 'acorn';
import { generateFiles } from '../src/loader';

describe('Translation keys tree shaking', () => {
  describe('extractKeys', () => {
    it('should extract only static translation keys', () => {
      const code = `
        trans('used.key1');
        trans("used.key2");
        trans('unused.key');
        trans('partial.' + variable); // should not resolve fully, may yield a prefix if applicable
      `;
      const ast = acorn.parse(code, { ecmaVersion: 'latest' });
      const keys = extractKeys(ast, ['trans']);

      expect(keys.has('used.key1')).toBe(true);
      expect(keys.has('used.key2')).toBe(true);

      expect([...keys].find(key => key.startsWith('partial.'))).toBeDefined();
    });
  });

  describe('generateFiles tree shaking', () => {
    it('should generate translation files without unused keys', () => {
      const allTranslations = {
        'used.key1': 'Hello',
        'used.key2': 'World',
        'unused.key': 'Should be removed',
        'partial.some': 'Partial value'
      };

      const usedKeys = new Set(['used.key1', 'used.key2', 'partial.*']);

      const generated = generateFiles('lang', [{ name: 'en', translations: allTranslations }], usedKeys);

      const generatedContent = generated[0].translations;

      expect(generatedContent['unused.key']).toBeUndefined();
      expect(generatedContent['used.key1']).toBe('Hello');
      expect(generatedContent['used.key2']).toBe('World');
      expect(generatedContent['partial.some']).toBe('Partial value');
    });
  });
});

describe('Vite plugin options', () => {
  it('should apply tree shaking when treeShake option is true', () => {
    const allTranslations = {
      'used.key': 'Used value',
      'unused.key': 'Unused value'
    };

    const usedKeys = new Set(['used.key']);

    const result = generateFiles('lang', [{ name: 'en', translations: allTranslations }], usedKeys);

    expect(result[0].translations['unused.key']).toBeUndefined();
    expect(result[0].translations['used.key']).toBe('Used value');
  });

  it('should not apply tree shaking when treeShake option is false', () => {
    const allTranslations = {
      'used.key': 'Used value',
      'unused.key': 'Unused value'
    };

    const result = generateFiles('lang', [{ name: 'en', translations: allTranslations }], null);

    expect(result[0].translations['unused.key']).toBe('Unused value');
    expect(result[0].translations['used.key']).toBe('Used value');
  });
});
