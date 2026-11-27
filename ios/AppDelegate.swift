import UIKit
import Capacitor
import FirebaseCore
import FBSDKCoreKit
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let o = FirebaseOptions(googleAppID: "__GOOGLE_APP_ID__", gcmSenderID: "__GCM_SENDER_ID__")
        o.apiKey = "__API_KEY__"
        o.projectID = "__PROJECT_ID__"
        o.clientID = "__CLIENT_ID__"
        o.bundleID = "com.cubemobilegames.squad"
        o.storageBucket = "__STORAGE_BUCKET__"
        FirebaseApp.configure(options: o)
        ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
        // własne cofanie krawędzią działa w aplikacji (JS) – wyłączamy systemowe, bo animacje się dublowały i ekran migał
        for d in [0.2, 0.6, 1.2, 2.5, 5.0] { DispatchQueue.main.asyncAfter(deadline: .now() + d) { [weak self] in self?.disableNativeSwipeBack() } }
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        disableNativeSwipeBack()
    }

    private func findWebView(_ v: UIView) -> WKWebView? {
        if let w = v as? WKWebView { return w }
        for s in v.subviews { if let w = findWebView(s) { return w } }
        return nil
    }

    private func disableNativeSwipeBack() {
        for w in UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).flatMap({ $0.windows }) {
            if let wv = findWebView(w), wv.allowsBackForwardNavigationGestures { wv.allowsBackForwardNavigationGestures = false }
        }
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if ApplicationDelegate.shared.application(app, open: url, options: options) { return true }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
}
