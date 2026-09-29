"""Builds the ink-and-wash bobblehead SVG and injects it into index.html.

Run: python3 ai/me/build.py
Everything between <!--FIGURE--> and <!--/FIGURE--> in index.html is replaced.
Each drawn part is rendered twice: a wobbly ink "lines" pass filled with paper
colour (so it hides what is behind it), then an offset watercolour "fills" pass
multiplied on top. Elements with class "solo" (eyes, photo, screens) are drawn
only in a third "tops" pass, crisp and on top of the wash.
"""
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))

INK = "#2b2622"
SKIN = "#f3d3b5"
HAIR = "#dcb96e"
HAIR_DARK = "#8a6a3a"
SHIRT = "#f6e7a1"
SHIRT_DARK = "#d9c46e"
PANTS = "#2e3f73"
SHOE = "#5a3e2e"
ROPE = "#9fd0ec"
CARD = "#1f3566"

L = f'stroke="{INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"'
T = f'stroke="{INK}" stroke-width="2.2" stroke-linecap="round" fill="none"'


def limb(x1, y1, x2, y2, w, fill=SKIN):
    """A rounded rectangle running from one point to another (upper arm, forearm, handle)."""
    length = math.hypot(x2 - x1, y2 - y1)
    ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
    return (f'<rect x="{x1 - w / 2:.1f}" y="{y1 - w / 2:.1f}" width="{length + w:.1f}" height="{w}" rx="{w / 2}" '
            f'fill="{fill}" {L} transform="rotate({ang:.1f} {x1} {y1})"/>')


def part(inner, hot=None, label=None):
    body = (f'<g class="lines" filter="url(#wobble)">{inner}</g>'
            f'<g class="fills" filter="url(#wash)" transform="translate(6,4)">{inner}</g>'
            f'<g class="tops">{inner}</g>')
    if hot:
        return (f'<g class="hot" id="hot-{hot}" data-item="{hot}" tabindex="0" role="button" '
                f'aria-label="{label}">{body}</g>')
    return f'<g>{body}</g>'


# ---- head ------------------------------------------------------------------
FACE = '<ellipse cx="500" cy="330" rx="138" ry="200"/>'
HAIR_PATH = ("M366,320 C350,240 360,180 385,150 Q372,118 405,118 Q410,96 440,104 L458,112 "
             "Q470,72 505,78 Q520,56 548,76 Q575,62 590,92 Q625,100 630,150 "
             "C642,190 640,270 634,320 C624,280 606,250 580,238 C560,250 520,246 490,232 "
             "C475,236 462,228 458,210 C440,232 410,240 392,236 C380,255 370,285 366,320 Z")
STRANDS = ["M450,200 Q430,150 410,122", "M432,222 Q402,180 388,152", "M406,234 Q386,202 374,172",
           "M472,204 Q498,140 520,84", "M500,224 Q538,160 560,84", "M540,236 Q588,180 600,110",
           "M578,242 Q620,200 628,160"]
STUBBLE = ("M362,400 C368,490 430,532 500,534 C570,532 632,490 638,400 C618,445 585,452 560,456 "
           "C545,448 522,444 500,448 C478,444 455,448 440,456 C415,452 382,445 362,400 Z")


