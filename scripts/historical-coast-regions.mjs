export const coastRegions=[
 {id:'new-england',name:'Maine, New Hampshire, Massachusetts, Rhode Island',bounds:[-71.5,40.8,-66.8,45.2]},
 {id:'new-york-new-jersey',name:'Long Island, New York Harbor, New Jersey',bounds:[-75.8,38.8,-71.5,41.4]},
 {id:'chesapeake',name:'Delaware, Maryland and Virginia estuaries',bounds:[-77.5,36.4,-74.8,39.8]},
 {id:'carolinas-georgia',name:'North Carolina, South Carolina and Georgia',bounds:[-81.5,30.6,-75.4,36.4]},
 {id:'florida',name:'Florida Atlantic, Keys and Gulf shores',bounds:[-87.7,24.1,-79.8,30.6]},
 {id:'northern-gulf',name:'Alabama, Mississippi and Louisiana',bounds:[-94,28,-87.7,31.1]},
 {id:'texas',name:'Texas Gulf coast',bounds:[-98,25.5,-94,30]},
 {id:'california',name:'California Pacific coast',bounds:[-125,32.3,-117,42]},
 {id:'pacific-northwest',name:'Oregon, Washington and Puget Sound',bounds:[-125.5,42,-121.3,49.1]},
 {id:'great-lakes',name:'Lower Great Lakes and New York lake shores',bounds:[-93,41.3,-75.8,49.4]},
 {id:'hawaii',name:'Hawaiian islands',bounds:[-161,18,-154,23]}
];
export const reviewViews=[
 ['maine',[-68.7,44.25],8],['cape-cod',[-70.2,41.75],8.5],['long-island',[-73,40.9],8],['new-jersey',[-74.25,39.8],8],['chesapeake',[-76.2,38.1],7.8],['outer-banks',[-76,35.7],7.6],['georgia',[-81.2,31.7],8],['florida-atlantic',[-80.3,27.3],7.5],['florida-keys',[-81,24.9],7.8],['florida-gulf',[-82.7,28.2],7.5],['louisiana',[-90.5,29.4],7.5],['texas-galveston',[-95,29.2],7.7],['texas-laguna-madre',[-97.4,26.8],7.5],['california-bays',[-122.3,37.8],8],['oregon',[-124,44.5],7.5],['puget-sound',[-122.65,48],7.6],['great-lakes',[-83.3,43],7.5],['hawaii',[-157.8,21.4],8]
];

// Include estuary heads and adjoining mainland, so a review window never cuts
// through the shoreline correction itself. Political face partitions are unchanged.
for(const region of coastRegions){region.reviewBounds=[...region.bounds];region.bounds=region.bounds.map((v,i)=>v+(i<2?-1.5:1.5));}
