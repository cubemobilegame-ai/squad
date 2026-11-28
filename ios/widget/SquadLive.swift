import ActivityKit
import WidgetKit
import SwiftUI

// Live Activity „Drop na wyspie”: zwinięta wyspa, rozwinięta wyspa i ekran blokady. Dane przekazuje aplikacja (wtyczka SquadWidget).
// Definicja atrybutów MUSI być identyczna w aplikacji (SquadWidgetPlugin.swift) i tutaj.
struct SquadLiveAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var title: String
        var place: String
        var cat: String
        var start: Date
        var from: Date
        var faces: [String]   // nazwy plików w App Group (la/<nazwa>)
        var people: String    // np. „4 osoby IN”
        var more: Int         // ile osób ponad pokazane twarze
        var pre: String       // „za”
        var open: String      // „Otwórz drop”
        var live: String      // „Trwa”
        var seg: [Double]     // pary (start, koniec) dropów dnia, sekundy epoch
        var hi: Int           // indeks twarzy organizatora w `faces`
        var none: Bool        // brak dropów dziś
        var msg1: String      // „Nie masz na dziś dropów”
        var msg2: String      // „Dołącz lub utwórz drop”
        var cta: String       // „Utwórz drop”
        var short: String     // „Brak”
    }
    var id: String
}

private let laGroup = "group.com.cubemobilegames.squad"
private let laSite = "https://squad-64cd5.web.app"
private let blue = Color(red: 0.31, green: 0.53, blue: 1.0)
private let blueLt = Color(red: 0.50, green: 0.70, blue: 1.0)
private let blueDk = Color(red: 0.18, green: 0.33, blue: 0.84)
private let slate = Color(red: 0.29, green: 0.32, blue: 0.45)
private let peri = Color(red: 0.557, green: 0.608, blue: 0.878)
private let sky = Color(red: 0.435, green: 0.804, blue: 0.973)
private let mute = Color(red: 0.60, green: 0.60, blue: 0.66)

private func faceImage(_ n: String) -> UIImage? {
    guard let u = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: laGroup) else { return nil }
    return UIImage(contentsOfFile: u.appendingPathComponent("la").appendingPathComponent(n).path)
}

@available(iOS 16.2, *)
private struct CompactMin: View {
    let state: SquadLiveAttributes.ContentState
    let stale: Bool
    var body: some View {
        let now = Date()
        Group {
            if stale || state.start <= now.addingTimeInterval(1) {
                Text(state.live).font(.system(size: 15, weight: .heavy)).lineLimit(1).fixedSize()
            } else {
                let mins = max(0, Int(state.start.timeIntervalSince(now) / 60))
                let digits = CGFloat(String(mins).count)
                if mins >= 180 {
                    Text(state.start, style: .time).monospacedDigit().lineLimit(1).fixedSize()
                        .font(.system(size: 15, weight: .heavy))
                } else {
                HStack(spacing: 3) {
                    Text(timerInterval: now...state.start, pauseTime: nil, countsDown: true, showsHours: false)
                        .monospacedDigit()
                        .lineLimit(1)
                        .fixedSize()
                        .frame(width: digits * 9.4, alignment: .leading)
                        .clipped()
                    Text("min").lineLimit(1).fixedSize()
                }
                .font(.system(size: 15, weight: .heavy))
                }
            }
        }
        .foregroundColor(Color(red: 0.04, green: 0.04, blue: 0.07))
        .padding(.vertical, 5).padding(.horizontal, 9)
        .background(Capsule().fill(Color.white))
    }
}

@available(iOS 16.2, *)
private struct PulseHalo: View {
    var body: some View {
        if #available(iOS 17.0, *) {
            Image(systemName: "circle.fill").font(.system(size: 15)).foregroundColor(blue.opacity(0.28))
                .symbolEffect(.pulse, options: .repeating)
        } else {
            Circle().fill(blue.opacity(0.28)).frame(width: 15, height: 15)
        }
    }
}

