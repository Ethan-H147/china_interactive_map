import {usSportsQuizzes} from './us-sports-definitions.mjs';
export const miscellaneousQuizzes=[
 {id:'misc-college-towns',label:'College towns',plural:'College towns',singular:'college town',description:'Find 44 college towns from their universities. Harvard and MIT share Cambridge; famous major-city campuses are omitted.'},
 {id:'misc-civil-war',label:'Civil War battlefields',plural:'Battlefields',singular:'battlefield',description:'Famous Civil War battlefields, shown as representative dots within NPS battlefield study areas.'},
 {id:'misc-national-parks',label:'National parks',plural:'National parks',singular:'national park',description:'All 63 national parks, using NPS legislative boundary polygons. New River Gorge includes its jointly designated preserve.'},
 {id:'misc-sports-towns',label:'Sports towns',plural:'Sports towns',singular:'sports town',description:'Locate the home city associated with a major NFL, NBA, MLB or NHL team. Dots mark city centers, rather than stadiums in neighboring municipalities.'},
 {id:'misc-revolution',label:'Revolutionary battlefields',plural:'Battlefields',singular:'battlefield',description:'Major American Revolutionary War battlefields, including grouped Lexington–Concord and Saratoga sites.'},
 {id:'misc-presidents',label:'Presidential birthplaces',plural:'Birthplaces',singular:'presidential birthplace',description:'Birthplaces of all 45 individual US presidents through October 2026. Both Adams presidents share one Quincy dot; repeat presidencies appear once.'}
];
export const usMiscQuizzes=[...miscellaneousQuizzes,...usSportsQuizzes];
