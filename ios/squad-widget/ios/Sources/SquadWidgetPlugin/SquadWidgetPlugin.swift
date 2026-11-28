import Foundation
import UIKit
import Capacitor
#if canImport(WidgetKit)
import WidgetKit
#endif
#if canImport(ActivityKit)
import ActivityKit
#endif
import CryptoKit

#if canImport(ActivityKit)
/// Definicja identyczna jak w rozszerzeniu widżetu (SquadLive.swift).
@available(iOS 16.1, *)
struct SquadLiveAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var title: String
        var place: String
        var cat: String
        var start: Date
        var from: Date
        var faces: [String]
        var people: String
        var more: Int
        var pre: String
        var open: String
        var live: String
    }
    var id: String
}

/// Definicja identyczna jak w rozszerzeniu widżetu (SquadLive.swift).
@available(iOS 16.1, *)
struct SquadWeekAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var days: [Int]
        var lb: [String]
        var hd: String
        var pill: String
        var n: Int
        var nt: String
        var ni: String
        var hasNext: Bool
        var start: Date
        var pre: String
        var open: String
        var nid: String
    }
    var id: String
}
#endif

/// Zapisuje najbliższe dropy do App Group, skąd czyta je widżet, i odświeża widżet.
@objc(SquadWidgetPlugin)
public class SquadWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SquadWidgetPlugin"
    public let jsName = "SquadWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pending", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "live", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "week", returnType: CAPPluginReturnPromise)
    ]
    private let group = "group.com.cubemobilegames.squad"

    @objc func update(_ call: CAPPluginCall) {
        let json = call.getString("json") ?? "[]"
        if let d = UserDefaults(suiteName: group) {
            d.set(json.data(using: .utf8), forKey: "drops")
        }
        #if canImport(WidgetKit)
        if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
        #endif
        call.resolve()
    }

    /// Czy widżet poprosił o „Nowy drop” (znacznik zapisany przez przycisk „+” w małym widżecie).
    @objc func pending(_ call: CAPPluginCall) {
        var v = false
        if let d = UserDefaults(suiteName: group), d.bool(forKey: "pendingNew") {
            v = true
            d.set(false, forKey: "pendingNew")
        }
        call.resolve(["v": v])
    }

    /// Zapisuje twarz (data:URL albo adres) w App Group i zwraca nazwę pliku.
    private func saveFace(_ src: String) async -> String? {
        guard let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else { return nil }
        let dir = root.appendingPathComponent("la")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let h = SHA256.hash(data: Data(src.utf8)).prefix(10).map { String(format: "%02x", $0) }.joined()
        let f = dir.appendingPathComponent(h + ".png")
        if FileManager.default.fileExists(atPath: f.path) { return h + ".png" }
        var data: Data?
        if src.hasPrefix("data:"), let c = src.firstIndex(of: ",") {
            data = Data(base64Encoded: String(src[src.index(after: c)...]))
        } else if let u = URL(string: src) {
            data = try? await URLSession.shared.data(from: u).0
        }
        guard let d = data, let img = UIImage(data: d), let png = img.pngData() else { return nil }
        try? png.write(to: f)
        return h + ".png"
    }

    /// Uruchamia / aktualizuje / kończy Live Activity („Drop na wyspie”). json = obiekt albo "" (zakończ).
    @objc func live(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        let json = call.getString("json") ?? ""
        Task {
            let cur = Activity<SquadLiveAttributes>.activities
            if !json.isEmpty && !ActivityAuthorizationInfo().areActivitiesEnabled { call.resolve(["err": "iOS wyłączył aktywności na żywo"]); return }
            guard !json.isEmpty, ActivityAuthorizationInfo().areActivitiesEnabled,
                  let o = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any],
                  let id = o["id"] as? String, let ts = o["ts"] as? Double else {
                for a in cur { await a.end(nil, dismissalPolicy: .immediate) }
                call.resolve(); return
            }
            var faces: [String] = []
            for s in (o["av"] as? [String] ?? []).prefix(3) { if let f = await saveFace(s) { faces.append(f) } }
            let start = Date(timeIntervalSince1970: ts / 1000)
            let st = SquadLiveAttributes.ContentState(
                title: o["t"] as? String ?? "", place: o["pl"] as? String ?? "", cat: o["k"] as? String ?? "",
                start: start, from: start.addingTimeInterval(-2 * 3600), faces: faces,
                people: o["pp"] as? String ?? "", more: o["more"] as? Int ?? 0,
                pre: o["pre"] as? String ?? "", open: o["open"] as? String ?? "", live: o["lv"] as? String ?? "")
            let content = ActivityContent(state: st, staleDate: start)
            for a in cur where a.attributes.id != id { await a.end(nil, dismissalPolicy: .immediate) }
            if let a = cur.first(where: { $0.attributes.id == id }) {
                await a.update(content)
            } else {
                do { _ = try Activity.request(attributes: SquadLiveAttributes(id: id), content: content, pushType: nil) }
                catch { call.resolve(["err": String(describing: error).prefix(120).description]); return }
            }
            call.resolve()
        }
        #else
        call.resolve()
        #endif
    }

    /// Live Activity „Tydzień” (wykres dropów na 7 dni). json = obiekt albo "" (zakończ).
    @objc func week(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        let json = call.getString("json") ?? ""
        Task {
            let cur = Activity<SquadWeekAttributes>.activities
            guard !json.isEmpty, ActivityAuthorizationInfo().areActivitiesEnabled,
                  let o = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any] else {
                for a in cur { await a.end(nil, dismissalPolicy: .immediate) }
                call.resolve(); return
            }
            let ts = o["ts"] as? Double ?? 0
            let start = Date(timeIntervalSince1970: ts / 1000)
            let st = SquadWeekAttributes.ContentState(
                days: o["days"] as? [Int] ?? [], lb: o["lb"] as? [String] ?? [],
                hd: o["hd"] as? String ?? "", pill: o["pill"] as? String ?? "", n: o["n"] as? Int ?? 0,
                nt: o["nt"] as? String ?? "", ni: o["ni"] as? String ?? "", hasNext: ts > 0, start: start,
                pre: o["pre"] as? String ?? "", open: o["open"] as? String ?? "", nid: o["nid"] as? String ?? "")
            let content = ActivityContent(state: st, staleDate: ts > 0 ? start : nil)
            if let a = cur.first {
                await a.update(content)
            } else {
                do { _ = try Activity.request(attributes: SquadWeekAttributes(id: "week"), content: content, pushType: nil) }
                catch { call.resolve(["err": String(describing: error).prefix(120).description]); return }
            }
            call.resolve()
        }
        #else
        call.resolve()
        #endif
    }
}
