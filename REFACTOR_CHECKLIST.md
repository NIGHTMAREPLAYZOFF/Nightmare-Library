
# Post-Refactor Verification Checklist

## Automated Checks
- [ ] Run UI smoke test: open main page, load dashboard
- [ ] Open reader with sample EPUB
- [ ] Open/create shelf functionality
- [ ] Toggle theme (dark/sepia/light)
- [ ] Search functionality works
- [ ] Upload book modal works

## Security Verification
- [ ] No console XSS warnings from previously reported lines
- [ ] All `innerHTML`/`outerHTML` replaced with safe DOM methods
- [ ] No hardcoded credentials in any file
- [ ] All secrets referenced via Cloudflare bindings only
- [ ] DOMPurify or safe DOM builders used for all dynamic content

## Cloudflare Compatibility
- [ ] No Node.js-only APIs in frontend code
- [ ] Cloudflare Pages preview build succeeds
- [ ] `wrangler.toml` configured with binding placeholders
- [ ] All environment variables documented
- [ ] Functions compatible with Cloudflare Workers runtime

## Performance Verification
- [ ] Time to interactive with 200 mocked books < 2s
- [ ] Lazy loading images work correctly
- [ ] Virtual scrolling for large libraries functional
- [ ] No layout thrashing in DevTools Performance tab
- [ ] EPUB chapter navigation smooth (< 100ms)

## Functional Tests
- [ ] EPUB open/close works
- [ ] Next/prev chapter navigation
- [ ] Progress save/load persists correctly
- [ ] Bookmarks creation and navigation
- [ ] Reading statistics tracking
- [ ] Shelf management (create/edit/delete)
- [ ] Book metadata editing
- [ ] Tags and filtering

## Accessibility
- [ ] Keyboard navigation works throughout
- [ ] ARIA attributes present on interactive elements
- [ ] Focus indicators visible
- [ ] Screen reader compatible

## Build Verification
- [ ] TypeScript compilation succeeds
- [ ] No linting errors
- [ ] All assets referenced correctly
- [ ] Static files served properly
