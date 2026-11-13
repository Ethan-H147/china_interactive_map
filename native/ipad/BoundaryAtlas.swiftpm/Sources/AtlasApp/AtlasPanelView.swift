import SwiftUI
import AtlasCore

@MainActor struct AtlasPanelView: View {
    @ObservedObject var store: AtlasStore
    @FocusState private var answerFocused: Bool
    var body: some View {
        VStack(spacing:0) {
            Picker("Panel",selection:$store.panel) {
                ForEach(AtlasPanel.allCases,id:\.self) { Text($0.rawValue).tag($0) }
            }.pickerStyle(.segmented).padding(.horizontal,20).padding(.top,22).padding(.bottom,16)
            Divider()
            ScrollView {
                VStack(alignment:.leading,spacing:24) {
                    switch store.panel {
                    case .settings: settings
                    case .discover: discover
                    case .quiz: quiz
                    }
                }.padding(24).frame(maxWidth:.infinity,alignment:.leading)
            }.scrollDismissesKeyboard(.interactively)
        }.foregroundStyle(AtlasTheme.ink).tint(AtlasTheme.accent)
    }
    private var settings: some View {
        VStack(alignment:.leading,spacing:24) {
            Text(store.plural).font(.system(.title2,design:.serif))
            Toggle("Place labels",isOn:$store.showLabels)
            Picker("Label language",selection:$store.labels) {
                ForEach(LabelLanguage.allCases,id:\.self) { Text($0.rawValue).tag($0) }
            }.pickerStyle(.menu)
            Button { store.camera.home() } label: { Label("Return to China",systemImage:"arrow.counterclockwise") }
            Divider()
            regionSearch
        }
    }
    @ViewBuilder private var discover: some View {
        if let selected=store.selected {
            Button("All \(store.countryName)") { store.clearSelection() }.font(.subheadline).underline()
            RegionCard(region:selected,audio:store.audio,inspect:{store.flagPath=$0})
            Divider()
            regionSearch
        } else {
            Text("Explore \(store.countryName)").font(.system(.title2,design:.serif))
            Text("Tap a \(store.singular) on the globe or choose one below.").foregroundStyle(AtlasTheme.muted)
            regionSearch
        }
    }
    private var regionSearch: some View {
        VStack(alignment:.leading,spacing:12) {
            HStack {
                Image(systemName:"magnifyingglass").foregroundStyle(AtlasTheme.muted)
                TextField("Find a \(store.singular)",text:$store.search).textInputAutocapitalization(.never).autocorrectionDisabled()
                if !store.search.isEmpty { Button {store.search=""} label: {Image(systemName:"xmark.circle.fill")}.accessibilityLabel("Clear search") }
            }.padding(12).background(Color.white,in:RoundedRectangle(cornerRadius:8)).overlay(RoundedRectangle(cornerRadius:8).stroke(AtlasTheme.muted.opacity(0.25)))
            if store.visibleRegions.isEmpty { Text("No matching provinces").foregroundStyle(.secondary) }
            LazyVStack(spacing:0) {
                ForEach(store.visibleRegions) { region in
                    Button { store.select(region,focus:true) } label: {
                        HStack {
                            VStack(alignment:.leading,spacing:4) {
                                Text(region.english).font(.body)
                                Text(region.local).font(.subheadline).foregroundStyle(AtlasTheme.muted)
                            }
                            Spacer();Image(systemName:"chevron.right").font(.caption).foregroundStyle(AtlasTheme.muted)
                        }.padding(.vertical,12).frame(minHeight:54).contentShape(Rectangle())
                    }.buttonStyle(.plain)
                    Divider().opacity(0.4)
                }
            }
        }
    }
    @ViewBuilder private var quiz: some View {
        if let round=store.round {
            HStack { Text(round.progress).monospacedDigit().font(.headline);Spacer();Button("End quiz") { answerFocused=false;store.endQuiz() } }
            ProgressView(value:Double(round.answered.count),total:Double(max(1,round.order.count)))
            if round.complete {
                Text("Round complete").font(.system(.title,design:.serif))
                Text("\(round.correct) correct of \(round.order.count)").font(.title3)
                Text("\(round.attempts) attempts").foregroundStyle(.secondary)
                Button("Play again") { store.startQuiz() }.buttonStyle(.borderedProminent)
            } else {
                switch round.mode {
                case .identify:
                    Text("Name the highlighted \(store.singular)").font(.system(.title2,design:.serif))
                    if let target=store.target { Button { store.camera.focus(target) } label: {Label("Locate highlight",systemImage:"scope")} }
                    answerEntry
                case .nameAll:
                    Text("Name every \(store.singular)").font(.system(.title2,design:.serif))
                    answerEntry
                case .find:
                    Text("Find on the globe").font(.subheadline).foregroundStyle(AtlasTheme.muted)
                    Text(store.target?.english ?? "").font(.system(.largeTitle,design:.serif))
                    Text("Tap its shape on the globe.").foregroundStyle(AtlasTheme.muted)
                    DisclosureGroup("Choose from a list") {
                        ForEach(store.regions) { region in
                            Button(region.english) { store.select(region) }.frame(minHeight:44)
                        }
                    }.font(.subheadline)
                }
                if !round.feedback.isEmpty {
                    Text(round.feedback).font(.subheadline).foregroundStyle(round.lastWasCorrect == true ? Color.green : AtlasTheme.accent)
                        .accessibilityAddTraits(.updatesFrequently)
                }
                Button("Skip") { answerFocused=false;store.round?.skip(regions:store.regions);store.answer="" }.font(.subheadline)
            }
        } else {
            Text("\(store.countryName) quiz").font(.system(.largeTitle,design:.serif))
            Text("\(store.regions.count) \(store.plural.lowercased())").foregroundStyle(AtlasTheme.muted)
            Picker("Quiz mode",selection:$store.quizMode) {
                ForEach(QuizMode.allCases) { Text($0.rawValue).tag($0) }
            }.pickerStyle(.inline).labelsHidden()
            Text("English and Chinese names are accepted. Place labels and cards stay hidden during a round.").font(.subheadline).foregroundStyle(AtlasTheme.muted)
            Button("Start quiz") { store.startQuiz() }.buttonStyle(.borderedProminent).controlSize(.large)
        }
    }
    private var answerEntry: some View {
        VStack(alignment:.leading,spacing:12) {
            TextField("\(store.singular.capitalized) name",text:$store.answer).textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.go)
                .focused($answerFocused).onSubmit { store.submit() }
            Button("Check answer") { store.submit() }.buttonStyle(.borderedProminent)
                .disabled(store.answer.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty)
        }
    }
}

