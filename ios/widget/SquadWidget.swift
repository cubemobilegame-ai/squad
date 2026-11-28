import WidgetKit
import SwiftUI
import AppIntents

// Widżet Squad: najbliższy drop z odliczaniem. Dane zapisuje aplikacja (wtyczka SquadWidget) w App Group.
private let appGroup = "group.com.cubemobilegames.squad"
private let siteURL = "https://squad-64cd5.web.app"

struct WDrop: Codable, Identifiable {
    let id: String
    let t: String      // tytuł
    let ts: Double     // start (ms)
    let pl: String?    // miejsce
    let e: String      // emoji kategorii
    let c1: String     // kolory motywu
    let c2: String
    let r: String?     // rola: host / in / late
    let n: Int?        // ile osób „in”
    var start: Date { Date(timeIntervalSince1970: ts / 1000) }
}

struct WEntry: TimelineEntry {
    let date: Date
    let drops: [WDrop]
}

private func loadDrops(now: Date) -> [WDrop] {
    guard let data = UserDefaults(suiteName: appGroup)?.data(forKey: "drops"),
          let all = try? JSONDecoder().decode([WDrop].self, from: data) else { return [] }
    return all.filter { $0.start.addingTimeInterval(2 * 3600) > now }.sorted { $0.ts < $1.ts }
}

