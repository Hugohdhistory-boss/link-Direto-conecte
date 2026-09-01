
// ===== LINK DIRETO — IA ANÚNCIOS V2 =====

document.addEventListener('DOMContentLoaded', () => {
  prepararInterfaceIA();
});

function prepararInterfaceIA(){
  const card = document.querySelector('#view-ai-ads .ai-ads-card');
  const result = document.getElementById('ai-resultado');
  if(!card || !result) return;

  if(!document.getElementById('ai-form-area')){
    const fields = Array.from(card.children).filter(el => el !== result);
    const formArea = document.createElement('div');
    formArea.id = 'ai-form-area';

    fields.forEach(el => formArea.appendChild(el));
    card.insertBefore(formArea, result);
  }

  if(!document.getElementById('ai-loading')){
    const loading = document.createElement('div');
    loading.id = 'ai-loading';
    loading.className = 'ai-loading';
    loading.innerHTML = `
      <div class="ai-loading-spark">✨</div>
      <b>A criar o teu anúncio...</b>
      <span>A organizar a mensagem para ficar clara e profissional.</span>
    `;
    card.insertBefore(loading, result);
  }

  result.innerHTML = `
    <div class="ai-result-head">
      <div class="ai-result-icon">✨</div>
      <div>
        <small>LINK DIRETO IA</small>
        <h3>Anúncio pronto</h3>
      </div>
    </div>

    <div id="ai-resultado-texto" class="ai-result-text"></div>

    <div class="ai-result-meta">
      <div>
        <small>PREÇO</small>
        <b id="ai-result-preco">A combinar</b>
      </div>
      <div>
        <small>LOCALIZAÇÃO</small>
        <b id="ai-result-local">Moçambique</b>
      </div>
    </div>

    <div class="ai-result-actions">
      <button class="ai-copy-btn" type="button" onclick="copiarAnuncioIA()">📋 Copiar anúncio</button>
      <button class="ai-edit-btn" type="button" onclick="alterarAnuncioIA()">← Alterar dados</button>
    </div>
  `;
}

function gerarAnuncioIA(){
  const tipo = document.getElementById('ai-tipo')?.value || 'produto';
  const nome = document.getElementById('ai-nome')?.value.trim() || '';
  const preco = document.getElementById('ai-preco')?.value.trim() || '';
  const local = document.getElementById('ai-local')?.value.trim() || '';
  const detalhes = document.getElementById('ai-detalhes')?.value.trim() || '';

  if(!nome){
    if(typeof toast === 'function') toast('Escreve primeiro o que queres anunciar.', true);
    return;
  }

  const titulos = {
    produto: `🔥 ${nome} disponível`,
    servico: `✨ ${nome}${local ? ` em ${local}` : ''}`,
    emprego: `💼 Oportunidade: ${nome}`,
    imovel: `🏠 ${nome} disponível`
  };

  let anuncio = `${titulos[tipo] || `✨ ${nome}`}\n\n`;

  if(detalhes) anuncio += `${detalhes}\n\n`;
  if(preco) anuncio += `💰 Preço: ${preco}\n`;
  if(local) anuncio += `📍 Localização: ${local}\n`;

  anuncio += `\n📲 Entre em contacto para mais informações.`;
  anuncio += `\n\n#LinkDireto #Moçambique`;

  const form = document.getElementById('ai-form-area');
  const loading = document.getElementById('ai-loading');
  const result = document.getElementById('ai-resultado');

  if(form) form.style.display = 'none';
  if(result) result.classList.remove('is-visible');
  if(loading) loading.classList.add('is-visible');

  setTimeout(() => {
    if(loading) loading.classList.remove('is-visible');

    const texto = document.getElementById('ai-resultado-texto');
    const precoEl = document.getElementById('ai-result-preco');
    const localEl = document.getElementById('ai-result-local');

    if(texto) texto.innerText = anuncio;
    if(precoEl) precoEl.textContent = preco || 'A combinar';
    if(localEl) localEl.textContent = local || 'Moçambique';

    if(result) result.classList.add('is-visible');
    if(typeof toast === 'function') toast('Anúncio criado com sucesso.');
  }, 700);
}

function alterarAnuncioIA(){
  const form = document.getElementById('ai-form-area');
  const result = document.getElementById('ai-resultado');
  const loading = document.getElementById('ai-loading');

  if(loading) loading.classList.remove('is-visible');
  if(result) result.classList.remove('is-visible');
  if(form) form.style.display = '';

  setTimeout(() => {
    document.getElementById('ai-nome')?.focus();
  }, 80);
}

async function copiarAnuncioIA(){
  const texto = document.getElementById('ai-resultado-texto')?.innerText.trim();

  if(!texto){
    if(typeof toast === 'function') toast('Primeiro gera um anúncio.', true);
    return;
  }

  try{
    await navigator.clipboard.writeText(texto);
    if(typeof toast === 'function') toast('Anúncio copiado.');
  }catch{
    window.prompt('Copia o anúncio:', texto);
  }
}