@MainActor struct RegionCard: View {
    let region: Region
    @ObservedObject var audio: PronunciationPlayer
    let inspect: (String) -> Void
    var body: some View {
        VStack(alignment:.leading,spacing:20) {
            HStack {
                Text(region.kind.uppercased()).font(.caption.weight(.semibold)).tracking(1.4).foregroundStyle(AtlasTheme.accent)
                Spacer()
                if let flag=region.flag { FlagButton(file:flag,title:"Inspect flag of \(region.english)") {inspect(flag)} }
            }
            Text(region.english).font(.system(.largeTitle,design:.serif)).fixedSize(horizontal:false,vertical:true)
            HStack(alignment:.firstTextBaseline,spacing:4) {
                Text(region.local).font(.title2).foregroundStyle(AtlasTheme.muted)
                Button { audio.play(region) } label: {
                    Image(systemName:audio.playingID==region.id ? "stop.fill" : "speaker.wave.2")
                        .font(.system(size:14)).frame(width:32,height:32).contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityLabel("\(audio.playingID==region.id ? "Stop" : "Play") Mandarin pronunciation of \(region.english), AI generated")
            }
            ForEach(region.names,id:\.self) { name in
                VStack(alignment:.leading,spacing:5) {
                    Text(name.label).font(.caption).foregroundStyle(AtlasTheme.muted)
                    Text(name.text).font(name.language=="bo" ? .custom("NotoSerifTibetan-Regular",size:23,relativeTo:.title3) : name.language=="mn" ? .custom("NotoSansMongolian-Regular",size:23,relativeTo:.title3) : .title3)
                }
            }
            if let error=audio.error { Text(error).font(.footnote).foregroundStyle(AtlasTheme.accent) }
            ForEach(Array(region.facts.enumerated()),id:\.offset) { _,fact in
                Divider()
                VStack(alignment:.leading,spacing:7) {
                    Text(fact.label).font(.subheadline.weight(.semibold))
                    Text(fact.value).font(.system(.title2,design:.serif))
                    HStack(alignment:.firstTextBaseline) {
                        Text(fact.detail).font(.caption).foregroundStyle(AtlasTheme.muted)
                        if let source=fact.source,let url=URL(string:source) { Link("Source",destination:url).font(.caption) }
                    }
                }
            }
        }
    }
}