@available(iOS 16.2, *)
private struct Dot: View {
    var body: some View {
        Circle().fill(LinearGradient(colors: [blueLt, blue, blueDk], startPoint: .topLeading, endPoint: .bottomTrailing))
            .frame(width: 9, height: 9)
    }
}

@available(iOS 16.2, *)
private struct Faces: View {
    let s: SquadLiveAttributes.ContentState
    let ring: Color
    var size: CGFloat = 38
    var body: some View {
        HStack(spacing: -size * 0.26) {
            ForEach(Array(s.faces.prefix(3).enumerated()), id: \.offset) { i, f in
                Group {
                    if let im = faceImage(f) { Image(uiImage: im).resizable().scaledToFill() }
                    else { Circle().fill(blueDk) }
                }
                .frame(width: size, height: size).clipShape(Circle())
                .overlay(Circle().stroke(ring, lineWidth: 2.5))
                .zIndex(Double(9 - i))
            }
            if s.more > 0 {
                Text("+\(s.more)").font(.system(size: size * 0.34, weight: .heavy)).foregroundColor(.white)
                    .frame(width: size, height: size).background(Circle().fill(blueDk))
                    .overlay(Circle().stroke(ring, lineWidth: 2.5))
            }
        }
    }
}

@available(iOS 16.2, *)
private struct Pill: View {
    let t: String
    var small = false
    var body: some View {
        Text(t).font(.system(size: small ? 12.5 : 15, weight: .semibold)).foregroundColor(Color.white.opacity(0.66))
            .lineLimit(1).padding(.horizontal, small ? 10 : 16).frame(height: small ? 26 : 34)
            .background(Capsule().fill(Color.white.opacity(0.10)))
    }
}

@available(iOS 16.2, *)
private struct Bar: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    var thick: CGFloat = 8
    var body: some View {
        let s = ctx.state
        if s.start > Date() && !ctx.isStale {
            ProgressView(timerInterval: s.from...s.start, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
                .progressViewStyle(.linear).tint(blue)
                .scaleEffect(x: 1, y: thick / 4, anchor: .center).frame(height: thick).clipShape(Capsule())
        } else {
            Capsule().fill(blue).frame(height: thick)
        }
    }
}

@available(iOS 16.2, *)
private struct Ring: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    var body: some View {
        let s = ctx.state
        if s.start > Date() && !ctx.isStale {
            ProgressView(timerInterval: s.from...s.start, countsDown: true, label: { EmptyView() },
                currentValueLabel: { Text(s.start, style: .timer).font(.system(size: 9.5, weight: .heavy).monospacedDigit()).foregroundColor(blueLt).minimumScaleFactor(0.6).lineLimit(1) })
                .progressViewStyle(.circular).tint(blue).frame(width: 38, height: 38)
        } else {
            Text(s.live).font(.system(size: 13, weight: .bold)).foregroundColor(blueLt)
        }
    }
}

@available(iOS 16.2, *)
private struct TimeTxt: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    var size: CGFloat = 14
    var weight: Font.Weight = .bold
    var body: some View {
        let s = ctx.state
        if ctx.isStale || s.start <= Date() {
            Text(s.live).font(.system(size: size, weight: weight)).foregroundColor(blueLt)
        } else {
            (Text(s.pre + " ") + Text(s.start, style: .timer)).font(.system(size: size, weight: weight).monospacedDigit()).foregroundColor(blueLt)
        }
    }
}

private func openBtn(_ s: SquadLiveAttributes.ContentState, _ id: String, chat: Bool) -> some View {
    HStack(spacing: 10) {
        Link(destination: URL(string: laSite + "/d/" + id)!) {
            Text(s.open).font(.system(size: 16, weight: .heavy)).foregroundColor(Color(red: 0.04, green: 0.04, blue: 0.07))
                .frame(maxWidth: .infinity).frame(height: 38).background(Capsule().fill(Color.white))
        }
        if chat {
            Link(destination: URL(string: laSite + "/c/" + id)!) {
                // ta sama ikona czatu co w dolnym menu aplikacji
                ChatIcon().stroke(Color.white, style: StrokeStyle(lineWidth: 1.9 * 24.0 / 24.0, lineCap: .round, lineJoin: .round))
                    .frame(width: 22, height: 22).frame(width: 38, height: 38).background(Circle().fill(Color.white.opacity(0.12)))
            }
        }
    }
}

