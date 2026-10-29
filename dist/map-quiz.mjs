import {createFirstLevelQuiz} from './first-level-quiz.mjs';

// Quizzes borrow the country's installed map. No quiz geography or duplicate
// sources are loaded; the country adapter prepares its normal division layers.
export function createQuizMapSession(map,atlas,country,native=atlas.quizMap){
 const owns=native.owns||((source)=>typeof source==='string'&&source.startsWith(country+'-'));
 let snapshot=new Map(),reviewPaints=new Map(),reviewed=null,active=false,enforcing=false,frame;
 const fills=()=>native.fillLayers().filter(id=>map.getLayer(id));
 const lines=()=>native.lineLayers().filter(id=>map.getLayer(id));
 function enforce(){
  if(!active||enforcing)return;enforcing=true;
  try{
   const visible=new Set([...fills(),...lines(),...(reviewed?reviewPaints.keys():[])]);
   for(const layer of map.getStyle().layers)if(owns(layer.source)){
    if(!snapshot.has(layer.id))snapshot.set(layer.id,{visibility:map.getLayoutProperty(layer.id,'visibility')||'visible'});
    const visibility=visible.has(layer.id)?'visible':'none';
    if((map.getLayoutProperty(layer.id,'visibility')||'visible')!==visibility)map.setLayoutProperty(layer.id,'visibility',visibility);
   }
   atlas.pauseLabels?.();
  }finally{enforcing=false;}
 }
 map.on('styledata',()=>{if(!active||frame)return;frame=requestAnimationFrame(()=>{frame=null;enforce();});});
 return{
  fills,lines,owns,capture:()=>native.capture(),
  async begin(){snapshot.clear();await native.begin();},
  setActive(value){active=value;document.getElementById('map-shell').dataset.quizOverlay=String(value);if(value)enforce();else{for(const [id,saved]of snapshot)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',saved.visibility);for(const [id,saved]of reviewPaints)if(map.getLayer(id)){map.setFilter(id,saved.filter||null);map.setPaintProperty(id,'line-color',saved.color);map.setPaintProperty(id,'line-opacity',saved.opacity);}snapshot.clear();reviewPaints.clear();reviewed=null;}},
  async restore(saved){await native.restore(saved);atlas.sync?.();atlas.updateLabels?.();},
  mark(record,state){for(const fill of fills()){const source=map.getLayer(fill).source;if(map.getSource(source))for(const id of native.featureIds?.(record)||[record.id])map.setFeatureState({source,id},state);}},
  pick(point){const layers=fills(),hit=layers.length?map.queryRenderedFeatures(point,{layers})[0]:null;return hit?(native.recordId?.(hit)||hit.properties.id):null;},
  review(record,state={}){
   if(!active)return;
   reviewed=record;native.review?.(record);
   for(const fill of fills())for(const id of [fill.replace(/-fill$/,'-selected'),fill.replace(/-fill$/,'-selection')])if(map.getLayer(id)){
    if(!reviewPaints.has(id))reviewPaints.set(id,{filter:map.getFilter(id),color:map.getPaintProperty(id,'line-color'),opacity:map.getPaintProperty(id,'line-opacity')??1});
    map.setFilter(id,['==',native.idExpression||['get','id'],record?.id||'']);
    map.setPaintProperty(id,'line-color',state.wrong?'#b44737':state.target?'#926b16':'#548165');
    map.setPaintProperty(id,'line-opacity',1);
    map.setLayoutProperty(id,'visibility',record?'visible':'none');
   }
  }
 };
}

export function attachMapQuiz(map,host,country,atlas){
 if(atlas.quiz||!atlas.quizMap)return atlas.quiz;
 const native=atlas.quizMap,session=createQuizMapSession(map,atlas,country),prefix='quiz-'+country;
 const quiz=createFirstLevelQuiz(map,host,{country,sidebar:native.sidebar,prefix,mapQuiz:true,
  records:()=>native.records(),ready:()=>atlas.ready,
  idExpression:native.idExpression,fillLayers:session.fills,lineLayer:()=>session.lines()[0],
  capture:session.capture,begin:session.begin,restore:session.restore,
  hideLabels:()=>atlas.pauseLabels?.(),onActiveChange:()=>session.setActive(quiz.active),
  mark:session.mark,pick:session.pick,review:session.review
 });
 const home=atlas.home.bind(atlas);
 atlas.home=(...args)=>quiz.active?quiz.end():home(...args);
 const tab=document.getElementById(prefix+'-tab-quiz');
 quiz.setCountryActive=value=>{tab.hidden=!value;if(!value)quiz.panel.hidden=true;};
 const open=quiz.open;quiz.open=options=>{open(options);if(native.warm)void native.warm().then(()=>quiz.setup()).catch(()=>{});};tab.onclick=()=>quiz.open();
 atlas.quiz=quiz;return quiz;
}
