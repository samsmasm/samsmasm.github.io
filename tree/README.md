# Family tree viewer (stage 2)
Static, read-only. Data comes from data/tree.json, which is generated from the SQLite master
(see ~/tools/family-tree/scripts/export_site_json.py). Do not edit tree.json by hand.
To view locally: `cd tree && python3 -m http.server 8000`, then open http://localhost:8000