/// Ikona czatu z menu (viewBox 24): zaokrąglony prostokąt + ogonek + dwie linie tekstu.
private struct ChatIcon: Shape {
    func path(in r: CGRect) -> Path {
        let k = r.width / 24
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: r.minX + x * k, y: r.minY + y * k) }
        var d = Path()
        d.addRoundedRect(in: CGRect(x: r.minX + 3.5 * k, y: r.minY + 4 * k, width: 17 * k, height: 13 * k), cornerSize: CGSize(width: 4 * k, height: 4 * k))
        d.move(to: p(8, 20.5)); d.addLine(to: p(11, 17))
        d.move(to: p(7.5, 9)); d.addLine(to: p(16.5, 9))
        d.move(to: p(7.5, 12.5)); d.addLine(to: p(13, 12.5))
        return d
    }
}

@available(iOS 16.2, *)
private struct LiveBody: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    let ring: Color
    let chat: Bool
    var body: some View {
        let s = ctx.state
        VStack(alignment: .leading, spacing: 0) {
            Text(s.title).font(.system(size: 24, weight: .heavy)).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.6)
            TimeTxt(ctx: ctx, size: 15).padding(.top, 3)
            Bar(ctx: ctx, thick: 8).padding(.top, 12)
            openBtn(s, ctx.attributes.id, chat: chat).padding(.top, 12)
        }
    }
}

@available(iOS 16.2, *)
struct SquadLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SquadLiveAttributes.self) { ctx in
            Group { if ctx.state.none { NoneBody(ctx: ctx) } else { DropBody(ctx: ctx) } }
                .padding(.horizontal, 20).padding(.vertical, 14)
                .widgetURL(URL(string: laSite + (ctx.state.none ? "" : "/d/" + ctx.attributes.id)))
                .activityBackgroundTint(Color(red: 0.086, green: 0.086, blue: 0.11))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { ctx in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    if ctx.state.none { Color.clear.frame(width: 1, height: 1) }
                    else { PeriTime(ctx: ctx).padding(.leading, 12) }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if ctx.state.none { Color.clear.frame(width: 1, height: 1) }
                    else { PeriClock(ctx: ctx).padding(.trailing, 12) }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if ctx.state.none { NoneBody(ctx: ctx).padding(.horizontal, 12).padding(.top, 0).padding(.bottom, 4) }
                    else { IslandBottom(ctx: ctx).padding(.horizontal, 12).padding(.top, 2).padding(.bottom, 4) }
                }
            } compactLeading: {
                HStack(spacing: 6) {
                    HostDot(s: ctx.state, idx: ctx.state.hi, size: 24).overlay(Circle().stroke(Color.white.opacity(0.16), lineWidth: 0.5))
                    Text("Drop").font(.system(size: 15, weight: .semibold)).foregroundColor(peri).lineLimit(1).fixedSize()
                }
                .frame(width: 72, alignment: .leading)
            } compactTrailing: {
                if ctx.state.none {
                    Text(ctx.state.short).font(.system(size: 15, weight: .heavy)).foregroundColor(Color(red: 0.04, green: 0.04, blue: 0.07))
                        .lineLimit(1).fixedSize().padding(.vertical, 5).padding(.horizontal, 10).background(Capsule().fill(Color.white))
                        .frame(width: 72, alignment: .trailing)
                } else {
                    CompactMin(state: ctx.state, stale: ctx.isStale)
                        .frame(width: 72, alignment: .trailing)
                }
            } minimal: {
                HostDot(s: ctx.state, idx: ctx.state.hi, size: 22).overlay(Circle().stroke(Color.white.opacity(0.16), lineWidth: 0.5))
            }
            .widgetURL(URL(string: laSite + (ctx.state.none ? "" : "/d/" + ctx.attributes.id)))
        }
    }
}

