#if os(macOS)
import AppKit
import Foundation
import SwiftUI
import WroughtmarkKit

struct WroughtmarkPalette {
    let bg: Color
    let surface: Color
    let border: Color
    let ink: Color
    let muted: Color
    let brass: Color
    let emerald: Color

    static let dark = WroughtmarkPalette(
        bg: Color(red: 9/255, green: 10/255, blue: 13/255),
        surface: Color(red: 17/255, green: 19/255, blue: 24/255),
        border: Color(red: 44/255, green: 50/255, blue: 64/255),
        ink: Color(red: 242/255, green: 244/255, blue: 248/255),
        muted: Color(red: 161/255, green: 168/255, blue: 182/255),
        brass: Color(red: 226/255, green: 172/255, blue: 85/255),
        emerald: Color(red: 52/255, green: 211/255, blue: 153/255)
    )

    static let light = WroughtmarkPalette(
        bg: Color(red: 247/255, green: 247/255, blue: 245/255),
        surface: Color.white,
        border: Color(red: 23/255, green: 26/255, blue: 33/255),
        ink: Color(red: 15/255, green: 18/255, blue: 24/255),
        muted: Color(red: 73/255, green: 80/255, blue: 94/255),
        brass: Color(red: 157/255, green: 102/255, blue: 22/255),
        emerald: Color(red: 15/255, green: 110/255, blue: 67/255)
    )
}

@MainActor
final class WatcherViewModel: ObservableObject {
    @Published var watchedFolder: URL?
    @Published var discipline: CreativeDiscipline = .music
    @Published var isWatching = false
    @Published var statusLine = "Idle. Select a project folder."
    @Published var recordedCount = 0
    @Published var lastSealID: String?

    private var timer: Timer?
    private let cliPath: String
    private let stateDir: URL

    init() {
        let fm = FileManager.default
        let appSupport = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        self.stateDir = appSupport.appendingPathComponent("Wroughtmark", isDirectory: true)
        try? fm.createDirectory(at: stateDir, withIntermediateDirectories: true)

        let envPath = ProcessInfo.processInfo.environment["WROUGHTMARK_BIN"]
        let cwd = fm.currentDirectoryPath
        let candidates = [
            envPath,
            Bundle.main.url(forResource: "wroughtmark", withExtension: nil)?.path,
            "\(cwd)/core/target/release/wroughtmark",
            "\(cwd)/core/target/debug/wroughtmark",
            "\(cwd)/../core/target/debug/wroughtmark",
            "/usr/local/bin/wroughtmark"
        ].compactMap { $0 }
        self.cliPath = candidates.first(where: { fm.isExecutableFile(atPath: $0) }) ?? "/usr/local/bin/wroughtmark"
    }

    var keyURL: URL { stateDir.appendingPathComponent("creator.key.json") }
    var chainURL: URL { stateDir.appendingPathComponent("active.chain.json") }

    func pickFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        if panel.runModal() == .OK, let url = panel.url {
            watchedFolder = url
            statusLine = "Ready: \(url.lastPathComponent)"
        }
    }

    func toggleWatching() {
        if isWatching {
            timer?.invalidate()
            timer = nil
            isWatching = false
            statusLine = "Paused"
            return
        }
        guard let folder = watchedFolder else {
            statusLine = "Pick a folder first"
            return
        }
        ensureKeyExists()
        isWatching = true
        statusLine = "Watching \(folder.lastPathComponent)"
        runScanOnce(folder: folder)
        timer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.runScanOnce(folder: folder)
            }
        }
    }

    func mintSealForDeliverable() {
        let panel = NSOpenPanel()
        panel.title = "Select Final Exported Deliverable"
        guard panel.runModal() == .OK, let fileURL = panel.url else { return }

        ensureKeyExists()
        let outSealURL = fileURL.appendingPathExtension("seal.json")
        let out = runCLI([
            "seal",
            chainURL.path,
            keyURL.path,
            discipline.rawValue,
            fileURL.path,
            outSealURL.path
        ])
        if let sealLine = out.split(separator: "\n").first(where: { $0.hasPrefix("minted ") }) {
            let sealID = sealLine.replacingOccurrences(of: "minted ", with: "")
            lastSealID = sealID
            statusLine = "Sealed: \(sealID)"
        } else {
            statusLine = "Mint failed (record at least 1 change first)"
        }
    }

    func verifyDeliverable() {
        let filePanel = NSOpenPanel()
        filePanel.title = "Select Exported Deliverable"
        guard filePanel.runModal() == .OK, let fileURL = filePanel.url else { return }

        let sealPanel = NSOpenPanel()
        sealPanel.title = "Select Wroughtmark Seal (.json)"
        guard sealPanel.runModal() == .OK, let sealURL = sealPanel.url else { return }

        guard let data = try? Data(contentsOf: fileURL),
              let sealJSON = try? String(contentsOf: sealURL, encoding: .utf8) else {
            statusLine = "Could not read file or seal"
            return
        }

        let valid = WroughtmarkVerifier.verify(output: data, sealJSON: sealJSON)
        statusLine = valid ? "VERIFIED: \(fileURL.lastPathComponent)" : "FAILED verification"
    }

    func exportDossierHTML() {
        let filePanel = NSOpenPanel()
        filePanel.title = "Select Exported Deliverable"
        guard filePanel.runModal() == .OK, let fileURL = filePanel.url else { return }

        let sealPanel = NSOpenPanel()
        sealPanel.title = "Select Wroughtmark Seal (.json)"
        guard sealPanel.runModal() == .OK, let sealURL = sealPanel.url else { return }

        guard let data = try? Data(contentsOf: fileURL),
              let sealJSON = try? String(contentsOf: sealURL, encoding: .utf8),
              let html = WroughtmarkVerifier.buildDossierHTML(output: data, sealJSON: sealJSON) else {
            statusLine = "Dossier export failed: invalid deliverable or seal"
            return
        }

        let savePanel = NSSavePanel()
        savePanel.nameFieldStringValue = "\(fileURL.deletingPathExtension().lastPathComponent)-dossier.html"
        if savePanel.runModal() == .OK, let outURL = savePanel.url {
            try? html.write(to: outURL, atomically: true, encoding: .utf8)
            statusLine = "Exported \(outURL.lastPathComponent)"
        }
    }

    private func ensureKeyExists() {
        guard !FileManager.default.fileExists(atPath: keyURL.path) else { return }
        _ = runCLI(["keygen", keyURL.path])
    }

    private func runScanOnce(folder: URL) {
        let out = runCLI(["watch", folder.path, chainURL.path, keyURL.path, "--once"])
        let lines = out.split(separator: "\n").filter { $0.hasPrefix("watched ") }
        if !lines.isEmpty {
            recordedCount += lines.count
            statusLine = "Recorded \(lines.count) change(s)"
        }
    }

    private func runCLI(_ args: [String]) -> String {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: cliPath)
        proc.arguments = args
        let pipe = Pipe()
        proc.standardOutput = pipe
        try? proc.run()
        proc.waitUntilExit()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return String(data: data, encoding: .utf8) ?? ""
    }
}

