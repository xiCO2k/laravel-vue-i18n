import fs from 'fs';
import { parseAll, parse, hasPhpTranslations, reset } from '../src/loader';

beforeEach(() => reset(__dirname + '/fixtures/lang/'));

it('creates a file for each lang', () => {
    const files = parseAll(__dirname + '/fixtures/lang/');

    expect(files.length).toBe(3);
    expect(files[0].name).toBe('php_en.json');
    expect(files[1].name).toBe('php_fr.json');
    expect(files[2].name).toBe('php_pt.json');

    const langEn = JSON.parse(fs.readFileSync(files[0].path).toString());
    expect(langEn['auth.failed']).toBe('These credentials do not match our records.');
    expect(langEn['auth.foo.level1.level2']).toBe('baren');

    const langPt = JSON.parse(fs.readFileSync(files[2].path).toString());
    expect(langPt['auth.failed']).toBe('As credenciais indicadas não coincidem com as registadas no sistema.');
    expect(langPt['auth.foo.level1.level2']).toBe('barpt');
});

it('transforms .php lang to .json', () => {
    const lang = parse(fs.readFileSync(__dirname + '/fixtures/lang/en/auth.php').toString());

    expect(lang['failed']).toBe('These credentials do not match our records.');
});

it('transform nested .php lang files to .json', () => {
    const langPt = parse(fs.readFileSync(__dirname + '/fixtures/lang/pt/auth.php').toString());
    expect(langPt['foo.level1.level2']).toBe('barpt');

    const langEn = parse(fs.readFileSync(__dirname + '/fixtures/lang/en/auth.php').toString());
    expect(langEn['foo.level1.level2']).toBe('baren');
});

it('checks if there is .php translations', () => {
    const hasTranslations = hasPhpTranslations(__dirname + '/fixtures/lang/');

    expect(hasTranslations).toBe(true);
});
