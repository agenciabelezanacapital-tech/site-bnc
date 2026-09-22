#!/usr/bin/env python3
"""Apply verified production publication times without changing article copy.

Add the first successful production deployment to blog/publication-times.json,
then run this script. Never use a preview, scheduled time or current edit time.
"""
import json
import re
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]


def synchronize():
    manifest = json.loads((ROOT / 'blog/publication-times.json').read_text())
    zone = ZoneInfo(manifest['timezone'])
    records = manifest['articles']
    updates = {}
    counts = {'articles': 0, 'cards': 0, 'rss': 0}

    def publication(slug, full=False):
        record = records[slug]
        value = datetime.fromisoformat(record['published_at'].replace('Z', '+00:00'))
        if value.tzinfo is None or not record.get('source') or not record.get('commit'):
            raise ValueError(f'Missing verified timestamp/source/commit: {slug}')
        local = value.astimezone(zone)
        label = local.strftime('%d/%m/%Y às %H:%M')
        if full:
            label = f'Publicado em {label} (Brasília)'
        return local, f'<time class="publication-time" datetime="{local.isoformat()}" title="Horário de Brasília">{label}</time>'

    for path in sorted((ROOT / 'blog').glob('*/index.html')):
        slug = path.parent.name
        local, markup = publication(slug, full=True)
        html = path.read_text()
        stamp = local.isoformat()
        # Preserve formatting and unrelated metadata, including the article body.
        html, published_count = re.subn(
            r'("datePublished"\s*:\s*")[^"]+(")',
            lambda m: m[1] + stamp + m[2], html)
        if published_count != 1:
            raise ValueError(f'Expected one datePublished: {path}')
        html = re.sub(
            r'(<meta\s+property="article:published_time"\s+content=")[^"]+("[^>]*>)',
            lambda m: m[1] + stamp + m[2], html)
        if 'property="article:published_time"' not in html:
            html = html.replace('</head>', f'<meta property="article:published_time" content="{stamp}" />\n</head>')

        def modified(match):
            value = datetime.fromisoformat(match[2].replace('Z', '+00:00'))
            if value.tzinfo is None:
                value = value.replace(tzinfo=zone)
            return match[1] + (stamp if value < local else match[2]) + match[3]
        html = re.sub(r'("dateModified"\s*:\s*")([^"]+)(")', modified, html)
        html = re.sub(r'(<meta\s+property="article:modified_time"\s+content=")([^"]+)("[^>]*>)', modified, html)

        def metadata(match):
            author = re.search(r'<strong>.*?</strong>', match[2], re.S)
            return match[1] + (author[0] if author else '') + markup + '</div>'
        html, count = re.subn(r'(<div class="article-(?:author|meta)">)(.*?)</div>', metadata, html, flags=re.S)
        if count != 1:
            raise ValueError(f'Expected one article metadata block: {path}')
        updates[path] = html
        counts['articles'] += 1

    def card(match):
        block = match[0]
        link = re.search(r'href="/blog/([^/]+)/"', block)
        if not link:
            return block
        _, markup = publication(link[1])
        # Cards in the blog use a div; the homepage uses a simple span.
        if '<div class="blog-meta">' in block:
            block, count = re.subn(
                r'(<div class="blog-meta">)\s*(?:<span>.*?</span>|<time\b[^>]*>.*?</time>)',
                lambda m: m[1] + '<span>' + markup + '</span>', block, count=1, flags=re.S)
        else:
            block, count = re.subn(r'<span class="blog-meta">.*?</span>',
                lambda m: '<span class="blog-meta">' + markup + '</span>', block, count=1, flags=re.S)
        counts['cards'] += count
        return block

    for path in [ROOT / 'blog/index.html', ROOT / 'index.html']:
        html = path.read_text()
        html = re.sub(r'<article\b[^>]*class="blog-card[^\"]*"[^>]*>.*?</article>', card, html, flags=re.S)
        html = re.sub(r'<a\b[^>]*class="blog-featured[^\"]*"[^>]*>.*?</a>', card, html, flags=re.S)
        updates[path] = html

    rss_path = ROOT / 'blog/rss.xml'
    def rss_item(match):
        block = match[0]
        link = re.search(r'<link>https://www\.belezanacapital\.com\.br/blog/([^/]+)/</link>', block)
        if not link:
            return block
        local, _ = publication(link[1])
        stamp = format_datetime(local.astimezone(timezone.utc), usegmt=True)
        counts['rss'] += 1
        return re.sub(r'<pubDate>.*?</pubDate>', f'<pubDate>{stamp}</pubDate>', block)
    rss = re.sub(r'<item>.*?</item>', rss_item, rss_path.read_text(), flags=re.S)
    latest = max(datetime.fromisoformat(r['published_at'].replace('Z', '+00:00')) for r in records.values())
    rss = re.sub(r'<lastBuildDate>.*?</lastBuildDate>',
        f'<lastBuildDate>{format_datetime(latest.astimezone(timezone.utc), usegmt=True)}</lastBuildDate>', rss)
    updates[rss_path] = rss

    # Validate all inputs before writing any file.
    changed = 0
    for path, content in updates.items():
        if path.read_text() != content:
            path.write_text(content)
            changed += 1
    print(json.dumps({**counts, 'files_changed': changed}, ensure_ascii=False))


if __name__ == '__main__':
    synchronize()
