import Foundation

public enum QuizMode: String, CaseIterable, Identifiable, Sendable {
    case identify = "Name highlighted place"
    case find = "Find the named place"
    case nameAll = "Name every place"
    public var id: String { rawValue }
}
public struct QuizSession: Sendable {
    public let mode: QuizMode
    public let order: [String]
    public private(set) var answered: Set<String> = []
    public private(set) var correct: Int = 0
    public private(set) var attempts: Int = 0
    public private(set) var feedback: String = ""
    public private(set) var lastWasCorrect: Bool?
    public init(mode: QuizMode, regions: [Region], shuffle: Bool = true) {
        self.mode = mode
        let ids = regions.map(\.id)
        order = shuffle ? ids.shuffled() : ids
    }
    public var targetID: String? { order.first { !answered.contains($0) } }
    public var complete: Bool { answered.count == order.count }
    public var progress: String { "\(answered.count) / \(order.count)" }
    @discardableResult public mutating func submit(_ text: String, regions: [Region]) -> Bool {
        guard !complete, mode != .find else { return false }
        let candidates = mode == .nameAll ? regions.filter { !answered.contains($0.id) } : regions.filter { $0.id == targetID }
        attempts += 1
        if let match = candidates.first(where: { $0.accepts(text) }) {
            answered.insert(match.id); correct += 1; feedback = "Correct: \(match.english)"; lastWasCorrect = true
            return true
        }
        lastWasCorrect = false; feedback = "Try again. English, Chinese and regional names are accepted."
        return false
    }
    @discardableResult public mutating func choose(_ id: String) -> Bool {
        guard mode == .find, !complete else { return false }
        attempts += 1
        guard id == targetID else { lastWasCorrect = false; feedback = "Try another place."; return false }
        answered.insert(id); correct += 1; lastWasCorrect = true; feedback = "Correct."
        return true
    }
    public mutating func skip(regions: [Region]) {
        guard let id=targetID else { return }
        feedback = regions.first(where: { $0.id == id }).map { "Skipped: \($0.english)" } ?? "Skipped"
        answered.insert(id); lastWasCorrect = false
    }
}
