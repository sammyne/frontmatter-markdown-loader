const loaderUtils = require("loader-utils")
const matter = require("gray-matter")

//const git = require("./packages/git")

const md = require("markdown-it")({
  html: true,
})

interface MatteredMD {
  attributes: any
  body: string
  html: string
}

const stringify = (src: string) =>
  JSON.stringify(src)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")

let vueCompiler: any, vueCompilerStripWith: any
try {
  vueCompiler = require("vue-template-compiler")
  vueCompilerStripWith = require("vue-template-es2015-compiler")
} catch (err) {}

module.exports = function(source: string) {
  //if (this.cacheable) this.cacheable()
  // address TS2339: another way would be the not recommended @ts-ignore
  if ((this as any).cacheable) {
    ;(this as any).cacheable()
  }

  const options = loaderUtils.getOptions(this) || {}

  //const gm = matter(source)
  const { content, data: attributes } = matter(source)
  const body: string = content as string
  //const attributes:any = data as any

  const html: string = !!options.markdown
    ? options.markdown(body)
    : md.render(body)

  //const fm = frontmatter(source)
  // TODO: add declaration for gray-matter
  const fm: MatteredMD = { attributes, body, html }

  /*
  if (options.markdown) {
    fm.html = options.markdown(fm.body)
  } else {
    fm.html = md.render(fm.body)
  }
  */

  let output = `
    body: ${stringify(fm.body)},
    html: ${stringify(fm.html)},
    attributes: ${stringify(fm.attributes)}`

  if (!!options.vue && vueCompiler && vueCompilerStripWith) {
    const rootClass = options.vue.root || "frontmatter-markdown"
    const template = fm.html
      .replace(/<(code\s.+)>/g, "<$1 v-pre>")
      .replace(/<code>/g, "<code v-pre>")
    const compiled = vueCompiler.compile(
      `<div class="${rootClass}">${template}</div>`
    )
    const render = `return ${vueCompilerStripWith(
      `function render() { ${compiled.render} }`
    )}`

    let staticRenderFns = ""
    if (compiled.staticRenderFns.length > 0) {
      staticRenderFns = `return ${vueCompilerStripWith(
        `[${compiled.staticRenderFns
          .map((fn: string) => `function () { ${fn} }`)
          .join(",")}]`
      )}`
    }

    output += `,
      vue: {
        render: ${stringify(render)},
        staticRenderFns: ${stringify(staticRenderFns)},
        component: {
          data: function () {
            return {
              templateRender: null
            }
          },
          render: function (createElement) {
            return this.templateRender ? this.templateRender() : createElement("div", "Rendering");
          },
          created: function () {
            this.templateRender = ${vueCompilerStripWith(
              `function render() { ${compiled.render} }`
            )};
            this.$options.staticRenderFns = ${vueCompilerStripWith(
              `[${compiled.staticRenderFns
                .map((fn: string) => `function () { ${fn} }`)
                .join(",")}]`
            )};
          }
        }
      }
    `
  }

  return `module.exports = { ${output} }`
}
