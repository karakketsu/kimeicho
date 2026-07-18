"""
imports/list.xlsx と imports/texts/*.txt から、
src/novels/*.md をまとめて生成するスクリプト。

使い方:
    python scripts/generate_novels.py
"""
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
XLSX_PATH = ROOT / "imports" / "list.xlsx"
TEXTS_DIR = ROOT / "imports" / "texts"
OUT_DIR = ROOT / "src" / "novels"
VAULT_DIR = ROOT / "src" / "vault" / "novels"

VALID_RATINGS = {"", "全年齢", "R-18", "R-18G"}


def slugify(text: str) -> str:
    """ファイル名として安全な文字列に変換する（日本語はそのまま残す）"""
    text = unicodedata.normalize("NFKC", str(text)).strip()
    text = re.sub(r"[\\/:*?\"<>|]", "", text)
    text = re.sub(r"\s+", "-", text)
    return text or "untitled"


def yaml_escape(value: str) -> str:
    value = str(value).replace('"', '\\"')
    return f'"{value}"'


def main():
    if not XLSX_PATH.exists():
        print(f"[エラー] {XLSX_PATH} が見つかりません。imports/list.xlsx を用意してください。")
        sys.exit(1)

    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)
    ws = wb["作品リスト"]

    rows = list(ws.iter_rows(min_row=2, values_only=True))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    VAULT_DIR.mkdir(parents=True, exist_ok=True)

    created, skipped, errors = 0, 0, []

    for idx, row in enumerate(rows, start=2):
        filename, title, date, work_type, fandom, pairing, rating, caption, scope = (
            list(row) + [None] * 9
        )[:9]

        # 記入例・空行はスキップ
        if not title or not str(title).strip():
            skipped += 1
            continue
        if str(filename).strip() == "001" and str(title).strip() == "深海の午後":
            skipped += 1
            continue

        filename = str(filename).strip() if filename else None
        if not filename:
            errors.append(f"{idx}行目: ファイル名が空です（タイトル: {title}）")
            continue

        txt_path = TEXTS_DIR / f"{filename}.txt"
        if not txt_path.exists():
            errors.append(f"{idx}行目: 本文ファイルが見つかりません → {txt_path.name}")
            continue

        body = txt_path.read_text(encoding="utf-8").strip()

        rating_str = str(rating).strip() if rating else ""
        if rating_str not in VALID_RATINGS:
            errors.append(
                f"{idx}行目: 年齢指定「{rating_str}」が不正です（全年齢／R-18／R-18G のいずれかにしてください）"
            )
            continue

        date_str = str(date).strip() if date else ""
        # openpyxlがdatetimeで読んだ場合に対応
        if hasattr(date, "strftime"):
            date_str = date.strftime("%Y-%m-%d")

        fandom_str = str(fandom).strip() if fandom else ""
        pairing_list = []
        if pairing:
            pairing_list = [p.strip() for p in str(pairing).split(",") if p.strip()]

        scope_str = str(scope).strip() if scope else ""
        is_vault = "vault" in scope_str.lower() or "限定" in scope_str
        layout_name = "vault-novel.njk" if is_vault else "novel.njk"
        front_matter = ["---", f"layout: {layout_name}", f"title: {yaml_escape(title)}", f"date: {date_str}"]
        if work_type:
            front_matter.append(f"type: {yaml_escape(work_type)}")
        if fandom_str:
            front_matter.append(f"fandom: {yaml_escape(fandom_str)}")
        if pairing_list:
            pairing_yaml = "[" + ", ".join(yaml_escape(p) for p in pairing_list) + "]"
            front_matter.append(f"pairing: {pairing_yaml}")
        front_matter.append(f"rating: {rating_str or '全年齢'}")
        if caption and str(caption).strip():
            front_matter.append(f"caption: {yaml_escape(str(caption).strip())}")
        front_matter.append("---")

        content = "\n".join(front_matter) + "\n\n" + body + "\n"

        out_dir = VAULT_DIR if is_vault else OUT_DIR
        out_name = slugify(filename)
        out_path = out_dir / f"{out_name}.md"
        out_path.write_text(content, encoding="utf-8")
        created += 1

    print(f"作成: {created}件 / スキップ: {skipped}件")
    if errors:
        print(f"\n[エラー {len(errors)}件]")
        for e in errors:
            print(" - " + e)


if __name__ == "__main__":
    main()
