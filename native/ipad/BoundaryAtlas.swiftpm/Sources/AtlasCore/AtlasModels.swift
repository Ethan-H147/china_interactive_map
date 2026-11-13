import Foundation

public struct NativeName: Codable, Hashable, Sendable {
    public let language: String
    public let label: String
    public let text: String
}

public struct Fact: Codable, Sendable {
    public let label: String
    public let value: String
    public let detail: String
    public let source: String?
}

public struct Region: Codable, Identifiable, Sendable {
    public let id: String
    public let index: Int
    public let english: String
    public let local: String
    public let kind: String
    public let center: [Double]
    public let names: [NativeName]
    public let aliases: [String]
    public let facts: [Fact]
    public let audio: String
    public let flag: String?
    public let polygons: [[[[Double]]]]
    public let hitArea: Double

    public func accepts(_ answer: String) -> Bool {
        let key = Self.normalize(answer)
        return !key.isEmpty && ([english, local] + aliases + names.map(\.text))
            .contains { Self.normalize($0) == key }
    }
    public static func normalize(_ text: String) -> String {
        text.folding(options: [.diacriticInsensitive, .caseInsensitive, .widthInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            .unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }.map(String.init).joined()
    }
}

public struct CountryManifest: Codable, Sendable {
    public let schemaVersion: Int
    public let id: String
    public let english: String
    public let local: String
    public let flag: String
    public let singular: String
    public let plural: String
    public let center: [Double]
    public let regions: [Region]
    public let geometry: GeometryManifest
    public let background: BackgroundManifest
    public let sources: [SourceCredit]
}
public struct GeometryManifest: Codable, Sendable {
    public let fills: String
    public let fillVertices: Int
    public let indices: String
    public let indexCount: Int
    public let lines: String
    public let lineInstances: Int
    public let vertexStride: Int
    public let lineStride: Int
}
public struct BackgroundManifest: Codable, Sendable {
    public let fills: String
    public let indices: String
    public let fillVertices: Int
    public let indexCount: Int
}
public struct SourceCredit: Codable, Sendable {
    public let title: String
    public let url: String
}
public struct CountryPack: Sendable {
    public let manifest: CountryManifest
    public let fills: Data
    public let indices: Data
    public let lines: Data
    public let backgroundFills: Data
    public let backgroundIndices: Data
}

public enum AtlasError: LocalizedError {
    case missing(String), incompatiblePack, invalidGeometry
    public var errorDescription: String? {
        switch self {
        case .missing(let file): return "The app package is missing \(file). Transfer and unzip the entire project again."
        case .incompatiblePack: return "This country pack needs a newer version of Boundary Atlas."
        case .invalidGeometry: return "The bundled map could not be decoded. Transfer the complete project again."
        }
    }
}

public protocol CountryRepository: Sendable {
    func load(_ country: String) async throws -> CountryPack
}

/// Exactly one active country. No world-wide detail cache or network requests.
public actor BundledCountryRepository: CountryRepository {
    private var resident: CountryPack?
    private var background: (String, Data, Data)?
    public init() {}
    public nonisolated static func url(_ relative: String) throws -> URL {
        let root = Bundle.module.resourceURL!.appendingPathComponent("Resources", isDirectory: true)
        let candidate = root.appendingPathComponent(relative).standardizedFileURL
        guard candidate.path.hasPrefix(root.standardizedFileURL.path + "/"),
              FileManager.default.fileExists(atPath: candidate.path) else { throw AtlasError.missing(relative) }
        return candidate
    }
    public func load(_ country: String) async throws -> CountryPack {
        if let resident, resident.manifest.id == country { return resident }
        resident = nil
        let data = try Data(contentsOf: Self.url("Countries/\(country)/catalogue.json"))
        let manifest = try JSONDecoder().decode(CountryManifest.self, from: data)
        guard manifest.schemaVersion == 1 else { throw AtlasError.incompatiblePack }
        let fills = try Data(contentsOf: Self.url(manifest.geometry.fills), options: .mappedIfSafe)
        let indices = try Data(contentsOf: Self.url(manifest.geometry.indices), options: .mappedIfSafe)
        let lines = try Data(contentsOf: Self.url(manifest.geometry.lines), options: .mappedIfSafe)
        guard fills.count == manifest.geometry.fillVertices * 16, indices.count == manifest.geometry.indexCount * 4,
              lines.count == manifest.geometry.lineInstances * 32,
              manifest.geometry.vertexStride == 16, manifest.geometry.lineStride == 32 else { throw AtlasError.invalidGeometry }
        if background?.0 != manifest.background.fills {
            background=nil
            let vertices=try Data(contentsOf:Self.url(manifest.background.fills),options:.mappedIfSafe)
            let elements=try Data(contentsOf:Self.url(manifest.background.indices),options:.mappedIfSafe)
            guard vertices.count==manifest.background.fillVertices*16,elements.count==manifest.background.indexCount*4 else {throw AtlasError.invalidGeometry}
            background=(manifest.background.fills,vertices,elements)
        }
        guard let background else {throw AtlasError.invalidGeometry}
        let pack = CountryPack(manifest: manifest, fills: fills, indices: indices, lines: lines, backgroundFills:background.1, backgroundIndices:background.2)
        resident = pack
        return pack
    }
    public func release() { resident = nil }
}
