# Sklep Play – grafiki i opisy (8 języków)
Każdy folder (`pl`, `en`, `es`, `de`, `fr`, `it`, `cs`, `uk`) zawiera:
- `zrzut-1.png` … `zrzut-6.png` – zrzuty ekranu telefonu 1080×1920 (Play Console → Strona sklepu → Zrzuty ekranu telefonu),
- `grafika-1024x500.png` – grafika promocyjna (Feature graphic),
- `opis.txt` – tytuł (≤30), krótki opis (≤80) i pełny opis (≤4000).
Ikona aplikacji 512×512: `sklep/ikona-512.png`.

Dodawanie języków w Play Console: Rozwijanie → Strona sklepu → Strona główna sklepu → „Zarządzaj tłumaczeniami” → „Dodaj własne tłumaczenia”.
Odświeżenie grafik po zmianach w aplikacji: `node tools/sklep/zrzuty.cjs <adres demo> <tmp>` i `node tools/sklep/grafiki.cjs <adres repo> <tmp> sklep/play`.