/// Język z listy preferowanych języków systemu (Locale.current w rozszerzeniu zależy od lokalizacji zawartych w pakiecie i potrafi zwrócić angielski).
private let lang: String = {
    let p = (Locale.preferredLanguages.first ?? "en").lowercased()
    let c = String(p.prefix(2))
    return ["pl", "en", "es", "de", "fr", "it", "cs", "uk"].contains(c) ? c : "en"
}()
private let loc = Locale(identifier: Locale.preferredLanguages.first ?? "en")
private let STR: [String: [String: String]] = [
    "pre": ["pl": "za", "en": "in", "es": "en", "de": "in", "fr": "dans", "it": "tra", "cs": "za", "uk": "через"],
    "live": ["pl": "TERAZ", "en": "NOW", "es": "AHORA", "de": "JETZT", "fr": "ICI", "it": "ORA", "cs": "TEĎ", "uk": "ЗАРАЗ"],
    "todayUp": ["pl": "DZISIAJ", "en": "TODAY", "es": "HOY", "de": "HEUTE", "fr": "AUJ.", "it": "OGGI", "cs": "DNES", "uk": "СЬОГОДНІ"],
    "around": ["pl": "w okolicy", "en": "nearby", "es": "cerca", "de": "in der Nähe", "fr": "à proximité", "it": "nelle vicinanze", "cs": "v okolí", "uk": "поблизу"],
    "going": ["pl": "w drodze", "en": "going", "es": "van", "de": "dabei", "fr": "partants", "it": "in arrivo", "cs": "jde", "uk": "йдуть"],
    "newDrop": ["pl": "Nowy drop", "en": "New drop", "es": "Nuevo drop", "de": "Neuer Drop", "fr": "Nouveau drop", "it": "Nuovo drop", "cs": "Nový drop", "uk": "Новий дроп"],
    "next": ["en": "Next drop", "pl": "Najbliższy drop", "es": "Próximo drop", "de": "Nächster Drop", "fr": "Prochain drop", "it": "Prossimo drop", "cs": "Nejbližší drop", "uk": "Найближчий дроп"],
    "now": ["pl": "TRWA TERAZ", "en": "HAPPENING NOW", "es": "EN CURSO", "de": "LÄUFT JETZT", "fr": "EN COURS", "it": "IN CORSO", "cs": "PROBÍHÁ", "uk": "ТРИВАЄ ЗАРАЗ"],
    "none": ["pl": "Brak nadchodzących dropów", "en": "No upcoming drops", "es": "No hay drops próximos", "de": "Keine anstehenden Drops", "fr": "Aucun drop à venir", "it": "Nessun drop in arrivo", "cs": "Žádné nadcházející dropy", "uk": "Немає майбутніх дропів"],
    "noneHint": ["pl": "Stwórz drop i zbierz ekipę ✨", "en": "Create a drop and get the crew ✨", "es": "Crea un drop y reúne a la crew ✨", "de": "Erstelle einen Drop und trommle die Crew zusammen ✨", "fr": "Crée un drop et rassemble la team ✨", "it": "Crea un drop e raduna la crew ✨", "cs": "Vytvoř drop a svolej partu ✨", "uk": "Створи дроп і зібери компанію ✨"],
    "starts": ["pl": "ZA", "en": "IN", "es": "EN", "de": "IN", "fr": "DANS", "it": "TRA", "cs": "ZA", "uk": "ЧЕРЕЗ"],
    "host": ["pl": "TWÓJ DROP", "en": "YOUR DROP", "es": "TU DROP", "de": "DEIN DROP", "fr": "TON DROP", "it": "IL TUO DROP", "cs": "TVŮJ DROP", "uk": "ТВІЙ ДРОП"],
    "today": ["pl": "Dziś", "en": "Today", "es": "Hoy", "de": "Heute", "fr": "Aujourd'hui", "it": "Oggi", "cs": "Dnes", "uk": "Сьогодні"],
    "tomorrow": ["pl": "Jutro", "en": "Tomorrow", "es": "Mañana", "de": "Morgen", "fr": "Demain", "it": "Domani", "cs": "Zítra", "uk": "Завтра"],
    "more": ["pl": "Więcej dropów wkrótce", "en": "More drops soon", "es": "Más drops pronto", "de": "Bald mehr Drops", "fr": "Bientôt d'autres drops", "it": "Presto altri drop", "cs": "Brzy další dropy", "uk": "Незабаром більше дропів"],
    "desc": ["pl": "Najbliższy drop z odliczaniem.", "en": "Your next drop with a countdown.", "es": "Tu próximo drop con cuenta atrás.", "de": "Dein nächster Drop mit Countdown.", "fr": "Ton prochain drop avec compte à rebours.", "it": "Il tuo prossimo drop con conto alla rovescia.", "cs": "Tvůj nejbližší drop s odpočtem.", "uk": "Твій найближчий дроп з відліком."],
]
private func tr(_ k: String) -> String { STR[k]?[lang] ?? STR[k]?["en"] ?? k }
private enum Tx {
    static var now: String { tr("now") }
    static var none: String { tr("none") }
    static var noneHint: String { tr("noneHint") }
    static var starts: String { tr("starts") }
    static var host: String { tr("host") }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> WEntry {
        WEntry(date: Date(), drops: [WDrop(id: "x", t: "Skate session", ts: Date().addingTimeInterval(5400).timeIntervalSince1970 * 1000, pl: "West Skatepark", e: "🛹", c1: "#7c3aed", c2: "#ec4899", r: "host", n: 3)])
    }
    func getSnapshot(in context: Context, completion: @escaping (WEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : WEntry(date: Date(), drops: loadDrops(now: Date())))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WEntry>) -> Void) {
        let now = Date()
        let drops = loadDrops(now: now)
        var dates: [Date] = [now]
        for d in drops.prefix(4) {
            if d.start > now { dates.append(d.start) }
            let end = d.start.addingTimeInterval(2 * 3600)
            if end > now { dates.append(end) }
        }
        let when = Array(Set(dates)).sorted().prefix(8)
        let entries = when.map { t in WEntry(date: t, drops: drops.filter { $0.start.addingTimeInterval(2 * 3600) > t }) }
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(20 * 60))))
    }
}

extension Color {
    init(hex: String) {
        var s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
}

private let ink = Color(red: 0.09, green: 0.09, blue: 0.12)
private let night = Color(red: 0.043, green: 0.043, blue: 0.071)

extension View {
    @ViewBuilder func widgetBG<B: View>(_ b: B) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { b }
        } else {
            self.padding(14).background(b)
        }
    }
}

private func dayLabel(_ d: Date) -> String {
    let f = DateFormatter()
    f.locale = loc
    let cal = Calendar.current
    f.dateFormat = "HH:mm"
    let time = f.string(from: d)
    if cal.isDateInToday(d) { return tr("today") + " " + time }
    if cal.isDateInTomorrow(d) { return tr("tomorrow") + " " + time }
    f.setLocalizedDateFormatFromTemplate("EEE d MMM")
    return f.string(from: d) + " · " + time
}

