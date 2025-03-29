import path from 'path'
import { existsSync, unlinkSync, readdirSync, rmdirSync, readFileSync } from 'fs'
import { Plugin } from 'vite'
import fg from 'fast-glob'
import { parse } from '@vue/compiler-sfc'
import * as acorn from 'acorn'
import { walk } from 'estree-walker'
import ts from 'typescript'
import { NodeTypes, RootNode, TemplateChildNode, AttributeNode, DirectiveNode, InterpolationNode, TextNode, ElementNode, SimpleExpressionNode } from "@vue/compiler-core"
import { hasPhpTranslations, generateFiles, prepareExtendedParsedLangFiles } from './loader'
import { ParsedLangFileInterface } from './interfaces/parsed-lang-file'
import { VitePluginOptionsInterface } from './interfaces/plugin-options'

let usedKeys: Set<string> | null = null

export function extractStaticPrefix(node: any): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value
  } else if (node.type === 'TemplateLiteral') {
    if (node.quasis.length > 0 && node.expressions.length > 0) {
      const firstQuasi = node.quasis[0]
      if (firstQuasi.type === 'TemplateElement' && firstQuasi.value) {
        return firstQuasi.value.cooked
      }
    } else if (node.quasis.length === 1) {
      return node.quasis[0].value.cooked
    }
  } else if (node.type === 'BinaryExpression' && node.operator === '+') {
    const leftPrefix = extractStaticPrefix(node.left)
    if (leftPrefix !== null) {
      const rightPrefix = extractStaticPrefix(node.right)
      if (rightPrefix !== null) {
        return leftPrefix + rightPrefix
      } else {
        return leftPrefix
      }
    }
  }
  return null
}

export function extractKeys(ast: any, functionNames: string[]): Set<string> {
  const keys = new Set<string>()
  walk(ast, {
    enter(node: any) {
      if (node.type === 'CallExpression') {
        let calleeName: string | null = null
        if (node.callee.type === 'Identifier') {
          calleeName = node.callee.name
        } else if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'ThisExpression' &&
          node.callee.property.type === 'Identifier'
        ) {
          calleeName = node.callee.property.name
        } else if (node.callee.type === 'Identifier' && functionNames.includes(node.callee.name)) {
          calleeName = node.callee.name
        }
        if (calleeName && functionNames.includes(calleeName)) {
          const arg = node.arguments[0]
          if (arg) {
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
              keys.add(arg.value)
            } else if (arg.type === 'TemplateLiteral' || arg.type === 'BinaryExpression') {
              const prefix = extractStaticPrefix(arg)
              if (prefix) {
                keys.add(prefix + '*')
              }
            }
          }
        }
      }
    }
  })
  return keys
}

export function collectTemplateExpressions(node: RootNode | TemplateChildNode | AttributeNode | DirectiveNode): string[] {
  const expressions: string[] = []
  if (!node) return expressions

  if (node.type === NodeTypes.ROOT && 'children' in node) {
    node.children.forEach(child => expressions.push(...collectTemplateExpressions(child as TemplateChildNode)))
  } else if (node.type === NodeTypes.ELEMENT && 'props' in node && 'children' in node) {
    const elementNode = node as ElementNode
    if (elementNode.props) {
      elementNode.props.forEach(prop => {
        if (prop.type === NodeTypes.DIRECTIVE && prop.exp) {
          expressions.push((prop.exp as SimpleExpressionNode).content || '')
        }
      })
    }
    if (elementNode.children) {
      elementNode.children.forEach(child => expressions.push(...collectTemplateExpressions(child)))
    }
  } else if (node.type === NodeTypes.INTERPOLATION && 'content' in node) {
    const interpolationNode = node as InterpolationNode
    if (interpolationNode.content.type === NodeTypes.SIMPLE_EXPRESSION) {
      expressions.push(interpolationNode.content.content || '')
    }
  } else if (node.type === NodeTypes.TEXT && 'content' in node) {
    const textNode = node as TextNode
    if (textNode.content.includes('$t(')) {
      expressions.push(textNode.content)
    }
  }
  return expressions
}

