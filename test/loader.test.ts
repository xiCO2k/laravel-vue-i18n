import fs from 'fs';
import { generateFiles, parseAll, parse, hasPhpTranslations, reset } from '../src/loader';

beforeEach(() => reset(__dirname + '/fixtures/lang/'));

it('creates a file for each lang', () => {
    const langPath = __dirname + '/fixtures/lang/';
    const files = generateFiles(langPath, parseAll(langPath));

    expect(files.length).toBe(3);
    expect(files[0].name).toBe('php_en.json');
    expect(files[1].name).toBe('php_fr.json');
    expect(files[2].name).toBe('php_pt.json');

    const langEn = JSON.parse(fs.readFileSync(langPath + files[0].name).toString());
    expect(langEn['auth.failed']).toBe('These credentials do not match our records.');
    expect(langEn['auth.foo.level1.level2']).toBe('baren');
    expect(langEn['auth.multiline']).toBe('Lorem ipsum dolor sit amet.');

    const langPt = JSON.parse(fs.readFileSync(langPath + files[2].name).toString());
    expect(langPt['auth.failed']).toBe('As credenciais indicadas não coincidem com as registadas no sistema.');
    expect(langPt['auth.foo.level1.level2']).toBe('barpt');
});

it('includes .php lang file in subdirectory in .json', () => {
    const langPath = __dirname + '/fixtures/lang/';
    const files = generateFiles(langPath, parseAll(langPath));
    const langEn = JSON.parse(fs.readFileSync(langPath + files[0].name).toString());

    expect(langEn['domain.user.sub_dir_support_is_amazing']).toBe('Subdirectory support is amazing');
    expect(langEn['domain.car.is_electric']).toBe('Electric');
    expect(langEn['domain.car.foo.level1.level2']).toBe('barpt');
});

it('includes .php lang file in nested subdirectory in .json', () => {
    const langPath = __dirname + '/fixtures/lang/';
    const files = generateFiles(langPath, parseAll(langPath));
    const langEn = JSON.parse(fs.readFileSync(langPath + files[0].name).toString())

    expect(langEn['nested.cars.car.is_electric']).toBe('Electric');
    expect(langEn['nested.cars.car.foo.level1.level2']).toBe('barpt');
})

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

it('transforms simple index array to .json', () => {
    const lang = parse(fs.readFileSync(__dirname + '/fixtures/lang/en/auth.php').toString());
    expect(lang['arr.0']).toBe('foo');
    expect(lang['arr.1']).toBe('bar');
});

it('checks if there is .php translations', () => {
    expect(hasPhpTranslations(__dirname + '/fixtures/lang/')).toBe(true);
    expect(hasPhpTranslations(__dirname + '/fixtures/wronglangfolder/')).toBe(false);
});
