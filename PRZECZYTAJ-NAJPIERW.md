# SQUAD – paczka awaryjna (Cube Mobile Apps)

Wszystko, czego potrzebujesz, żeby odtworzyć aplikację SQUAD na innym koncie, u innego programisty albo po awarii.

## Co jest w paczce
| Plik / folder | Co to jest |
|---|---|
| `squad-kod/` | Cały kod aplikacji (to samo co repozytorium GitHub `cubemobilegame-ai/squad`) |
| `squad-historia.bundle` | Repozytorium z pełną historią zmian (git). Odtworzenie: `git clone squad-historia.bundle squad` |
| `squad-podglad.html` | Podgląd aplikacji w trybie demo – otwórz w przeglądarce, działa bez internetu |
| `squad-kod/sklep/` | Ikona 512, grafika 1024×500 i zrzuty ekranu do Sklepu Play |
| `squad-kod/public/` | Gotowa aplikacja (strona + PWA) – to trafia na Firebase Hosting |

**Celowo NIE ma tu haseł ani kluczy** (klucz konta usługi Firebase, hasło i plik klucza podpisu Androida). Trzymaj je osobno, np. w menedżerze haseł. Bez klucza podpisu Androida nie wydasz aktualizacji tej samej aplikacji w Sklepie Play – zrób jego kopię zaraz po wygenerowaniu (krok C).

## Z czego składa się aplikacja
- **Strona / PWA**: jeden plik `public/index.html` (+ `config.js`, `sw.js`, `manifest.json`, grafiki). Tryb demo: dopisz `?demo` do adresu.
- **Firebase (plan darmowy Spark)**: Hosting, Firestore (baza), Authentication (Google + anonimowe). Projekt: `squad-64cd5`.
- **Powiadomienia push**: Firebase Cloud Messaging (klucz VAPID w `public/config.js`), wysyłane przez automat GitHub co 10 min (`tools/cron.cjs`).
- **Android**: aplikacja TWA budowana automatem GitHub (`android/`, `.github/workflows/android.yml`) → zakładka Releases (APK do telefonu, AAB do Sklepu Play).
- **Automaty GitHub Actions** (`.github/workflows/`):
  - `firebase.yml` – wdrożenie strony, reguł i indeksów przy każdej zmianie,
  - `automat.yml` – powiadomienia, przypomnienia, sprzątanie dropów (co 10 min),
  - `android.yml` – budowa APK/AAB, `android-klucz.yml` – jednorazowe wygenerowanie klucza podpisu,
  - `przerwa.yml` – włącza/wyłącza ekran „Przerwa techniczna / Awaria”.

## A. Przeniesienie na nowe konto Firebase (krok po kroku)
1. console.firebase.google.com → **Add project** (Google Analytics niepotrzebne).
2. **Build → Firestore Database → Create database** (lokalizacja `eur3` / Europa, tryb produkcyjny).
3. **Build → Authentication → Get started** → włącz **Google** i **Anonymous**.
4. **Project settings → General → Your apps → Web (</>)** → zarejestruj aplikację → skopiuj `apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId` do `public/config.js`.
5. **Project settings → Cloud Messaging → Web Push certificates → Generate key pair** → wklej jako `vapidKey` w `public/config.js`.
6. **Project settings → Service accounts → Generate new private key** → cały plik JSON wklej w GitHub jako sekret `FIREBASE_SERVICE_ACCOUNT`.
7. W `.firebaserc` zmień `squad-64cd5` na nowy identyfikator projektu; w `android/app.json` zmień `host` na `NOWY-ID.web.app`.
8. Google Cloud Console → **APIs & Services → Credentials → OAuth 2.0 Client (Web client)**: dodaj w „Authorized JavaScript origins” `https://NOWY-ID.web.app` i `https://NOWY-ID.firebaseapp.com`, a w „Authorized redirect URIs” `https://NOWY-ID.web.app/__/auth/handler` i `https://NOWY-ID.firebaseapp.com/__/auth/handler`.
9. Wypchnij zmiany na GitHub – automat „Firebase – wdrożenie” sam wgra stronę, reguły i indeksy.

