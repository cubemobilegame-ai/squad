import Foundation
import Capacitor
#if canImport(WidgetKit)
import WidgetKit
#endif

/// Zapisuje najbliższe dropy do App Group, skąd czyta je widżet, i odświeża widżet.
@objc(SquadWidgetPlugin)
public class SquadWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SquadWidgetPlugin"
    public let jsName = "SquadWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pending", returnType: CAPPluginReturnPromise)
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
}
