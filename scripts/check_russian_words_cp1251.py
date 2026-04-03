#!/usr/bin/env python3
"""
Проверка списка слов в TXT (Windows-1251).

Логика:
1) Убираем из слова дефисы/апострофы/пробелы (нормализация).
2) Отбрасываем строки с латиницей (A-Z) и/или с некорректными символами.
3) Проверяем слово по русскому лексикону (pymorphy2).
4) Записываем прошедшие слова в clean, не прошедшие (всё удалённое) в removed.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from functools import lru_cache


CYRILLIC_ONLY_RE = re.compile(r"^[а-яё]+$", re.IGNORECASE)
LATIN_RE = re.compile(r"[A-Za-z]")
WS_RE = re.compile(r"\s+")


# Охват основных дефисов/минусов/тире и апострофов.
HYphen_CHARS = "-–—−"
APOSTROPHE_CHARS = "'’ʼ‘`´\""


def normalize_token(raw: str) -> str:
    """
    Убираем дефисы/апострофы/пробелы из слова и приводим к нижнему регистру.
    """
    s = raw.strip()
    if not s:
        return ""

    # Удаляем апострофы и дефисы.
    trans = {ord(ch): None for ch in (HYphen_CHARS + APOSTROPHE_CHARS)}
    s = s.translate(trans)
    # Убираем пробелы/переносы внутри слова.
    s = WS_RE.sub("", s)
    return s.casefold()


def has_separators(raw: str) -> bool:
    """
    Сигнал, что в исходной строке встречаются дефисы/апострофы или пробелы внутри слова.
    """
    s = raw.strip()
    if not s:
        return False

    if any(ch in s for ch in (HYphen_CHARS + APOSTROPHE_CHARS)):
        return True

    # Пробел/табуляция/перенос внутри слова (не по краям).
    return bool(re.search(r"\s", s))


def is_cyrillic_word(norm: str) -> bool:
    return bool(norm) and CYRILLIC_ONLY_RE.match(norm) is not None


def load_pymorphy2_morph() -> "object":
    """
    Подключает pymorphy2 так, чтобы использовать локально установленный в .vendor_pymorphy2 пакет.
    """
    vendor_dir = os.path.join(os.getcwd(), ".vendor_pymorphy2")
    if os.path.isdir(vendor_dir):
        sys.path.insert(0, vendor_dir)

    try:
        from pymorphy2 import MorphAnalyzer  # type: ignore

        return MorphAnalyzer()
    except Exception as e:  # pragma: no cover
        raise RuntimeError(
            "Не удалось импортировать pymorphy2. "
            "Попробуйте запустить скрипт из корня проекта DayWord, "
            "где лежит .vendor_pymorphy2. Ошибка: %r" % (e,)
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Путь к входному .txt (cp1251, 1 слово на строку).")
    parser.add_argument("--clean-out", required=True, help="Путь к выходному файлу с проверенными словами.")
    parser.add_argument("--removed-out", required=True, help="Путь к выходному файлу с удалёнными строками.")
    parser.add_argument("--encoding", default="cp1251", help="Кодировка входного файла. По умолчанию cp1251.")
    parser.add_argument(
        "--normalize-separators",
        action="store_true",
        help="Если включено: удаляем дефисы/апострофы/пробелы из слова и проверяем получившееся слово. "
        "Если выключено (по умолчанию): удаляем строку целиком при наличии таких символов в исходном слове.",
    )
    parser.add_argument(
        "--progress-every",
        type=int,
        default=100000,
        help="Показывать прогресс каждые N строк. По умолчанию 100000.",
    )
    parser.add_argument(
        "--cache-size",
        type=int,
        default=200000,
        help="Размер кэша проверок слов. По умолчанию 200000.",
    )
    args = parser.parse_args()

    morph = load_pymorphy2_morph()

    @lru_cache(maxsize=args.cache_size)
    def is_known(word: str) -> bool:
        if not word:
            return False
        if morph.word_is_known(word):
            return True
        # Иногда в списках встречается разнобой "ё/е".
        if "ё" in word and morph.word_is_known(word.replace("ё", "е")):
            return True
        return False

    in_path = args.input
    clean_path = args.clean_out
    removed_path = args.removed_out

    total = 0
    clean_count = 0
    removed_count = 0

    with open(in_path, "r", encoding=args.encoding, errors="replace") as fin, open(
        clean_path, "w", encoding="utf-8", newline="\n"
    ) as fout_clean, open(removed_path, "w", encoding="utf-8", newline="\n") as fout_removed:
        for line in fin:
            total += 1
            raw = line.rstrip("\r\n")

            if total % args.progress_every == 0:
                print(f"[progress] {total:,} lines. clean={clean_count:,} removed={removed_count:,}", file=sys.stderr)

            # Признак проблемной декодировки.
            if not raw or "�" in raw:
                fout_removed.write(raw + "\n")
                removed_count += 1
                continue

            # Удаляем мусор с латиницей.
            if LATIN_RE.search(raw):
                fout_removed.write(raw + "\n")
                removed_count += 1
                continue

            # По умолчанию удаляем строку целиком, если исходное слово содержит дефис/апостроф/внутренние пробелы.
            if not args.normalize_separators and has_separators(raw):
                fout_removed.write(raw + "\n")
                removed_count += 1
                continue

            norm = normalize_token(raw)
            if not norm:
                fout_removed.write(raw + "\n")
                removed_count += 1
                continue

            # Требуем, чтобы после нормализации остались только кириллические буквы.
            if not is_cyrillic_word(norm):
                fout_removed.write(raw + "\n")
                removed_count += 1
                continue

            if is_known(norm):
                fout_clean.write(norm + "\n")
                clean_count += 1
            else:
                fout_removed.write(raw + "\n")
                removed_count += 1

    print(
        f"[done] total={total:,} clean={clean_count:,} removed={removed_count:,}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

