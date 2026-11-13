import Foundation

public struct Vector3: Equatable, Sendable {
    public var x: Double, y: Double, z: Double
    public init(_ x: Double, _ y: Double, _ z: Double) { self.x = x; self.y = y; self.z = z }
    public func dot(_ v: Self) -> Double { x * v.x + y * v.y + z * v.z }
    public static func + (a: Self, b: Self) -> Self { .init(a.x+b.x, a.y+b.y, a.z+b.z) }
    public static func * (v: Self, s: Double) -> Self { .init(v.x*s, v.y*s, v.z*s) }
    public static func geographic(_ lon: Double, _ lat: Double) -> Self {
        let a = lon * .pi / 180, b = lat * .pi / 180
        return .init(cos(b)*cos(a), sin(b), cos(b)*sin(a))
    }
}
public struct GlobeCamera: Equatable, Sendable {
    public var longitude: Double = 104
    public var latitude: Double = 35
    public var zoom: Double = 2.25
    public init() {}
    public var forward: Vector3 { .geographic(longitude, latitude) }
    public var right: Vector3 {
        let a = longitude * .pi / 180
        return .init(-sin(a), 0, cos(a))
    }
    public var up: Vector3 {
        let a = longitude * .pi / 180, b = latitude * .pi / 180
        return .init(-sin(b)*cos(a), cos(b), -sin(b)*sin(a))
    }
    public mutating func clamp() {
        latitude = max(-85, min(85, latitude)); zoom = max(0.82, min(32, zoom))
        longitude = (longitude + 540).truncatingRemainder(dividingBy: 360) - 180
    }
    public func project(_ coordinate: [Double], width: Double, height: Double) -> [Double]? {
        guard coordinate.count == 2, width > 0, height > 0 else { return nil }
        let p = Vector3.geographic(coordinate[0], coordinate[1])
        guard p.dot(forward) > 0.02 else { return nil }
        let x = p.dot(right) * zoom / (width/height), y = p.dot(up) * zoom
        guard abs(x) <= 1.1, abs(y) <= 1.1 else { return nil }
        return [(x+1)*width/2, (1-y)*height/2]
    }
    public func coordinate(x: Double, y: Double, width: Double, height: Double) -> [Double]? {
        guard width > 0, height > 0 else { return nil }
        let a = (2*x/width-1)*(width/height)/zoom, b = (1-2*y/height)/zoom
        let r = a*a+b*b
        guard r <= 1 else { return nil }
        let p = right*a + up*b + forward*sqrt(max(0,1-r))
        return [atan2(p.z,p.x)*180 / .pi, asin(max(-1,min(1,p.y)))*180 / .pi]
    }
}

public enum RegionHitTest {
    private static func inside(_ point: [Double], ring: [[Double]]) -> Bool {
        guard ring.count > 2 else { return false }
        var hit = false
        var previous = ring.count-1
        for i in ring.indices {
            let a=ring[i], b=ring[previous]
            if (a[1]>point[1]) != (b[1]>point[1]),
               point[0] < (b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0] { hit.toggle() }
            previous=i
        }
        return hit
    }
    public static func region(at point: [Double], in regions: [Region]) -> Region? {
        // Small regions win at shared/coincident hit masks (Hong Kong and Macao).
        regions.sorted { $0.hitArea < $1.hitArea }.first { region in
            region.polygons.contains { polygon in
                guard let outer=polygon.first, inside(point, ring: outer) else { return false }
                return !polygon.dropFirst().contains { inside(point, ring: $0) }
            }
        }
    }
}