/// Odliczanie: <24 h – żywy zegar, później data.
struct CountdownText: View {
    let drop: WDrop
    let now: Date
    var body: some View {
        if drop.start <= now {
            Text(Tx.now)
        } else if drop.start.timeIntervalSince(now) < 24 * 3600 {
            Text(drop.start, style: .timer).monospacedDigit()
        } else {
            Text(dayLabel(drop.start))
        }
    }
}

private let gray = Color(red: 0.557, green: 0.557, blue: 0.576)
private let blue = Color(red: 0.369, green: 0.612, blue: 1.0)
private let cardBG = Color(red: 0.078, green: 0.078, blue: 0.078)

/// „+” z małego widżetu: iOS 17+ uruchamia aplikację i zapisuje znacznik, który aplikacja odczytuje (małe widżety nie obsługują Link).
@available(iOS 17.0, *)
struct NewDropIntent: AppIntent {
    static let title: LocalizedStringResource = "New drop"
    static let openAppWhenRun: Bool = true
    func perform() async throws -> some IntentResult {
        UserDefaults(suiteName: appGroup)?.set(true, forKey: "pendingNew")
        return .result()
    }
}

struct PlusGlyph: View {
    let size: CGFloat
    var body: some View {
        ZStack {
            Circle().fill(Color(red: 0.169, green: 0.169, blue: 0.176))
            Image(systemName: "plus").font(.system(size: size * 0.42, weight: .bold)).foregroundColor(.white)
        }
        .frame(width: size, height: size)
    }
}

struct PlusButton: View {
    let size: CGFloat
    let small: Bool
    var body: some View {
        if small {
            if #available(iOS 17.0, *) {
                Button(intent: NewDropIntent()) { PlusGlyph(size: size) }.buttonStyle(.plain)
            } else {
                PlusGlyph(size: size)
            }
        } else {
            Link(destination: URL(string: siteURL + "/new")!) { PlusGlyph(size: size) }
        }
    }
}

/// „za 42 min” (żywo), w dniu startu; później data.
struct RelText: View {
    let d: WDrop
    let now: Date
    let cap: Bool
    var body: some View {
        if d.start <= now {
            Text(Tx.now)
        } else if d.start.timeIntervalSince(now) < 24 * 3600 {
            let p0 = tr("pre")
            let pre = cap ? p0.prefix(1).uppercased() + String(p0.dropFirst()) : p0
            Text(pre + " ") + Text(d.start, style: .relative)
        } else {
            Text(dayLabel(d.start))
        }
    }
}

private func hhmm(_ d: Date) -> String {
    let f = DateFormatter(); f.locale = loc; f.dateFormat = "HH:mm"; return f.string(from: d)
}

private func dropsWord(_ n: Int) -> String {
    if lang == "pl" {
        if n == 1 { return "drop" }
        let a = n % 10, b = n % 100
        return (a >= 2 && a <= 4 && !(b >= 12 && b <= 14)) ? "dropy" : "dropów"
    }
    return n == 1 ? "drop" : "drops"
}

