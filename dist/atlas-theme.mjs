const palettes={philippines:{background:'#edf2f8'},indonesia:{background:'#faf1ef'},japan:{background:'#f5f5f5'},
 china:{background:'#f4f0e7'},
 korea:{background:'#edf1f6'},
 mongolia:{background:'#eaf1f5'}
};
export function applyAtlasTheme(map,country){
 document.body.dataset.atlas=country;
 document.documentElement.dataset.atlas=country;
 map.setPaintProperty('background','background-color',palettes[country].background);
}
