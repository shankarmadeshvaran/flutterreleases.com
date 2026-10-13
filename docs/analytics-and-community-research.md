# Analytics and Community Research

FlutterReleases uses Google Analytics 4 because it has a free dashboard for
traffic sources, pages, search terms, downloads, outbound links, and custom
events. The GA script is injected by
`packages/web/vite/plugins/google-analytics-plugin.ts` only when a measurement
ID is configured.

UI code should add analytics through
`packages/web/src/web/lib/analytics.ts` so tracking failures cannot affect page
rendering, filtering, downloads, or navigation.

## Production Configuration

Create a free GA4 property and web data stream for `flutterreleases.com`, then
set this environment variable in GitHub Actions and Cloudflare Pages:

```sh
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

If the variable is missing, the site still builds and runs without analytics.

The build marks the injected GA4 bootstrap so the static generator can reuse it
on every generated HTML page. Static links outside the React root have delegated
release, download, release-note, and navigation tracking. React controls keep
their existing event handlers, avoiding duplicate click events.

Keep Enhanced Measurement page loads and browser-history page changes enabled.
These provide page views; the checker and homepage query deep links do not send
additional virtual page views. A query-selected release remains a homepage visit
with a `release_deep_link_viewed` event.

After building and generating the static site, run `bun run test:analytics`.
Use `bun run test:analytics --require-enabled` for a build with a measurement ID
to check all HTML files and static click behavior. Builds without an ID should
contain no GA4 bootstrap. Use a test ID for local checks rather than sending
test traffic into the production property.

## Event Taxonomy

| Event | Purpose |
|---|---|
| `navigation_click` | Header, footer, hero, and internal page navigation |
| `outbound_click` | GitHub, X/contact, donate, and other external destinations |
| `hero_latest_click` | Latest stable/beta pills on the homepage |
| `versions_hub_latest_click` | Latest stable/beta/dev cards on `/flutter-versions/` |
| `versions_hub_release_click` | Release links from version-history tables |
| `release_page_click` | Links from the homepage release table to `/release/<version>/` |
| `release_expanded` / `release_collapsed` | Row expansion intent in the homepage table |
| `release_notes_click` | Full notes, framework, engine, and footer release-note links |
| `download_click` | SDK download clicks by version, channel, platform, and location |
| `filter_changed` | Channel filter usage |
| `release_search` | Debounced search usage and result count |
| `search_cleared` | Search reset intent |
| `release_deep_link_viewed` | SPA deep links such as `/?v=3.44.9#release` |
| `official_archive_click` | Fallback clicks to Flutter's official SDK archive |
| `theme_toggle` | Dark/light preference changes |
| `version_checker_viewed` | Visits to `/tools/flutter-version-checker/` |
| `version_checker_mode_changed` | Switches between Flutter → Dart and Dart → Flutter modes |
| `version_checker_channel_filter` | Channel filter usage in the checker |
| `version_checker_flutter_lookup` | Successful Flutter version selection and bundled Dart result |
| `version_checker_dart_lookup` | Successful Dart version lookup and matching Flutter result counts |
| `checker_compatibility_check` | User-initiated Flutter/Dart checks and compatible/incompatible outcomes |
| `checker_lookup_unmatched` | Unmatched Flutter/Dart input, with flags but no arbitrary input text |
| `checker_release_click` | Release-detail navigation from checker results |

Checker lookup events wait 700 ms after edits and do not count auto-filled defaults
as completed lookups. The compatibility event replaces the old overlength name,
which the event wrapper previously truncated; update any GA4 explorations using
that old name. Historical results cannot be corrected retroactively.

For the Flutter & Dart Version Compatibility Checker, register useful GA4 custom
dimensions/metrics for `mode`, `flutter_version`, `dart_version`,
`bundled_dart_version`, `channel`, `release_type`, `compatible`,
`result_count`, `stable_count`, `beta_count`, `prerelease_count`, and
`matching_flutter_count`.

