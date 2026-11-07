import csv, os
OUT = '/tmp/claude-0/-home-claude/f3e57477-4977-52fe-a973-2e2b820d1504/scratchpad/store/'
D = {}
D['pl-PL'] = ("Squad – wspólne wypady", "Wypad z ekipą w 15 sekund. Jeden link i odpowiedź IN / LATE / OUT.", """Masz ochotę na pizzę, kino albo domówkę, ale zbieranie ekipy na pięciu czatach to dramat? Squad załatwia to w 15 sekund.

⚡ JAK TO DZIAŁA
• Tworzysz drop: co, gdzie i kiedy
• Wysyłasz link na Messengera, Insta, WhatsAppa albo SMS-em
• Znajomi klikają IN, LATE albo OUT – bez instalowania aplikacji
• Od razu widzisz, kto wbija, kto się spóźni i kto odpada

🎯 KAŻDY RODZAJ WYPADU
Pizza, sport, domówka, klub, knajpa, kawa, kino, gry, galeria, spacer, wyjazd, okazje – wybierz kategorię i gotowe. Drop może też powtarzać się co tydzień.

👀 KTO JEST W DROPIE
Czytelna lista: kto jest IN, kto się spóźni i o ile minut, kto odpadł.

💬 CZAT TYLKO DLA EKIPY
Każdy drop ma swój czat grupowy. Zero prywatnych wiadomości. Ankiety „gdzie idziemy?”, reakcje, informacja kto przeczytał i kto pisze.

📍 PUBLICZNE DROPY W OKOLICY
Dołącz do otwartych wypadów do 20 km od ciebie albo stwórz własny z limitem miejsc. Tylko dla osób 16+.

👥 STAŁE EKIPY
Grupy z czatem, który nie znika – klasa, drużyna, paczka z osiedla. Drop wyślesz całej grupie jednym kliknięciem albo pokażesz kod QR.

📸 ALBUM I KOLAŻ
Zdjęcia z wypadu w jednym miejscu i gotowy kolaż na story.

🔔 POWIADOMIENIA I KALENDARZ
Dowiesz się, gdy ktoś odpowie albo napisze. Przed startem przypomnimy całej ekipie. Drop dodasz do kalendarza jednym kliknięciem.

🔒 BEZPIECZEŃSTWO
Bez prywatnych wiadomości, zgłaszanie i blokowanie jednym kliknięciem, filtr wulgaryzmów, ksywkę zmienisz raz na 2 tygodnie.

🌍 Po polsku, angielsku, hiszpańsku, niemiecku, francusku, włosku, czesku i ukraińsku.

Zbierz ekipę. Wbijajcie razem. Squad ✦""")
D['en-US'] = ("Squad – hangouts together", "Get your crew together in 15 seconds. One link – IN / LATE / OUT.", """Want pizza, a movie or a house party, but organizing your crew across five chats is a nightmare? Squad sorts it out in 15 seconds.

⚡ HOW IT WORKS
• Create a drop: what, where and when
• Send the link via Messenger, Instagram, WhatsApp or text
• Friends tap IN, LATE or OUT – no app install needed
• See right away who's coming, who'll be late and who's out

🎯 ANY KIND OF PLAN
Pizza, sport, house party, club, food, coffee, movies, gaming, shopping, walks, trips, special occasions – pick a category and go. Drops can repeat every week too.

👀 WHO'S IN
A clear list: who's IN, who's running late and by how much, who's out.

💬 CHAT JUST FOR THE CREW
Every drop has its own group chat. No private DMs. "Where are we going?" polls, reactions, read receipts and typing indicators.

📍 PUBLIC DROPS NEARBY
Join open hangouts within 20 km or create your own with a seat limit. 16+ only.

👥 YOUR REGULAR CREWS
Groups with a chat that never disappears – your class, team or neighborhood crew. Send a drop to the whole group in one tap or show a QR code.

📸 ALBUM & COLLAGE
All the photos from the hangout in one place, plus a ready-made collage for your story.

🔔 NOTIFICATIONS & CALENDAR
Know when someone answers or writes. We remind the whole crew before the start. Add a drop to your calendar in one tap.

🔒 SAFETY
No private messages, one-tap reporting and blocking, a profanity filter, and nicknames can only change once every 2 weeks.

🌍 In English, Polish, Spanish, German, French, Italian, Czech and Ukrainian.

Get the crew together. Show up together. Squad ✦""")
D['es-ES'] = ("Squad – planes en grupo", "Reúne a tu gente en 15 segundos. Un enlace: IN / LATE / OUT.", """¿Te apetece pizza, cine o una fiesta en casa, pero organizar a tu gente en cinco chats es un caos? Squad lo resuelve en 15 segundos.

⚡ CÓMO FUNCIONA
• Creas un drop: qué, dónde y cuándo
• Envías el enlace por Messenger, Instagram, WhatsApp o SMS
• Tus amigos pulsan IN, LATE u OUT, sin instalar la app
• Ves al momento quién va, quién llega tarde y quién no viene

🎯 CUALQUIER PLAN
Pizza, deporte, fiesta en casa, discoteca, restaurante, café, cine, juegos, compras, paseos, viajes, ocasiones especiales: elige la categoría y listo. Los drops también pueden repetirse cada semana.

👀 QUIÉN VA
Una lista clara: quién está IN, quién llega tarde y cuánto, quién no viene.

💬 CHAT SOLO PARA TU GENTE
Cada drop tiene su chat de grupo. Sin mensajes privados. Encuestas «¿adónde vamos?», reacciones, quién ha leído y quién está escribiendo.

📍 DROPS PÚBLICOS CERCA
Únete a planes abiertos a menos de 20 km o crea el tuyo con plazas limitadas. Solo mayores de 16.

👥 TUS GRUPOS DE SIEMPRE
Grupos con un chat que no desaparece: la clase, el equipo, los del barrio. Envía un drop a todo el grupo con un toque o muestra un código QR.

📸 ÁLBUM Y COLLAGE
Todas las fotos del plan en un sitio y un collage listo para tu historia.

🔔 NOTIFICACIONES Y CALENDARIO
Te enteras cuando alguien responde o escribe. Avisamos a todos antes de empezar. Añade el drop a tu calendario con un toque.

🔒 SEGURIDAD
Sin mensajes privados, denuncias y bloqueos con un toque, filtro de palabrotas y el apodo solo se cambia cada 2 semanas.

🌍 En español, inglés, polaco, alemán, francés, italiano, checo y ucraniano.

Reúne a tu gente. Id juntos. Squad ✦""")
D['de-DE'] = ("Squad – gemeinsam unterwegs", "Deine Crew in 15 Sekunden zusammen. Ein Link: IN / LATE / OUT.", """Lust auf Pizza, Kino oder eine Hausparty – aber die Crew in fünf Chats zu organisieren ist Stress? Squad erledigt das in 15 Sekunden.

⚡ SO FUNKTIONIERT'S
• Du erstellst einen Drop: was, wo und wann
• Du schickst den Link per Messenger, Instagram, WhatsApp oder SMS
• Freunde tippen IN, LATE oder OUT – ganz ohne App-Installation
• Du siehst sofort, wer kommt, wer später kommt und wer absagt

🎯 FÜR JEDEN PLAN
Pizza, Sport, Hausparty, Club, Essen gehen, Kaffee, Kino, Gaming, Shopping, Spaziergang, Ausflug, besondere Anlässe – Kategorie wählen, fertig. Drops können sich auch jede Woche wiederholen.

👀 WER IST DABEI
Eine klare Liste: wer IN ist, wer sich verspätet und um wie viel, wer abgesagt hat.

💬 CHAT NUR FÜR DIE CREW
Jeder Drop hat seinen eigenen Gruppenchat. Keine privaten Nachrichten. Umfragen „Wohin gehen wir?“, Reaktionen, Lesebestätigungen und Tipp-Anzeige.

📍 ÖFFENTLICHE DROPS IN DER NÄHE
Mach bei offenen Treffen im Umkreis von 20 km mit oder erstelle eigene mit begrenzten Plätzen. Erst ab 16.

👥 FESTE CREWS
Gruppen mit einem Chat, der bleibt – Klasse, Team, Leute aus der Nachbarschaft. Schick einen Drop mit einem Tipp an die ganze Gruppe oder zeig einen QR-Code.

📸 ALBUM & COLLAGE
Alle Fotos vom Treffen an einem Ort und eine fertige Collage für deine Story.

🔔 BENACHRICHTIGUNGEN & KALENDER
Du erfährst, wenn jemand antwortet oder schreibt. Vor dem Start erinnern wir die ganze Crew. Drop mit einem Tipp in den Kalender.

🔒 SICHERHEIT
Keine privaten Nachrichten, Melden und Blockieren mit einem Tipp, Schimpfwortfilter, und der Nickname lässt sich nur alle 2 Wochen ändern.

🌍 Auf Deutsch, Englisch, Polnisch, Spanisch, Französisch, Italienisch, Tschechisch und Ukrainisch.

Crew zusammentrommeln. Gemeinsam hingehen. Squad ✦""")
D['fr-FR'] = ("Squad – sorties entre potes", "Réunis ta bande en 15 secondes. Un lien : IN / LATE / OUT.", """Envie d’une pizza, d’un ciné ou d’une soirée, mais organiser ta bande sur cinq conversations, c’est l’enfer ? Squad règle ça en 15 secondes.

⚡ COMMENT ÇA MARCHE
• Tu crées un drop : quoi, où et quand
• Tu envoies le lien par Messenger, Instagram, WhatsApp ou SMS
• Tes potes appuient sur IN, LATE ou OUT – sans installer l’appli
• Tu vois tout de suite qui vient, qui sera en retard et qui ne vient pas

🎯 TOUS LES PLANS
Pizza, sport, soirée, boîte, resto, café, ciné, jeux vidéo, shopping, balade, virée, occasions spéciales – choisis la catégorie et c’est parti. Un drop peut aussi se répéter chaque semaine.

👀 QUI VIENT
Une liste claire : qui est IN, qui sera en retard et de combien, qui ne vient pas.

💬 UN CHAT JUSTE POUR LA BANDE
Chaque drop a son chat de groupe. Zéro message privé. Sondages « on va où ? », réactions, confirmations de lecture et indicateur de saisie.

📍 DROPS PUBLICS PRÈS DE TOI
Rejoins des sorties ouvertes à moins de 20 km ou crée la tienne avec un nombre de places limité. Réservé aux 16 ans et plus.

👥 TES BANDES HABITUELLES
Des groupes avec un chat qui ne disparaît pas – ta classe, ton équipe, les potes du quartier. Envoie un drop à tout le groupe en un clic ou montre un QR code.

📸 ALBUM ET COLLAGE
Toutes les photos de la sortie au même endroit et un collage prêt pour ta story.

🔔 NOTIFICATIONS ET AGENDA
Tu sais quand quelqu’un répond ou écrit. On rappelle toute la bande avant le début. Ajoute le drop à ton agenda en un clic.

🔒 SÉCURITÉ
Pas de messages privés, signalement et blocage en un clic, filtre anti-grossièretés, et le pseudo ne change qu’une fois toutes les 2 semaines.

🌍 En français, anglais, polonais, espagnol, allemand, italien, tchèque et ukrainien.

Réunis ta bande. Venez ensemble. Squad ✦""")
D['it-IT'] = ("Squad – uscite insieme", "Raduna la tua crew in 15 secondi. Un link: IN / LATE / OUT.", """Voglia di pizza, cinema o una festa in casa, ma organizzare la crew su cinque chat è un incubo? Squad lo risolve in 15 secondi.

⚡ COME FUNZIONA
• Crei un drop: cosa, dove e quando
• Mandi il link su Messenger, Instagram, WhatsApp o SMS
• Gli amici toccano IN, LATE o OUT – senza installare l’app
• Vedi subito chi viene, chi arriva tardi e chi non c’è

🎯 OGNI TIPO DI USCITA
Pizza, sport, festa in casa, disco, ristorante, caffè, cinema, gaming, shopping, passeggiata, gita, occasioni speciali – scegli la categoria e via. I drop possono anche ripetersi ogni settimana.

👀 CHI C’È
Una lista chiara: chi è IN, chi è in ritardo e di quanto, chi non viene.

💬 CHAT SOLO PER LA CREW
Ogni drop ha la sua chat di gruppo. Zero messaggi privati. Sondaggi «dove andiamo?», reazioni, conferme di lettura e indicatore di scrittura.

📍 DROP PUBBLICI VICINO A TE
Unisciti a uscite aperte entro 20 km o crea la tua con posti limitati. Solo dai 16 anni in su.

👥 LE TUE CREW DI SEMPRE
Gruppi con una chat che non sparisce – la classe, la squadra, gli amici del quartiere. Manda un drop a tutto il gruppo con un tocco o mostra un codice QR.

📸 ALBUM E COLLAGE
Tutte le foto dell’uscita in un posto e un collage pronto per la tua storia.

🔔 NOTIFICHE E CALENDARIO
Sai quando qualcuno risponde o scrive. Prima dell’inizio ricordiamo l’uscita a tutta la crew. Aggiungi il drop al calendario con un tocco.

🔒 SICUREZZA
Niente messaggi privati, segnalazioni e blocchi con un tocco, filtro per le parolacce e il nickname si cambia solo ogni 2 settimane.

🌍 In italiano, inglese, polacco, spagnolo, tedesco, francese, ceco e ucraino.

Raduna la crew. Andateci insieme. Squad ✦""")
D['cs-CZ'] = ("Squad – společné akce", "Svolej partu za 15 vteřin. Jeden odkaz: IN / LATE / OUT.", """Máš chuť na pizzu, kino nebo domácí párty, ale svolávat partu v pěti chatech je peklo? Squad to vyřeší za 15 vteřin.

⚡ JAK TO FUNGUJE
• Vytvoříš drop: co, kde a kdy
• Pošleš odkaz přes Messenger, Instagram, WhatsApp nebo SMS
• Kamarádi ťuknou na IN, LATE nebo OUT – bez instalace aplikace
• Hned vidíš, kdo jde, kdo přijde později a kdo nejde

🎯 JAKÁKOLI AKCE
Pizza, sport, domácí párty, klub, restaurace, kafe, kino, hry, nákupy, procházka, výlet, zvláštní příležitosti – vyber kategorii a hotovo. Drop se může i opakovat každý týden.

👀 KDO JDE
Přehledný seznam: kdo je IN, kdo se zpozdí a o kolik, kdo nejde.

💬 CHAT JEN PRO PARTU
Každý drop má svůj skupinový chat. Žádné soukromé zprávy. Ankety „kam jdeme?“, reakce, kdo četl a kdo právě píše.

📍 VEŘEJNÉ DROPY V OKOLÍ
Přidej se k otevřeným akcím do 20 km nebo vytvoř vlastní s omezeným počtem míst. Jen pro lidi od 16 let.

👥 STÁLÉ PARTY
Skupiny s chatem, který nezmizí – třída, tým, parta z okolí. Drop pošleš celé skupině jedním ťuknutím nebo ukážeš QR kód.

📸 ALBUM A KOLÁŽ
Všechny fotky z akce na jednom místě a hotová koláž na story.

🔔 UPOZORNĚNÍ A KALENDÁŘ
Dozvíš se, když někdo odpoví nebo napíše. Před začátkem připomeneme akci celé partě. Drop přidáš do kalendáře jedním ťuknutím.

🔒 BEZPEČNOST
Žádné soukromé zprávy, nahlášení a blokování jedním ťuknutím, filtr sprostých slov a přezdívku lze změnit jen jednou za 2 týdny.

🌍 Česky, anglicky, polsky, španělsky, německy, francouzsky, italsky a ukrajinsky.

Svolej partu. Jděte spolu. Squad ✦""")
D['uk'] = ("Squad – спільні зустрічі", "Збери компанію за 15 секунд. Одне посилання: IN / LATE / OUT.", """Хочеш піцу, кіно чи вечірку вдома, але збирати компанію в п’яти чатах – це жах? Squad вирішить це за 15 секунд.

⚡ ЯК ЦЕ ПРАЦЮЄ
• Створюєш дроп: що, де і коли
• Надсилаєш посилання в Messenger, Instagram, WhatsApp або SMS
• Друзі натискають IN, LATE або OUT – без встановлення застосунку
• Одразу бачиш, хто йде, хто запізниться і хто не прийде

🎯 БУДЬ-ЯКИЙ ПЛАН
Піца, спорт, вечірка вдома, клуб, ресторан, кава, кіно, ігри, шопінг, прогулянка, поїздка, особливі події – обери категорію і готово. Дроп може також повторюватися щотижня.

👀 ХТО ЙДЕ
Зрозумілий список: хто IN, хто запізниться і на скільки, хто не прийде.

💬 ЧАТ ТІЛЬКИ ДЛЯ КОМПАНІЇ
У кожного дропу свій груповий чат. Жодних приватних повідомлень. Опитування «куди йдемо?», реакції, хто прочитав і хто зараз пише.

📍 ПУБЛІЧНІ ДРОПИ ПОРУЧ
Долучайся до відкритих зустрічей у радіусі 20 км або створи свою з обмеженою кількістю місць. Лише для осіб від 16 років.

👥 ПОСТІЙНІ КОМПАНІЇ
Групи з чатом, який не зникає, – клас, команда, друзі з району. Надішли дроп усій групі одним дотиком або покажи QR-код.

📸 АЛЬБОМ І КОЛАЖ
Усі фото із зустрічі в одному місці та готовий колаж для сторіс.

🔔 СПОВІЩЕННЯ І КАЛЕНДАР
Дізнаєшся, коли хтось відповість або напише. Перед початком нагадаємо всій компанії. Додай дроп у календар одним дотиком.

🔒 БЕЗПЕКА
Без приватних повідомлень, скарги й блокування одним дотиком, фільтр лайки, а нікнейм можна змінювати лише раз на 2 тижні.

🌍 Українською, англійською, польською, іспанською, німецькою, французькою, італійською та чеською.

Збери компанію. Ідіть разом. Squad ✦""")
DIR = {'pl-PL': 'pl', 'en-US': 'en', 'es-ES': 'es', 'de-DE': 'de', 'fr-FR': 'fr', 'it-IT': 'it', 'cs-CZ': 'cs', 'uk': 'uk'}
with open(OUT + 'opisy-sklep-play.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, quoting=csv.QUOTE_ALL)
    w.writerow(["Język (kod Play)", "Tytuł aplikacji (max 30)", "Krótki opis (max 80)", "Pełny opis (max 4000)"])
    for k, (t, s, d) in D.items():
        assert len(t) <= 30 and len(s) <= 80 and len(d) <= 4000, (k, len(t), len(s), len(d))
        print(k, len(t), len(s), len(d))
        w.writerow([k, t, s, d])
        os.makedirs(OUT + 'out/' + DIR[k], exist_ok=True)
        open(OUT + f'out/{DIR[k]}/opis.txt', 'w').write(f"TYTUŁ:\n{t}\n\nKRÓTKI OPIS:\n{s}\n\nPEŁNY OPIS:\n{d}\n")