def head():
    g = []
    for x in (364, 636):
        g.append(f'<ellipse cx="{x}" cy="355" rx="22" ry="38" fill="{SKIN}" {L}/>')
        g.append(f'<path d="M{x - 5 if x < 500 else x + 5},342 q{"-7" if x < 500 else "7"},14 0,28" {T}/>')
    g.append(f'<ellipse cx="500" cy="330" rx="138" ry="200" fill="{SKIN}" {L}/>')
    g.append(f'<g clip-path="url(#faceClip)"><path d="{STUBBLE}" fill="#b58a5a" opacity=".25"/>'
             f'<path class="solo" d="{STUBBLE}" fill="url(#dots)"/></g>')
    for x in (400, 600):
        g.append(f'<ellipse cx="{x}" cy="440" rx="26" ry="13" fill="#f2a0a0" opacity=".35"/>')
    g.append(f'<path d="{HAIR_PATH}" fill="{HAIR}" {L}/>')
    g.append(f'<path d="M458,112 Q452,160 458,210" stroke="{HAIR_DARK}" stroke-width="3" fill="none"/>')
    for d in STRANDS:
        g.append(f'<path d="{d}" stroke="{HAIR_DARK}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".85"/>')
    g.append(f'<path d="M405,286 Q440,268 475,281" stroke="{HAIR_DARK}" stroke-width="5" fill="none" stroke-linecap="round"/>')
    g.append(f'<path d="M525,281 Q560,268 595,286" stroke="{HAIR_DARK}" stroke-width="5" fill="none" stroke-linecap="round"/>')
    for x in (442, 558):
        g.append(f'<ellipse class="solo" cx="{x}" cy="348" rx="13" ry="11" fill="#fff"/>')
        g.append(f'<circle class="solo" cx="{x + 2}" cy="349" r="8" fill="#4f8f7c"/>')
        g.append(f'<circle class="solo" cx="{x + 2}" cy="349" r="4" fill="#1e1a17"/>')
        g.append(f'<circle class="solo" cx="{x + 5}" cy="345" r="2.2" fill="#fff"/>')
        g.append(f'<circle cx="{x}" cy="345" r="50" fill="none" stroke="#23201e" stroke-width="5"/>')
    g.append('<path d="M492,338 Q500,329 508,338" stroke="#23201e" stroke-width="5" fill="none"/>')
    g.append('<path d="M392,338 L366,332 M608,338 L634,332" stroke="#23201e" stroke-width="5"/>')
    g.append(f'<path d="M502,372 Q494,420 486,432 Q500,442 516,433" {T}/>')
    g.append(f'<path class="solo" d="M450,476 Q500,510 550,476" stroke="{INK}" stroke-width="3" fill="none" stroke-linecap="round"/>')
    return "".join(g)


# ---- body ------------------------------------------------------------------
def arms():
    return (limb(332, 650, 300, 770, 40) + limb(300, 770, 256, 722, 36) +
            limb(668, 650, 700, 765, 40) + limb(700, 765, 710, 855, 36))


def neck():
    return f'<path d="M478,500 L478,590 L440,586 L500,646 L560,586 L522,590 L522,500 Z" fill="{SKIN}" {L}/>'


def trousers():
    return (f'<path d="M340,800 L332,952 L428,952 L500,852 L572,952 L668,952 L660,800 Z" fill="{PANTS}" {L}/>'
            f'<ellipse cx="378" cy="958" rx="60" ry="18" fill="{SHOE}" {L}/>'
            f'<ellipse cx="622" cy="958" rx="60" ry="18" fill="{SHOE}" {L}/>')


def shirt():
    g = [f'<path d="M392,588 C362,592 344,602 336,628 L326,812 Q500,830 674,812 L664,628 C656,602 638,592 608,588 '
         f'L560,586 L500,646 L440,586 Z" fill="{SHIRT}" {L}/>',
         f'<path d="M392,590 C360,596 342,606 334,632 L312,705 L364,716 L372,660 Z" fill="{SHIRT}" {L}/>',
         f'<path d="M608,590 C640,596 658,606 666,632 L688,705 L636,716 L628,660 Z" fill="{SHIRT}" {L}/>',
         f'<path d="M500,646 L500,818" {T}/>']
    for y in (682, 722, 762, 800):
        g.append(f'<circle cx="508" cy="{y}" r="4" fill="#fffaf0" {L}/>')
    g.append(f'<path d="M478,584 L428,580 L452,630 L500,646 Z" fill="{SHIRT}" {L}/>')
    g.append(f'<path d="M522,584 L572,580 L548,630 L500,646 Z" fill="{SHIRT}" {L}/>')
    g.append(f'<path d="M340,790 Q500,806 660,790" stroke="{SHIRT_DARK}" stroke-width="3" fill="none" opacity=".6"/>')
    return "".join(g)


def pocket():
    return f'<path d="M548,668 L608,668 L608,722 Q578,730 548,722 Z" fill="{SHIRT}" {L}/>'


