from pathlib import Path
import re

ROOTS = [Path("server/db.ts"), Path("server/routers.ts"), *Path("server/_core").rglob("*.ts")]
pattern = re.compile(r'''(?P<prefix>from\s+["']|import\s*\(\s*["'])(?P<path>\.{1,2}/[^"']+)(?P<quote>["'])''')

for path in ROOTS:
    text = path.read_text()

    def replace(match: re.Match[str]) -> str:
        spec = match.group("path")
        final_segment = spec.rsplit("/", 1)[-1]
        if "." in final_segment:
            return match.group(0)
        return f'{match.group("prefix")}{spec}.js{match.group("quote")}'

    updated = pattern.sub(replace, text)
    if updated != text:
        path.write_text(updated)
        print(path)
