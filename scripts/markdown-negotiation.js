function acceptRanges(header) {
  return String(header || '').split(',').map(part => {
    const [type, ...parameters] = part.trim().toLowerCase().split(';');
    const quality = parameters.map(value => value.trim()).find(value => value.startsWith('q='));
    const value = quality ? Number(quality.slice(2)) : 1;
    return { type: type.trim(), quality: Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0 };
  });
}

export function prefersMarkdown(header) {
  const ranges = acceptRanges(header);
  const markdown = ranges.filter(range => range.type === 'text/markdown');
  if (!markdown.length) return false;
  const quality = Math.max(...markdown.map(range => range.quality));
  if (quality === 0) return false;
  const html = ['text/html', 'text/*', '*/*']
    .map(type => ranges.filter(range => range.type === type))
    .find(matches => matches.length);
  return quality >= (html ? Math.max(...html.map(range => range.quality)) : 0);
}

function normalizedPath(pathname) {
  try {
    return pathname.split('/').map(segment => encodeURIComponent(decodeURIComponent(segment))).join('/');
  } catch {
    return null;
  }
}

function responseHeaders(response, negotiated = false) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (negotiated) {
    const vary = (headers.get('Vary') || '').split(',').map(value => value.trim()).filter(Boolean);
    if (!vary.some(value => value.toLowerCase() === 'accept' || value === '*')) vary.push('Accept');
    headers.set('Vary', vary.join(', '));
    // Asset subrequests retain Pages caching; the public negotiated URL must not
    // be cached under one representation by caches that ignore Vary: Accept.
    headers.set('Cache-Control', 'private, no-store');
  }
  return headers;
}

async function missing(request, env) {
  if (!prefersMarkdown(request.headers.get('Accept')) && !new URL(request.url).pathname.endsWith('.md')) {
    const url = new URL('/404.html', request.url);
    const asset = await env.ASSETS.fetch(new Request(url, { method: request.method, headers: { Accept: 'text/html' } }));
    return new Response(request.method === 'HEAD' ? null : asset.body, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' },
    });
  }
  return new Response(request.method === 'HEAD' ? null : 'Not found\n', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function createMarkdownWorker(routes, redirects = {}, discoveryLinks = '') {
  const markdownFiles = new Set(Object.values(routes));
  return {
    async fetch(request, env) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);
      const url = new URL(request.url);
      const pathname = normalizedPath(url.pathname);
      if (!pathname) return missing(request, env);

      let target = Object.hasOwn(redirects, pathname) ? redirects[pathname] : null;
      if (!target && pathname === '/index.html') target = '/';
      if (!target && !pathname.endsWith('/') && Object.hasOwn(routes, `${pathname}/`)) target = `${pathname}/`;
      if (!target && pathname.endsWith('.md/') && markdownFiles.has(pathname.slice(0, -1))) target = pathname.slice(0, -1);
      if (target) {
        url.pathname = target;
        return new Response(null, { status: 301, headers: { Location: url.href, 'Cache-Control': 'no-store' } });
      }

      const negotiated = Object.hasOwn(routes, pathname);
      const directMarkdown = markdownFiles.has(pathname);
      if (!negotiated && !directMarkdown) {
        if (pathname.startsWith('/release/') || pathname.endsWith('.md')) return missing(request, env);
        return env.ASSETS.fetch(request);
      }

      const markdown = directMarkdown || prefersMarkdown(request.headers.get('Accept'));
      const assetUrl = new URL(request.url);
      assetUrl.pathname = markdown && negotiated ? routes[pathname] : pathname;
      assetUrl.search = '';
      const headers = new Headers(request.headers);
      if (markdown && negotiated) {
        // Validators/ranges for HTML cannot validate the alternate Markdown body.
        for (const name of ['If-None-Match', 'If-Modified-Since', 'Range', 'If-Range']) headers.delete(name);
      }
      headers.set('Accept', markdown ? 'text/markdown' : 'text/html');
      const asset = await env.ASSETS.fetch(new Request(assetUrl, { method: request.method, headers }));
      if (markdown && asset.status === 200 && !(asset.headers.get('Content-Type') || '').startsWith('text/markdown')) {
        return missing(request, env);
      }
      const outputHeaders = responseHeaders(asset, negotiated);
      if (markdown) {
        outputHeaders.set('Content-Type', 'text/markdown; charset=utf-8');
        outputHeaders.append('Link', `<${url.origin}${negotiated ? pathname : Object.keys(routes).find(key => routes[key] === pathname)}>; rel="canonical"`);
      }
      if (pathname === '/' && asset.status === 200 && discoveryLinks) outputHeaders.append('Link', discoveryLinks);
      return new Response(request.method === 'HEAD' ? null : asset.body, {
        status: asset.status,
        statusText: asset.statusText,
        headers: outputHeaders,
      });
    },
  };
}