def pen():
    return (f'<rect x="570" y="628" width="12" height="64" rx="4" fill="#d63a2f" {L}/>'
            f'<rect x="568" y="620" width="16" height="20" rx="4" fill="#a82a22" {L}/>'
            f'<path d="M584,626 L588,626 L588,656" stroke="#9aa3ad" stroke-width="3" fill="none"/>')


def heart():
    return (f'<path d="M420,712 C404,698 394,688 394,677 C394,668 402,662 410,662 C415,662 419,665 420,670 '
            f'C421,665 425,662 430,662 C438,662 446,668 446,677 C446,688 436,698 420,712 Z" fill="#d9606e" {L}/>')


def rope():
    return (f'<path d="M486,592 Q484,660 490,738 M514,592 Q516,660 510,738" stroke="{INK}" stroke-width="9" fill="none"/>'
            f'<path d="M486,592 Q484,660 490,738 M514,592 Q516,660 510,738" stroke="{ROPE}" stroke-width="5" fill="none" stroke-dasharray="7 3"/>')


def card():
    return (f'<rect x="460" y="732" width="80" height="104" rx="8" fill="{CARD}" {L}/>'
            '<rect x="470" y="728" width="60" height="10" rx="4" fill="#9aa3ad" stroke="#2b2622" stroke-width="2"/>'
            '<image class="solo" href="id.jpg" x="472" y="744" width="56" height="56" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>'
            '<rect x="472" y="744" width="56" height="56" rx="4" fill="none" stroke="#fff" stroke-width="2"/>'
            '<rect class="solo" x="474" y="808" width="52" height="6" rx="3" fill="#fff" opacity=".85"/>'
            '<rect class="solo" x="480" y="820" width="40" height="5" rx="2.5" fill="#9fd0ec" opacity=".85"/>')


def phone():
    return (f'<g transform="rotate(-10 248 690)"><rect x="222" y="640" width="54" height="94" rx="10" fill="#2c2f36" {L}/>'
            '<rect class="solo" x="229" y="651" width="40" height="70" rx="4" fill="#a8d4ee"/>'
            '<circle class="solo" cx="249" cy="684" r="10" fill="#fff" opacity=".85"/>'
            '<rect class="solo" x="245" y="675" width="8" height="13" rx="4" fill="#5a7fa0"/></g>'
            f'<circle cx="256" cy="722" r="22" fill="{SKIN}" {L}/>')


def dumbbell():
    return (f'<rect x="636" y="859" width="130" height="13" rx="6" fill="#9aa3ad" {L}/>'
            f'<rect x="622" y="832" width="26" height="66" rx="7" fill="#6a6a6a" {L}/>'
            f'<rect x="754" y="832" width="26" height="66" rx="7" fill="#6a6a6a" {L}/>'
            f'<circle cx="710" cy="863" r="22" fill="{SKIN}" {L}/>')


def laptop():
    return (f'<rect x="78" y="890" width="204" height="30" rx="4" fill="#c96a5a" {L}/>'
            f'<rect x="90" y="920" width="182" height="32" rx="4" fill="#6a9bc9" {L}/>'
            f'<rect x="116" y="772" width="128" height="100" rx="7" fill="#b8bec6" {L}/>'
            '<rect class="solo" x="124" y="780" width="112" height="84" rx="3" fill="#dff1fa"/>'
            f'<path class="solo" d="M140,795 L220,850 M140,850 L220,795" stroke="#4a6aa3" stroke-width="3"/>'
            f'<path class="solo" d="M140,790 L140,856 L226,856" stroke="{INK}" stroke-width="2" fill="none"/>'
            f'<path d="M104,872 L256,872 L272,890 L88,890 Z" fill="#9aa1aa" {L}/>')


def controller():
    return (f'<path d="M150,962 Q140,998 166,998 Q182,998 192,984 L232,984 Q242,998 258,998 Q284,998 272,962 '
            f'Q266,946 246,946 L176,946 Q156,946 150,962 Z" fill="#4a4f57" {L}/>'
            '<path class="solo" d="M172,960 h14 M179,953 v14" stroke="#ddd" stroke-width="4" stroke-linecap="round"/>'
            '<circle class="solo" cx="244" cy="956" r="4.5" fill="#e8475f"/><circle class="solo" cx="254" cy="966" r="4.5" fill="#6ad08a"/>')


