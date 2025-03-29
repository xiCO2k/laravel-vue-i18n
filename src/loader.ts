import fs from 'fs'
import path from 'path'
import { Engine } from 'php-parser'
import { ParsedLangFileInterface } from './interfaces/parsed-lang-file'
import { TranslationValue } from './interfaces/translation'
import { PhpAstNode } from './interfaces/php-ast-node'

const toCamelCase = (str: string): string => {
  if (str === str.toUpperCase()) {
    return str.toLowerCase()
  }

  return str.replace(/^\w/, (c) => c.toLowerCase())
}

export const hasPhpTranslations = (folderPath: string): boolean => {
  folderPath = folderPath.replace(/[\\/]$/, '') + path.sep

  try {
    const folders = fs
      .readdirSync(folderPath)
      .filter((file) => fs.statSync(folderPath + path.sep + file).isDirectory())
      .sort()

    for (const folder of folders) {
      const files = fs.readdirSync(folderPath + path.sep + folder).filter((file) => /\.php$/.test(file))

      if (files.length > 0) {
        return true
      }
    }
  } catch (e) {}

  return false
}

export const parseAll = (folderPath: string): ParsedLangFileInterface[] => {
  folderPath = folderPath.replace(/[\\/]$/, '') + path.sep

  if (!fs.existsSync(folderPath)) {
    return []
  }

  const folders = fs
    .readdirSync(folderPath)
    .filter((file) => fs.statSync(folderPath + path.sep + file).isDirectory())
    .sort()

  const data = []
  for (const folder of folders) {
    const langFolderPath = folderPath + path.sep + folder

    const lang = readThroughDir(langFolderPath)

    data.push({
      folder,
      translations: convertToDotsSyntax(lang)
    })
  }

  // If data contains an object with folder name 'vendor'
  const vendorIndex = data.findIndex(({ folder }) => folder === 'vendor')

  if (vendorIndex !== -1) {
    const vendorTranslations = data[vendorIndex].translations
    data.splice(vendorIndex, 1)

    data.forEach(
      (langFile) =>
        (langFile.translations = mergeVendorTranslations(langFile.folder, langFile.translations, vendorTranslations))
    )
  }

  return data
    .filter(({ translations }) => {
      return Object.keys(translations).length > 0
    })
    .map(({ folder, translations }) => {
      return {
        name: `php_${folder}.json`,
        translations
      }
    })
}

function mergeVendorTranslations(folder: string, translations: any, vendorTranslations: any) {
  // Filter the translations from the vendor file that match the current folder
  const langTranslationsFromVendor = Object.entries(vendorTranslations)
    .filter(([key]) => key.includes(`.${folder}.`))
    .reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key.replace(`.${folder}.`, '::')]: value
      }),
      {}
    )

  // Merge the vendor translations that matched the folder with the current translations
  return { ...translations, ...langTranslationsFromVendor }
}

export const parse = (content: string): Record<string, string> => {
  const arr = new Engine({}).parseCode(content, 'lang').children.filter((child) => child.kind === 'return')[0] as any

  if (arr?.expr?.kind !== 'array') {
    return {}
  }

  return convertToDotsSyntax(parseItem(arr.expr))
}

