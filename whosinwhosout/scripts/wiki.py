"""Small helpers for pulling data out of MediaWiki wikitext."""
import re
import unicodedata


def strip_refs(s):
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.S)
    return s


def strip_templates(s, names=None):
    """Remove {{...}} templates (nested-safe). If names given, only those (case-insensitive)."""
    out, i = [], 0
    while i < len(s):
        if s.startswith("{{", i):
            m = re.match(r"\{\{\s*([^|}]+)", s[i:])
            name = m.group(1).strip().lower() if m else ""
            if names is None or name in names:
                depth, j = 0, i
                while j < len(s):
                    if s.startswith("{{", j):
                        depth += 1
                        j += 2
                    elif s.startswith("}}", j):
                        depth -= 1
                        j += 2
                        if depth == 0:
                            break
                    else:
                        j += 1
                i = j
                continue
        out.append(s[i])
        i += 1
    return "".join(out)


def templates(s, name):
    """Yield the raw body of each {{name ...}} template (nested-safe)."""
    pat = re.compile(r"\{\{\s*" + re.escape(name) + r"\s*[|}\n]", re.I)
    for m in pat.finditer(s):
        depth, j = 0, m.start()
        while j < len(s):
            if s.startswith("{{", j):
                depth += 1
                j += 2
            elif s.startswith("}}", j):
                depth -= 1
                j += 2
                if depth == 0:
                    break
            else:
                j += 1
        yield s[m.start() + 2 : j - 2]


def params(body):
    """Split a template body into named params, ignoring pipes inside [[ ]] and {{ }}."""
    parts, depth, cur, i = [], 0, [], 0
    while i < len(body):
        two = body[i : i + 2]
        if two in ("[[", "{{"):
            depth += 1
            cur.append(two)
            i += 2
            continue
        if two in ("]]", "}}"):
            depth -= 1
            cur.append(two)
            i += 2
            continue
        if body[i] == "|" and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(body[i])
        i += 1
    parts.append("".join(cur))
    out = {}
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            out[k.strip().lower()] = v.strip()
    return out


def delink(s):
    """[[Target|Text]] -> Text, [[Text]] -> Text, strip bold/italic and html."""
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\{\{\s*NZ electorate link\s*\|([^}|]*)[^}]*\}\}", r"\1", s, flags=re.I)
    s = re.sub(r"'''?", "", s)
    s = re.sub(r"<[^>]+>", "", s)
    return s.strip()


def norm(name):
    """Normalise a name for matching: strip accents, macrons, punctuation, case."""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("\u2013", "-").replace("\u2014", "-")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return s.strip()
