import SwiftUI
import MetalKit
import AtlasCore

enum AtlasScene: Equatable { case globe, flag(String) }

@MainActor struct AtlasMetalView: UIViewRepresentable {
    @ObservedObject var store: AtlasStore
    let resources: MetalResources
    var scene: AtlasScene = .globe
    func makeCoordinator() -> Coordinator { Coordinator(store:store,resources:resources,scene:scene) }
    func makeUIView(context: Context) -> MTKView {
        let view=MTKView(frame:.zero,device:resources.device)
        view.colorPixelFormat = .bgra8Unorm;view.depthStencilPixelFormat = .depth32Float
        view.clearColor=MTLClearColor(red:0.958,green:0.943,blue:0.911,alpha:1)
        view.preferredFramesPerSecond=60;view.enableSetNeedsDisplay=true;view.isPaused=true
        view.isMultipleTouchEnabled=true
        view.delegate=context.coordinator;context.coordinator.attach(view)
        return view
    }
    func updateUIView(_ view: MTKView,context: Context) {
        context.coordinator.scene=scene
        context.coordinator.update()
    }
    static func dismantleUIView(_ view: MTKView,coordinator: Coordinator) {
        coordinator.stop();view.delegate=nil
    }

    @MainActor final class Coordinator: NSObject,MTKViewDelegate,UIGestureRecognizerDelegate {
        let store: AtlasStore
        let resources: MetalResources
        var scene: AtlasScene
        weak var view: MTKView?
        private var labelViews: [String:UILabel] = [:]
        private var installedLabels: String?
        private var inertia: CADisplayLink?
        private var velocity=CGPoint.zero
        private var lastFrame: CFTimeInterval=0
        private var flagYaw: Float = -0.22
        private var flagPitch: Float = 0.08
        private var lastError: String?
        private let cameraToken=UUID()
        init(store: AtlasStore,resources: MetalResources,scene: AtlasScene) {
            self.store=store;self.resources=resources;self.scene=scene
        }
        func attach(_ view: MTKView) {
            self.view=view
            let pan=UIPanGestureRecognizer(target:self,action:#selector(pan(_:)));pan.maximumNumberOfTouches=1
            let pinch=UIPinchGestureRecognizer(target:self,action:#selector(pinch(_:)))
            let tap=UITapGestureRecognizer(target:self,action:#selector(tap(_:)))
            let double=UITapGestureRecognizer(target:self,action:#selector(doubleTap(_:)));double.numberOfTapsRequired=2
            tap.require(toFail:double)
            for gesture in [pan,pinch,tap,double] { gesture.delegate=self;view.addGestureRecognizer(gesture) }
            if scene == .globe { store.camera.invalidateOwner=cameraToken;store.camera.invalidate = { [weak self] in self?.redraw() } }
            view.accessibilityLabel = scene == .globe ? "Interactive provincial globe. Drag to rotate and pinch to zoom. Provinces are also available in the searchable list." : "Three-dimensional waving flag. Drag to rotate."
            update()
        }
        func update() {
            guard let view else { return }
            if let pack=store.pack {
                do { try resources.install(pack) } catch { report(error) }
                if scene == .globe,installedLabels != pack.manifest.id {
                    labelViews.values.forEach { $0.removeFromSuperview() };labelViews.removeAll()
                    for region in pack.manifest.regions {
                        let label=UILabel();label.textAlignment = .center;label.numberOfLines=2;label.isUserInteractionEnabled=false
                        label.isAccessibilityElement=false;label.textColor=UIColor(red:0.28,green:0.25,blue:0.22,alpha:1)
                        label.layer.shadowColor=UIColor.white.cgColor;label.layer.shadowOpacity=0.95;label.layer.shadowRadius=2;label.layer.shadowOffset = .zero
                        labelViews[region.id]=label;view.addSubview(label)
                    }
                    installedLabels=pack.manifest.id
                }
            }
            let animate: Bool
            switch scene {
            case .globe: animate=false
            case .flag: animate = store.isActive && !store.reduceMotion && !store.flagPaused
            }
            view.enableSetNeedsDisplay = !animate;view.isPaused = !animate
            if !store.isActive { stopInertia();return }
            if scene == .globe,store.flagPath != nil { stopInertia();return }
            redraw()
        }
        private func report(_ error: Error) {
            guard lastError != error.localizedDescription else { return };lastError=error.localizedDescription
            Task { @MainActor [weak store = self.store] in store?.loadError=error.localizedDescription }
        }
        func redraw() { view?.setNeedsDisplay();updateLabels() }
        func stop() { stopInertia();if scene == .globe,store.camera.invalidateOwner==cameraToken { store.camera.invalidate=nil;store.camera.invalidateOwner=nil };labelViews.values.forEach { $0.removeFromSuperview() } }
        func stopInertia() { inertia?.invalidate();inertia=nil;velocity = .zero }
        // MTKViewDelegate predates Swift actor annotations. Keep its witnesses
        // nonisolated, then enter our main-actor-owned renderer explicitly.
        // UIKit-driven callbacks stay synchronous; off-main callbacks hop back.
        nonisolated func mtkView(_ view: MTKView,drawableSizeWillChange size: CGSize) {
            if Thread.isMainThread {
                MainActor.assumeIsolated { resizeViewport(size) }
            } else {
                Task { @MainActor [weak self] in self?.resizeViewport(size) }
            }
        }
        nonisolated func draw(in view: MTKView) {
            if Thread.isMainThread {
                MainActor.assumeIsolated { drawAttachedFrame() }
            } else {
                Task { @MainActor [weak self] in self?.drawAttachedFrame() }
            }
        }
        private func drawAttachedFrame() {
            guard let view else { return }
            drawFrame(in:view)
        }
        private func resizeViewport(_ size: CGSize) {
            if scene == .globe,size.height>0,size.width>0 {
                store.camera.viewportAspect=Double(size.width/size.height)
                if !store.camera.hasInitialFrame {store.camera.hasInitialFrame=true;store.camera.home()}
            }
            updateLabels()
        }
        private func drawFrame(in view: MTKView) {
            guard store.isActive,let descriptor=view.currentRenderPassDescriptor,let drawable=view.currentDrawable,
                  let command=resources.queue.makeCommandBuffer(),let encoder=command.makeRenderCommandEncoder(descriptor:descriptor) else { return }
            let size=view.drawableSize,camera=store.camera.value
            func vector(_ v: Vector3) -> SIMD4<Float> { .init(Float(v.x),Float(v.y),Float(v.z),0) }
            var u=GPUUniforms();u.right=vector(camera.right);u.up=vector(camera.up);u.forward=vector(camera.forward)
            u.camera = .init(Float(camera.zoom),Float(size.width/max(1,size.height)),Float(store.highlightedIndex),Float(CACurrentMediaTime().truncatingRemainder(dividingBy:1000)))
            u.viewport = .init(Float(size.width),Float(size.height),0,store.reduceMotion ? 1 : 0)
            encoder.setCullMode(.none);encoder.setDepthStencilState(resources.depth)
            switch scene {
            case .globe:
                encoder.setRenderPipelineState(resources.globePipeline);encoder.setVertexBytes(&u,length:MemoryLayout<GPUUniforms>.stride,index:1)
                encoder.setVertexBuffer(resources.ocean,offset:0,index:0);encoder.drawPrimitives(type:.triangle,vertexStart:0,vertexCount:resources.oceanCount)
                if let fills=resources.backgroundFills,let indices=resources.backgroundIndices {
                    encoder.setVertexBuffer(fills,offset:0,index:0)
                    encoder.drawIndexedPrimitives(type:.triangle,indexCount:resources.backgroundCount,indexType:.uint32,indexBuffer:indices,indexBufferOffset:0)
                }
                if let fills=resources.fills,let indices=resources.indices {
                    encoder.setVertexBuffer(fills,offset:0,index:0)
                    encoder.drawIndexedPrimitives(type:.triangle,indexCount:resources.fillCount,indexType:.uint32,indexBuffer:indices,indexBufferOffset:0)
                }
                if let lines=resources.lines {
                    encoder.setRenderPipelineState(resources.linePipeline);encoder.setVertexBuffer(lines,offset:0,index:0)
                    encoder.drawPrimitives(type:.triangle,vertexStart:0,vertexCount:6,instanceCount:resources.lineCount)
                }
            case .flag(let file):
                do {
                    let texture=try resources.flagTexture(file)
                    u.camera.x=1;u.flag = .init(flagYaw,flagPitch,Float(texture.width)/Float(texture.height),0)
                    encoder.setRenderPipelineState(resources.flagPipeline);encoder.setVertexBytes(&u,length:MemoryLayout<GPUUniforms>.stride,index:1)
                    encoder.setVertexBuffer(resources.cloth,offset:0,index:0);encoder.setFragmentTexture(texture,index:0)
                    encoder.drawPrimitives(type:.triangle,vertexStart:0,vertexCount:resources.clothCount)
                } catch { report(error) }
            }
            encoder.endEncoding();command.present(drawable);command.commit()
        }
        private func updateLabels() {
            guard scene == .globe,let view else { return }
            let camera=store.camera.value,size=view.bounds.size
            var occupied=[CGRect]()
            let regions=store.regions.sorted { ($0.id==store.selectedID ? 0 : 1) < ($1.id==store.selectedID ? 0 : 1) }
            for r in regions {
                guard let label=labelViews[r.id] else { continue }
                label.isHidden=true
                guard store.showLabels,!store.hidesAnswers,
                      let p=camera.project(r.center,width:Double(size.width),height:Double(size.height)) else { continue }
                if ["810000","820000"].contains(r.id),camera.zoom<5,store.selectedID != r.id { continue }
                let english=store.labels == .local ? "" : r.english
                let local=store.labels == .english ? "" : r.local
                label.text=[english,local].filter { !$0.isEmpty }.joined(separator:"\n")
                label.font=UIFont.preferredFont(forTextStyle:.caption1)
                let measured=label.sizeThatFits(CGSize(width:170,height:70))
                let rect=CGRect(x:p[0]-Double(measured.width)/2,y:p[1]-Double(measured.height)/2,width:Double(measured.width),height:Double(measured.height)).insetBy(dx:-3,dy:-2)
                guard !occupied.contains(where: { $0.intersects(rect) }) else { continue }
                label.frame=rect;label.isHidden=false;occupied.append(rect)
            }
        }
        @objc func tap(_ gesture: UITapGestureRecognizer) {
            guard scene == .globe,let view else { return };stopInertia()
            let p=gesture.location(in:view)
            guard let coordinate=store.camera.value.coordinate(x:Double(p.x),y:Double(p.y),width:Double(view.bounds.width),height:Double(view.bounds.height)),
                  let region=RegionHitTest.region(at:coordinate,in:store.regions) else { return }
            store.select(region);redraw()
        }
        @objc func doubleTap(_ gesture: UITapGestureRecognizer) {
            guard scene == .globe else { return };stopInertia();store.camera.change { $0.zoom *= 1.7 }
        }
        @objc func pinch(_ gesture: UIPinchGestureRecognizer) {
            guard scene == .globe else { return };stopInertia();let scale=Double(gesture.scale)
            store.camera.change { $0.zoom *= scale };gesture.scale=1
        }
        @objc func pan(_ gesture: UIPanGestureRecognizer) {
            guard let view else { return }
            if gesture.state == .began { stopInertia() }
            let delta=gesture.translation(in:view);gesture.setTranslation(.zero,in:view)
            switch scene {
            case .globe:
                rotate(delta)
                if gesture.state == .ended,!store.reduceMotion {
                    velocity=gesture.velocity(in:view)
                    if hypot(velocity.x,velocity.y)>80 {
                        lastFrame=CACurrentMediaTime();let link=CADisplayLink(target:self,selector:#selector(step(_:)))
                        link.add(to:.main,forMode:.common);inertia=link
                    }
                }
            case .flag:
                flagYaw += Float(delta.x)*0.008;flagPitch=max(-1,min(1,flagPitch+Float(delta.y)*0.008));redraw()
            }
        }
        private func rotate(_ delta: CGPoint) {
            let height=max(1,Double(view?.bounds.height ?? 1)),factor=120/(height*store.camera.value.zoom)
            store.camera.change { $0.longitude -= Double(delta.x)*factor;$0.latitude += Double(delta.y)*factor }
        }
        @objc private func step(_ link: CADisplayLink) {
            guard store.isActive,store.flagPath == nil else { stopInertia();return }
            let dt=max(0,min(0.033,link.timestamp-lastFrame));lastFrame=link.timestamp
            rotate(CGPoint(x:Double(velocity.x)*dt,y:Double(velocity.y)*dt))
            let friction=CGFloat(exp(-5.5*dt));velocity.x *= friction;velocity.y *= friction
            if hypot(velocity.x,velocity.y)<12 { stopInertia() }
        }
    }
}
