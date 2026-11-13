import XCTest
@testable import AtlasCore

final class AtlasCoreTests: XCTestCase {
    func testCameraRoundTripAndBackside() throws {
        var camera=GlobeCamera()
        for longitude in stride(from:-150.0,to:150.0,by:30.0) {
            camera.longitude=longitude
            for latitude in [-70.0,-35,0,35,70] {
                camera.latitude=latitude
                let point=[longitude+10,latitude+5]
                let xy=try XCTUnwrap(camera.project(point,width:1200,height:900))
                let result=try XCTUnwrap(camera.coordinate(x:xy[0],y:xy[1],width:1200,height:900))
                XCTAssertEqual(result[0],point[0],accuracy:0.000001)
                XCTAssertEqual(result[1],point[1],accuracy:0.000001)
            }
        }
        camera=GlobeCamera()
        XCTAssertNil(camera.project([-76,-35],width:1200,height:900))
        XCTAssertNil(camera.coordinate(x:-1000,y:-1000,width:1200,height:900))
    }
    func testChinaPackNamesQuizAndGeometry() async throws {
        let pack=try await BundledCountryRepository().load("china")
        let regions=pack.manifest.regions
        XCTAssertEqual(regions.count,34)
        XCTAssertEqual(Set(regions.map(\.id)).count,34)
        for r in regions {
            XCTAssertTrue(r.accepts(r.english));XCTAssertTrue(r.accepts(r.local))
            for name in r.names { XCTAssertTrue(r.accepts(name.text)) }
            XCTAssertFalse(r.accepts(""))
            XCTAssertTrue(FileManager.default.fileExists(atPath:try BundledCountryRepository.url(r.audio).path))
        }
        for mode in QuizMode.allCases {
            var round=QuizSession(mode:mode,regions:regions,shuffle:false)
            for region in regions {
                if mode == .find { XCTAssertTrue(round.choose(region.id)) }
                else { XCTAssertTrue(round.submit(region.local,regions:regions)) }
            }
            XCTAssertTrue(round.complete);XCTAssertEqual(round.correct,34)
        }
    }
    func testWrongAnswersSkipAndDuplicate() async throws {
        let pack=try await BundledCountryRepository().load("china")
        let regions=pack.manifest.regions
        var round=QuizSession(mode:.nameAll,regions:regions,shuffle:false)
        XCTAssertFalse(round.submit("not a province",regions:regions));XCTAssertEqual(round.correct,0)
        XCTAssertTrue(round.submit(regions[0].english,regions:regions))
        XCTAssertFalse(round.submit(regions[0].english,regions:regions))
        round.skip(regions:regions);XCTAssertEqual(round.answered.count,2);XCTAssertEqual(round.correct,1)
    }
}
