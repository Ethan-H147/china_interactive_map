import MetalKit
import AtlasCore

struct GPUUniforms {
    var right = SIMD4<Float>(0,0,0,0)
    var up = SIMD4<Float>(0,0,0,0)
    var forward = SIMD4<Float>(0,0,0,0)
    var camera = SIMD4<Float>(1,1,-1,0)
    var viewport = SIMD4<Float>(1,1,0,0)
    var flag = SIMD4<Float>(0,0,1.5,0)
}

@MainActor final class MetalResources {
    let device: MTLDevice
    let queue: MTLCommandQueue
    let globePipeline: MTLRenderPipelineState
    let linePipeline: MTLRenderPipelineState
    let flagPipeline: MTLRenderPipelineState
    let depth: MTLDepthStencilState
    let ocean: MTLBuffer
    let oceanCount: Int
    let cloth: MTLBuffer
    let clothCount: Int
    private(set) var fills: MTLBuffer?
    private(set) var backgroundFills: MTLBuffer?
    private(set) var backgroundIndices: MTLBuffer?
    private(set) var backgroundCount = 0
    private(set) var indices: MTLBuffer?
    private(set) var lines: MTLBuffer?
    private(set) var fillCount = 0
    private(set) var lineCount = 0
    private var countryID: String?
    private var texture: MTLTexture?
    private var texturePath: String?

    init() throws {
        guard let device=MTLCreateSystemDefaultDevice(),let queue=device.makeCommandQueue() else {
            throw NSError(domain:"Metal",code:1,userInfo:[NSLocalizedDescriptionKey:"Metal is unavailable on this device."])
        }
        self.device=device;self.queue=queue
        let library=try device.makeLibrary(source: AtlasShaders.source, options: nil)
        func pipeline(_ vertex: String,_ fragment: String) throws -> MTLRenderPipelineState {
            let d=MTLRenderPipelineDescriptor();d.vertexFunction=library.makeFunction(name:vertex);d.fragmentFunction=library.makeFunction(name:fragment)
            d.colorAttachments[0].pixelFormat = .bgra8Unorm;d.depthAttachmentPixelFormat = .depth32Float
            return try device.makeRenderPipelineState(descriptor:d)
        }
        globePipeline=try pipeline("globeVertex","globeFragment")
        linePipeline=try pipeline("lineVertex","globeFragment")
        flagPipeline=try pipeline("flagVertex","flagFragment")
        let dd=MTLDepthStencilDescriptor();dd.depthCompareFunction = .lessEqual;dd.isDepthWriteEnabled=true
        guard let depth=device.makeDepthStencilState(descriptor:dd) else { throw AtlasError.invalidGeometry };self.depth=depth
        var sphere=[SIMD4<Float>]()
        for lat in stride(from:-90,to:90,by:3) { for lon in stride(from:-180,to:180,by:3) {
            let a=SIMD4<Float>(Float(lon),Float(lat),-1,0),b=SIMD4<Float>(Float(lon+3),Float(lat),-1,0)
            let c=SIMD4<Float>(Float(lon+3),Float(lat+3),-1,0),d=SIMD4<Float>(Float(lon),Float(lat+3),-1,0)
            sphere += [a,b,c,a,c,d]
        }}
        oceanCount=sphere.count
        guard let ocean=device.makeBuffer(bytes:sphere,length:sphere.count*16,options:.storageModeShared) else { throw AtlasError.invalidGeometry };self.ocean=ocean
        var cloth=[SIMD4<Float>]()
        for y in 0..<32 { for x in 0..<64 {
            let a=SIMD4<Float>(Float(x)/64,Float(y)/32,0,0),b=SIMD4<Float>(Float(x+1)/64,Float(y)/32,0,0)
            let c=SIMD4<Float>(Float(x+1)/64,Float(y+1)/32,0,0),d=SIMD4<Float>(Float(x)/64,Float(y+1)/32,0,0)
            cloth += [a,b,c,a,c,d]
        }}
        clothCount=cloth.count
        guard let clothBuffer=device.makeBuffer(bytes:cloth,length:cloth.count*16,options:.storageModeShared) else { throw AtlasError.invalidGeometry };self.cloth=clothBuffer
    }
    func install(_ pack: CountryPack) throws {
        guard countryID != pack.manifest.id else { return }
        if backgroundFills == nil {
            backgroundFills=pack.backgroundFills.withUnsafeBytes {p in p.baseAddress.flatMap {device.makeBuffer(bytes:$0,length:p.count,options:.storageModeShared)}}
            backgroundIndices=pack.backgroundIndices.withUnsafeBytes {p in p.baseAddress.flatMap {device.makeBuffer(bytes:$0,length:p.count,options:.storageModeShared)}}
            guard backgroundFills != nil,backgroundIndices != nil else {backgroundFills=nil;backgroundIndices=nil;throw AtlasError.invalidGeometry}
            backgroundCount=pack.manifest.background.indexCount
        }
        fills=nil;indices=nil;lines=nil;countryID=nil
        fills=pack.fills.withUnsafeBytes { p in p.baseAddress.flatMap { device.makeBuffer(bytes:$0,length:p.count,options:.storageModeShared) } }
        indices=pack.indices.withUnsafeBytes { p in p.baseAddress.flatMap { device.makeBuffer(bytes:$0,length:p.count,options:.storageModeShared) } }
        lines=pack.lines.withUnsafeBytes { p in p.baseAddress.flatMap { device.makeBuffer(bytes:$0,length:p.count,options:.storageModeShared) } }
        guard fills != nil,indices != nil,lines != nil else { throw AtlasError.invalidGeometry }
        fillCount=pack.manifest.geometry.indexCount;lineCount=pack.manifest.geometry.lineInstances;countryID=pack.manifest.id
    }
    func flagTexture(_ path: String) throws -> MTLTexture {
        if texturePath==path,let texture { return texture }
        let url=try BundledCountryRepository.url(path)
        let loaded=try MTKTextureLoader(device:device).newTexture(URL:url,options:[.SRGB:false,.origin:MTKTextureLoader.Origin.topLeft])
        texture=loaded;texturePath=path;return loaded
    }
    func releaseFlag() { texture=nil;texturePath=nil }
}
