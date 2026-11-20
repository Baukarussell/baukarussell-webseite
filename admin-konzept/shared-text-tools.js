// Baukarussell test admin: shared text tools for freeform content fields.
// No HTML is stored or executed. Plain data fields (emails, addresses, dates)
// remain unchanged. The original records are preserved until the editor saves.
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const template=document.querySelector('#member-editor .member-text-tools');
 if(!template)return;
 const fonts={inter:"'Inter',Arial,sans-serif",cormorant:"'Cormorant Garamond',Georgia,serif",georgia:"Georgia,serif"};
 const colors={gold:'#b8945f',lightgold:'#d4b483',darkgold:'#94724b',bronze:'#a77d57',anthracite:'#30332f',slate:'#74776f',sage:'#60766b',wine:'#875a67'};
 const symbols={check:'✓',bullet:'•',diamond:'◆',arrow:'→',star:'★',circle:'○',square:'▪',up:'↗'};
 const re=/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\[pt=(10|11|12|14|16|18|20|24)\]([\s\S]*?)\[\/pt\]|\[font=(inter|cormorant|georgia)\]([\s\S]*?)\[\/font\]|\[color=(gold|lightgold|darkgold|bronze|anthracite|slate|sage|wine)\]([\s\S]*?)\[\/color\]|\[align=(left|center|justify)\]([\s\S]*?)\[\/align\]|\[line=(1\.4|1\.6|1\.8|2)\]([\s\S]*?)\[\/line\]|\*\*\*([\s\S]+?)\*\*\*|\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*/g;
 function child(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 function safeUrl(v){
  try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:''}catch(_){return ''}
 }
 function renderInline(parent,plain){
  const pattern=new RegExp(re.source,'g');let cursor=0,m;
  while((m=pattern.exec(plain))!==null){
   if(m.index>cursor)parent.append(document.createTextNode(plain.slice(cursor,m.index)));
   if(m[1]!==undefined){
    const href=safeUrl(m[2]);if(href){const n=child('a',m[1]);n.href=href;n.target='_blank';n.rel='noopener noreferrer';parent.append(n)}
    else parent.append(document.createTextNode(m[0]));
   }else if(m[3]!==undefined){const n=child('span');n.style.fontSize=m[3]+'pt';renderInline(n,m[4]);parent.append(n)}
   else if(m[5]!==undefined){const n=child('span');n.style.fontFamily=fonts[m[5]];renderInline(n,m[6]);parent.append(n)}
   else if(m[7]!==undefined){const n=child('span');n.style.color=colors[m[7]];renderInline(n,m[8]);parent.append(n)}
   else if(m[9]!==undefined){const n=child('span');n.style.display='block';n.style.textAlign=m[9];renderInline(n,m[10]);parent.append(n)}
   else if(m[11]!==undefined){const n=child('span');n.style.display='block';n.style.lineHeight=m[11];renderInline(n,m[12]);parent.append(n)}
   else if(m[13]!==undefined){const n=child('strong'),em=child('em');renderInline(em,m[13]);n.append(em);parent.append(n)}
   else if(m[14]!==undefined){const n=child('strong');renderInline(n,m[14]);parent.append(n)}
   else {const n=child('em');renderInline(n,m[15]);parent.append(n)}
   cursor=pattern.lastIndex;
  }
  if(cursor<plain.length)parent.append(document.createTextNode(plain.slice(cursor)));
 }
 function renderLines(parent,text){
  parent.replaceChildren();
  const raw=String(text||'').replace(/\r\n?/g,'\n');
  if(!raw)return;
  for(const line of raw.split('\n')){
   const isHeading=line.startsWith('## '),isBullet=line.startsWith('- ');
   const row=child(isHeading?'h4':'div');
   row.style.whiteSpace='pre-wrap';row.style.minHeight='1.5em';row.style.margin='0';row.style.lineHeight='1.7';
   if(isBullet)row.append(document.createTextNode('• '));
   const part=isHeading?line.slice(3):isBullet?line.slice(2):line;
   if(part)renderInline(row,part);else row.append(document.createTextNode('\u00a0'));
   parent.append(row);
  }
 }
 const casePreserve=/https?:\/\/[^\s)]+|\[\/?(?:pt(?:=(?:10|11|12|14|16|18|20|24))?|font(?:=(?:inter|cormorant|georgia))?|color(?:=(?:gold|lightgold|darkgold|bronze|anthracite|slate|sage|wine))?|align(?:=(?:left|center|justify))?|line(?:=(?:1\.4|1\.6|1\.8|2))?)\]/gi;
 function caseText(value,upper){
  const p=new RegExp(casePreserve.source,'gi');let result='',start=0,m;
  while((m=p.exec(value))!==null){result+=upper?value.slice(start,m.index).toLocaleUpperCase('de-CH'):value.slice(start,m.index).toLocaleLowerCase('de-CH');result+=m[0];start=p.lastIndex;}
  const tail=value.slice(start);return result+(upper?tail.toLocaleUpperCase('de-CH'):tail.toLocaleLowerCase('de-CH'));
 }
 function install(areaId){
  const area=$(areaId);if(!area||!area.parentNode)return;
  const toolbar=template.cloneNode(true);toolbar.classList.add('shared-text-toolbar');toolbar.setAttribute('aria-label','Text formatieren');
  for(const node of toolbar.querySelectorAll('[id]'))node.removeAttribute('id');
  area.parentNode.insertBefore(toolbar,area);
  if(areaId==='e-text'){
   const group=document.createElement('span');group.className='member-shared-extra';
   for(const [kind,label,title] of [['heading','H2','Zwischenüberschrift'],['list','☷','Aufzählung']]){
    const button=document.createElement('button');button.type='button';button.className='member-tool-case';
    button.textContent=label;button.title=title;button.setAttribute('aria-label',title);
    button.dataset.sharedExtra=kind;group.append(button);
   }
   const align=toolbar.querySelector('.member-align-tools');
   if(align)toolbar.insertBefore(group,align);
  }
  const edits=toolbar.querySelectorAll('button,select,summary');
  const font=toolbar.querySelector('.member-tool-font'),size=toolbar.querySelector('.member-tool-point');
  const colorMenu=toolbar.querySelector('.member-palette')?.closest('details');
  const symbolMenu=toolbar.querySelector('.member-symbol-picker')?.closest('details');
  const glyph=toolbar.querySelector('.member-color-glyph');
  const symbolGlyph=toolbar.querySelector('.member-symbol-current');
  const lineSelect=toolbar.querySelector('.member-line-tool select');
  const set=(start,end,replacement,position='select')=>{
   area.setRangeText(replacement,start,end,position);
   area.dispatchEvent(new Event('input',{bubbles:true}));area.focus();
  };
  const alertSelect=()=>{
   const box=window.BKAdmin?.toast;
   if(typeof box==='function')box('Bitte zuerst den Text markieren.');
   else area.focus();
  };
  const wrap=(tag,value)=>{
   const a=area.selectionStart,b=area.selectionEnd;
   if(a===b){alertSelect();return false}
   const raw=area.value.slice(a,b);
   const changed=raw.split('\n').map(line=>{
    if(!line.trim())return line;
    const old=new RegExp('^\\['+tag+'=[^\\]]+\\]([\\s\\S]*)\\[\\/'+tag+'\\]$').exec(line);
    return '['+tag+'='+value+']'+(old?old[1]:line)+'[/'+tag+']';
   }).join('\n');
   set(a,b,changed);return true;
  };
  const mark=(kind)=>{
   const a=area.selectionStart,b=area.selectionEnd,text=area.value.slice(a,b);
   if(kind==='uppercase'||kind==='lowercase'){
    if(!text)return alertSelect();
    return set(a,b,caseText(text,kind==='uppercase'));
   }
   let replacement='';
   if(kind==='bold')replacement='**'+(text||'Text')+'**';
   else if(kind==='italic')replacement='*'+(text||'Text')+'*';
   else if(kind==='link'){
    const url=window.prompt('Linkadresse eingeben (https://...)','https://');
    if(!url)return;
    if(!safeUrl(url)){window.BKAdmin?.toast?.('Bitte eine gültige Linkadresse eingeben.');return}
    replacement='['+(text||'Linktext')+']('+url+')';
   }
   if(replacement)set(a,b,replacement);
  };
  toolbar.querySelectorAll('[data-member-format]').forEach(btn=>btn.addEventListener('click',()=>mark(btn.dataset.memberFormat)));
  toolbar.querySelectorAll('[data-shared-extra]').forEach(button=>button.addEventListener('click',()=>{
   const start=area.selectionStart,end=area.selectionEnd,selected=area.value.slice(start,end);
   const value=button.dataset.sharedExtra==='heading'
    ?'## '+(selected||'Zwischenüberschrift')
    :selected?selected.split('\n').map(line=>'- '+line).join('\n'):'- Erster Punkt';
   set(start,end,value);
  }));
  font.addEventListener('change',()=>{const v=font.value;font.value='';if(wrap('font',v))font.options[0].textContent={inter:'Inter',cormorant:'Cormorant Garamond',georgia:'Georgia'}[v]||'Inter'});
  size.addEventListener('change',()=>{const v=size.value;size.value='';if(v)wrap('pt',v)});
  toolbar.querySelectorAll('[data-member-color]').forEach(btn=>btn.addEventListener('click',()=>{
   const v=btn.dataset.memberColor;if(wrap('color',v)){glyph.style.borderBottomColor=colors[v];colorMenu.open=false}
  }));
  toolbar.querySelectorAll('[data-member-symbol]').forEach(btn=>btn.addEventListener('click',()=>{
   const v=btn.dataset.memberSymbol,sign=symbols[v];if(!sign)return;
   const n=area.selectionStart;set(n,n,sign+' ','end');symbolGlyph.textContent=sign;symbolMenu.open=false;
  }));
  toolbar.querySelectorAll('[data-member-align]').forEach(btn=>btn.addEventListener('click',()=>{
   const ok=wrap('align',btn.dataset.memberAlign);
   if(ok)toolbar.querySelectorAll('[data-member-align]').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));
  }));
  lineSelect.addEventListener('change',()=>{if(lineSelect.value)wrap('line',lineSelect.value)});
  document.addEventListener('pointerdown',ev=>{
   if(colorMenu.open&&!colorMenu.contains(ev.target))colorMenu.open=false;
   if(symbolMenu.open&&!symbolMenu.contains(ev.target))symbolMenu.open=false;
  });
  colorMenu.addEventListener('toggle',()=>{if(colorMenu.open)symbolMenu.open=false});
  symbolMenu.addEventListener('toggle',()=>{if(symbolMenu.open)colorMenu.open=false});
  for(const node of edits){node.addEventListener('pointerdown',()=>{});} // Preserve normal keyboard navigation.
 }
 for(const id of ['project-description','reg-description','page-text-field','e-text'])install(id);
 window.BKSharedText={renderInline,renderLines};
})();
