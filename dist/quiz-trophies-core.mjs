export const quizTrophies=Object.freeze([
 {country:'china',name:'Jade disc',material:'Jade · brushed brass',description:'A carved jade disc held in a slender brass cradle.',goal:'Perfect a full provincial quiz',minimum:34,tint:'#e4eee8',file:'data/trophies/china.glb',poster:'data/trophies/china.webp'},
 {country:'japan',name:'Vermilion torii',material:'Vermilion lacquer · brass',description:'An upturned torii gate with brass collars and folded paper streamers.',goal:'Perfect a full prefecture quiz',minimum:47,tint:'#f1e5df',file:'data/trophies/japan.glb',poster:'data/trophies/japan.webp'},
 {country:'united-states',name:'Liberty bell',material:'Cast brass · walnut',description:'A miniature bell with its signature crack, suspended from a walnut yoke.',goal:'Perfect a full States & DC quiz',minimum:51,tint:'#e8eaf0',file:'data/trophies/united-states.glb',poster:'data/trophies/united-states.webp'},
 {country:'france',name:'Brass tower',material:'Brass · dark stone',description:'An open lattice miniature inspired by the Eiffel Tower.',goal:'Perfect a full region quiz',minimum:13,tint:'#eee9dc',file:'data/trophies/france.glb',poster:'data/trophies/france.webp'}
]);
export function trophyProgress(trophy,snapshot){
 const candidates=(snapshot?.bests||[]).filter(a=>a.country===trophy.country&&a.level===1&&a.fullRound&&!a.scope&&a.total>=trophy.minimum),earned=candidates.filter(a=>Number.isFinite(a.fastestMs)&&a.fastestMs>0).sort((a,b)=>a.fastestMs-b.fastestMs)[0],best=earned||candidates.sort((a,b)=>b.bestCorrect/b.total-a.bestCorrect/a.total)[0];
 return{earned:!!earned,correct:best?.bestCorrect||0,total:best?.total||trophy.minimum,percent:best?Math.round(best.bestCorrect/best.total*100):0,fastestMs:earned?.fastestMs??null};
}
