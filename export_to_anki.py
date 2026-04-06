"""
FlashForge → Anki converter
Usage:
    pip install genanki
    python export_to_anki.py flashforge-export.json

Produces one .apkg file per FlashForge set in the current directory.
Double-click each .apkg to import into Anki.
"""

import json
import sys
import os
import base64
import hashlib
import re

import genanki


# ── HTML helpers ──────────────────────────────────────────────────────────────

def table_to_html(rows):
    if not rows:
        return ""
    html = '<table border="1" cellpadding="4" style="border-collapse:collapse;margin:auto">'
    for i, row in enumerate(rows):
        html += "<tr>"
        tag = "th" if i == 0 else "td"
        for cell in row:
            html += f"<{tag} style='padding:6px'>{cell}</{tag}>"
        html += "</tr>"
    return html + "</table>"


def extract_image(data_url, media_files):
    """Decode a base64 data URL, write it to a temp file, return the filename."""
    if not data_url or not data_url.startswith("data:image/"):
        return None
    try:
        header, b64 = data_url.split(",", 1)
    except ValueError:
        return None
    ext = "jpg"
    if "png" in header:
        ext = "png"
    elif "gif" in header:
        ext = "gif"
    elif "webp" in header:
        ext = "webp"
    name = "ff_" + hashlib.md5(b64.encode()).hexdigest()[:16] + "." + ext
    media_files[name] = base64.b64decode(b64)
    return name


def build_field(text, image_url, table, media_files):
    parts = []
    if text:
        parts.append(f"<div>{text}</div>")
    if image_url:
        if image_url.startswith("data:"):
            fname = extract_image(image_url, media_files)
            if fname:
                parts.append(f'<div><img src="{fname}" style="max-width:500px"></div>')
        else:
            # External URL — reference directly
            parts.append(f'<div><img src="{image_url}" style="max-width:500px"></div>')
    if table:
        parts.append(table_to_html(table))
    return "".join(parts)


# ── Per-set conversion ────────────────────────────────────────────────────────

CSS = """
body { font-family: sans-serif; font-size: 20px; text-align: center; padding: 12px; }
table { margin: auto; }
th, td { padding: 6px 10px; }
img { border-radius: 8px; margin-top: 8px; }
"""

CARD_TEMPLATE = [
    {
        "name": "Card 1",
        "qfmt": "{{Front}}",
        "afmt": '{{FrontSide}}<hr id="answer">{{Back}}',
    }
]


def convert_set(deck_data, output_dir):
    title = deck_data.get("title", "Untitled")
    deck_id = abs(hash(deck_data.get("id", title))) % (10 ** 10)
    model_id = abs(hash(deck_data.get("id", title) + "_model")) % (10 ** 10)

    model = genanki.Model(
        model_id,
        "FlashForge Basic",
        fields=[{"name": "Front"}, {"name": "Back"}],
        templates=CARD_TEMPLATE,
        css=CSS,
    )
    deck = genanki.Deck(deck_id, title)
    media_files = {}  # filename → bytes

    cards = deck_data.get("cards", [])
    skipped = 0
    for card in cards:
        front = build_field(
            card.get("term"), card.get("termImage"), card.get("termTable"), media_files
        )
        back = build_field(
            card.get("definition"), card.get("defImage"), card.get("defTable"), media_files
        )
        if not front.strip() and not back.strip():
            skipped += 1
            continue
        note = genanki.Note(model=model, fields=[front, back])
        deck.add_note(note)

    # Write media bytes to temp files next to the script so genanki can bundle them
    tmp_paths = []
    for fname, data in media_files.items():
        tmp = os.path.join(output_dir, fname)
        with open(tmp, "wb") as f:
            f.write(data)
        tmp_paths.append(tmp)

    pkg = genanki.Package(deck)
    pkg.media_files = tmp_paths

    safe_title = re.sub(r'[\\/*?:"<>|]', "_", title)
    out_path = os.path.join(output_dir, safe_title + ".apkg")
    pkg.write_to_file(out_path)

    # Clean up temp media files
    for tmp in tmp_paths:
        try:
            os.remove(tmp)
        except OSError:
            pass

    note_count = len(deck.notes)
    print(f"  ✓ {title!r} → {safe_title}.apkg  ({note_count} card{'s' if note_count != 1 else ''}"
          + (f", {skipped} skipped" if skipped else "") + ")")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    json_path = sys.argv[1]
    if not os.path.isfile(json_path):
        print(f"Error: file not found: {json_path}")
        sys.exit(1)

    with open(json_path, encoding="utf-8") as f:
        sets = json.load(f)

    # Support both raw array (from Export for Anki button) and backup format { sets: [...] }
    if isinstance(sets, dict) and "sets" in sets:
        sets = sets["sets"]

    if not isinstance(sets, list):
        print("Error: expected a JSON array of sets.")
        sys.exit(1)

    output_dir = os.path.dirname(os.path.abspath(json_path))
    print(f"Converting {len(sets)} set(s) → {output_dir}\n")

    for s in sets:
        try:
            convert_set(s, output_dir)
        except Exception as e:
            print(f"  ✗ {s.get('title', '?')!r}: {e}")

    print("\nDone! Double-click each .apkg file to import into Anki.")


if __name__ == "__main__":
    main()
