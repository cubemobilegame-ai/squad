import WidgetKit
import SwiftUI

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
        WEntry(date: Date(), drops: [WDrop(id: "x", t: "Skate session", ts: Date().addingTimeInterval(5400).timeIntervalSince1970 * 1000, pl: "West Skatepark", e: "🛹", c1: "#7c3aed", c2: "#ec4899", r: "host")])
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

struct DropGradient: View {
    let d: WDrop
    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(hex: d.c1), Color(hex: d.c2)], startPoint: .topLeading, endPoint: .bottomTrailing)
            Color.white.opacity(0.5)
            RadialGradient(colors: [Color.white.opacity(0.55), .clear], center: .topTrailing, startRadius: 4, endRadius: 150)
        }
    }
}

struct EmojiBubble: View {
    let e: String
    let size: CGFloat
    var body: some View {
        ZStack {
            Circle().fill(Color.white.opacity(0.55))
            Circle().stroke(Color.white.opacity(0.8), lineWidth: 1)
            Text(e).font(.system(size: size * 0.55))
        }
        .frame(width: size, height: size)
    }
}

struct BigCard: View {
    let d: WDrop
    let now: Date
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                Text(d.r == "host" ? Tx.host : "SQUAD")
                    .font(.system(size: 9, weight: .heavy, design: .rounded)).tracking(1.4)
                    .foregroundColor(ink.opacity(0.55))
                Spacer()
                EmojiBubble(e: d.e, size: 34)
            }
            Spacer(minLength: 4)
            Text(d.t)
                .font(.system(size: 17, weight: .heavy, design: .rounded))
                .foregroundColor(ink).lineLimit(2).minimumScaleFactor(0.8)
            if let p = d.pl, !p.isEmpty {
                Text("📍 " + p).font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundColor(ink.opacity(0.6)).lineLimit(1).padding(.top, 1)
            }
            HStack(spacing: 5) {
                Image(systemName: d.start <= now ? "bolt.fill" : "clock.fill").font(.system(size: 10, weight: .bold))
                CountdownText(drop: d, now: now).font(.system(size: 13, weight: .heavy, design: .rounded)).lineLimit(1).minimumScaleFactor(0.7)
            }
            .foregroundColor(ink)
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(Capsule().fill(Color.white.opacity(0.62)))
            .padding(.top, 7)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct EmptyView2: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Squad").font(.system(size: 22, weight: .black, design: .rounded)).foregroundColor(.white)
            Spacer()
            Text(Tx.none).font(.system(size: 14, weight: .heavy, design: .rounded)).foregroundColor(.white)
            Text(Tx.noneHint).font(.system(size: 11, weight: .medium, design: .rounded)).foregroundColor(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct MiniRow: View {
    let d: WDrop
    let now: Date
    var body: some View {
        HStack(spacing: 9) {
            Text(d.e).font(.system(size: 16))
                .frame(width: 30, height: 30)
                .background(Circle().fill(Color.white.opacity(0.10)))
            VStack(alignment: .leading, spacing: 1) {
                Text(d.t).font(.system(size: 12, weight: .bold, design: .rounded)).foregroundColor(.white).lineLimit(1)
                CountdownText(drop: d, now: now).font(.system(size: 10.5, weight: .semibold, design: .rounded))
                    .foregroundColor(.white.opacity(0.6)).lineLimit(1)
            }
            Spacer(minLength: 0)
        }
    }
}

struct SquadWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: WEntry
    var body: some View {
        let first = entry.drops.first
        Group {
            if let f = first {
                if family == .systemSmall {
                    BigCard(d: f, now: entry.date)
                        .widgetBG(DropGradient(d: f))
                        .widgetURL(URL(string: siteURL + "/d/" + f.id))
                } else {
                    HStack(spacing: 12) {
                        BigCard(d: f, now: entry.date)
                            .padding(12)
                            .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Color.clear).overlay(DropGradient(d: f).clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))))
                            .frame(maxWidth: .infinity)
                        VStack(alignment: .leading, spacing: 8) {
                            let rest = Array(entry.drops.dropFirst().prefix(3))
                            if rest.isEmpty {
                                Text(tr("more"))
                                    .font(.system(size: 12, weight: .semibold, design: .rounded)).foregroundColor(.white.opacity(0.55))
                            } else {
                                ForEach(rest) { d in
                                    Link(destination: URL(string: siteURL + "/d/" + d.id)!) { MiniRow(d: d, now: entry.date) }
                                }
                            }
                            Spacer(minLength: 0)
                        }
                        .frame(maxWidth: .infinity, alignment: .topLeading)
                    }
                    .widgetBG(night)
                    .widgetURL(URL(string: siteURL + "/d/" + f.id))
                }
            } else {
                EmptyView2().widgetBG(LinearGradient(colors: [night, Color(red: 0.16, green: 0.07, blue: 0.14)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .widgetURL(URL(string: siteURL + "/"))
            }
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
    var body: some Widget { SquadWidget() }
}