struct SmallA: View {
    let d: WDrop?
    let now: Date
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                Text("DROP").font(.system(size: 12, weight: .bold, design: .rounded)).tracking(0.5).foregroundColor(gray)
                Spacer()
                PlusButton(size: 32, small: true)
            }
            Spacer(minLength: 2)
            if let d = d {
                Text(d.start <= now ? tr("live") : hhmm(d.start))
                    .font(.system(size: 36, weight: .bold, design: .rounded)).foregroundColor(blue)
                    .lineLimit(1).minimumScaleFactor(0.5)
                Text(d.t).font(.system(size: 14, weight: .bold, design: .rounded)).foregroundColor(.white).lineLimit(1).padding(.top, 2)
                RelText(d: d, now: now, cap: false).font(.system(size: 12, weight: .bold, design: .rounded)).foregroundColor(gray).lineLimit(1)
            } else {
                Text(Tx.none).font(.system(size: 14, weight: .bold, design: .rounded)).foregroundColor(.white).lineLimit(2)
                Text(Tx.noneHint).font(.system(size: 11, weight: .semibold, design: .rounded)).foregroundColor(gray).lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct MediumA: View {
    let drops: [WDrop]
    let now: Date
    var body: some View {
        let today = drops.filter { Calendar.current.isDate($0.start, inSameDayAs: now) }.count
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 0) {
                Text(tr("todayUp")).font(.system(size: 11, weight: .bold, design: .rounded)).tracking(0.4).foregroundColor(gray)
                    .lineLimit(1).minimumScaleFactor(0.6)
                Text("\(today)").font(.system(size: 34, weight: .bold, design: .rounded)).foregroundColor(.white)
                    .lineLimit(1).minimumScaleFactor(0.6).padding(.top, 2)
                Text(dropsWord(today) + " " + tr("around")).font(.system(size: 11, weight: .medium, design: .rounded)).foregroundColor(gray)
                    .lineLimit(2).minimumScaleFactor(0.8)
                Spacer(minLength: 0)
                PlusButton(size: 38, small: false)
            }
            .frame(width: 92, alignment: .leading)
            .frame(maxHeight: .infinity, alignment: .topLeading)
            .layoutPriority(2)
            if let f = drops.first {
                Link(destination: URL(string: siteURL + "/d/" + f.id)!) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(tr("next")).font(.system(size: 10, weight: .bold, design: .rounded)).foregroundColor(gray).lineLimit(1).padding(.bottom, 3)
                        RelText(d: f, now: now, cap: true).font(.system(size: 11, weight: .bold, design: .rounded)).foregroundColor(blue)
                            .padding(.horizontal, 9).padding(.vertical, 3)
                            .background(Capsule().fill(Color(red: 0.114, green: 0.165, blue: 0.251))).lineLimit(1)
                        Text(f.t).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundColor(.white).lineLimit(1).padding(.top, 4)
                        if let p = f.pl, !p.isEmpty { Text(p).font(.system(size: 11, weight: .medium, design: .rounded)).foregroundColor(gray).lineLimit(1) }
                        if let n = f.n, n > 0 {
                            HStack(spacing: 8) {
                                HStack(spacing: -7) {
                                    ForEach(0..<min(n, 3), id: \.self) { i in
                                        Circle().fill([Color(red: 0.84, green: 0.80, blue: 0.98), Color(red: 0.98, green: 0.85, blue: 0.69), Color(red: 0.71, green: 0.84, blue: 0.98)][i])
                                            .overlay(Circle().stroke(cardBG, lineWidth: 1.5)).frame(width: 20, height: 20)
                                    }
                                }
                                Text("\(n) " + tr("going")).font(.system(size: 11, weight: .bold, design: .rounded)).foregroundColor(gray).lineLimit(1)
                            }.padding(.top, 6)
                        }
                    }
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(cardBG))
                }
                .layoutPriority(1)
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    Text(Tx.none).font(.system(size: 14, weight: .bold, design: .rounded)).foregroundColor(.white).lineLimit(2)
                    Text(Tx.noneHint).font(.system(size: 11, weight: .medium, design: .rounded)).foregroundColor(gray).lineLimit(2)
                }
                .padding(.horizontal, 12).padding(.vertical, 8)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(cardBG))
            }
        }
    }
}

struct SquadWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: WEntry
    var body: some View {
        let f = entry.drops.first
        if family == .systemSmall {
            SmallA(d: f, now: entry.date)
                .widgetBG(Color.black)
                .widgetURL(URL(string: siteURL + (f.map { "/d/" + $0.id } ?? "/new")))
        } else {
            MediumA(drops: entry.drops, now: entry.date)
                .widgetBG(Color.black)
        }
    }
}

struct SquadWidget: Widget {
    let kind = "SquadWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            SquadWidgetView(entry: entry)
        }
        .configurationDisplayName("Squad")
        .description(Text(tr("desc")))
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct SquadWidgetBundle: WidgetBundle {
    var body: some Widget {
        SquadWidget()
        if #available(iOS 16.2, *) { SquadLiveActivity() }
        if #available(iOS 16.2, *) { SquadWeekActivity() }
    }
}
