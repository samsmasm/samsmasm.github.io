#!/usr/bin/env python3
"""Look for a function that is called but never defined or imported.

This exists because `wireMarkInput` was used in results.js and imported nowhere,
and `loadClassHistory` the same in teach.js. Both left the page looking normal
while the feature was dead: mark boxes wired to nothing, trend lines that never
drew. `node --check` sees only syntax, so it cannot catch either.

    python3 test/undefined-calls.py

It is a heuristic, not a type checker: it strips comments and strings, gathers
every name used in call position, and subtracts everything declared, imported,
destructured or taken as a parameter. Anything left is worth a look.
"""

import pathlib
import re
import sys

HERE = pathlib.Path(__file__).parent.parent

BUILT_IN = set("""
window document console location history navigator localStorage sessionStorage screen
Math JSON Object Array String Number Boolean Date Promise Map Set WeakMap WeakSet RegExp
Error TypeError RangeError URL URLSearchParams Blob File FileReader FormData Image Audio
setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame
encodeURIComponent decodeURIComponent encodeURI decodeURI parseInt parseFloat isNaN isFinite
fetch alert confirm prompt structuredClone crypto AbortController TextEncoder TextDecoder
Event CustomEvent FocusEvent MouseEvent KeyboardEvent PointerEvent InputEvent
Intl Symbol Proxy Reflect BigInt getComputedStyle matchMedia queueMicrotask atob btoa
qrcode
if for while switch catch return typeof new delete void do else try finally await yield async
function class super import export
""".split())


def strip_noise(src):
    """Blank out comments and string bodies so prose cannot look like code.

    Done character by character rather than with regexes, because a // inside a
    URL in a string is not a comment, and an apostrophe inside a comment is not
    a string. Getting that wrong silently truncated an import line and made this
    tool report names that were imported perfectly well.
    """
    out = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        two = src[i:i + 2]
        if two == '//':
            while i < n and src[i] != '\n':
                i += 1
        elif two == '/*':
            i += 2
            while i < n and src[i:i + 2] != '*/':
                i += 1
            i += 2
        elif c in '\'"`':
            quote = c
            out.append(quote)
            i += 1
            while i < n and src[i] != quote:
                i += 2 if src[i] == '\\' else 1
            out.append(quote)
            i += 1
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def names_in(text):
    return set(re.findall(r'[A-Za-z_$][\w$]*', text))


def declared(src):
    out = set()
    out |= set(re.findall(r'\b(?:function|class)\s+([A-Za-z_$][\w$]*)', src))
    # const a = 1, b = 2  /  let one = null, two = null;
    for block in re.findall(r'\b(?:const|let|var)\s+([^;\n]*)', src):
        out |= set(re.findall(r'(?:^|,)\s*([A-Za-z_$][\w$]*)\s*(?==|,|$)', block))
        if '=' not in block:
            out |= names_in(block)
    # destructuring and import lists
    for block in re.findall(r'\{([^{}]*)\}\s*(?:=|from)', src):
        out |= names_in(block)
    out |= set(re.findall(r'import\s+([A-Za-z_$][\w$]*)\s+from', src))
    # parameters
    for params in re.findall(r'function\s*[\w$]*\s*\(([^)]*)\)', src):
        out |= names_in(params)
    for params in re.findall(r'\(([^()]*)\)\s*=>', src):
        out |= names_in(params)
    out |= set(re.findall(r'([A-Za-z_$][\w$]*)\s*=>', src))
    out |= set(re.findall(r'\bcatch\s*\(\s*([\w$]+)', src))
    # object shorthand methods and class methods:  name(args) {
    out |= set(re.findall(r'(?m)^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{', src))
    return out


def main():
    problems = 0
    for path in sorted((HERE / 'js').glob('*.js')):
        src = strip_noise(path.read_text())
        called = set(re.findall(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(', src))
        missing = sorted(called - declared(src) - BUILT_IN)
        if missing:
            problems += 1
            print(path.relative_to(HERE), '->', ', '.join(missing))
    if problems:
        print(str(problems) + ' file(s) call something that is not defined or imported')
        return 1
    print('no undefined calls in js/')
    return 0


if __name__ == '__main__':
    sys.exit(main())
