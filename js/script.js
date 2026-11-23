/* ==========================================================
   Uma carta entre girassóis — comportamento
   Fluxo: envelope → carta → jardim → mensagem final
   ========================================================== */
(function () {
  "use strict";

  // ---------- Configurações fáceis de ajustar ----------
  const CONFIG = {
    velocidadeDigitacaoMs: 38,   // tempo entre cada letra da carta
    esperaAposAbrirMs: 2600,     // tempo da animação do envelope antes de mostrar a carta
    esperaMensagemFinalMs: 7000, // tempo do jardim crescendo antes da mensagem final
    quantidadeParticulas: 26,
    // Cada flor: posição horizontal (%), tamanho da cabeça (px), altura do caule (px) e atraso do crescimento (s)
    flores: [
      { x: 8,  cabeca: 78,  caule: 190, atraso: 0.3 },
      { x: 24, cabeca: 110, caule: 270, atraso: 0.9 },
      { x: 42, cabeca: 90,  caule: 220, atraso: 1.5 },
      { x: 58, cabeca: 125, caule: 310, atraso: 0.6 },
      { x: 75, cabeca: 95,  caule: 235, atraso: 1.2 },
      { x: 90, cabeca: 72,  caule: 175, atraso: 1.8 },
    ],
  };

  const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Atalhos ----------
  const $ = (id) => document.getElementById(id);
  const telas = {
    envelope: $("tela-envelope"),
    carta: $("tela-carta"),
    jardim: $("tela-jardim"),
  };

  /** Mostra uma tela e esconde as outras (com transição de opacidade no CSS). */
  function mostrarTela(nome) {
    Object.entries(telas).forEach(([chave, el]) => {
      const ativa = chave === nome;
      el.classList.toggle("ativa", ativa);
      el.setAttribute("aria-hidden", String(!ativa));
    });
  }

  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ---------- SVGs: se algum arquivo faltar, não mostra ícone quebrado ----------
  function protegerImagens() {
    document.querySelectorAll("img[data-svg]").forEach((img) => {
      img.addEventListener("error", () => {
        img.classList.add("sem-arquivo");
        console.warn("SVG não encontrado:", img.getAttribute("src"));
      });
    });
  }

  // ---------- Música (só inicia após interação) ----------
  const musica = $("musica");
  const botaoMusica = $("botao-musica");

  function atualizarBotaoMusica(tocando) {
    botaoMusica.setAttribute("aria-pressed", String(tocando));
    botaoMusica.setAttribute("aria-label", tocando ? "Pausar música" : "Tocar música");
  }

  async function iniciarMusica() {
    try {
      await musica.play();
      atualizarBotaoMusica(true);
    } catch (erro) {
      // Sem arquivo de áudio ou navegador bloqueou: o site segue funcionando em silêncio.
      console.warn("Música não iniciada:", erro.message);
    }
  }

  botaoMusica.addEventListener("click", () => {
    if (musica.paused) iniciarMusica();
    else { musica.pause(); atualizarBotaoMusica(false); }
  });

  // Só mostra o botão se o arquivo de música existir e puder carregar.
  musica.addEventListener("canplay", () => { botaoMusica.hidden = false; }, { once: true });
  musica.addEventListener("error", () => { botaoMusica.hidden = true; }, true);
  musica.load();

  // ---------- Tela 1: envelope ----------
  const envelope = $("envelope");
  const botaoAbrir = $("botao-abrir");

  botaoAbrir.addEventListener("click", async () => {
    botaoAbrir.disabled = true;
    botaoAbrir.style.opacity = "0";
    iniciarMusica(); // clique do usuário = interação válida para o áudio
    envelope.classList.add("aberto");
    await esperar(reduzirMovimento ? 200 : CONFIG.esperaAposAbrirMs);
    mostrarTela("carta");
    escreverCarta();
  });

  // ---------- Tela 2: carta com efeito de escrita ----------
  const textoCarta = $("texto-carta");
  const botaoJardim = $("botao-jardim");

  /** Divide o texto de cada parágrafo em letras e as revela gradualmente. */
  async function escreverCarta() {
    const paragrafos = Array.from(textoCarta.querySelectorAll("p"));

    if (reduzirMovimento) { botaoJardim.hidden = false; return; }

    // Guarda o texto original para leitores de tela e prepara as letras
    textoCarta.setAttribute("aria-label", textoCarta.textContent.replace(/\s+/g, " ").trim());
    const letrasPorParagrafo = paragrafos.map((p) => {
      const texto = p.textContent.replace(/\s+/g, " ").trim();
      p.textContent = "";
      p.setAttribute("aria-hidden", "true");
      return Array.from(texto).map((caractere) => {
        const span = document.createElement("span");
        span.className = "letra";
        span.textContent = caractere;
        p.appendChild(span);
        return span;
      });
    });

    await esperar(900); // deixa a carta terminar de aparecer
    for (const letras of letrasPorParagrafo) {
      for (const letra of letras) {
        letra.classList.add("visivel");
        await esperar(CONFIG.velocidadeDigitacaoMs);
      }
      await esperar(380); // pausa entre parágrafos
    }
    botaoJardim.hidden = false;
    botaoJardim.focus({ preventScroll: true });
  }

  // ---------- Tela 3: jardim ----------
  const jardim = $("jardim");

  /** Folha simples reutilizada nos caules (forma orgânica em SVG inline, cor verde natural). */
  const FOLHA_SVG =
    '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M2 38C6 14 28 2 58 4 56 28 34 42 2 38Z" fill="#6f9c46"/>' +
    '<path d="M4 37C20 24 36 14 56 5" stroke="#4d7a30" stroke-width="1.5" fill="none"/></svg>';

  /** Monta uma flor: caule + folhas + cabeça (SVG real de girassol). */
  function criarFlor({ x, cabeca, caule, atraso }) {
    const flor = document.createElement("div");
    flor.className = "flor";
    flor.style.left = x + "%";
    flor.style.setProperty("--tam", cabeca + "px");
    flor.style.setProperty("--alt", caule + "px");
    flor.style.marginLeft = -cabeca / 2 + "px";
    flor.style.setProperty("--tempo-balanco", (3.6 + Math.random() * 2.4).toFixed(2) + "s");
    flor.style.setProperty("--atraso-balanco", (-Math.random() * 3).toFixed(2) + "s");
    flor.dataset.atraso = atraso;

    flor.innerHTML =
      '<div class="caule"></div>' +
      '<div class="folha esq">' + FOLHA_SVG + "</div>" +
      '<div class="folha dir">' + FOLHA_SVG + "</div>";

    // A cabeça usa o arquivo SVG real baixado em assets/images
    const img = document.createElement("img");
    img.className = "cabeca";
    img.src = "assets/images/Sunflower.svg";
    img.alt = "";
    img.width = cabeca;
    img.setAttribute("data-svg", "");
    img.addEventListener("error", () => img.classList.add("sem-arquivo"));
    flor.appendChild(img);

    return flor;
  }

  function criarParticulas() {
    const caixa = $("particulas");
    for (let i = 0; i < CONFIG.quantidadeParticulas; i++) {
      const p = document.createElement("span");
      p.className = "particula";
      p.style.left = Math.random() * 100 + "%";
      p.style.setProperty("--p", 4 + Math.random() * 8 + "px");
      p.style.setProperty("--dx", (Math.random() * 120 - 60).toFixed(0) + "px");
      p.style.setProperty("--dur", 7 + Math.random() * 8 + "s");
      p.style.setProperty("--atr", (-Math.random() * 12).toFixed(1) + "s");
      caixa.appendChild(p);
    }
  }

  function construirJardim() {
    CONFIG.flores.forEach((cfg) => jardim.appendChild(criarFlor(cfg)));
    criarParticulas();
  }

  /** Faz cada flor crescer, uma após a outra. */
  function crescerFlores() {
    jardim.querySelectorAll(".flor").forEach((flor) => {
      const atraso = reduzirMovimento ? 0 : Number(flor.dataset.atraso) * 1000;
      setTimeout(() => flor.classList.add("crescendo"), atraso);
    });
  }

  botaoJardim.addEventListener("click", async () => {
    mostrarTela("jardim");
    crescerFlores();
    await esperar(reduzirMovimento ? 600 : CONFIG.esperaMensagemFinalMs);
    // ---------- Tela 4: mensagem final sobre o jardim ----------
    $("mensagem-final").classList.add("visivel");
  });

  // ---------- Início ----------
  protegerImagens();
  construirJardim();
})();
