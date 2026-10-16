/* Browser-local deterministic SVG photos and guarded phase transitions. */
(function(root){
 'use strict';
 function framing(input={}) {
  const bounded=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Number(n):0));
  return Object.freeze({x:bounded(input.x,-90,90),y:bounded(input.y,-55,55)});
 }
 function photoSvg(input) {
  const f=framing(input),x=160+f.x,y=94+f.y;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><radialGradient id="ocean" cx="35%" cy="30%"><stop stop-color="#75c8e4"/><stop offset=".55" stop-color="#237bb0"/><stop offset="1" stop-color="#103456"/></radialGradient><clipPath id="globe"><circle r="78"/></clipPath><linearGradient id="shade"><stop stop-color="#06172b" stop-opacity="0"/><stop offset="1" stop-color="#06172b" stop-opacity=".7"/></linearGradient></defs><rect width="320" height="180" fill="#071724"/><g fill="#c5deea"><circle cx="24" cy="26" r="1.3"/><circle cx="283" cy="40" r="1.1"/><circle cx="270" cy="154" r="1"/><circle cx="49" cy="147" r="1.2"/></g><g transform="translate(${x} ${y})"><circle r="82" fill="#5aa9d7" opacity=".16"/><circle r="78" fill="url(#ocean)"/><g clip-path="url(#globe)"><path d="M-66-38l23-26 27 3 14 19-16 16-13 1-10 22-22-2-15-20zM-16-3l25 3 13 23-7 18-4 25-13 14-13-34-7-16zM16-67l39 10 29 25-12 16-30-7-5 18-20-13 9-13-16-12zM46 28l23-5 15 17-17 13-23-7z" fill="#8ab67e" stroke="#c1d5a4" stroke-width="1.2"/><path d="M-80-16q44-19 85 0t78-8M-71 27q36-14 71 3t76-3M-38-69q20 5 39-3" fill="none" stroke="#f0f9fb" stroke-width="9" opacity=".6" stroke-linecap="round"/><circle r="78" fill="url(#shade)"/></g><circle r="78" fill="none" stroke="#c6e6f6" stroke-width="1.3" opacity=".55"/></g></svg>`;
 }
 function capture(input) {
  const frame=framing(input);
  return Object.freeze({frame,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(photoSvg(frame))});
 }
 const transitions={attach:{attach:'attaching'},attaching:{finish:'frame',skip:'frame'},frame:{capture:'review'},review:{send:'sending',retake:'frame'},sending:{finish:'complete',skip:'complete'},complete:{retake:'frame'}};
 function nextPhase(phase,event){return Object.hasOwn(transitions,phase)&&Object.hasOwn(transitions[phase],event)?transitions[phase][event]:phase;}
 function primaryActionGate(interval=350){
  let last=-Infinity;
  return Object.freeze({accept(now){if(!Number.isFinite(now)||now-last<interval)return false;last=now;return true;},reset(){last=-Infinity;}});
 }
 root.OrbitPhoto=Object.freeze({framing,photoSvg,capture,nextPhase,primaryActionGate});
 if(typeof module==='object'&&module.exports)module.exports=root.OrbitPhoto;
})(typeof globalThis!=='undefined'?globalThis:this);