@available(iOS 16.2, *)
private struct PeriTime: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    private let size: CGFloat = 16.7
    var body: some View {
        let s = ctx.state
        let now = Date()
        if ctx.isStale || s.start <= now.addingTimeInterval(1) {
            Text(s.live).font(.system(size: size, weight: .medium)).foregroundColor(peri)
        } else {
            let mins = max(0, Int(s.start.timeIntervalSince(now) / 60))
            let digits = CGFloat(String(mins).count)
            if mins >= 180 {
                Text(cap(s.pre) + " " + String(mins / 60) + " h")
                    .font(.system(size: size, weight: .medium)).foregroundColor(peri).lineLimit(1).truncationMode(.tail)
            } else {
            HStack(spacing: 4) {
                Text(cap(s.pre)).lineLimit(1).fixedSize()
                Text(timerInterval: now...s.start, pauseTime: nil, countsDown: true, showsHours: false)
                    .monospacedDigit().lineLimit(1).fixedSize()
                    .frame(width: digits * size * 0.6, alignment: .leading).clipped()
                Text("min").lineLimit(1).fixedSize()
            }
            .font(.system(size: size, weight: .medium)).foregroundColor(peri)
            .frame(maxWidth: .infinity, alignment: .leading).clipped()
            }
        }
    }
}

@available(iOS 16.2, *)
private struct PeriClock: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    var body: some View {
        Text(ctx.state.start, style: .time).font(.system(size: 16.7, weight: .medium).monospacedDigit()).foregroundColor(peri)
    }
}

private let segColors: [Color] = [   // kolory dropów, o 6% ciemniejsze
    Color(red: 0.929, green: 0.682, blue: 0.107), Color(red: 0.940, green: 0.351, blue: 0.155),
    Color(red: 0.940, green: 0.338, blue: 0.583), Color(red: 0.611, green: 0.423, blue: 0.940)]

/// Oś czasu dnia: błękit = minęło, odcinki = dropy (każdy w innym kolorze), twoja fotka = „teraz”.
@available(iOS 16.2, *)
private struct TimelineBar: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    var thick: CGFloat = 15
    var knob: CGFloat = 28
    var body: some View {
        let s = ctx.state
        // oś całego dnia: od północy do północy (w czasie urządzenia)
        let t0 = Calendar.current.startOfDay(for: s.start).timeIntervalSince1970
        let span: Double = 86400
        let nowF = min(max((Date().timeIntervalSince1970 - t0) / span, 0), 1)
        GeometryReader { g in
            let w = g.size.width
            ZStack(alignment: .leading) {
                Capsule().fill(slate).frame(height: thick)
                Capsule().fill(sky).frame(width: max(thick, w * nowF), height: thick)
                ForEach(0..<(s.seg.count / 2), id: \.self) { i in
                    let a = min(max((s.seg[2 * i] - t0) / span, 0), 1)
                    let b = min(max((s.seg[2 * i + 1] - t0) / span, 0), 1)
                    Capsule().fill(segColors[i % segColors.count])
                        .frame(width: max(thick, w * (b - a)), height: thick).offset(x: min(w * a, w - max(thick, w * (b - a))))
                }
                HostDot(s: s, idx: 0, size: knob)
                    .offset(x: min(max(w * nowF - knob / 2, 0), w - knob))
            }
            .frame(height: knob)
        }
        .frame(height: knob)
    }
}

@available(iOS 16.2, *)
private struct HostDot: View {
    let s: SquadLiveAttributes.ContentState
    var idx = 0
    var size: CGFloat = 36
    var body: some View {
        Group {
            if idx < s.faces.count, let im = faceImage(s.faces[idx]) {
                Image(uiImage: im).resizable().scaledToFill()
            } else {
                Image(systemName: "person.fill").font(.system(size: size * 0.45)).foregroundColor(peri)
            }
        }
        .frame(width: size, height: size).background(slate).clipShape(Circle())
    }
}

