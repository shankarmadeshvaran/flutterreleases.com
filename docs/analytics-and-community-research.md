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
| `version_checker_compatibility_check` | Exact Flutter/Dart compatibility checks and compatible/incompatible outcomes |

For the Flutter & Dart Version Compatibility Checker, register useful GA4 custom
dimensions/metrics for `mode`, `flutter_version`, `dart_version`,
`bundled_dart_version`, `channel`, `release_type`, `compatible`,
`result_count`, `stable_count`, `beta_count`, `prerelease_count`, and
`matching_flutter_count`.

Do not send secrets, email addresses, tokens, or raw stack traces in analytics
properties. Search query tracking is intentionally capped to 80 characters.

## Developer Problems Worth Tracking

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
