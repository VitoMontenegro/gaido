#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED="$ROOT/packages/shared/src"
DISC="$ROOT/packages/discover/src"

fix_imports() {
  local dir="$1"
  find "$dir" -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 | while IFS= read -r -d '' f; do
    sed -i '' \
      -e "s|from '../api/|from '@gaido/api-client/api/|g" \
      -e "s|from '../../api/|from '@gaido/api-client/api/|g" \
      -e "s|from '../hooks/useAuth'|from '@gaido/api-client/hooks/useAuth'|g" \
      -e "s|from '../hooks/useLogout'|from '@gaido/api-client/hooks/useLogout'|g" \
      -e "s|from '../hooks/useNotifications'|from '@gaido/api-client/hooks/useNotifications'|g" \
      -e "s|from '../lib/cn'|from '@gaido/ui-primitives/cn'|g" \
      -e "s|from '../lib/lazyImport'|from '@gaido/ui-primitives/lazyImport'|g" \
      -e "s|from '../lib/authValidation'|from '@gaido/ui-primitives/authValidation'|g" \
      -e "s|from '../lib/site'|from '@gaido/site-urls/site'|g" \
      -e "s|from '../lib/brand'|from '@gaido/site-urls/brand'|g" \
      -e "s|from '../components/ErrorBoundary'|from '@gaido/ui-primitives/ErrorBoundary'|g" \
      -e "s|from '../components/ScrollToTop'|from '@gaido/ui-primitives/ScrollToTop'|g" \
      -e "s|from '../components/ExternalRedirect'|from '@gaido/ui-primitives/ExternalRedirect'|g" \
      -e "s|from '../components/PasswordInput'|from '@gaido/ui-primitives/PasswordInput'|g" \
      "$f"
  done
}

mkdir -p "$DISC"/{pages/provider,components/{discover,location},contexts,lib,hooks,layouts,styles}
cp "$SHARED/pages/"{DiscoverPage,ProviderPage,AuthPages,AccountPages}.tsx "$DISC/pages/"
cp -r "$SHARED/pages/provider" "$DISC/pages/"
cp -r "$SHARED/components/discover" "$DISC/components/"
cp -r "$SHARED/components/location" "$DISC/components/"
cp "$SHARED/components/"{BrandLogo,CookieBanner,ApiErrorBanner,PartnerServicesBar,Breadcrumbs,LegalContentEditor,PasswordInput}.tsx "$DISC/components/" 2>/dev/null || true
cp "$SHARED/contexts/LocationContext.tsx" "$DISC/contexts/"
cp "$SHARED/lib/"{geo.ts,categoryTiles.ts,html.ts,seo.tsx,telegramButtons.ts} "$DISC/lib/"
cp "$SHARED/hooks/"{useTelegramBotURL,useCookieConsent}.ts "$DISC/hooks/"
cp -r "$ROOT/packages/shared/public" "$ROOT/packages/discover/"
cp "$SHARED/styles/globals.css" "$DISC/styles/theme.css"
fix_imports "$DISC"
echo "discover copy done"