Do not send secrets, email addresses, tokens, or raw stack traces in analytics
properties. Search text is sent only for version-like or known channel/type
queries and is capped to 80 characters. Other searches retain length and result
count only. Unmatched checker input is not sent as raw text.

## Funnel Definitions

- Release journey: homepage `page_view`, release-page `page_view`, then
  `download_click` or `release_notes_click`.
- Checker journey: checker `page_view`, `version_checker_flutter_lookup` or
  `version_checker_dart_lookup` or `checker_compatibility_check`, then
  `checker_release_click`, and optionally a release download/notes click.
- Blog journey: article `page_view`, navigation to a checker or release page,
  then a user-initiated lookup or release download/notes click.

Use open funnels when visitors may land directly on a release or checker.
Inspect page_location and event parameters in GA4 DebugView after deployment.
Register categorical fields as event-scoped custom dimensions and numeric
counts as custom metrics. Do not add automatic and custom download event counts
together: they can represent the same action. A download click does not prove a
binary finished downloading.

## Developer Problems Worth Tracking

Automated JSON, sitemap, and RSS requests need edge analytics rather than GA4.
See [Resource usage analytics](resource-usage-analytics.md) for the verified
Cloudflare fields, reporting query, and interpretation rules.

These are the strongest community-backed problems FlutterReleases can help
answer with the existing `releases.json` data.

| Problem | Where it appears | Product opportunity |
|---|---|---|
| Dart SDK mismatch and version solving failures | Stack Overflow questions such as "Flutter requires SDK version" and "How to change the current Dart SDK version" | Make Flutter-to-Dart compatibility easier to find and link from every release page |
| Upgrade uncertainty between Flutter versions | Stack Overflow questions about upgrading existing Flutter apps | Add an upgrade path view comparing two stable versions |
| Hotfix/minor release-note confusion | Flutter stable changelog, Flutter release notes, and SDK archive have different best URLs depending on release type | Keep crawler rules strict: feature releases use docs release notes; stable patches use `CHANGELOG.md` version anchors |
| Download link trust and platform selection | Flutter SDK archive is the source developers use to verify historical SDK downloads | Track download clicks by platform and keep crawler download verification visible |
| "Latest stable Flutter version" discovery | Search Console opportunity plus Flutter community support channels | Keep `/flutter-versions/` as the stable-first hub and link it prominently |

## Research Sources

- Flutter community channels: https://flutter.dev/community
- Flutter contribution and help locations: https://docs.flutter.dev/contribute
- Dart community channels: https://dart.dev/community
- Flutter SDK archive: https://docs.flutter.dev/install/archive
- Flutter release notes: https://docs.flutter.dev/release/release-notes
- Flutter stable changelog: https://github.com/flutter/flutter/blob/stable/CHANGELOG.md
- Stack Overflow Dart SDK mismatch example: https://stackoverflow.com/questions/56351254/flutter-requires-sdk-version
- Stack Overflow changing Dart SDK version example: https://stackoverflow.com/questions/69608798/how-to-change-the-current-dart-sdk-version
- Stack Overflow upgrading Flutter apps example: https://stackoverflow.com/questions/64797607/how-do-i-upgrade-an-existing-flutter-app
- FlutterDev Discord listing: https://discord.com/servers/420324994703163402
- r/FlutterDev community listing: https://gummysearch.com/r/FlutterDev/

## Rules For Future Analytics Changes

- Reuse `trackEvent` and `trackView`; do not call `window.gtag` directly from UI components.
- Keep events tied to product intent: navigation, search, filters, downloads,
  release notes, theme, and deep links.
- Use stable property names: `version`, `flutter_version`, `dart_version`,
  `channel`, `platform`, `location`, `label`, `href`, and `result_count`.
- Keep crawler and release data as the source of truth. Analytics should observe
  behavior, not create or modify release facts.
- Verify `bun run typecheck`, `bun run lint`, and `bun run build:web` after UI
  analytics changes.
