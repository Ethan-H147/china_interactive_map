import SwiftUI
import AtlasCore
import ImageIO

@MainActor struct AtlasRootView: View {
    @ObservedObject var store: AtlasStore
    @Environment(\.scenePhase) private var phase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var resources: MetalResources?
    @State private var initializationError: String?
    @State private var compactPanel=false
    var body: some View {
        GeometryReader { geometry in
            let wide=geometry.size.width>=900
            VStack(spacing:0) {
                header(compact:!wide)
                if let error=initializationError ?? store.loadError {
                    ContentUnavailableView("Unable to open the atlas",systemImage:"map",description:Text(error))
                } else if let resources,store.pack != nil {
                    HStack(spacing:0) {
                        if wide { AtlasPanelView(store:store).frame(width:350).background(AtlasTheme.paper);Divider() }
                        ZStack(alignment:.bottomTrailing) {
                            AtlasMetalView(store:store,resources:resources)
                            mapControls.padding(20)
                            if !wide {
                                VStack { HStack { Button { compactPanel=true } label: { Label(store.panel.rawValue,systemImage:"sidebar.left") }.buttonStyle(.borderedProminent);Spacer() };Spacer() }.padding()
                            }
                        }
                    }
                    .sheet(isPresented:$compactPanel) {
                        AtlasPanelView(store:store).background(AtlasTheme.paper)
                            .presentationDetents([.height(240),.fraction(0.58),.large])
                            .presentationDragIndicator(.visible)
                            .modifier(FlagPresentation(store:store,resources:resources,enabled:true))
                    }
                    .modifier(FlagPresentation(store:store,resources:resources,enabled:!compactPanel))
                } else { Spacer();ProgressView().tint(AtlasTheme.accent);Spacer() }
            }
            .background(AtlasTheme.paper).foregroundStyle(AtlasTheme.ink).tint(AtlasTheme.accent)
            .task {
                store.reduceMotion=reduceMotion
                await store.load()
                guard resources == nil else { return }
                do { resources=try MetalResources() } catch { initializationError=error.localizedDescription }
            }
            .onChange(of:reduceMotion) { _,value in store.reduceMotion=value }
            .onChange(of:phase) { _,value in store.isActive=value == .active;if value != .active { store.audio.stop() } }
            .onChange(of:store.panel) { _,_ in if !wide { compactPanel=true } }
            .onChange(of:store.selected?.id) { _,_ in if !wide { compactPanel=true } }
            .sheet(isPresented:$store.showSources) { SourcesView(store:store) }
            .preferredColorScheme(.light)
        }
    }
    private func header(compact: Bool) -> some View {
        HStack(spacing:12) {
            Text(store.countryName).font(.system(compact ? .title2 : .largeTitle,design:.serif)).fontWeight(.semibold)
            Text(store.pack?.manifest.local ?? "").font(compact ? .title3 : .title2).foregroundStyle(AtlasTheme.muted)
            Spacer()
            if let flag=store.pack?.manifest.flag { FlagButton(file:flag,title:"Inspect \(store.countryName) flag") { store.flagPath=flag } }
            Button { store.showSources=true } label:{Image(systemName:"info.circle").frame(width:44,height:44)}.accessibilityLabel("Sources and prototype information")
        }.padding(.horizontal,24).padding(.vertical,10).overlay(alignment:.bottom) { Rectangle().fill(AtlasTheme.accent.opacity(0.2)).frame(height:1) }
    }
    private var mapControls: some View {
        VStack(spacing:8) {
            mapButton("plus",label:"Zoom in") { store.camera.change { $0.zoom *= 1.35 } }
            mapButton("minus",label:"Zoom out") { store.camera.change { $0.zoom /= 1.35 } }
            mapButton("globe.asia.australia",label:"Show whole globe") { store.camera.change { $0.zoom = 0.85 } }
            mapButton("arrow.counterclockwise",label:"Return to China") { store.camera.home() }
        }.padding(6).background(.regularMaterial,in:RoundedRectangle(cornerRadius:12))
    }
    private func mapButton(_ symbol:String,label:String,action:@escaping()->Void) -> some View {
        Button(action:action) { Image(systemName:symbol).frame(width:44,height:44) }.accessibilityLabel(label)
    }
}