const parseItem = (expr: PhpAstNode): TranslationValue => {
  if (expr.kind === 'string') {
    return expr.value as string || ''
  }

  if (expr.kind === 'nullkeyword') {
    return null
  }

  if (expr.kind === 'array') {
    if (!expr.items) return {}

    const parsedItems = expr.items.map((item) => parseItem(item))

    if (expr.items.every((item) => item.key !== null)) {
      return parsedItems.reduce<Record<string, TranslationValue>>(
        (acc, val) => {
          const valAsRecord = val as Record<string, TranslationValue>;

          return { ...acc, ...valAsRecord };
        },
        {}
      );
    } else {
      const indexedResult: Record<string, TranslationValue> = {};

      parsedItems.forEach((item, index) => {
        indexedResult[index.toString()] = item as TranslationValue;
      });

      return indexedResult;
    }
  }

  if (expr.kind === 'bin') {
    if (!expr.left || !expr.right) return ''
    return (parseItem(expr.left) as string) + (parseItem(expr.right) as string)
  }

  if (expr.key) {
    let key = expr.key.value

    if (expr.key.kind === 'staticlookup') {
      if (expr.key.offset?.name === 'class') {
        key = toCamelCase(expr.key.what?.name || '')
      } else {
        key = toCamelCase(expr.key.offset?.name || '')
      }
    } else if (expr.key.kind === 'propertylookup') {
      key = toCamelCase(expr.key.what?.offset?.name || '')
    }

    if (!expr.value) return { [key]: '' }
    return { [key]: parseItem(expr.value as PhpAstNode) } as TranslationValue
  }

  if (!expr.value) return {}
  return parseItem(expr.value as PhpAstNode) || {}
}


const convertToDotsSyntax = (list: TranslationValue | TranslationValue[]): Record<string, string> => {
  const flatten = (items: TranslationValue | TranslationValue[], context = '') => {
    const data: Record<string, string> = {}

    if (items === null) {
      return data
    }

    Object.entries(items).forEach(([key, value]) => {
      if (typeof value === 'string') {
        data[context + key] = value
        return
      }

      Object.entries(flatten(value, context + key + '.')).forEach(([itemKey, itemValue]) => {
        data[itemKey] = itemValue
      })
    })

    return data
  }

  return flatten(list)
}

export const reset = (folderPath: string) => {
  const dir = fs.readdirSync(folderPath)

  dir
    .filter((file) => file.match(/^php_/))
    .forEach((file) => {
      fs.unlinkSync(folderPath + file)
    })
}

export const readThroughDir = (dir: string): TranslationValue => {
  const data: TranslationValue = {}

  fs.readdirSync(dir).forEach((file) => {
    const absoluteFile = dir + path.sep + file

    if (fs.statSync(absoluteFile).isDirectory()) {
      const subFolderFileKey = file.replace(/\.\w+$/, "");

      data[subFolderFileKey] = readThroughDir(absoluteFile);
    } else {
      data[file.replace(/\.\w+$/, "")] = parse(fs.readFileSync(absoluteFile).toString());
    }
  })

  return data
}

export const prepareExtendedParsedLangFiles = (langPaths: string[]): ParsedLangFileInterface[] =>
  langPaths.flatMap((langPath) => parseAll(langPath))

export const generateFiles = (langPath: string, data: ParsedLangFileInterface[], usedKeys: Set<string> | null = null): ParsedLangFileInterface[] => {
  data = mergeData(data)

  if (usedKeys) {
    const exactKeys = new Set<string>();
    const prefixes: string[] = [];
    usedKeys.forEach(key => {
      if (key.endsWith('*')) {
        prefixes.push(key.slice(0, -1));
      } else {
        exactKeys.add(key);
      }
    });

    data = data.map(langFile => ({
      ...langFile,
      translations: Object.fromEntries(
        Object.entries(langFile.translations).filter(([key]) =>
          exactKeys.has(key) || prefixes.some(prefix => key.startsWith(prefix))
        )
      )
    }));
  }

  if (!fs.existsSync(langPath)) {
    fs.mkdirSync(langPath)
  }

  data.forEach(({ name, translations }) => {
    fs.writeFileSync(langPath + name, JSON.stringify(translations))
  })

  return data
}

function mergeData(data: ParsedLangFileInterface[]): ParsedLangFileInterface[] {
  const obj: Record<string, Record<string, string>> = {}

  data.forEach(({ name, translations }) => {
    if (!obj[name]) {
      obj[name] = {}
    }

    obj[name] = { ...obj[name], ...translations }
  })

  const arr: ParsedLangFileInterface[] = []
  Object.entries(obj).forEach(([name, translations]) => {
    arr.push({ name, translations })
  })

  return arr
}
