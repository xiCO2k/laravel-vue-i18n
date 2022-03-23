import fs from 'fs';
import path from 'path';
import { Engine } from 'php-parser';

export const hasPhpTranslations = (folderPath: string): boolean => {
    folderPath = folderPath.replace(/[\\/]$/, '') + path.sep;

    const folders = fs.readdirSync(folderPath)
        .filter(file => fs.statSync(folderPath + path.sep + file).isDirectory())
        .sort();

    for (const folder of folders) {
        const lang = {};

        const files = fs.readdirSync(folderPath + path.sep + folder)
           .filter(file => /\.php$/.test(file));

       if (files.length > 0) {
           return true;
       }
   }

    return false;
}

export const parseAll = (folderPath: string): { name: string, path: string }[] => {
    folderPath = folderPath.replace(/[\\/]$/, '') + path.sep;

    const folders = fs.readdirSync(folderPath)
        .filter(file => fs.statSync(folderPath + path.sep + file).isDirectory())
        .sort();

    const data = [];
    for (const folder of folders) {
        const lang = {};

        fs
            .readdirSync(folderPath + path.sep + folder)
            .filter(file => ! fs.statSync(folderPath + path.sep + folder + path.sep + file).isDirectory())
            .sort()
            .forEach((file) => {
                lang[file.replace(/\.\w+$/, '')] = parse(fs.readFileSync(folderPath + path.sep + folder + path.sep + file).toString());
            });

        data.push({
            folder,
            translations: convertToDotsSyntax(lang),
        });
    }

    return data.map(({ folder, translations }) => {
        const name = `php_${folder}.json`;
        const path = folderPath + name;

        fs.writeFileSync(path, JSON.stringify(translations));
        return { name, path }
    });
}

export const parse = (content: string) => {
    const arr = (new Engine({})).parseCode(content, 'lang').children
        .filter(child => child.kind === 'return')[0] as any;

    return parseItem(arr.expr);
}

const parseItem = (expr) => {
    if (expr.kind === 'string') {
        return expr.value;
    }

    if (expr.kind === 'array') {
        let items = expr.items.map((item) => parseItem(item));

        if (expr.items.every((item) => item.key !== null)) {
            items = items.reduce((acc, val) => Object.assign({}, acc, val), {})
        }

        return items;
    }

    if (expr.key) {
        return { [expr.key.value]: parseItem(expr.value) }
    }

    return parseItem(expr.value)
}

const convertToDotsSyntax = (list) => {
    const flatten = (items, context = '') => {
        const data = {};

        Object.entries(items).forEach(([key, value]) => {
            if (typeof value === 'string') {
                data[context + key] = value;
                return;
            }

            Object.entries(flatten(value, context + key + '.')).forEach(([itemKey, itemValue]) => {
                data[itemKey] = itemValue;
            });
        });

        return data;
    }

    return flatten(list);
}
