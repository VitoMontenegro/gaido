/// <reference path="./tinymce-shims.d.ts" />
import tinymce from 'tinymce/tinymce'

declare global {
  interface Window {
    tinymce: typeof tinymce
  }
}

let bootstrapped: Promise<typeof tinymce> | null = null

/** Load TinyMCE core and assets in a safe order (skins/plugins expect window.tinymce). */
export function bootstrapTinyMce(): Promise<typeof tinymce> {
  if (!bootstrapped) {
    bootstrapped = (async () => {
      window.tinymce = tinymce
      await import('tinymce/icons/default')
      await import('tinymce/themes/silver')
      await import('tinymce/models/dom')
      await import('tinymce/plugins/lists')
      await import('tinymce/plugins/link')
      await import('tinymce/plugins/image')
      await import('tinymce/plugins/media')
      await import('tinymce/plugins/table')
      await import('tinymce/plugins/code')
      await import('tinymce/plugins/autolink')
      await import('tinymce/skins/ui/oxide/skin.js')
      await import('tinymce/skins/ui/oxide/content.js')
      await import('tinymce/skins/content/default/content.js')
      return tinymce
    })()
  }
  return bootstrapped
}