@main
struct WroughtmarkMenuBarApp: App {
    @StateObject private var vm = WatcherViewModel()
    @AppStorage("wroughtmark.theme.dark") private var isDark = true

    var body: some Scene {
        let palette = isDark ? WroughtmarkPalette.dark : WroughtmarkPalette.light
        MenuBarExtra("Wroughtmark", systemImage: vm.isWatching ? "seal.fill" : "seal") {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(vm.isWatching ? palette.emerald : palette.brass)
                        .frame(width: 7, height: 7)
                    Text("Wroughtmark")
                        .font(.system(.headline, design: .default).weight(.bold))
                        .foregroundStyle(palette.ink)
                    Spacer()
                    Button(isDark ? "DARK" : "LIGHT") {
                        isDark.toggle()
                    }
                    .buttonStyle(.plain)
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .foregroundStyle(palette.brass)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .overlay(Rectangle().stroke(palette.border, lineWidth: 1))

                    Text(vm.isWatching ? "ACTIVE" : "IDLE")
                        .font(.system(size: 10, weight: .semibold, design: .monospaced))
                        .foregroundStyle(vm.isWatching ? palette.emerald : palette.muted)
                }

                Text(vm.statusLine)
                    .font(.caption)
                    .foregroundStyle(palette.muted)

                Picker("Discipline", selection: $vm.discipline) {
                    Text("Writing").tag(CreativeDiscipline.writing)
                    Text("Music").tag(CreativeDiscipline.music)
                    Text("Visual").tag(CreativeDiscipline.visual)
                    Text("Film").tag(CreativeDiscipline.film)
                }
                .pickerStyle(.segmented)

                HStack {
                    Text("Recorded Events")
                        .font(.caption2)
                        .foregroundStyle(palette.muted)
                    Spacer()
                    Text("\(vm.recordedCount)")
                        .font(.system(.caption, design: .monospaced).weight(.semibold))
                        .foregroundStyle(palette.brass)
                }
                .padding(8)
                .background(palette.surface)
                .overlay(Rectangle().stroke(palette.border, lineWidth: 1))

                Divider()

                Button("Select Project Folder...") { vm.pickFolder() }
                Button(vm.isWatching ? "Pause Watching" : "Start Watching") {
                    vm.toggleWatching()
                }
                .disabled(vm.watchedFolder == nil && !vm.isWatching)

                Button("Mint Seal for Export...") { vm.mintSealForDeliverable() }
                Button("Verify Deliverable + Seal...") { vm.verifyDeliverable() }
                Button("Export Dossier (.html)...") { vm.exportDossierHTML() }

                Divider()

                Button("Quit") { NSApplication.shared.terminate(nil) }
            }
            .padding(14)
            .frame(width: 304)
            .background(palette.bg)
            .foregroundStyle(palette.ink)
            .preferredColorScheme(isDark ? .dark : .light)
        }
        .menuBarExtraStyle(.window)
    }
}
#endif
