/* Baukarussell text and form undo / redo.
 * Browser-session only. Separate histories per event, member, project, invitation and page.
 * Does not publish or write data to GitHub. File uploads and removed entities are excluded.
 */
(function(){
 'use strict';
 const ids=['editor','page-editor','member-editor','project-editor','registration-editor'];
 const sections=ids.map(id=>document.getElementById(id)).filter(Boolean);
 const histories=new Map();
 let restoring=false;

 function context(target){
   const root=sections.find(section=>section.contains(target));
   if(!root||root.classList.contains('hidden'))return null;
   const key=root.dataset.historyKey;
   return key?{root,key}:null;
 }
 function state(key){
   if(!histories.has(key))histories.set(key,{undo:[],redo:[],known:new WeakMap(),selection:new WeakMap()});
   return histories.get(key);
 }
 function eligible(target){
   if(!target||!target.matches?.('input,textarea,select'))return false;
   if(target.matches('input[type="file"],input[type="hidden"],input[type="button"],input[type="submit"],input[type="reset"]'))return false;
   if(target.disabled||target.readOnly)return false;
   return true;
 }
 function read(target){
   if(target.matches('input[type="checkbox"],input[type="radio"]'))return target.checked;
   return target.value;
 }
 function apply(target,value){
   if(target.matches('input[type="checkbox"],input[type="radio"]'))target.checked=Boolean(value);
   else target.value=String(value);
 }
 function record(event){
   if(restoring||event.isComposing||!eligible(event.target))return;
   const ctx=context(event.target);
   if(!ctx)return;
   const target=event.target,h=state(ctx.key),after=read(target);
   if(!h.known.has(target)){h.known.set(target,after);return;}
   const before=h.known.get(target);
   if(before===after)return;
   const now=Date.now();
   const inputType=String(event.inputType||event.type);
   const typing=['insertText','deleteContentBackward','deleteContentForward'].includes(inputType);
   const latest=h.undo[h.undo.length-1];
   const merge=!!latest&&latest.target===target&&latest.typing&&typing
     &&latest.inputType===inputType&&now-latest.at<850&&latest.after===before;
   if(merge){
     latest.after=after;latest.at=now;latest.afterSelection=selection(target);
   }else{
     h.undo.push({
       target,before,after,at:now,inputType,typing,
       beforeSelection:h.selection.get(target)||selection(target),
       afterSelection:selection(target)
     });
     if(h.undo.length>100)h.undo.shift();
   }
   h.redo.length=0;
   h.known.set(target,after);
   h.selection.delete(target);
   updateButtons();
 }
 function selection(element){
   try{
     if(typeof element.selectionStart==='number'&&typeof element.selectionEnd==='number'){
       return [element.selectionStart,element.selectionEnd];
     }
   }catch(_){/* Date, number and other inputs have no selection positions. */}
   return null;
 }
 function restoreSelection(element,range){
   if(!range)return;
   try{element.setSelectionRange(range[0],range[1]);}catch(_){}
 }
 function available(h,root,kind){
   return h[kind].some(entry=>entry.target.isConnected&&root.contains(entry.target));
 }
 function updateButtons(){
   for(const root of sections){
     const h=histories.get(root.dataset.historyKey);
     const canUndo=!!h&&available(h,root,'undo');
     const canRedo=!!h&&available(h,root,'redo');
     for(const button of root.querySelectorAll('[data-bk-undo]'))button.disabled=!canUndo;
     for(const button of root.querySelectorAll('[data-bk-redo]'))button.disabled=!canRedo;
   }
 }
 function step(direction,root){
   const key=root.dataset.historyKey;
   if(!key)return;
   const h=histories.get(key);
   if(!h)return;
   const from=direction==='undo'?h.undo:h.redo;
   const to=direction==='undo'?h.redo:h.undo;
   while(from.length){
     const item=from.pop();
     if(!item.target.isConnected||!root.contains(item.target))continue;
     restoring=true;
     try{
       apply(item.target,direction==='undo'?item.before:item.after);
       h.known.set(item.target,read(item.target));
       h.selection.delete(item.target);
       item.target.focus({preventScroll:true});
       restoreSelection(item.target,direction==='undo'?item.beforeSelection:item.afterSelection);
       // Existing editor input handlers update previews and temporary draft snapshots.
       item.target.dispatchEvent(new Event('input',{bubbles:true}));
       if(item.target.matches('select,input[type="checkbox"],input[type="radio"]')){
         item.target.dispatchEvent(new Event('change',{bubbles:true}));
       }
       to.push(item);
     }finally{restoring=false;}
     break;
   }
   updateButtons();
 }
 function control(kind,inline=false){
   const button=document.createElement('button');
   button.type='button';
   button.className='bk-undo-button'+(inline?' bk-undo-inline':'');
   button.dataset[kind==='undo'?'bkUndo':'bkRedo']='';
   button.title=kind==='undo'?'Letzte Änderung rückgängig machen (Ctrl + Z)':'Änderung wiederholen (Ctrl + Y)';
   button.setAttribute('aria-label',kind==='undo'?'Rückgängig':'Wiederholen');
   const arrow=document.createElement('span');
   arrow.className='bk-undo-arrow';
   arrow.textContent=kind==='undo'?'↶':'↷';
   const label=document.createElement('span');
   label.textContent=kind==='undo'?'Rückgängig':'Wiederholen';
   button.append(arrow,label);
   button.disabled=true;
   // Keep the textarea selection while clicking Undo in the text toolbar.
   if(inline)button.addEventListener('mousedown',event=>event.preventDefault());
   button.addEventListener('click',()=>{
     const root=sections.find(s=>s.contains(button));
     if(root)step(kind,root);
   });
   return button;
 }
 function addControls(root){
   const header=root.querySelector('.hero-heading');
   if(!header)return;
   const holder=header.querySelector('.editor-actions,.manager-actions')||header;
   const controls=document.createElement('div');controls.className='bk-undo-controls';
   controls.append(control('undo'),control('redo'));
   if(holder===header){
     const save=header.querySelector('button.btn');
     header.insertBefore(controls,save||null);
   }else holder.prepend(controls);
   // The editor's native formatting toolbar gets its own Undo / Redo pair.
   for(const area of root.querySelectorAll('textarea')){
     const bar=document.createElement('div');bar.className='bk-undo-text-controls';
     bar.append(control('undo',true),control('redo',true));
     if(area.id==='e-text'){
       const toolbar=area.parentElement.querySelector('.toolbar');
       if(toolbar)toolbar.prepend(bar);
       else area.before(bar);
     }else area.before(bar);
   }
   if(root.id!=='editor'){
     const note=document.createElement('div');note.className='bk-undo-local-note';
     note.textContent='Automatische Vorschau im Browser · nicht veröffentlicht';
     // A simple status under the heading is enough; no redundant "Lokal merken" button.
     const title=header.querySelector('h1');
     if(title)title.insertAdjacentElement('afterend',note);
   }
 }
 for(const section of sections){
   addControls(section);
   new MutationObserver(updateButtons).observe(section,{attributes:true,attributeFilter:['class','data-history-key']});
 }
 document.addEventListener('focusin',event=>{
   if(restoring||!eligible(event.target))return;
   const ctx=context(event.target);if(!ctx)return;
   state(ctx.key).known.set(event.target,read(event.target));
 });
 document.addEventListener('beforeinput',event=>{
   if(restoring||!eligible(event.target))return;
   const ctx=context(event.target);if(!ctx)return;
   const h=state(ctx.key);
   if(!h.known.has(event.target))h.known.set(event.target,read(event.target));
   h.selection.set(event.target,selection(event.target));
 });
 document.addEventListener('input',record);
 document.addEventListener('change',record);
 document.addEventListener('keydown',event=>{
   if(event.defaultPrevented||event.altKey||!(event.ctrlKey||event.metaKey))return;
   const ctx=context(event.target);
   if(!ctx)return;
   const k=String(event.key).toLowerCase();
   const action=(k==='z'&&!event.shiftKey)?'undo':
      (k==='y'||k==='z'&&event.shiftKey)?'redo':null;
   if(!action)return;
   // Do not fall back to the browser's unrelated native history after our
   // custom Undo stack has been exhausted.
   event.preventDefault();
   const h=histories.get(ctx.key);
   if(h&&available(h,ctx.root,action))step(action,ctx.root);
 },true);
 updateButtons();
})();
