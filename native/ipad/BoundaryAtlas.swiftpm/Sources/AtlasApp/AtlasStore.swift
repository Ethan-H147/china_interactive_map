import SwiftUI
import AVFoundation
import UIKit
import CoreText
import AtlasCore

enum AtlasPanel: String, CaseIterable { case settings = "Map settings", discover = "Discover", quiz = "Quiz" }
enum LabelLanguage: String, CaseIterable { case both = "Bilingual", english = "English", local = "Chinese" }

/// Camera notifications go directly to the renderer, not through SwiftUI's view tree.
@MainActor final class CameraController {
    var value = GlobeCamera()
    var viewportAspect = 1.0
    var hasInitialFrame = false
    var invalidate: (() -> Void)?
    var invalidateOwner: UUID?
    func change(_ update: (inout GlobeCamera) -> Void) { update(&value); value.clamp(); invalidate?() }
    func home() { value = GlobeCamera();value.zoom=min(2.25,1.8*viewportAspect);value.clamp();invalidate?() }
    func focus(_ region: Region) {
        var camera=GlobeCamera();camera.longitude=region.center[0];camera.latitude=region.center[1]
        var extent=0.025
        for polygon in region.polygons { for ring in polygon { for point in ring {
            let p=Vector3.geographic(point[0],point[1])
            extent=max(extent,max(abs(p.dot(camera.up)),abs(p.dot(camera.right))/max(0.1,viewportAspect)))
        } } }
        camera.zoom=min(32,0.82/extent);value=camera;value.clamp();invalidate?()
    }
}

@MainActor final class PronunciationPlayer: NSObject, ObservableObject, AVAudioPlayerDelegate {
    @Published private(set) var playingID: String?
    @Published private(set) var error: String?
    private var audio: AVAudioPlayer?
    func stop() { audio?.stop(); audio = nil; playingID = nil }
    func play(_ region: Region) {
        if playingID == region.id { stop(); return }
        stop(); error = nil
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
            let player = try AVAudioPlayer(contentsOf: BundledCountryRepository.url(region.audio))
            player.delegate = self; audio = player
            guard player.play() else { throw AtlasError.missing(region.audio) }
            playingID = region.id
        } catch { self.error = error.localizedDescription; stop() }
    }
    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor [weak self] in if self?.audio === player { self?.stop() } }
    }
    nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        Task { @MainActor [weak self] in if self?.audio === player { self?.error = "This recording could not be played.";self?.stop() } }
    }
}

@MainActor final class AtlasStore: ObservableObject {
    @Published private(set) var pack: CountryPack?
    @Published var loadError: String?
    @Published var panel: AtlasPanel = .settings {
        didSet { audio.stop(); if oldValue == .quiz && panel != .quiz { round=nil;answer="" } }
    }
    @Published private(set) var selectedID: String?
    @Published var search = ""
    @Published var labels: LabelLanguage = .both
    @Published var showLabels = true
    @Published var flagPath: String? { didSet { audio.stop() } }
    @Published var showSources = false
    @Published var round: QuizSession?
    @Published var quizMode: QuizMode = .identify
    @Published var answer = ""
    @Published var reduceMotion = false
    @Published var isActive = true
    @Published var flagPaused = false
    let camera = CameraController()
    let audio = PronunciationPlayer()
    let repository: any CountryRepository
    private let countryID: String
    private var isLoading = false
    init(countryID: String = "china", repository: any CountryRepository = BundledCountryRepository()) {
        self.countryID=countryID;self.repository=repository
    }
    var regions: [Region] { pack?.manifest.regions ?? [] }
    var countryName: String { pack?.manifest.english ?? "Boundary Atlas" }
    var singular: String { pack?.manifest.singular ?? "division" }
    var plural: String { pack?.manifest.plural ?? "Divisions" }
    var selected: Region? { regions.first { $0.id == selectedID } }
    var target: Region? { regions.first { $0.id == round?.targetID } }
    var visibleRegions: [Region] {
        let query = Region.normalize(search)
        return regions.filter { query.isEmpty || ([$0.english,$0.local] + $0.aliases + $0.names.map(\.text)).contains { Region.normalize($0).contains(query) } }
    }
    var highlightedIndex: Int {
        if panel == .quiz, let round { return round.mode == .identify ? (target?.index ?? -1) : -1 }
        return selected?.index ?? -1
    }
    var hidesAnswers: Bool { panel == .quiz && round != nil }
    func load() async {
        guard pack == nil, !isLoading else { return }
        isLoading = true; defer { isLoading = false }
        for file in ["Fonts/noto-sans-mongolian.ttf","Fonts/noto-serif-tibetan.ttf"] {
            if let url=try? BundledCountryRepository.url(file) { CTFontManagerRegisterFontsForURL(url as CFURL,.process,nil) }
        }
        do { pack = try await repository.load(countryID); loadError = nil }
        catch { loadError = error.localizedDescription }
    }
    func select(_ region: Region, focus: Bool = false) {
        if panel == .quiz, round != nil {
            if round?.mode == .find { _ = round?.choose(region.id); haptic(round?.lastWasCorrect == true) }
            return
        }
        audio.stop(); selectedID = region.id; panel = .discover
        if focus { camera.focus(region) }
    }
    func clearSelection() { audio.stop(); selectedID = nil }
    func startQuiz() {
        audio.stop(); selectedID = nil; search = ""; answer = ""
        round = QuizSession(mode: quizMode, regions: regions); panel = .quiz; camera.home()
    }
    func submit() {
        guard !answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        _ = round?.submit(answer, regions: regions)
        haptic(round?.lastWasCorrect == true)
        if round?.lastWasCorrect == true { answer = "" }
    }
    func endQuiz() { round = nil; answer = ""; audio.stop() }
    func haptic(_ success: Bool) { UINotificationFeedbackGenerator().notificationOccurred(success ? .success : .warning) }
}
