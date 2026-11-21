import SwiftUI
import WebKit

/// Abre a plataforma Elos 360° Global. Links externos (WhatsApp, e-mail, outros sites) abrem fora do app.
let elosHost = "elo360global.com.br"
let elosStart = URL(string: "https://elo360global.com.br/sistema")!

struct ContentView: View {
    @StateObject private var model = WebModel()
    var body: some View {
        ZStack {
            Color(red: 7/255, green: 20/255, blue: 42/255).ignoresSafeArea()
            WebView(model: model)
            if model.offline {
                VStack(spacing: 16) {
                    Image("Logo").resizable().frame(width: 120, height: 120)
                    Text("Sem conexão com a internet").font(.headline).foregroundColor(.white)
                    Text("Verifique sua conexão e tente de novo.").foregroundColor(.white.opacity(0.8))
                    Button("Tentar de novo") { model.reload() }
                        .padding(.horizontal, 24).padding(.vertical, 12)
                        .background(Color(red: 232/255, green: 184/255, blue: 74/255))
                        .foregroundColor(Color(red: 7/255, green: 20/255, blue: 42/255)).cornerRadius(24)
                }.padding()
            }
        }
    }
}

final class WebModel: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate {
    @Published var offline = false
    let web: WKWebView

    override init() {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()
        cfg.allowsInlineMediaPlayback = true
        web = WKWebView(frame: .zero, configuration: cfg)
        super.init()
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 7/255, green: 20/255, blue: 42/255, alpha: 1)
        let refresh = UIRefreshControl()
        refresh.addTarget(self, action: #selector(pull(_:)), for: .valueChanged)
        web.scrollView.refreshControl = refresh
        web.load(URLRequest(url: elosStart))
    }

    @objc func pull(_ sender: UIRefreshControl) { web.reload(); sender.endRefreshing() }
    func reload() { offline = false; if web.url == nil { web.load(URLRequest(url: elosStart)) } else { web.reload() } }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.allow) }
        let host = url.host ?? ""
        let interno = (url.scheme == "https" || url.scheme == "http") && (host == elosHost || host.hasSuffix("." + elosHost) || host == "elos360-global.onrender.com")
        if interno || url.scheme == "about" || url.scheme == "blob" || url.scheme == "data" { return decisionHandler(.allow) }
        UIApplication.shared.open(url)
        decisionHandler(.cancel)
    }

    // Links com target=_blank
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url {
            if url.host == elosHost { webView.load(action.request) } else { UIApplication.shared.open(url) }
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { offline = false }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { check(error) }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { check(error) }
    private func check(_ error: Error) {
        let e = error as NSError
        if e.domain == NSURLErrorDomain && [NSURLErrorNotConnectedToInternet, NSURLErrorTimedOut, NSURLErrorCannotFindHost, NSURLErrorNetworkConnectionLost].contains(e.code) { offline = true }
    }

    // Alertas e confirmações da página
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        top()?.present(a, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        top()?.present(a, animated: true)
    }
    private func top() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
        var vc = scene?.windows.first(where: { $0.isKeyWindow })?.rootViewController
        while let p = vc?.presentedViewController { vc = p }
        return vc
    }
}

struct WebView: UIViewRepresentable {
    let model: WebModel
    func makeUIView(context: Context) -> WKWebView { model.web }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
