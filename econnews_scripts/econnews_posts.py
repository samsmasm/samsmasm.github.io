#!/usr/bin/env python3
import json, os, re

BASE = os.path.join(os.environ.get("GITHUB_WORKSPACE", "/home/sam/samsmasm.github.io"), "econnews")
posts_dir = os.path.join(BASE, 'posts')
posts_json = os.path.join(BASE, 'posts.json')

files = sorted(
    [f for f in os.listdir(posts_dir) if re.match(r'\d{4}-\d{2}-\d{2}\.html$', f)],
    reverse=True
)

posts = [{'date': f[:-5], 'title': f'Economics News - {f[:-5]}', 'filename': f} for f in files]
json.dump(posts, open(posts_json, 'w'), indent=2)
print(f'Updated posts.json with {len(posts)} entries')
