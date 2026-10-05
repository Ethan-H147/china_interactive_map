const palettes={japan:{background:'#f5f5f5'},
 china:{background:'#f4f0e7'},
 korea:{background:'#edf1f6'},
 mongolia:{background:'#eaf1f5'}
};
export function applyAtlasTheme(map,country){
 document.body.dataset.atlas=country;
 document.documentElement.dataset.atlas=country;
 map.setPaintProperty('background','background-color',palettes[country].background);
}
