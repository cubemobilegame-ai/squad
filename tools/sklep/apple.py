#!/usr/bin/env python3
"""Generuje teksty do App Store Connect (8 języków) z opisów Google Play: sklep/apple/<lang>/opis.txt + opisy-app-store.csv."""
import os, csv, shutil
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PLAY, OUT = os.path.join(R, "sklep", "play"), os.path.join(R, "sklep", "apple")
SHOTS = "/tmp/claude-0/-home-claude/f3e57477-4977-52fe-a973-2e2b820d1504/scratchpad/store/out-ios"
LOC = {"pl": "Polish", "en": "English (U.S.)", "es": "Spanish (Spain)", "de": "German", "fr": "French", "it": "Italian", "cs": "Czech", "uk": "Ukrainian"}
SUB = {"pl": "Wypady z ekipą w 15 sekund", "en": "Plan hangouts in 15 seconds", "es": "Quedadas en 15 segundos", "de": "Treffen in 15 Sekunden",
       "fr": "Sorties en 15 secondes", "it": "Uscite in 15 secondi", "cs": "Akce za 15 vteřin", "uk": "Зустрічі за 15 секунд"}
KW = {"pl": "znajomi,spotkania,impreza,czat grupowy,zaproszenie,planer,ekipa,domówka,kalendarz,ankieta,wyjście,paczka,link",
      "en": "friends,meetup,party,group chat,invite,planner,crew,event,calendar,poll,nightout,social,link",
      "es": "amigos,reunión,fiesta,chat grupal,invitación,planificador,evento,calendario,encuesta,salir,grupo,enlace",
      "de": "Freunde,Verabredung,Party,Gruppenchat,Einladung,Planer,Crew,Event,Kalender,Umfrage,ausgehen,Clique,Link",
      "fr": "amis,rencontre,soirée,chat de groupe,invitation,planificateur,bande,événement,calendrier,sondage,sortir",
      "it": "amici,incontro,festa,chat di gruppo,invito,organizzatore,crew,evento,calendario,sondaggio,serata,link",
      "cs": "kamarádi,setkání,párty,skupinový chat,pozvánka,plánovač,parta,událost,kalendář,anketa,výlet,odkaz",
      "uk": "друзі,зустріч,вечірка,груповий чат,запрошення,планувальник,компанія,подія,календар,опитування,посилання"}
PROMO = {"pl": "Rzuć drop, wyślij link i zobacz, kto wbija. Znajomi odpowiadają IN, LATE albo OUT jednym kliknięciem. Czat grupowy, przypomnienia i album z wypadu.",
         "en": "Drop a plan, share the link and see who's in. Friends reply IN, LATE or OUT with one tap. Group chat, reminders and a photo album for every hangout.",
         "es": "Lanza un drop, comparte el enlace y mira quién va. Tus amigos responden IN, LATE u OUT con un toque. Chat de grupo, recordatorios y álbum de fotos.",
         "de": "Drop erstellen, Link teilen und sehen, wer dabei ist. Freunde antworten IN, LATE oder OUT mit einem Tipp. Gruppenchat, Erinnerungen und Fotoalbum.",
         "fr": "Lance un drop, partage le lien et vois qui vient. Tes potes répondent IN, LATE ou OUT d’un clic. Chat de groupe, rappels et album photo.",
         "it": "Lancia un drop, condividi il link e scopri chi c’è. Gli amici rispondono IN, LATE o OUT con un tocco. Chat di gruppo, promemoria e album foto.",
         "cs": "Hoď drop, pošli odkaz a uvidíš, kdo jde. Kamarádi odpoví IN, LATE nebo OUT jedním ťuknutím. Skupinový chat, upozornění a fotoalbum.",
         "uk": "Створи дроп, поділися посиланням і побач, хто йде. Друзі відповідають IN, LATE або OUT одним дотиком. Груповий чат, нагадування й фотоальбом."}
NEW = {"pl": "Pierwsza wersja Squad na iPhone’a. Wypady z ekipą, czat grupowy, publiczne dropy w okolicy i album z wypadu.",
       "en": "The first Squad release for iPhone. Hangouts with your crew, group chat, public drops nearby and a hangout photo album.",
       "es": "La primera versión de Squad para iPhone. Planes con tu gente, chat de grupo, drops públicos cercanos y álbum de fotos.",
       "de": "Die erste Squad-Version für iPhone. Treffen mit deiner Crew, Gruppenchat, öffentliche Drops in der Nähe und Fotoalbum.",
       "fr": "La première version de Squad pour iPhone. Sorties entre potes, chat de groupe, drops publics à proximité et album photo.",
       "it": "La prima versione di Squad per iPhone. Uscite con la crew, chat di gruppo, drop pubblici vicini e album foto.",
       "cs": "První verze Squad pro iPhone. Akce s partou, skupinový chat, veřejné dropy v okolí a fotoalbum.",
       "uk": "Перша версія Squad для iPhone. Зустрічі з компанією, груповий чат, публічні дропи поруч і фотоальбом."}
rows = []
for l, name in LOC.items():
    t = open(os.path.join(PLAY, l, "opis.txt"), encoding="utf-8").read()
    title = t.split("\n")[1].strip()
    full = t.split("PEŁNY OPIS:\n", 1)[1].strip()
    sub, kw, pr, nw = SUB[l], KW[l], PROMO[l], NEW[l]
    while len(kw) > 100: kw = kw.rsplit(',', 1)[0]
    assert len(title) <= 30 and len(sub) <= 30 and len(kw) <= 100 and len(pr) <= 170 and len(full) <= 4000 and len(nw) <= 4000, (l, len(title), len(sub), len(kw), len(pr))
    d = os.path.join(OUT, l); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "opis.txt"), "w", encoding="utf-8").write(
        f"JĘZYK W APP STORE CONNECT: {name}\n\nNAZWA (≤30):\n{title}\n\nPODTYTUŁ (≤30):\n{sub}\n\nTEKST PROMOCYJNY (≤170):\n{pr}\n\nSŁOWA KLUCZOWE (≤100, po przecinku):\n{kw}\n\nCO NOWEGO:\n{nw}\n\nOPIS (≤4000):\n{full}\n")
    for i in range(1, 7):
        s = os.path.join(SHOTS, l, f"zrzut-{i}.png")
        if os.path.exists(s): shutil.copy(s, os.path.join(d, f"zrzut-{i}.png"))
    rows.append([name, title, sub, pr, kw, nw, full])
with open(os.path.join(OUT, "opisy-app-store.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f); w.writerow(["Język", "Nazwa", "Podtytuł", "Tekst promocyjny", "Słowa kluczowe", "Co nowego", "Opis"]); w.writerows(rows)
print("ok")
