# Release Resource Usage

Use Cloudflare edge analytics to measure automated requests to:

- `/releases.json` (the canonical filename, not `/release.json`)
- `/feed.xml` (RSS)
- `/sitemap.xml`

GA4 and Cloudflare Web Analytics rely on browser JavaScript. They do not measure
ordinary HTTP fetches by RSS readers, scripts, or search crawlers. Do not embed
tracking scripts in JSON/XML or fabricate GA4 visitor sessions for these requests.

## Where to View Requests

In Cloudflare, select `flutterreleases.com`, open domain Analytics, and inspect
Traffic or Security analytics with a request-path filter. Available dashboard
filters and fields depend on the plan. For repeatable reports, use the GraphQL
Analytics API with a token scoped to this zone's Analytics Read permission.

The current Free zone permits grouping these requests by path, response status,
and user agent. The `clientRefererHost` field was denied on this plan during the
October 13, 2026 audit; do not assume referrer-level analysis is available.

## Repeatable Query

POST this read-only query to `https://api.cloudflare.com/client/v4/graphql` with
the token in the Authorization header. Replace the zone ID and date range.
Keep credentials outside the repository and frontend.

```graphql
query ResourceUsage($zone: string!, $start: Time!, $end: Time!) {
  viewer {
    zones(filter: {zoneTag: $zone}) {
      httpRequestsAdaptiveGroups(
        limit: 1000
        orderBy: [count_DESC]
        filter: {
          datetime_geq: $start
          datetime_lt: $end
          clientRequestHTTPHost: "flutterreleases.com"
          requestSource: "eyeball"
          clientRequestPath_in: ["/releases.json", "/feed.xml", "/sitemap.xml"]
        }
      ) {
        count
        dimensions {
          clientRequestPath
          edgeResponseStatus
          userAgent
        }
      }
    }
  }
}
```

For resource-level totals, omit `userAgent` from the dimensions. If a result
reaches the row limit, shorten the period or query resources separately before
presenting it as a complete report.

## Interpret Carefully

- `200` means a response was served; it does not prove the consumer parsed or
  used the latest release information.
- `304` means a client revalidated its cached copy. Include this as polling
  activity, not as another full dataset download.
- `301`/`302` are redirects, not successful resource deliveries at that URL.
- The site's own React application fetches `releases.json`; these requests are
  not evidence of external API integrations.
- User-agent strings are self-reported. RSS reader and script identifiers are
  useful signals, not verified identities or unique subscriber counts.
- Sitemap traffic is mainly discovery/indexing activity. Report it separately
  from developer consumption of JSON/RSS.
- Adaptive analytics can use sampling. Treat counts as reported analytics,
  not guaranteed exact access logs.
- No IP addresses or persistent user identifiers are needed for this report.

The existing crawler and generators already update these resources from the
canonical release dataset. Usage reporting reads Cloudflare analytics and does
not modify the crawler, resources, caching, or delivery routes.

References:

- [Cloudflare edge versus Web Analytics](https://developers.cloudflare.com/web-analytics/faq/)
- [GraphQL Analytics](https://developers.cloudflare.com/analytics/graphql-api/)
- [Analytics sampling](https://developers.cloudflare.com/analytics/graphql-api/sampling/)
