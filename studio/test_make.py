"""Self-check for make.py's SEO rules:  py test_make.py"""
import make

GOOD = {"keyword": "raining candy", "title": "What If It Started Raining Candy?",
        "description": "What if it started raining candy? The science is sticky.",
        "hashtags": ["#WhatIf", "#Science", "#Shorts"], "tags": ["a", "b", "c", "d", "e"],
        "thumbnail_text": "CANDY RAIN", "audience": "general"}

assert make.check_youtube(GOOD) == [], make.check_youtube(GOOD)
assert any("no hashtags" in e for e in make.check_youtube({**GOOD, "title": "What If It Started Raining Candy #fun"}))
assert any("keyword" in e for e in make.check_youtube({**GOOD, "title": "A Sweet Surprise From The Clouds Above"}))
assert any("#Shorts" in e for e in make.check_youtube({**GOOD, "hashtags": ["#WhatIf", "#Science", "#Candy"]}))
assert any("audience" in e for e in make.check_youtube({**GOOD, "audience": "teens"}))
assert any("translations.fr" in e for e in make.check_youtube({**GOOD, "translations": {"fr": {"title": "x"}}}))
print("make.py SEO checks: OK")
