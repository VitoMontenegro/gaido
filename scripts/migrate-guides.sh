#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED="$ROOT/packages/shared/src"
GUIDES="$ROOT/packages/guides/src"

fix_imports() {
  local dir="$1"
  find "$dir" -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 | while IFS= read -r -d '' f; do
    sed -i '' \
      -e "s|from '../api/|from '@gaido/api-client/api/|g" \
      -e "s|from \"../api/|from \"@gaido/api-client/api/|g" \
      -e "s|from '../../api/|from '@gaido/api-client/api/|g" \
      -e "s|from '../hooks/useAuth'|from '@gaido/api-client/hooks/useAuth'|g" \
      -e "s|from '../hooks/useLogout'|from '@gaido/api-client/hooks/useLogout'|g" \
      -e "s|from '../hooks/useNotifications'|from '@gaido/api-client/hooks/useNotifications'|g" \
      -e "s|from '../hooks/useTelegramBotURL'|from '../hooks/useTelegramBotURL'|g" \
      -e "s|from '../hooks/useCookieConsent'|from '../hooks/useCookieConsent'|g" \
      -e "s|from '../hooks/useRecentViews'|from '../hooks/useRecentViews'|g" \
      -e "s|from '../hooks/useDragScroll'|from '../hooks/useDragScroll'|g" \
      -e "s|from '../../hooks/useAuth'|from '@gaido/api-client/hooks/useAuth'|g" \
      -e "s|from '../../hooks/useLogout'|from '@gaido/api-client/hooks/useLogout'|g" \
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
      "$f"
  done
}

mkdir -p "$GUIDES"/{pages/guide,pages/provider,components/{crm,reviews,map},lib,hooks,layouts,styles}
cp -r "$SHARED/pages/guide"/* "$GUIDES/pages/guide/"
cp "$SHARED/pages/"{GuidesHomePage,GuidePage,ExcursionPage,CatalogPages,CityMapPages,SearchPage,SeoCityPage,JournalPages,AboutPage,CreateExcursionPage,EditExcursionPage,AuthPages,AccountPages}.tsx "$GUIDES/pages/"
cp -r "$SHARED/components/crm" "$GUIDES/components/"
cp -r "$SHARED/components/reviews" "$GUIDES/components/"
cp -r "$SHARED/components/map" "$GUIDES/components/"
cp "$SHARED/components/"*.tsx "$GUIDES/components/" 2>/dev/null || true
rm -rf "$GUIDES/components/discover" "$GUIDES/components/location" 2>/dev/null || true
rm -f "$GUIDES/components/"{AdminGuidesEditor,SiteContentEditor,AdminEntityLists,ArticlesEditor,PartnerServicesBar,SiteHeader,SiteFooter}.tsx 2>/dev/null || true
cp "$SHARED/lib/"*.ts "$GUIDES/lib/" 2>/dev/null || true
cp "$SHARED/lib/seo.tsx" "$GUIDES/lib/"
cp "$SHARED/hooks/"*.ts "$GUIDES/hooks/"
cp -r "$ROOT/packages/shared/public" "$ROOT/packages/guides/"
cp "$SHARED/styles/globals.css" "$GUIDES/styles/theme.css"
fix_imports "$GUIDES"
echo "guides copy done"