Ręcznie z komputera (zamiast automatu): `npm i -g firebase-tools`, `firebase login`, w folderze `squad-kod`: `firebase deploy --only hosting,firestore`.

## B. Nowe repozytorium GitHub
1. Załóż puste repo, wgraj zawartość `squad-kod/` (albo `git clone squad-historia.bundle` i `git push` na nowe repo).
2. **Settings → Secrets and variables → Actions** – dodaj sekrety:

| Sekret | Skąd |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | krok A6 (cały plik JSON) |
| `ANDROID_KEY_PASS` | wymyślone hasło do klucza podpisu, min. 12 znaków |
| `ANDROID_KEYSTORE_B64` | plik `ANDROID_KEYSTORE_B64.txt` z automatu „Android – klucz podpisu” |
| `ANDROID_SHA256` | odcisk z pliku `ANDROID_SHA256.txt` (po wgraniu do Play dopisz po przecinku odcisk z Play Console → App integrity) |

## C. Android – klucz podpisu i Sklep Play
1. Dodaj sekret `ANDROID_KEY_PASS`.
2. Actions → **Android – klucz podpisu (jednorazowo)** → Run workflow → pobierz artefakt „klucz-podpisu-squad” (jest dostępny tylko 1 dzień!).
3. Z artefaktu: zawartość `ANDROID_KEYSTORE_B64.txt` → sekret `ANDROID_KEYSTORE_B64`; zawartość `ANDROID_SHA256.txt` → sekret `ANDROID_SHA256`.
4. **Zrób kopię pliku `squad-upload.jks` i hasła** w bezpiecznym miejscu.
5. Actions → **Android – AAB i APK** → Run workflow → w Releases pojawi się podpisany AAB do Sklepu Play.
6. Po publikacji w Sklepie Play: w `public/index.html` ustaw `PLAY_LIVE=true` (okienko instalacji pokaże przycisk do Sklepu Play).

## D. Ekran „Przerwa techniczna / Awaria”
- Actions → **Przerwa techniczna / awaria** → Run workflow → wybierz tryb (i opcjonalnie tekst, godzinę powrotu). Wyłączenie: tryb „wyłącz”.
- Gdy nie działa baza Firebase: edytuj `public/status.json` (`"mode": "awaria"` albo `"przerwa"`, wyłączenie: `null`) i zapisz – strona wgra się sama.
- Podgląd bez włączania: dopisz do adresu `?demo&status=przerwa` albo `?demo&status=awaria`.

## E. Ważne ustawienia i miejsca w kodzie (`public/index.html`)
- `MAIL_TO` – adres kontaktowy w „Pomoc i kontakt”.
- `PLAY_URL`, `PLAY_LIVE` – link do Sklepu Play i włącznik przycisku.
- `APP_VER` – numer wersji pokazywany w profilu.
- Teksty PL/EN: słowniki `L.pl` i `L.en`.
- Kolory: zmienne CSS `--acc`, `--g1..--g3` (różowy motyw) i `:root.boy` (niebieski motyw).
- Kreator awatarów: `public/avatars/k/` (części), kod szukaj `KREATOR AWATARA` i `kreator awatarów`.

## F. Licencje użytych materiałów
- Emotki 3D i części awatarów: **Microsoft Fluent Emoji** – licencja MIT (`public/e/LICENSE.txt`).
- Czcionka: **Bricolage Grotesque** – SIL Open Font License (`public/fonts/OFL.txt`).
- Biblioteki Firebase – Apache 2.0.

## G. Kontakt / konta
- Projekt Firebase: `squad-64cd5` (konto Google właściciela).
- Repozytorium: `github.com/cubemobilegame-ai/squad`.
- Pakiet Android: `com.cubemobilegames.squad`.
- E-mail kontaktowy aplikacji: cubemobilegame@gmail.com.