@available(iOS 16.2, *)
private struct IslandBottom: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    var body: some View {
        let s = ctx.state
        VStack(alignment: .leading, spacing: 12) {
            TimelineBar(ctx: ctx)
            HStack(spacing: 12) {
                HostDot(s: s, idx: s.hi, size: 34)
                Text(s.title).font(.system(size: 20, weight: .bold)).foregroundColor(.white)
                    .lineLimit(1).truncationMode(.tail).layoutPriority(1).frame(maxWidth: .infinity, alignment: .leading)
                Link(destination: URL(string: laSite + "/d/" + ctx.attributes.id)!) {
                    Text(s.open).font(.system(size: 16, weight: .bold)).foregroundColor(Color(red: 0.04, green: 0.04, blue: 0.07))
                        .lineLimit(1).truncationMode(.tail).padding(.horizontal, 16).frame(minWidth: 96).frame(height: 36).background(Capsule().fill(Color.white))
                }
            }
        }
    }
}

// ---------- Live Activity „Tydzień”: wykres dropów na 7 dni (osobna, opcjonalna aktywność) ----------
struct SquadWeekAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var days: [Int]       // liczba dropów w kolejnych 7 dniach (0 = dziś)
        var lb: [String]      // podpisy dni
        var hd: String        // „Ten tydzień”
        var pill: String      // „2 dziś”
        var n: Int            // dropów dziś
        var nt: String        // tytuł najbliższego dropa
        var ni: String        // „dziś 20:00”
        var hasNext: Bool
        var start: Date       // start najbliższego dropa
        var pre: String       // „za”
        var open: String      // „Otwórz drop”
        var nid: String       // id najbliższego dropa
    }
    var id: String
}

@available(iOS 16.2, *)
private struct WeekBars: View {
    let s: SquadWeekAttributes.ContentState
    var count = 7
    var bar: CGFloat = 20
    var unit: CGFloat = 8.5
    var base: CGFloat = 5
    var labels = true
    var spread = true
    var body: some View {
        HStack(alignment: .bottom, spacing: spread ? 0 : 3) {
            ForEach(0..<min(count, s.days.count), id: \.self) { i in
                VStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: bar * 0.32, style: .continuous)
                        .fill(i == 0 ? blue : Color.white.opacity(0.22))
                        .frame(width: bar, height: base + CGFloat(min(s.days[i], 4)) * unit)
                    if labels {
                        Text(i < s.lb.count ? s.lb[i] : "")
                            .font(.system(size: 11, weight: i == 0 ? .heavy : .bold))
                            .foregroundColor(i == 0 ? .white : mute).lineLimit(1).minimumScaleFactor(0.7)
                    }
                }
                .frame(maxWidth: spread ? .infinity : nil)
            }
        }
    }
}

@available(iOS 16.2, *)
private struct WeekPill: View {
    let t: String
    var size: CGFloat = 14
    var body: some View {
        Text(t).font(.system(size: size, weight: .heavy)).foregroundColor(.white).lineLimit(1).fixedSize()
            .padding(.vertical, 4).padding(.horizontal, 10).background(Capsule().fill(blue))
    }
}

@available(iOS 16.2, *)
private struct WeekNext: View {
    let ctx: ActivityViewContext<SquadWeekAttributes>
    var body: some View {
        let s = ctx.state
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 1) {
                Text(s.nt).font(.system(size: 15, weight: .heavy)).foregroundColor(.white).lineLimit(1)
                if !ctx.isStale && s.start > Date() && s.start < Date().addingTimeInterval(7200) {
                    (Text(s.ni + " · " + s.pre + " ") + Text(s.start, style: .timer))
                        .font(.system(size: 12.5, weight: .bold).monospacedDigit()).foregroundColor(mute).lineLimit(1)
                } else {
                    Text(s.ni).font(.system(size: 12.5, weight: .bold)).foregroundColor(mute).lineLimit(1)
                }
            }
            Spacer(minLength: 6)
            Link(destination: URL(string: laSite + "/d/" + s.nid)!) {
                Text(s.open).font(.system(size: 14, weight: .heavy)).foregroundColor(Color(red: 0.04, green: 0.04, blue: 0.07))
                    .lineLimit(1).padding(.horizontal, 16).frame(height: 32).background(Capsule().fill(Color.white))
            }
        }
    }
}

