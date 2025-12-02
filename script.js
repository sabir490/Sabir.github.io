const STORAGE_KEY = 'news_articles_v1';
let articles = [];

const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

async function init(){
  await loadArticles();
  if(location.pathname.endsWith('article.html')) renderArticlePage();
  else renderIndex();
  setupUI();
}

async function loadArticles(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(saved){
    try{ articles = JSON.parse(saved); return; }catch(e){}
  }
  try{
    const res = await fetch('articles.json');
    if(res.ok){ 
      articles = await res.json(); 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(articles)); 
    }
  }catch(e){}
}

function saveArticles(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(articles)); }

// homepage
function renderIndex(){
  const heroEl = qs('#hero');
  const mainCol = qs('#mainCol');
  const trending = qs('#trendingList');

  const sorted = articles.slice().sort((a,b)=> new Date(b.date)-new Date(a.date));
  const featured = sorted[0];

  if(featured){
    heroEl.innerHTML = `
      <article class="featured">
        <img src="${featured.cover}">
        <div class="meta">
          <h1>${escapeHtml(featured.title)}</h1>
          <p class="article-meta">${featured.author} • ${featured.date}</p>
          <p>${escapeHtml(featured.excerpt)}</p>
          <p><a href="article.html?id=${featured.id}">Read more</a></p>
        </div>
      </article>`;
  }

  const categories = ['India','World','Sports','Tech','Lifestyle','Opinion'];
  mainCol.innerHTML = categories.map(cat => renderCategory(cat, sorted.filter(a=>a.category===cat))).join('');

  trending.innerHTML = sorted.slice(0,5)
    .map(a=>`<li><a href="article.html?id=${a.id}">${escapeHtml(a.title)}</a></li>`).join('');

  const ticker = qs('#ticker');
  ticker.innerHTML = '<span>'+sorted.slice(0,8).map(a=>escapeHtml(a.title)).join(' — ')+'</span>';
}

function renderCategory(name, items){
  if(items.length===0) return `<section><h2>${name}</h2><p>No articles</p></section>`;
  const cards = items.map(a=>`
    <article class="card">
      <img src="${a.cover}">
      <div class="info">
        <h4>${escapeHtml(a.title)}</h4>
        <p class="article-meta">${a.author} • ${a.date}</p>
        <p>${escapeHtml(a.excerpt)}</p>
        <p><a href="article.html?id=${a.id}">Read</a></p>
      </div>
    </article>`).join('');
  return `<section><h2>${name}</h2>${cards}</section>`;
}

// article page
function renderArticlePage(){
  const id = new URLSearchParams(location.search).get('id');
  const a = articles.find(x=>x.id===id);
  const el = qs('#articleContent');
  if(!a){ el.innerHTML='<p>Article not found.</p>'; return; }

  el.innerHTML = `
    <article>
      <h1>${escapeHtml(a.title)}</h1>
      <p class="article-meta">${a.author} • ${a.date} • ${a.category}</p>
      <img src="${a.cover}"/>
      <div class="article-body">${a.content}</div>
      <div class="share"><button id="shareBtn">Share</button></div>
      <section class="related"><h3>Related Articles</h3><div id="relatedList"></div></section>
    </article>`;

  const related = articles.filter(x=>x.category===a.category && x.id!==a.id).slice(0,3);
  qs('#relatedList').innerHTML = related
    .map(r=>`<a href="article.html?id=${r.id}">${escapeHtml(r.title)}</a>`)
    .join('<br>');

  qs('#shareBtn').addEventListener('click', ()=> shareArticle(a));
}

function shareArticle(a){
  const url = location.href;
  if(navigator.share){
    navigator.share({title: a.title, text: a.excerpt, url}).catch(()=>{});
  } else {
    const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(a.title+' '+url)}`;
    window.open(tw,'_blank');
  }
}

// UI & admin
function setupUI(){
  qs('#darkToggle').addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur==='dark' ? '' : 'dark');
  });

  const adminBtn = qs('#adminBtn');
  const adminModal = qs('#adminModal');

  adminBtn.addEventListener('click', ()=> openAdmin());
  qs('#closeAdmin').addEventListener('click', ()=> closeAdmin());

  qs('#exportBtn').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(articles,null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'articles-export.json';
    a.click();
  });

  qs('#importFile').addEventListener('change', async e=>{
    const f = e.target.files[0];
    if(!f) return;
    const txt = await f.text();
    try{
      const arr = JSON.parse(txt);
      if(Array.isArray(arr)){
        articles = arr;
        saveArticles();
        location.reload();
      }
    }catch(err){ alert('Invalid JSON'); }
  });

  const searchInput = qs('#searchInput');
  searchInput.addEventListener('input', ()=>{
    const q = searchInput.value.toLowerCase().trim();
    if(!q){ renderIndex(); return; }
    const results = articles.filter(a=> (a.title+a.excerpt+a.content).toLowerCase().includes(q));
    qs('#mainCol').innerHTML =
      `<section><h2>Search results (${results.length})</h2>`+
      results.map(a=>`
      <article class="card">
        <img src="${a.cover}">
        <div class="info">
          <h4>${escapeHtml(a.title)}</h4>
          <p class="article-meta">${a.author} • ${a.date}</p>
          <p>${escapeHtml(a.excerpt)}</p>
          <p><a href="article.html?id=${a.id}">Read</a></p>
        </div>
      </article>`).join('')+
      `</section>`;
  });

  qsa('.main-nav a').forEach(el=> el.addEventListener('click', e=>{
    e.preventDefault();
    const cat = el.dataset.cat;
    if(cat==='All'){ renderIndex(); return; }
    qs('#mainCol').innerHTML =
      `<section><h2>${cat}</h2>`+
      articles.filter(a=>a.category===cat)
      .map(a=>`
      <article class="card">
        <img src="${a.cover}">
        <div class="info">
          <h4>${escapeHtml(a.title)}</h4>
          <p class="article-meta">${a.author} • ${a.date}</p>
          <p>${escapeHtml(a.excerpt)}</p>
          <p><a href="article.html?id=${a.id}">Read</a></p>
        </div>
      </article>`).join('')+
      `</section>`;
  });

  const form = qs('#articleForm');
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const id = qs('#articleId').value || Date.now().toString();
    const obj = {
      id,
      title: qs('#title').value,
      author: qs('#author').value,
      date: qs('#date').value,
      category: qs('#category').value,
      cover: qs('#cover').value,
      excerpt: qs('#excerpt').value,
      content: qs('#content').value
    };
    const idx = articles.findIndex(x=>x.id===id);
    if(idx>=0) articles[idx]=obj;
    else articles.unshift(obj);
    saveArticles();
    closeAdmin();
    renderIndex();
    alert('Saved');
  });

  qs('#deleteArticle').addEventListener('click', ()=>{
    const id = qs('#articleId').value;
    if(!id) return alert('No article selected');
    articles = articles.filter(x=>x.id!==id);
    saveArticles();
    closeAdmin();
    renderIndex();
  });
}

function openAdmin(article){
  const m = qs('#adminModal');
  m.classList.remove('hidden');
  if(!article){
    qs('#articleId').value='';
    qs('#title').value='';
    qs('#author').value='';
    qs('#date').value=new Date().toISOString().slice(0,10);
    qs('#category').value='India';
    qs('#cover').value='';
    qs('#excerpt').value='';
    qs('#content').value='';
    return;
  }
}

function closeAdmin(){ qs('#adminModal').classList.add('hidden'); }

function escapeHtml(s){
  return String(s||'')
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;');
}

init();
