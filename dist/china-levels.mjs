// Shared by the page and the China data worker.
export function isPrefectureLevel(p){return p.level==='taiwan-region'||p.level==='city'&&String(p.adcode).slice(2,4)!=='90';}