def clipboard():
    return (f'<g transform="rotate(7 866 870)"><rect x="822" y="800" width="90" height="128" rx="8" fill="#b88a5a" {L}/>'
            f'<rect x="832" y="816" width="70" height="104" rx="2" fill="#fffdf8" {L}/>'
            f'<rect x="845" y="792" width="44" height="18" rx="4" fill="#9aa3ad" {L}/>'
            + "".join(f'<path class="solo" d="M842,{y} h{50 if i % 2 else 40}" stroke="#8a8a8a" stroke-width="2.5"/>'
                      for i, y in enumerate((834, 848, 862, 876, 890, 904)))
            + '</g>')


def envelope():
    return (f'<g transform="rotate(-8 765 945)"><rect x="720" y="916" width="92" height="58" rx="4" fill="#fff8e8" {L}/>'
            f'<path d="M720,918 L766,950 L812,918" {T}/></g>')


def magnifier():
    return (limb(872, 972, 930, 1000, 14, fill="#7a4a2a") +
            f'<circle cx="850" cy="950" r="32" fill="#d6f0ff" stroke="{INK}" stroke-width="7"/>'
            '<path class="solo" d="M834,936 q10,-10 24,-8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>')


def figure():
    defs = ('<defs>'
            '<filter id="wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4"/>'
            '<feDisplacementMap in="SourceGraphic" scale="4"/></filter>'
            '<filter id="wash" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="9"/>'
            '<feDisplacementMap in="SourceGraphic" scale="12"/></filter>'
            f'<clipPath id="faceClip">{FACE}</clipPath>'
            '<clipPath id="photoClip"><rect x="472" y="744" width="56" height="56" rx="4"/></clipPath>'
            '<pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse">'
            '<circle cx="2" cy="2" r="1.3" fill="#8a6a3e" opacity=".5"/><circle cx="6.5" cy="6" r="1.1" fill="#8a6a3e" opacity=".4"/></pattern>'
            '</defs>')
    ground = '<ellipse cx="500" cy="968" rx="470" ry="34" fill="#e8d6ff" opacity=".45"/>'
    parts = [
        part(laptop(), "laptop", "Did AI make our slides and resources?"),
        part(controller(), "controller", "Isn't that just lazy?"),
        part(clipboard(), "clipboard", "Does AI plan our lessons?"),
        part(magnifier(), "magnifier", "Can I trust them?"),
        part(envelope(), "envelope", "Are your emails written by AI?"),
        part(arms()),
        part(trousers()),
        part(neck()),
        part(shirt()),
        part(pen(), "pen", "Does AI mark my work?"),
        part(pocket()),
        part(heart(), "heart", "If AI gets better than you, what are teachers for?"),
        part(rope()),
        part(card(), "id", "Does AI know who I am?"),
        part(phone(), "phone", "Is my feedback written by AI?"),
        part(dumbbell(), "dumbbell", "Why is it OK for you to use AI when we're told to use it sparingly?"),
        '<g id="headRot">' + part(head(), "head", "Is AI making you worse at your job?") + '</g>',
    ]
    return (f'<svg id="figure" viewBox="0 0 1000 1010" xmlns="http://www.w3.org/2000/svg" '
            f'role="group" aria-label="Cartoon bobblehead of Sam. Click the objects to ask questions.">'
            f'{defs}{ground}{"".join(parts)}</svg>')


if __name__ == "__main__":
    path = os.path.join(HERE, "index.html")
    html = open(path).read()
    html, n = re.subn(r"<!--FIGURE-->.*?<!--/FIGURE-->", lambda m: "<!--FIGURE-->" + figure() + "<!--/FIGURE-->",
                      html, flags=re.S)
    assert n == 1, "FIGURE markers not found"
    open(path, "w").write(html)
    print("figure injected")