@available(iOS 16.2, *)
struct SquadWeekActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SquadWeekAttributes.self) { ctx in
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text(ctx.state.hd).font(.system(size: 17, weight: .heavy)).foregroundColor(.white).lineLimit(1)
                    Spacer(minLength: 8)
                    WeekPill(t: ctx.state.pill)
                }
                WeekBars(s: ctx.state).padding(.top, 6)
                if ctx.state.hasNext { WeekNext(ctx: ctx).padding(.top, 8) }
            }
            .padding(.horizontal, 18).padding(.vertical, 12)
            .activityBackgroundTint(Color(red: 0.10, green: 0.10, blue: 0.13))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { ctx in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(ctx.state.hd).font(.system(size: 17, weight: .heavy)).foregroundColor(.white).lineLimit(1).padding(.leading, 12)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    WeekPill(t: ctx.state.pill).padding(.trailing, 12)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    WeekBars(s: ctx.state, bar: 24, unit: 7, base: 5).padding(.horizontal, 12).padding(.top, 2).padding(.bottom, 4)
                }
            } compactLeading: {
                WeekBars(s: ctx.state, count: 5, bar: 6, unit: 4, base: 4, labels: false, spread: false)
                    .frame(width: 72, alignment: .leading)
            } compactTrailing: {
                WeekPill(t: ctx.state.pill, size: 14).frame(width: 72, alignment: .trailing)
            } minimal: {
                Text(ctx.state.n > 0 ? "\(ctx.state.n)" : "·").font(.system(size: 13, weight: .heavy)).foregroundColor(.white)
                    .frame(width: 22, height: 22).background(Circle().fill(blue))
            }
            .widgetURL(URL(string: laSite + (ctx.state.hasNext ? "/d/" + ctx.state.nid : "")))
        }
    }
}

private func cap(_ t: String) -> String { t.prefix(1).uppercased() + t.dropFirst() }

/// Całość treści dropa (napis + godzina, oś dnia, organizator + przycisk) – ta sama na blokadzie i w rozwiniętej wyspie.
@available(iOS 16.2, *)
private struct DropBody: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack { PeriTime(ctx: ctx); Spacer(minLength: 8); PeriClock(ctx: ctx) }
            IslandBottom(ctx: ctx)
        }
    }
}

/// Stan „brak dropów dziś”: komunikat, oś dnia z Twoją fotką i przycisk „Utwórz drop”.
@available(iOS 16.2, *)
private struct NoneBody: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    var body: some View {
        let s = ctx.state
        VStack(alignment: .leading, spacing: 10) {
            Text(s.msg1).font(.system(size: 16.7, weight: .medium)).foregroundColor(peri).lineLimit(1).truncationMode(.tail)
            TimelineBar(ctx: ctx)
            HStack(spacing: 12) {
                Text(s.msg2).font(.system(size: 16, weight: .medium)).foregroundColor(.white).lineLimit(2).layoutPriority(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Link(destination: URL(string: laSite + "/new")!) {
                    HStack(spacing: 6) {
                        Image(systemName: "plus").font(.system(size: 14, weight: .heavy))
                        Text(s.cta).font(.system(size: 16, weight: .bold)).lineLimit(1).truncationMode(.tail)
                    }
                    .foregroundColor(Color(red: 0.04, green: 0.04, blue: 0.07))
                    .padding(.leading, 12).padding(.trailing, 16).frame(height: 36).background(Capsule().fill(Color.white))
                }
            }
        }
    }
}
