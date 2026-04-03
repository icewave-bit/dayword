#!/usr/bin/env python3
"""
Собирает SQLite-словарь из текстового списка (одно слово на строку, UTF-8).

Слова хранятся с кодом языка (например ru, en) — одна БД на все языки.

Таблица words(language_code, word) — только проверка «есть ли слово в языке»:
  SELECT EXISTS(
    SELECT 1 FROM words WHERE language_code = ? AND word = ?
  );
Автодополнение по префиксу не предусмотрено.
"""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

DDL_WORDS = """
CREATE TABLE words (
    language_code TEXT NOT NULL,
    word TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'dictionary',
    suggested_at INTEGER,
    PRIMARY KEY (language_code, word)
) WITHOUT ROWID
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("dist/merged_clean.txt"),
        help="Вход: один word на строку (UTF-8).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/dictionary.db"),
        help="Выходной файл SQLite.",
    )
    parser.add_argument(
        "--language",
        type=str,
        default="ru",
        help="Код языка (ISO 639-1 или свой), напр. ru, en. По умолчанию ru.",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Дописать слова в существующую БД (другой язык или дозаливка), не удаляя файл.",
    )
    parser.add_argument("--batch-size", type=int, default=50_000)
    args = parser.parse_args()

    if not args.input.is_file():
        raise SystemExit(f"Нет файла: {args.input.resolve()}")

    lang = args.language.strip().lower()
    if not lang:
        raise SystemExit("Пустой --language")

    args.output.parent.mkdir(parents=True, exist_ok=True)

    if args.output.exists() and not args.append:
        args.output.unlink()

    conn = sqlite3.connect(args.output)
    try:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = OFF")
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.execute("PRAGMA cache_size = -200000")

        if not args.append:
            conn.execute(DDL_WORDS)
        else:
            conn.execute(DDL_WORDS.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS"))

        insert_sql = (
            "INSERT OR IGNORE INTO words(language_code, word, source) VALUES (?, ?, 'dictionary')"
            if args.append
            else "INSERT INTO words(language_code, word, source) VALUES (?, ?, 'dictionary')"
        )

        count_before = 0
        if args.append:
            row = conn.execute(
                "SELECT COUNT(*) FROM words WHERE language_code = ?",
                (lang,),
            ).fetchone()
            count_before = int(row[0]) if row else 0

        batch: list[tuple[str, str]] = []
        lines_ok = 0

        with open(args.input, encoding="utf-8") as f:
            for line in f:
                w = line.rstrip("\r\n")
                if not w or w == "\ufeff":
                    continue
                lines_ok += 1
                batch.append((lang, w))
                if len(batch) >= args.batch_size:
                    conn.executemany(insert_sql, batch)
                    batch.clear()
            if batch:
                conn.executemany(insert_sql, batch)

        conn.commit()
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("ANALYZE words")
        conn.commit()

        if args.append:
            row = conn.execute(
                "SELECT COUNT(*) FROM words WHERE language_code = ?",
                (lang,),
            ).fetchone()
            count_after = int(row[0]) if row else 0
            added = count_after - count_before
            print(
                f"OK (append): язык={lang!r}, строк в файле={lines_ok:,}, "
                f"добавлено новых в БД={added:,} → {args.output.resolve()}"
            )
        else:
            print(
                f"OK: язык={lang!r}, вставлено={lines_ok:,} → {args.output.resolve()}"
            )
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
