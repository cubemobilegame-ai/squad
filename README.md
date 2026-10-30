# SQUAD – spontaniczne wypady ze znajomymi (Cube Mobile Apps)

Aplikacja dla młodzieży: dropy (wypady) z odpowiedziami IN / LATE / OUT, tylko czaty grupowe, grupy, album wypadu z kolażem, odznaki.

## Jak to działa
- `public/` – cała aplikacja (strona + PWA). Trafia na **Firebase Hosting** pod `https://squad-64cd5.web.app`.
- `tools/cron.cjs` – automat (GitHub Actions co ok. 10 min): powiadomienia push, przypomnienia, sprzątanie po 24 h. Zastępuje płatne funkcje w chmurze – całość działa na darmowym planie Spark.
- `firestore.rules` – zasady dostępu do bazy. Zdjęcia (profilowe i album) zapisują się w bazie, skompresowane.
- `android/` – ustawienia aplikacji na Androida (Trusted Web Activity – aplikacja otwiera stronę SQUAD jak natywna apka, linki `/d/…` otwierają się w aplikacji).
- `sklep/` – ikona, grafika 1024×500 i zrzuty ekranu do Sklepu Play.

## Automaty (GitHub Actions)
| Automat | Kiedy | Co robi |
|---|---|---|
| **Firebase – wdrożenie** | każda zmiana w aplikacji | wysyła stronę i reguły bazy na Firebase |
| **Automat – powiadomienia i sprzątanie** | co ok. 10 minut | powiadomienia push, przypomnienia, usuwanie dropów po 24 h |
| **Android – klucz podpisu (jednorazowo)** | ręcznie, raz | tworzy klucz podpisu aplikacji |
| **Android – AAB i APK** | zmiana w `android/` lub ręcznie | buduje `.aab` (Sklep Play) i `.apk` (telefon) → zakładka **Releases** |

## Sekrety (Settings → Secrets and variables → Actions)
| Nazwa | Skąd |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Google Cloud → Konta usługi → klucz JSON (cała zawartość pliku) |
| `ANDROID_KEY_PASS` | wymyślone hasło do klucza podpisu (min. 12 znaków) |
| `ANDROID_KEYSTORE_B64` | plik `ANDROID_KEYSTORE_B64.txt` z automatu „klucz podpisu” |
| `ANDROID_SHA256` | odcisk klucza; po pierwszym wgraniu do Play dopisz po przecinku odcisk „klucza podpisywania aplikacji” z Play Console |

Pełna instrukcja krok po kroku jest w dokumencie „SQUAD – uruchomienie Firebase krok po kroku”.

## Podgląd bez Firebase
Otwórz `https://squad-64cd5.web.app/?demo` albo plik `public/index.html` lokalnie – działa tryb demo na przykładowych danych.