export default function i18n(options: string | VitePluginOptionsInterface = 'lang'): Plugin {
  let langPath = typeof options === 'string' ? options : options.langPath ?? 'lang'
  langPath = langPath.replace(/[\\/]$/, '') + path.sep

  const additionalLangPaths = typeof options === 'string' ? [] : options.additionalLangPaths ?? []

  const frameworkLangPath = 'vendor/laravel/framework/src/Illuminate/Translation/lang/'.replace('/', path.sep)
  let files: ParsedLangFileInterface[] = []
  let exitHandlersBound: boolean = false

  const clean = () => {
    files.forEach(file => {
      const filePath = langPath + file.name
      if (existsSync(filePath)) unlinkSync(filePath)
    })
    files = []
    if (existsSync(langPath) && readdirSync(langPath).length === 0) rmdirSync(langPath)
  }

  return {
    name: 'i18n',
    enforce: 'post',
    config() {
      /** @ts-ignore */
      process.env.VITE_LARAVEL_VUE_I18N_HAS_PHP = true

      return {
        define: {
          'process.env.LARAVEL_VUE_I18N_HAS_PHP': true
        }
      }
    },
    buildStart() {
      const vueFiles = fg.sync('**/*.vue', { cwd: './resources/js/', absolute: true })
      usedKeys = new Set<string>()

      if (typeof options !== 'string' && options.treeShake) {
        for (const file of vueFiles) {
          const content = readFileSync(file, 'utf8')
          const { descriptor } = parse(content, { sourceMap: false })

          if (descriptor.script) {
            const scriptAst = acorn.parse(descriptor.script.content, {
              ecmaVersion: 'latest',
              sourceType: 'module'
            })
            const scriptKeys = extractKeys(scriptAst, ['trans', 'wTrans', 'transChoice', 'wTransChoice'])
            scriptKeys.forEach(key => usedKeys!.add(key))
          }

          if (descriptor.scriptSetup) {
            let scriptSetupContent = descriptor.scriptSetup.content
            if (descriptor.scriptSetup.lang === 'ts') {
              const transpiled = ts.transpileModule(scriptSetupContent, { compilerOptions: { module: ts.ModuleKind.ESNext } })
              scriptSetupContent = transpiled.outputText
            }
            const scriptSetupAst = acorn.parse(scriptSetupContent, {
              ecmaVersion: 'latest',
              sourceType: 'module'
            })
            const scriptSetupKeys = extractKeys(scriptSetupAst, ['trans', 'wTrans', 'transChoice', 'wTransChoice'])
            scriptSetupKeys.forEach(key => usedKeys!.add(key))
          }

          if (descriptor.template) {
            const templateAst = descriptor.template.ast
            if (templateAst) {
              const expressions = collectTemplateExpressions(templateAst)
              for (const expr of expressions) {
                try {
                  const exprAst = acorn.parseExpressionAt(expr, 0, { ecmaVersion: 'latest' })
                  const exprKeys = extractKeys(exprAst, ['$t', '$tChoice'])
                  exprKeys.forEach(key => usedKeys!.add(key))
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        }
      } else {
        usedKeys = null
      }

      if (!hasPhpTranslations(frameworkLangPath) && !hasPhpTranslations(langPath)) return

      const data = prepareExtendedParsedLangFiles([frameworkLangPath, langPath, ...additionalLangPaths])
      files = generateFiles(langPath, data, usedKeys)
    },
    handleHotUpdate(ctx) {
      if (/lang\/.*\.php$/.test(ctx.file)) {
        const data = prepareExtendedParsedLangFiles([frameworkLangPath, langPath, ...additionalLangPaths])
        files = generateFiles(langPath, data, usedKeys)
      }
    },
    buildEnd: clean,
    configureServer() {
      if (exitHandlersBound) {
        return
      }

      process.on('exit', clean)
      process.on('SIGINT', process.exit)
      process.on('SIGTERM', process.exit)
      process.on('SIGHUP', process.exit)
    }
  }
}