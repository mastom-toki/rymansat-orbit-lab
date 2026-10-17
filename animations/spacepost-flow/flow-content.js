/* Only predefined examples may select the card; arbitrary query text is ignored. */
(function(root){
'use strict';
function select(content,params){
 const key=params.get('wish');
 const lines=typeof key==='string'&&/^[0-9]+$/.test(key)&&content.wishChoices?.[Number(key)];
 return {...content,wish:(Array.isArray(lines)?lines:content.wish).slice()};
}
const api={select};if(typeof module==='object'&&module.exports)module.exports=api;else root.SpacepostContent=api;
})(typeof window==='object'?window:globalThis);
