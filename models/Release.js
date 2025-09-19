// models/Release.js
// A single normalized model for release items and helpers to normalize raw JSON

// Normalize release_notes from a raw item
function normalizeNotes(rawItem) {
  // If there's an explicit release_notes object, filter null/empty values
  if (rawItem && typeof rawItem.release_notes === 'object' && rawItem.release_notes !== null) {
    const cleaned = Object.entries(rawItem.release_notes)
      .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .reduce((acc, [k, v]) => {
        acc[k] = String(v).trim();
        return acc;
      }, {});
    return Object.keys(cleaned).length ? cleaned : null;
  }

  // fallback single URL props
  const fallback = rawItem?.notes_url || rawItem?.notesUrl || rawItem?.release_notes_url || rawItem?.ref_url || rawItem?.notes || null;
  if (!fallback || String(fallback).trim() === '') return null;
  const base = String(fallback).trim();

  // If this is a full release, synthesize per-section anchors (only if release_type === 'Release')
  const releaseType = (rawItem?.release_type || rawItem?.type || rawItem?.releaseType || rawItem?.release || '').toString().toLowerCase();
  if (releaseType === 'release') {
    return {
      base,
      framework: `${base}#framework`,
      material: `${base}#material`,
      ios: `${base}#ios`,
      android: `${base}#android`,
      windows: `${base}#windows`,
      linux: `${base}#linux`,
      web: `${base}#web`,
      tools: `${base}#tooling`,
    };
  }

  // non-Release => only base
  return { base };
}

export class Release {
  constructor(params) {
    Object.assign(this, params);
  }

  static fromRaw(it, { verbose = false } = {}) {
    // several possible keys historically used (compat)
    const version = it.version || it.flutter_version || it.flutterVersion || it.flutterVersionString || null;
    const channel = it.channel || 'stable';
    const release_type = it.release_type || it.type || it.releaseType || (it.release ? String(it.release) : 'Release');
    const released = it.released || it.published || it.date || null;
    const dart_version = it.dart_version || it.dart || it.dartVersion || null;
    const framework_revision = it.framework_revision || it.framework || it.frameworkRevision || null;
    const engine_revision = it.engine_revision || it.engine || null;
    const git_tag = it.git_tag || it.tag || null;
    const build = it.build || it.engine_revision || null;
    const requires = it.requires || {};
    const platforms = it.platforms || it.download || it.platform || {};
    const summary = it.summary || it.description || '';
    const ref_url = it.ref_url || it.ref || it.url || null;
    const verified = typeof it.verified === 'boolean' ? it.verified : !!(it.sources && it.sources.includes('GitHub Release'));
    const sources = it.sources || [];

    const release_notes = normalizeNotes(it);

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`raw item: candidateVersion=${version || '(missing)'} keys=[${Object.keys(it).join(',')}]`);
      if (release_notes) {
        const keys = Object.keys(release_notes).join(',');
        // eslint-disable-next-line no-console
        console.log(`[RN-debug] ${version || '(no-version)'} release_notes= ${JSON.stringify(release_notes)} -> sectionsKeys=${keys}`);
      }
    }

    // Return a plain object (POJO) to keep getStaticProps JSON-serializable
    return {
      version,
      channel,
      release_type,
      released,
      dart_version,
      framework_revision,
      engine_revision,
      git_tag,
      build,
      requires,
      platforms,
      release_notes,
      summary,
      ref_url,
      verified: !!verified,
      sources,
      __raw: it,
    };
  }
}

export function normalizeReleases(rawItems, { verbose = false } = {}) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  return items.map((it) => Release.fromRaw(it, { verbose }));
}
