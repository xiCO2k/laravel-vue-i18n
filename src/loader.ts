import fs from 'fs'
import path from 'path'
import { Engine } from 'php-parser'

export const hasPhpTranslations = (folderPath: string): boolean => {
  folderPath = folderPath.replace(/[\\/]$/, '') + path.sep

  try {
    const folders = fs
      .readdirSync(folderPath)
      .filter((file) => fs.statSync(folderPath + path.sep + file).isDirectory())
      .sort()

    for (const folder of folders) {
      const lang = {}

      const files = fs.readdirSync(folderPath + path.sep + folder).filter((file) => /\.php$/.test(file))

      if (files.length > 0) {
        return true
      }
    }
  } catch (e) {}

  return false
}

export const parseAll = (folderPath: string): { name: string; path: string }[] => {
  folderPath = folderPath.replace(/[\\/]$/, '') + path.sep

  const folders = fs
    .readdirSync(folderPath)
    .filter((file) => fs.statSync(folderPath + path.sep + file).isDirectory())
    .sort()

  const data = []
  for (const folder of folders) {
    const lang = {}

    fs.readdirSync(folderPath + path.sep + folder)
      .sort()
      .forEach((langFolderItem) => {
        const langFolderPath = folderPath + path.sep + folder
        const langFolderItemPath = langFolderPath + path.sep + langFolderItem

        if (fs.statSync(langFolderItemPath).isDirectory()) {
          // Lang sub folder
          const subFolderFileKey = langFolderItem.replace(/\.\w+$/, '')
          lang[subFolderFileKey] = {}

          fs.readdirSync(langFolderItemPath)
            .filter((file) => !fs.statSync(langFolderItemPath + path.sep + file).isDirectory())
            .sort()
            .forEach((file) => {
              lang[subFolderFileKey][file.replace(/\.\w+$/, '')] = parse(
                fs.readFileSync(langFolderItemPath + path.sep + file).toString()
              )
            })
        } else {
          // Lang file
          lang[langFolderItem.replace(/\.\w+$/, '')] = parse(fs.readFileSync(langFolderItemPath).toString())
        }
      })

    data.push({
      folder,
      translations: convertToDotsSyntax(lang)
    })
  }

  return data
    .filter(({ translations }) => {
      return Object.keys(translations).length > 0
    })
    .map(({ folder, translations }) => {
      const name = `php_${folder}.json`
      const path = folderPath + name

      fs.writeFileSync(path, JSON.stringify(translations))
      return { name, path }
    })
}

export const parse = (content: string) => {
  const arr = new Engine({}).parseCode(content, 'lang').children.filter((child) => child.kind === 'return')[0] as any

  if (arr?.expr?.kind !== 'array') {
    return {}
  }

  return convertToDotsSyntax(parseItem(arr.expr))
}

const parseItem = (expr) => {
  if (expr.kind === 'string') {
    return expr.value
  }

  if (expr.kind === 'array') {
    let items = expr.items.map((item) => parseItem(item))

    if (expr.items.every((item) => item.key !== null)) {
      items = items.reduce((acc, val) => Object.assign({}, acc, val), {})
    }

    return items
  }

  if (expr.kind === 'bin') {
    return parseItem(expr.left) + parseItem(expr.right)
  }

  if (expr.key) {
    return { [expr.key.value]: parseItem(expr.value) }
  }

  return parseItem(expr.value)
}

const convertToDotsSyntax = (list) => {
  const flatten = (items, context = '') => {
    const data = {}

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

export const reset = (folderPath) => {
  const dir = fs.readdirSync(folderPath)

  dir
    .filter((file) => file.match(/^php_/))
    .forEach((file) => {
      fs.unlinkSync(folderPath + file)
    })
}
