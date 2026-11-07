import base64, os, json
SP = '/tmp/claude-0/-home-claude/f3e57477-4977-52fe-a973-2e2b820d1504/scratchpad/store/'
P = '/home/claude/squad/public/'
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
og = open(SP + '../og2/drop.html').read()
css = og[og.index('<style>') + 7:og.index('</style>')]
onest = 'data:font/woff;base64,' + b64(P + 'fonts/onest-cyr.woff')
css = css.replace('font-family:U;color', 'font-family:U,OC;color') + f'@font-face{{font-family:OC;src:url({onest})}}h1,p,.logo{{font-family:U,OC}}'

T = {
 'pl': [("Wypad<br>w <em>15 sekund</em>", "Rzuć drop, a ekipa odpowie IN, LATE albo OUT."),
        ("Odpowiedź<br><em>jednym kliknięciem</em>", "Znajomi dołączają z linku – bez instalowania."),
        ("Czat tylko<br>dla <em>ekipy</em>", "Każdy drop ma swój czat. Zero prywatnych wiadomości."),
        ("Co dziś<br><em>robicie?</em>", "Pizza, klub, sport, domówka, wyjazd i więcej."),
        ("Dropy<br><em>w okolicy</em>", "Dołącz do publicznych wypadów do 20 km od ciebie."),
        ("Wszystkie ekipy<br>w <em>jednym miejscu</em>", "Grupy i czaty dropów z licznikiem nowych wiadomości.")],
 'en': [("Plans in<br><em>15 seconds</em>", "Drop a plan – your crew answers IN, LATE or OUT."),
        ("Answer with<br><em>one tap</em>", "Friends join from a link – no install needed."),
        ("Chat just<br>for the <em>crew</em>", "Every drop has its own group chat. No private DMs."),
        ("What are you<br><em>up to?</em>", "Pizza, club, sport, house party, trips and more."),
        ("Drops<br><em>near you</em>", "Join public hangouts within 20 km."),
        ("All your crews<br>in <em>one place</em>", "Groups and drop chats with unread counters.")],
 'es': [("Plan en<br><em>15 segundos</em>", "Lanza un drop y tu gente responde IN, LATE u OUT."),
        ("Responde con<br><em>un toque</em>", "Tus amigos se unen desde un enlace, sin instalar nada."),
        ("Chat solo<br>para tu <em>gente</em>", "Cada drop tiene su chat de grupo. Sin mensajes privados."),
        ("¿Qué hacéis<br><em>hoy?</em>", "Pizza, discoteca, deporte, fiesta en casa, viajes y más."),
        ("Drops<br><em>cerca de ti</em>", "Únete a quedadas públicas a menos de 20 km."),
        ("Todos tus grupos<br>en <em>un sitio</em>", "Grupos y chats de drops con contador de mensajes nuevos.")],
 'de': [("Treffen in<br><em>15 Sekunden</em>", "Drop erstellen – deine Crew antwortet IN, LATE oder OUT."),
        ("Antwort mit<br><em>einem Tipp</em>", "Freunde machen per Link mit – ohne Installation."),
        ("Chat nur<br>für die <em>Crew</em>", "Jeder Drop hat seinen Gruppenchat. Keine privaten Nachrichten."),
        ("Was macht ihr<br><em>heute?</em>", "Pizza, Club, Sport, Hausparty, Ausflüge und mehr."),
        ("Drops<br><em>in deiner Nähe</em>", "Mach bei öffentlichen Treffen im Umkreis von 20 km mit."),
        ("Alle Crews<br>an <em>einem Ort</em>", "Gruppen und Drop-Chats mit Zähler für neue Nachrichten.")],
 'fr': [("Une sortie en<br><em>15 secondes</em>", "Lance un drop, ta bande répond IN, LATE ou OUT."),
        ("Réponds en<br><em>un clic</em>", "Tes potes rejoignent via un lien, sans rien installer."),
        ("Un chat juste<br>pour la <em>bande</em>", "Chaque drop a son chat de groupe. Zéro message privé."),
        ("Vous faites<br><em>quoi ce soir ?</em>", "Pizza, boîte, sport, soirée, virées et plus."),
        ("Des drops<br><em>près de toi</em>", "Rejoins des sorties publiques à moins de 20 km."),
        ("Toutes tes bandes<br>au <em>même endroit</em>", "Groupes et chats de drops avec compteur de nouveaux messages.")],
 'it': [("Un’uscita in<br><em>15 secondi</em>", "Lancia un drop: la tua crew risponde IN, LATE o OUT."),
        ("Rispondi con<br><em>un tocco</em>", "Gli amici entrano da un link, senza installare nulla."),
        ("Chat solo<br>per la <em>crew</em>", "Ogni drop ha la sua chat di gruppo. Zero messaggi privati."),
        ("Cosa fate<br><em>oggi?</em>", "Pizza, disco, sport, feste in casa, gite e altro."),
        ("Drop<br><em>vicino a te</em>", "Unisciti a uscite pubbliche entro 20 km."),
        ("Tutte le crew<br>in <em>un posto</em>", "Gruppi e chat dei drop con contatore dei nuovi messaggi.")],
 'cs': [("Akce za<br><em>15 vteřin</em>", "Hoď drop a parta odpoví IN, LATE nebo OUT."),
        ("Odpověď<br><em>jedním ťuknutím</em>", "Kamarádi se přidají z odkazu – bez instalace."),
        ("Chat jen<br>pro <em>partu</em>", "Každý drop má svůj skupinový chat. Žádné soukromé zprávy."),
        ("Co dnes<br><em>podniknete?</em>", "Pizza, klub, sport, domácí párty, výlety a další."),
        ("Dropy<br><em>ve tvém okolí</em>", "Přidej se k veřejným akcím do 20 km."),
        ("Všechny party<br>na <em>jednom místě</em>", "Skupiny a chaty dropů s počítadlem nových zpráv.")],
 'uk': [("Зустріч за<br><em>15 секунд</em>", "Створи дроп – компанія відповість IN, LATE або OUT."),
        ("Відповідь<br><em>одним дотиком</em>", "Друзі долучаються за посиланням – без встановлення."),
        ("Чат тільки<br>для <em>компанії</em>", "У кожного дропу свій груповий чат. Жодних приватних повідомлень."),
        ("Що робите<br><em>сьогодні?</em>", "Піца, клуб, спорт, вечірка вдома, поїздки та інше."),
        ("Дропи<br><em>поруч із тобою</em>", "Долучайся до публічних зустрічей у радіусі 20 км."),
        ("Усі компанії<br>в <em>одному місці</em>", "Групи й чати дропів з лічильником нових повідомлень.")],
}
F = {
 'pl': ("Wypady<br>z <em>ekipą</em>", "Rzuć drop. Ekipa odpowie<br>w kilka sekund.", "Pizza po treningu", "DZIŚ · 19:30", "4 osoby wbijają", "i ty?"),
 'en': ("Hang out<br>with your <em>crew</em>", "Drop a plan. Your crew<br>answers in seconds.", "Pizza after practice", "TODAY · 19:30", "4 people are in", "you?"),
 'es': ("Planes<br>con tu <em>gente</em>", "Lanza un drop. Tu gente<br>responde en segundos.", "Pizza tras el entreno", "HOY · 19:30", "4 personas van", "¿y tú?"),
 'de': ("Treffen<br>mit der <em>Crew</em>", "Drop erstellen. Deine Crew<br>antwortet in Sekunden.", "Pizza nach dem Training", "HEUTE · 19:30", "4 sind dabei", "und du?"),
 'fr': ("Sorties<br>entre <em>potes</em>", "Lance un drop. Ta bande<br>répond en quelques secondes.", "Pizza après l’entraînement", "AUJ. · 19:30", "4 personnes viennent", "et toi ?"),
 'it': ("Uscite<br>con la <em>crew</em>", "Lancia un drop. La tua crew<br>risponde in pochi secondi.", "Pizza dopo l’allenamento", "OGGI · 19:30", "4 persone ci sono", "e tu?"),
 'cs': ("Akce<br>s <em>partou</em>", "Hoď drop. Parta odpoví<br>během pár vteřin.", "Pizza po tréninku", "DNES · 19:30", "4 lidi jdou", "a ty?"),
 'uk': ("Зустрічі<br>з <em>компанією</em>", "Створи дроп. Компанія<br>відповість за секунди.", "Піца після тренування", "СЬОГОДНІ · 19:30", "4 людини йдуть", "а ти?"),
}
SHOT_CSS = '''body{width:1080px;height:1920px}
.top{position:absolute;left:0;right:0;top:96px;text-align:center}
.top .logo{justify-content:center;font-size:44px}
.top h1{margin-top:34px;font-size:96px}.top p{margin:22px auto 0;font-size:34px;max-width:880px}
.ph{position:absolute;left:50%;top:600px;width:880px;transform:translateX(-50%);border-radius:110px;padding:20px;background:#16161c;border:2px solid rgba(255,255,255,.12);box-shadow:0 60px 120px -40px rgba(0,0,0,.8),0 0 0 10px rgba(255,255,255,.025)}
.ph img{display:block;width:100%;border-radius:92px}
.ph::before{content:"";position:absolute;left:50%;top:44px;width:170px;height:46px;margin-left:-85px;border-radius:30px;background:#000;z-index:2}'''
os.makedirs(SP + 'html', exist_ok=True)
for l, rows in T.items():
    for i, (h, sub) in enumerate(rows, 1):
        src = SP + f'raw/{l}-{i}.png'
        if i == 2:
            from PIL import Image
            im = Image.open(src); top = 95 * 3; c = Image.new('RGB', im.size, (11, 11, 18)); c.paste(im.crop((0, top, im.width, im.height)), (0, 40 * 3)); c.save(SP + f'raw/{l}-2c.png'); src = SP + f'raw/{l}-2c.png'
        img = 'data:image/png;base64,' + b64(src)
        html = f'<!doctype html><html><head><meta charset="utf-8"><style>{css}{SHOT_CSS}</style></head><body><div class="bg"></div><div class="top"><div class="logo">Squad<i>✦</i></div><h1>{h}</h1><p>{sub}</p></div><div class="ph"><img src="{img}"></div></body></html>'
        open(SP + f'html/{l}-zrzut-{i}.html', 'w').write(html)
    fh, fs_, ft, fp, fw, fy = F[l]
    fg = open(SP + 'feature.html').read()
    fg = fg.replace('Wypady<br>z <em>ekipą</em>', fh).replace('Rzuć drop. Ekipa odpowie<br>w kilka sekund.', fs_)
    fg = fg.replace('Pizza po treningu', ft).replace('DZIŚ · 19:30', fp).replace('4 osoby wbijają', fw).replace('<small>i ty?</small>', f'<small>{fy}</small>')
    fg = fg.replace('font-family:U;color', 'font-family:U,OC;color').replace('</style>', f'@font-face{{font-family:OC;src:url({onest})}}h1,p,.logo,.t,.who{{font-family:U,OC}}</style>', 1)
    open(SP + f'html/{l}-grafika-1024x500.html', 'w').write(fg)
print('ok')
