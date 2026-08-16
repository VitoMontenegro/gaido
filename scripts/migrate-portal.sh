#!/usr/bin/env bash
# Fix relative imports after copying from packages/shared
fix_imports() {
  local dir="$1"
  find "$dir" -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 | while IFS= read -r -d '' f; do
    sed -i '' \
      -e "s|from '../api/|from '@gaido/api-client/api/|g" \
      -e "s|from \"../api/|from \"@gaido/api-client/api/|g" \
      -e "s|from '../../api/|from '@gaido/api-client/api/|g" \
      -e "s|from \"../../api/|from \"@gaido/api-client/api/|g" \
      -e "s|from '../hooks/useAuth'|from '@gaido/api-client/hooks/useAuth'|g" \
      -e "s|from '../hooks/useLogout'|from '@gaido/api-client/hooks/useLogout'|g" \
      -e "s|from '../hooks/useNotifications'|from '@gaido/api-client/hooks/useNotifications'|g" \
      -e "s|from '../../hooks/useAuth'|from '@gaido/api-client/hooks/useAuth'|g" \
      -e "s|from '../../hooks/useLogout'|from '@gaido/api-client/hooks/useLogout'|g" \
      -e "s|from '../../hooks/useNotifications'|from '@gaido/api-client/hooks/useNotifications'|g" \
      -e "s|from '../lib/cn'|from '@gaido/ui-primitives/cn'|g" \
      -e "s|from '../lib/lazyImport'|from '@gaido/ui-primitives/lazyImport'|g" \
      -e "s|from '../../lib/lazyImport'|from '@gaido/ui-primitives/lazyImport'|g" \
      -e "s|from '../lib/authValidation'|from '@gaido/ui-primitives/authValidation'|g" \
      -e "s|from '../lib/site'|from '@gaido/site-urls/site'|g" \
      -e "s|from '../../lib/site'|from '@gaido/site-urls/site'|g" \
      -e "s|from '../lib/brand'|from '@gaido/site-urls/brand'|g" \
      -e "s|from '../../lib/brand'|from '@gaido/site-urls/brand'|g" \
      -e "s|from '../components/ErrorBoundary'|from '@gaido/ui-primitives/ErrorBoundary'|g" \
      -e "s|from '../components/RoleGate'|from '@gaido/ui-primitives/RoleGate'|g" \
      -e "s|from '../components/GuideGate'|from '@gaido/ui-primitives/GuideGate'|g" \
      -e "s|from '../components/ScrollToTop'|from '@gaido/ui-primitives/ScrollToTop'|g" \
      -e "s|from '../components/ExternalRedirect'|from '@gaido/ui-primitives/ExternalRedirect'|g" \
      -e "s|from '../components/PasswordInput'|from '@gaido/ui-primitives/PasswordInput'|g" \
      -e "s|from '@gaido/shared/|from '@gaido/LEGACY/'|g" \
      "$f"
  done
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED="$ROOT/packages/shared/src"

echo "Creating portal package..."
PORTAL="$ROOT/packages/portal/src"
mkdir -p "$PORTAL"/{layouts,components/crm,pages,lib,hooks,styles}
cp "$SHARED/pages/PortalStubPage.tsx" "$SHARED/pages/AdminPages.tsx" "$SHARED/pages/DeployPage.tsx" "$SHARED/pages/AuthPages.tsx" "$PORTAL/pages/"
cp "$SHARED/components/BrandLogo.tsx" "$SHARED/components/CookieBanner.tsx" "$SHARED/components/ApiErrorBanner.tsx" \
   "$SHARED/components/RichTextEditor.tsx" "$SHARED/components/GalleryField.tsx" "$SHARED/components/ImageUrlField.tsx" \
   "$SHARED/components/ImageCropModal.tsx" "$SHARED/components/RepeaterField.tsx" "$SHARED/components/AdminGuidesEditor.tsx" \
   "$SHARED/components/SiteContentEditor.tsx" "$SHARED/components/AdminEntityLists.tsx" "$SHARED/components/ArticlesEditor.tsx" \
   "$SHARED/components/LegalContentEditor.tsx" "$SHARED/components/excursionUi.tsx" "$PORTAL/components/"
cp "$SHARED/components/crm/StatCard.tsx" "$SHARED/components/crm/AccountNavLink.tsx" "$PORTAL/components/crm/"
cp "$SHARED/lib/telegramButtons.ts" "$SHARED/lib/html.ts" "$SHARED/lib/seo.tsx" "$SHARED/lib/imageProcess.ts" \
   "$SHARED/lib/legalContent.ts" "$SHARED/lib/videoEmbed.ts" "$PORTAL/lib/"
cp "$SHARED/hooks/useTelegramBotURL.ts" "$SHARED/hooks/useCookieConsent.ts" "$PORTAL/hooks/"
cp -r "$ROOT/packages/shared/public" "$ROOT/packages/portal/"
cp "$SHARED/styles/globals.css" "$PORTAL/styles/theme.css"
fix_imports "$PORTAL"

echo "Done portal copy"
