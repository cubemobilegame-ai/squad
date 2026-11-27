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
    }
    var id: String
}

private let laGroup = "group.com.cubemobilegames.squad"
private let laSite = "https://squad-64cd5.web.app"
private let blue = Color(red: 0.31, green: 0.53, blue: 1.0)
private let blueLt = Color(red: 0.50, green: 0.70, blue: 1.0)
private let blueDk = Color(red: 0.18, green: 0.33, blue: 0.84)
private let mute = Color(red: 0.60, green: 0.60, blue: 0.66)

private func faceImage(_ n: String) -> UIImage? {
    guard let u = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: laGroup) else { return nil }
    return UIImage(contentsOfFile: u.appendingPathComponent("la").appendingPathComponent(n).path)
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
    var body: some View {
        HStack(spacing: -10) {
            ForEach(Array(s.faces.prefix(3).enumerated()), id: \.offset) { i, f in
                Group {
                    if let im = faceImage(f) { Image(uiImage: im).resizable().scaledToFill() }
                    else { Circle().fill(blueDk) }
                }
                .frame(width: 38, height: 38).clipShape(Circle())
                .overlay(Circle().stroke(ring, lineWidth: 2.5))
                .zIndex(Double(9 - i))
            }
            if s.more > 0 {
                Text("+\(s.more)").font(.system(size: 13, weight: .heavy)).foregroundColor(.white)
                    .frame(width: 38, height: 38).background(Circle().fill(blueDk))
                    .overlay(Circle().stroke(ring, lineWidth: 2.5))
            }
        }
    }
}

@available(iOS 16.2, *)
private struct Pill: View {
    let t: String
    var body: some View {
        Text(t).font(.system(size: 15, weight: .semibold)).foregroundColor(Color.white.opacity(0.66))
            .lineLimit(1).padding(.horizontal, 16).frame(height: 34)
            .background(Capsule().fill(Color.white.opacity(0.10)))
    }
}

@available(iOS 16.2, *)
private struct Countdown: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    var body: some View {
        let s = ctx.state
        VStack(spacing: 7) {
            HStack {
                Spacer()
                if ctx.isStale || s.start <= Date() {
                    Text(s.live).font(.system(size: 12.5, weight: .bold)).foregroundColor(blueLt)
                } else {
                    (Text(s.pre + " ") + Text(s.start, style: .relative)).font(.system(size: 12.5, weight: .bold)).foregroundColor(blueLt)
                }
            }
            if s.start > Date() {
                ProgressView(timerInterval: s.from...s.start, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
                    .progressViewStyle(.linear).tint(blue)
            } else {
                Capsule().fill(blue).frame(height: 4)
            }
        }
    }
}

private func openBtn(_ s: SquadLiveAttributes.ContentState, _ id: String, chat: Bool) -> some View {
    HStack(spacing: 10) {
        Link(destination: URL(string: laSite + "/d/" + id)!) {
            Text(s.open).font(.system(size: 16, weight: .heavy)).foregroundColor(Color(red: 0.04, green: 0.04, blue: 0.07))
                .frame(maxWidth: .infinity).frame(height: 46).background(Capsule().fill(Color.white))
        }
        if chat {
            Link(destination: URL(string: laSite + "/c/" + id)!) {
                // ta sama ikona czatu co w dolnym menu aplikacji
                ChatIcon().stroke(Color.white, style: StrokeStyle(lineWidth: 1.9 * 24.0 / 24.0, lineCap: .round, lineJoin: .round))
                    .frame(width: 24, height: 24).frame(width: 46, height: 46).background(Circle().fill(Color.white.opacity(0.12)))
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
private struct Body: View {
    let ctx: ActivityViewContext<SquadLiveAttributes>
    let ring: Color
    let chat: Bool
    var body: some View {
        let s = ctx.state
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(s.title).font(.system(size: 21, weight: .heavy)).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7)
                    if !s.place.isEmpty { Text(s.place).font(.system(size: 13.5)).foregroundColor(mute).lineLimit(1) }
                }
                Spacer(minLength: 8)
                Pill(t: s.cat)
            }
            HStack {
                Faces(s: s, ring: ring)
                Spacer()
                Text(s.people).font(.system(size: 14, weight: .bold)).foregroundColor(Color(red: 0.81, green: 0.81, blue: 0.85))
            }.padding(.top, 16)
            Countdown(ctx: ctx).padding(.top, 14)
            openBtn(s, ctx.attributes.id, chat: chat).padding(.top, 14)
        }
    }
}

@available(iOS 16.2, *)
struct SquadLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SquadLiveAttributes.self) { ctx in
            Body(ctx: ctx, ring: Color(red: 0.10, green: 0.10, blue: 0.13), chat: false)
                .padding(20)
                .activityBackgroundTint(Color(red: 0.10, green: 0.10, blue: 0.13))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { ctx in
            DynamicIsland {
                DynamicIslandExpandedRegion(.bottom) {
                    Body(ctx: ctx, ring: .black, chat: true).padding(.horizontal, 4).padding(.bottom, 4)
                }
            } compactLeading: {
                HStack(spacing: 7) { Dot(); Text(ctx.state.cat).font(.system(size: 14, weight: .heavy)).lineLimit(1) }
            } compactTrailing: {
                Group {
                    if ctx.state.start <= Date() || ctx.isStale { Text(ctx.state.live) }
                    else { (Text(ctx.state.pre + " ") + Text(ctx.state.start, style: .relative)) }
                }
                .font(.system(size: 14, weight: .heavy)).foregroundColor(blueLt).lineLimit(1).minimumScaleFactor(0.6).frame(maxWidth: 84)
            } minimal: {
                Dot()
            }
            .widgetURL(URL(string: laSite + "/d/" + ctx.attributes.id))
        }
    }
}
