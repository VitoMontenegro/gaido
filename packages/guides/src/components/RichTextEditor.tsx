import { Editor } from '@tinymce/tinymce-react'
import tinymce from 'tinymce/tinymce'
import 'tinymce/icons/default'
import 'tinymce/themes/silver'
import 'tinymce/models/dom'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/link'
import 'tinymce/plugins/image'
import 'tinymce/plugins/media'
import 'tinymce/plugins/table'
import 'tinymce/plugins/code'
import 'tinymce/plugins/autolink'
import 'tinymce/skins/ui/oxide/skin.js'
import 'tinymce/skins/content/default/content.js'
import { adminApi, resolveMediaUrl } from '@gaido/api-client/api/client'
import { processImageFile } from '../lib/imageProcess'

// Keep tinymce referenced so Vite doesn't tree-shake the import.
void tinymce

type Props = {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
}

export default function RichTextEditor({ value, onChange, disabled }: Props) {
  return (
    <Editor
      licenseKey="gpl"
      disabled={disabled}
      value={value}
      onEditorChange={(html) => onChange(html)}
      init={{
        height: 420,
        menubar: 'edit insert format table',
        plugins: 'lists link image media table code autolink',
        toolbar:
          'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image media table | code',
        branding: false,
        promotion: false,
        convert_urls: false,
        relative_urls: false,
        image_dimensions: false,
        media_live_embeds: true,
        media_alt_source: false,
        media_poster: false,
        images_upload_handler: async (blobInfo) => {
          const raw = new File([blobInfo.blob()], blobInfo.filename() || 'photo.jpg', {
            type: blobInfo.blob().type || 'image/jpeg',
          })
          const file = await processImageFile(raw, {
            maxBytes: 350 * 1024,
            maxDimension: 1600,
            format: 'jpeg',
          })
          const { public_key } = await adminApi.uploadMedia(file)
          return resolveMediaUrl(public_key)
        },
        content_style:
          'body { font-family: Roboto, Arial, sans-serif; font-size: 16px; line-height: 1.7; color: #44403c; max-width: 720px; }' +
          ' p { margin: 0 0 1.1em; }' +
          ' img { max-width: 100% !important; width: 100% !important; height: auto !important; border-radius: 14px; }' +
          ' table { width: 100% !important; border: 0 !important; border-collapse: separate !important; border-spacing: 0 !important; table-layout: fixed; margin: 1.25em 0; }' +
          ' td, th { border: 0 !important; padding: 0 !important; vertical-align: top; width: 50%; background: transparent; }' +
          ' tr > td:first-child, tr > th:first-child { padding-right: 5px !important; }' +
          ' tr > td:last-child, tr > th:last-child { padding-left: 5px !important; }' +
          ' td img, th img { width: 100% !important; aspect-ratio: 4/3; object-fit: cover; margin: 0; }' +
          ' iframe, video { width: 100% !important; aspect-ratio: 16/9; min-height: 260px; border: 0; border-radius: 14px; margin: 1.25em 0; }',
      }}
    />
  )
}
