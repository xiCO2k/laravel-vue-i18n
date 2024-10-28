import fs from 'fs';
import { generateFiles, parseAll, parse, hasPhpTranslations, reset, prepareExtendedParsedLangFiles } from '../src/loader';
import { isolateFolder, removeIsolatedFolder } from './folderIsolationUtil'

const isolatedFixtures = isolateFolder(__dirname + '/fixtures', 'loader');
afterAll(() => removeIsolatedFolder(isolatedFixtures));

beforeEach(() => reset(isolatedFixtures + '/lang/'));

it('creates a file for each lang', () => {
    const langPath = isolatedFixtures + '/lang/';
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

it('merges published package translations into each lang .json', () => {
    const langPath = isolatedFixtures + '/lang/';
    const files = generateFiles(langPath, parseAll(langPath));

    expect(files.length).toBe(3);
    expect(files[0].name).toBe('php_en.json');
    expect(files[1].name).toBe('php_fr.json');
    expect(files[2].name).toBe('php_pt.json');

    const langEn = JSON.parse(fs.readFileSync(langPath + files[0].name).toString());
    expect(langEn['package-example::messages.welcome']).toBe('Welcome to the example package.');
    expect(langEn['package-example::messages.foo.level1.level2']).toBe('package');
    expect(langEn['package-example::messages.multiline']).toBe('Lorem ipsum dolor sit amet.');

    const langFr = JSON.parse(fs.readFileSync(langPath + files[1].name).toString());
    expect(langFr['package-example::messages.welcome']).toBeUndefined();
    expect(langFr['package-example::messages.foo.level1.level2']).toBeUndefined();
    expect(langFr['package-example::messages.multiline']).toBeUndefined();

    const langPt = JSON.parse(fs.readFileSync(langPath + files[2].name).toString());
    expect(langPt['package-example::messages.welcome']).toBe('Bem-vindo ao exemplo do pacote.');
    expect(langPt['package-example::messages.foo.level1.level2']).toBe('pacote');
});

it('includes .php lang file in subdirectory in .json', () => {
    const langPath = isolatedFixtures + '/lang/';
    const files = generateFiles(langPath, parseAll(langPath));
    const langEn = JSON.parse(fs.readFileSync(langPath + files[0].name).toString());

    expect(langEn['domain.user.sub_dir_support_is_amazing']).toBe('Subdirectory support is amazing');
    expect(langEn['domain.car.is_electric']).toBe('Electric');
    expect(langEn['domain.car.foo.level1.level2']).toBe('barpt');
});

it('includes .php lang file in nested subdirectory in .json', () => {
    const langPath = isolatedFixtures + '/lang/';
    const files = generateFiles(langPath, parseAll(langPath));
    const langEn = JSON.parse(fs.readFileSync(langPath + files[0].name).toString())

    expect(langEn['nested.cars.car.is_electric']).toBe('Electric');
    expect(langEn['nested.cars.car.foo.level1.level2']).toBe('barpt');
})

it('inclues additional lang paths to load from', () => {
    const langPath = isolatedFixtures + '/lang/';
    const additionalLangPaths = [
        isolatedFixtures + '/locales/'
    ];

    const langPaths = prepareExtendedParsedLangFiles([
        langPath,
        ...additionalLangPaths,
    ]);

    const files = generateFiles(langPath, langPaths);

    const langEn = JSON.parse(fs.readFileSync(langPath + files[0].name).toString());

    expect(langEn['auth.throttle']).toBe('Too many login attempts. Please try again in :seconds seconds.');
});

it('overwrites translations from additional lang paths', () => {
    const langPath = isolatedFixtures + '/lang/';
    const additionalLangPaths = [
        isolatedFixtures + '/locales/'
    ];

    const langPaths = prepareExtendedParsedLangFiles([
        langPath,
        ...additionalLangPaths,
    ]);

    const files = generateFiles(langPath, langPaths);

    const langEn = JSON.parse(fs.readFileSync(langPath + files[0].name).toString());

    expect(langEn['auth.failed']).toBe('These credentials are incorrect.');
    expect(langEn['domain.user.sub_dir_support_is_amazing']).toBe('Subdirectory override is amazing');
});

it('transforms .php lang to .json', () => {
    const lang = parse(fs.readFileSync(isolatedFixtures + '/lang/en/auth.php').toString());

    expect(lang['failed']).toBe('These credentials do not match our records.');
});

it('transform nested .php lang files to .json', () => {
    const langPt = parse(fs.readFileSync(isolatedFixtures + '/lang/pt/auth.php').toString());
    expect(langPt['foo.level1.level2']).toBe('barpt');

    const langEn = parse(fs.readFileSync(isolatedFixtures + '/lang/en/auth.php').toString());
    expect(langEn['foo.level1.level2']).toBe('baren');
});

it('transforms simple index array to .json', () => {
    const lang = parse(fs.readFileSync(isolatedFixtures + '/lang/en/auth.php').toString());
    expect(lang['arr.0']).toBe('foo');
    expect(lang['arr.1']).toBe('bar');
});

it('transforms enum values to .json', () => {
    const lang = parse(fs.readFileSync(isolatedFixtures + '/lang/en/enums.php').toString());

    expect(lang['status.new']).toBe('New');
    expect(lang['status.inProgress']).toBe('In Progress');
    expect(lang['status.finished']).toBe('Finished');
});

it('transforms class names and consts to .json', () => {
    const lang = parse(fs.readFileSync(isolatedFixtures + '/lang/en/classnames.php').toString());

    expect(lang['someClass']).toBe('Some Class');
    expect(lang['name']).toBe('Name');
});

it('ignores empty `array` or `null` translations', () => {
    const lang = parse(fs.readFileSync(isolatedFixtures + '/lang/en/ignore.php').toString());

    expect(lang['empty_array']).toBe(undefined);
    expect(lang['null']).toBe(undefined);
});

it('checks if there is .php translations', () => {
    expect(hasPhpTranslations(isolatedFixtures + '/lang/')).toBe(true);
    expect(hasPhpTranslations(isolatedFixtures + '/wronglangfolder/')).toBe(false);
});
