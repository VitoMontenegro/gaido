import type { ComponentType, LazyExoticComponent } from 'react'
import { bootstrapTinyMce } from './tinymceBootstrap'
import { lazyImport } from './lazyImport'

export type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
}

export function lazyRichTextEditor(
  factory: () => Promise<{ default: ComponentType<RichTextEditorProps> }>,
): LazyExoticComponent<ComponentType<RichTextEditorProps>> {
  return lazyImport(async () => {
    await bootstrapTinyMce()
    return factory() as Promise<{ default: ComponentType<unknown> }>
  }) as LazyExoticComponent<ComponentType<RichTextEditorProps>>
}