@MainActor struct FlagButton: View {
    let file: String
    let title: String
    let action: () -> Void
    var body: some View {
        Button(action:action) {
            if let image=FlagThumbnails.image(file) {
                Image(uiImage:image).resizable().scaledToFit().frame(width:52,height:36).clipShape(RoundedRectangle(cornerRadius:4))
            } else { Image(systemName:"flag").frame(width:52,height:36) }
        }.frame(minWidth:52,minHeight:44).accessibilityLabel(title)
    }
}

@MainActor struct FlagPresentation: ViewModifier {
    @ObservedObject var store: AtlasStore
    let resources: MetalResources
    let enabled: Bool
    func body(content: Content) -> some View {
        content.sheet(isPresented:Binding(get:{enabled && store.flagPath != nil},set:{if !$0 {store.flagPath=nil;resources.releaseFlag()}})) {
            if let path=store.flagPath {FlagInspector(store:store,resources:resources,path:path)}
        }
    }
}

@MainActor enum FlagThumbnails {
    private static let cache: NSCache<NSString,UIImage> = {
        let cache=NSCache<NSString,UIImage>();cache.countLimit=4;cache.totalCostLimit=512*1024;return cache
    }()
    static func image(_ file: String) -> UIImage? {
        if let image=cache.object(forKey:file as NSString) {return image}
        guard let url=try? BundledCountryRepository.url(file),
              let source=CGImageSourceCreateWithURL(url as CFURL,nil) else {return nil}
        let options: [CFString:Any] = [kCGImageSourceCreateThumbnailFromImageAlways:true,kCGImageSourceThumbnailMaxPixelSize:156,kCGImageSourceCreateThumbnailWithTransform:true]
        guard let cgImage=CGImageSourceCreateThumbnailAtIndex(source,0,options as CFDictionary) else {return nil}
        let image=UIImage(cgImage:cgImage);cache.setObject(image,forKey:file as NSString,cost:cgImage.width*cgImage.height*4);return image
    }
}

@MainActor struct FlagInspector: View {
    @ObservedObject var store: AtlasStore
    let resources: MetalResources
    let path: String
    var body: some View {
        NavigationStack {
            AtlasMetalView(store:store,resources:resources,scene:.flag(path))
                .navigationTitle("Flag").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement:.topBarLeading) {
                        Button(store.flagPaused ? "Play" : "Pause") { store.flagPaused.toggle() }.disabled(store.reduceMotion)
                    }
                    ToolbarItem(placement:.topBarTrailing) { Button("Done") { store.flagPath=nil;resources.releaseFlag() } }
                }
                .safeAreaInset(edge:.bottom) { Text("Drag to rotate").font(.footnote).foregroundStyle(.secondary).padding() }
        }.presentationDetents([.large])
    }
}

@MainActor struct SourcesView: View {
    @ObservedObject var store: AtlasStore
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            List {
                Section("Boundary Atlas for iPad") {
                    Text("China provincial prototype").font(.headline)
                    Text("34 present-day provincial-level divisions, an interactive native globe, cards, local pronunciation, three quiz modes and a three-dimensional flag viewer.")
                    Text("Historical snapshots and lower administrative levels are not included. Geography follows the website's retained scope.")
                }
                Section("Sources") { ForEach(store.pack?.manifest.sources ?? [],id:\.url) { source in if let url=URL(string:source.url) { Link(source.title,destination:url) } } }
                Section("Audio") { Text("Locally stored, AI-generated Mandarin recordings using ElevenLabs' Daniel voice. Pronunciation remains subject to listening review.") }
            }.navigationTitle("About & sources").toolbar { Button("Done") { dismiss() } }
        }
    }
}
