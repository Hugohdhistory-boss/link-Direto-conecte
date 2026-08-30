const CACHE_NAME='link-direto-v14-install-chat';
const ASSETS=['./','./index.html','./styles.css','./cover-v5.css','./v6-enhancements.css','./v7-auth.css','./v8-notifications.css','./v9-tech.css','./v10-black.css','./v11-social.css','./v12-profile.css','./v14-install-chat.css','./app.js','./manifest.json','./icon-192.png','./icon-512.png','./capa-link-direto-v5.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));
      return response;
    }).catch(()=>caches.open(CACHE_NAME).then(cache=>cache.match('./index.html'))));
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(cache=>cache.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok&&new URL(event.request.url).origin===location.origin)cache.put(event.request,response.clone());
    return response;
  }))));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
    for(const client of windows){if('focus'in client)return client.focus()}
    return clients.openWindow('./?v=14');
  }));
});
