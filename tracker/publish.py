#!/usr/bin/env python3
"""Upload tracker/projects.md (private, never committed) to the tracker Worker.

Adds each project's last-touched date from git: its `folder` in this repo, or
its `note` in ~/notes. Projects added or deleted on the web page are first
written into projects.md, so the upload never undoes them. Run from anywhere:

    python3 tracker/publish.py            # upload
    python3 tracker/publish.py --dry-run  # print the JSON, upload nothing
"""
import json, pathlib, subprocess, sys, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
SITE = HERE.parent
NOTES = pathlib.Path.home() / 'notes'
KEY_FILE = pathlib.Path.home() / '.config' / 'unisam-tracker-admin-key'
API = 'https://unisam.nz/tracker/api/projects'
STATUSES = ['needs-work', 'works', 'check', 'idea']


def parse(text):
    projects, cur = [], None
    for line in text.splitlines():
        if line.startswith('## '):
            cur = {'name': line[3:].strip()}
            projects.append(cur)
        elif cur is not None and line.startswith('- ') and ':' in line:
            key, _, val = line[2:].partition(':')
            key, val = key.strip(), val.strip()
            if key == 'features':
                cur[key] = [f.strip() for f in val.split(';') if f.strip()]
            elif val:
                cur[key] = val
    for p in projects:
        if p.get('status') not in STATUSES:
            sys.exit(f"{p['name']}: status must be one of {', '.join(STATUSES)}")
    return projects


def last_commit(repo, path, follow=False):
    # Notes are single files: follow them across renames and skip pure moves,
    # so tidying the vault does not count as working on a project.
    extra = ['--follow', '--diff-filter=AM'] if follow else []
    out = subprocess.run(['git', '-C', str(repo), 'log', '-1', '--format=%cI', *extra, '--', path],
                         capture_output=True, text=True).stdout.strip()
    return out or None


FIELDS = ['status', 'folder', 'note', 'url', 'summary', 'last', 'functional', 'features', 'added']


def section(p):
    out = [f"## {p['name']}"]
    for k in FIELDS:
        v = p.get(k)
        if k == 'features':
            v = '; '.join(v or [])
        if v or k == 'features':
            out.append(f"- {k}: {v}".rstrip())
    return '\n'.join(out) + '\n'


def drop_section(text, name):
    """Remove the `## name` block (up to the next `## ` or the end)."""
    lines, out, skipping = text.splitlines(keepends=True), [], False
    for line in lines:
        if line.startswith('## '):
            skipping = line[3:].strip() == name
        if not skipping:
            out.append(line)
    return ''.join(out)


def apply_changes(text, changes):
    """Write adds and deletes made on the web page into projects.md text."""
    for c in changes:
        if c.get('op') == 'add':
            p = c['project']
            if p['name'] not in [q['name'] for q in parse(text)]:
                text = text.rstrip('\n') + '\n\n' + section(p)
        elif c.get('op') == 'delete':
            text = drop_section(text, c['name'])
    return text


def call(method, path, body=None):
    req = urllib.request.Request(API.rsplit('/', 1)[0] + path, method=method,
                                 data=body.encode() if body else None, headers={
        'Authorization': 'Bearer ' + KEY_FILE.read_text().strip(),
        'Content-Type': 'application/json',
        'User-Agent': 'unisam-tracker-publish',
    })
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())


def main():
    dry = '--dry-run' in sys.argv
    md = HERE / 'projects.md'
    text = md.read_text()
    changes = [] if dry else call('GET', '/changes')['changes']
    if changes:
        text = apply_changes(text, changes)
        md.write_text(text)
        for c in changes:
            print(f"from the web: {c['op']} {c.get('name') or c['project']['name']}")
    projects = parse(text)
    for p in projects:
        if p.get('folder'):
            p['touched'] = last_commit(SITE, p['folder'])
        elif p.get('note'):
            p['touched'] = last_commit(NOTES, p['note'], follow=True)
        if not p.get('touched') and p.get('added'):
            p['touched'] = p['added']
    body = {'projects': projects, 'applied': [c['id'] for c in changes]}
    if dry:
        print(json.dumps(body, ensure_ascii=False, indent=1))
        return
    print(call('PUT', '/projects', json.dumps(body, ensure_ascii=False)))


if __name__ == '__main__':
    main()
