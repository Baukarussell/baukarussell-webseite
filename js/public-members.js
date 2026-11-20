/* Public Baukarussell member cards. Private cloud drafts are NEVER requested here.
   The static fallback remains visible until a separately approved JSON snapshot exists. */
(async()=>{
 'use strict';
 const root=document.querySelector('#members .members-grid');
 if(!root)return;
 try{
  const response=await fetch('/members-data.json',{cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json();
  if(!Array.isArray(data)||!data.length)return;
  const publicMembers=data.filter(x=>x&&typeof x.id==='string'&&/^[a-zA-Z0-9_.-]+$/.test(x.id)&&x.public!==false);
  if(!publicMembers.length)return;
  const cards=document.createDocumentFragment();
  for(const member of publicMembers){
   const card=document.createElement('div');card.className='member-card';
   const logo=typeof member.logo==='string'&&/^\/(?:logos|events|mitglieder|uploads)\//.test(member.logo)&&!member.logo.includes('..')?member.logo:'';
   if(logo){
    const image=document.createElement('img');image.src=logo;image.className='member-img';image.loading='lazy';image.alt='Logo '+String(member.name||'Mitglied');
    card.append(image);
   }
   const name=document.createElement('span');name.className='member-list-name';name.textContent=member.name||'Mitglied';
   card.append(name);
   const a=document.createElement('a');a.className='member-btn';
   a.href='/mitglieder/profil.html?member='+encodeURIComponent(member.id);
   a.textContent='Mehr erfahren →';card.append(a);cards.append(card);
  }
  root.replaceChildren(cards);
 }catch(error){console.warn('Member snapshot not available, showing existing cards',error);}
})();
