#!/usr/bin/env python3
"""Upload tracker/projects.md (private, never committed) to the tracker Worker.

Adds each project's last-touched date from git: its `folder` in this repo, or
its `note` in ~/notes. Run from anywhere:

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


def main():
    projects = parse((HERE / 'projects.md').read_text())
    for p in projects:
        if p.get('folder'):
            p['touched'] = last_commit(SITE, p['folder'])
        elif p.get('note'):
            p['touched'] = last_commit(NOTES, p['note'], follow=True)
    body = json.dumps({'projects': projects}, ensure_ascii=False, indent=1)
    if '--dry-run' in sys.argv:
        print(body)
        return
    req = urllib.request.Request(API, data=body.encode(), method='PUT', headers={
        'Authorization': 'Bearer ' + KEY_FILE.read_text().strip(),
        'Content-Type': 'application/json',
        'User-Agent': 'unisam-tracker-publish',
    })
    with urllib.request.urlopen(req) as res:
        print(res.read().decode())


if __name__ == '__main__':
    main()
