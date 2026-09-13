/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://rvtsrnnuhkmqxutlbeyr.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_zDv6yIvfB-4HtNlqwSsXGw_CjAx9nOm";


const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


let usuarioAtual = null;
let clienteAtual = null;

const CONFIG_PADRAO = {
  notificacoes_painel: true,
  notificar_atendimento: true,
  notificar_entrega: true,
  som_entrega: false,
  email_atualizacoes: true,
  email_marketing: false,
  email_dicas: false,
  realtime_ativo: true
};

let configuracoesUsuario = { ...CONFIG_PADRAO };

let arquivosSelecionados = [];
let etapaAtual = 1;
let entregaAtual = null;
let anexosEntregaAtual = [];
let realtimePedidosChannel = null;
let realtimeEntregasChannel = null;
let realtimeDispositivosChannel = null;

let pedidosCarregados = [];
let entregasCarregadas = [];


const loading =
  document.getElementById(
    "dashboardLoading"
  );

const app =
  document.getElementById(
    "dashboardApp"
  );

const userEmail =
  document.getElementById(
    "userEmail"
  );

const logoutButton =
  document.getElementById(
    "logoutButton"
  );


/* =========================================================
   NAVEGAÇÃO
========================================================= */

document
  .querySelectorAll(
    ".menu-button"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const page =
            button.dataset.page;

          abrirPagina(page);

        }
      );

    }
  );


function abrirPagina(page) {

  document
    .querySelectorAll(
      ".menu-button"
    )
    .forEach(
      item =>
        item.classList.remove(
          "active"
        )
    );


  document
    .querySelector(
      `[data-page="${page}"]`
    )
    .classList.add(
      "active"
    );


  document
    .querySelectorAll(
      ".page"
    )
    .forEach(
      item =>
        item.classList.remove(
          "active"
        )
    );


  document
    .getElementById(
      `page-${page}`
    )
    .classList.add(
      "active"
    );


  const nomes = {
    "inicio": "Início",
    "novo-pedido": "Novo Pedido",
    "pedidos": "Meus Pedidos",
    "entregas": "Entregas"
  };


  document
    .getElementById(
      "topbarTitle"
    )
    .textContent =
      nomes[page];


  if (
    page === "pedidos"
  ) {

    carregarPedidos();

  }


  if (page === "entregas") {

    carregarEntregas();

  }

}


/* =========================================================
   LOGIN
========================================================= */

async function verificarLogin() {

  const {
    data,
    error
  } =
    await supabaseClient
      .auth
      .getSession();


  if (
    error ||
    !data.session
  ) {

    window.location.href =
      "index.html";

    return;

  }


  usuarioAtual =
    data.session.user;


  userEmail.textContent =
    usuarioAtual.email;


  const {
    data: cliente,
    error: clienteError
  } =
    await supabaseClient
      .from("clientes")
      .select("*")
      .eq(
        "user_id",
        usuarioAtual.id
      )
      .single();


  if (clienteError) {

    console.error(
      clienteError
    );

    loading.textContent =
      "Não foi possível carregar os dados do cliente.";

    return;

  }


  clienteAtual =
    cliente;


  document
    .getElementById(
      "welcomeTitle"
    )
    .textContent =
      `Bem-vindo, ${cliente.nome}.`;


  document
    .getElementById(
      "clienteProjeto"
    )
    .textContent =
      cliente.projeto;


  document
    .getElementById(
      "clienteDescricao"
    )
    .textContent =
      cliente.descricao;


  await carregarConfiguracoesUsuario();

  await carregarStatusConta();

  await carregarDispositivoAtual();

  iniciarRealtimeDispositivos();


  app.classList.add(
    "visible"
  );


  setTimeout(() => {

    loading.classList.add(
      "saindo"
    );


    setTimeout(() => {

      loading.style.display =
        "none";

    }, 450);

  }, 900);


  await carregarContadores();
  await carregarEntregas();

  iniciarRealtimeCliente();

}


/* =========================================================
   DISPOSITIVO ATUAL
========================================================= */

async function carregarDispositivoAtual() {

  if (!usuarioAtual) {
    return;
  }

  const listaAtual =
    document.getElementById(
      "currentDeviceList"
    );

  const listaOutros =
    document.getElementById(
      "settingsDevicesList"
    );

  if (
    !listaAtual ||
    !listaOutros
  ) {
    return;
  }


  /* =========================
     SISTEMA / NAVEGADOR
  ========================= */

  const ua =
    navigator.userAgent;

  let sistema =
    "Sistema desconhecido";

  if (/Windows NT 10/i.test(ua)) {
    sistema = "Windows 10 / 11";

  } else if (/Windows/i.test(ua)) {
    sistema = "Windows";

  } else if (/Android/i.test(ua)) {
    sistema = "Android";

  } else if (
    /iPhone|iPad|iPod/i.test(ua)
  ) {
    sistema = "iOS";

  } else if (/Mac OS X/i.test(ua)) {
    sistema = "macOS";

  } else if (/Linux/i.test(ua)) {
    sistema = "Linux";
  }


  let navegador =
    "Navegador desconhecido";

  if (/Edg\//i.test(ua)) {
    navegador = "Microsoft Edge";

  } else if (/OPR\//i.test(ua)) {
    navegador = "Opera";

  } else if (/Firefox\//i.test(ua)) {
    navegador = "Mozilla Firefox";

  } else if (
    /Chrome\//i.test(ua) &&
    !/Edg\//i.test(ua)
  ) {
    navegador = "Google Chrome";

  } else if (
    /Safari\//i.test(ua) &&
    !/Chrome\//i.test(ua)
  ) {
    navegador = "Safari";
  }


  const mobile =
    /Android|iPhone|iPad|iPod/i
      .test(ua);

  let tipo =
    mobile
      ? "Celular"
      : "Computador";

  if (/iPhone/i.test(ua)) {
    tipo = "iPhone";
  }

  if (/iPad/i.test(ua)) {
    tipo = "iPad";
  }

  if (/Android/i.test(ua)) {
    tipo = "Android";
  }


  /* =========================
     IDENTIFICADOR
  ========================= */

  let identificador =
    localStorage.getItem(
      "shiro_device_id"
    );

  if (!identificador) {

    identificador =
      crypto.randomUUID();

    localStorage.setItem(
      "shiro_device_id",
      identificador
    );
  }


  /* =========================
     BUSCAR DISPOSITIVO
  ========================= */

  let {
    data: dispositivoExistente,
    error: erroBusca
  } =
    await supabaseClient
      .from("dispositivos")
      .select("*")
      .eq(
        "user_id",
        usuarioAtual.id
      )
      .eq(
        "identificador",
        identificador
      )
      .maybeSingle();


  if (erroBusca) {

    console.error(
      "Erro ao buscar dispositivo:",
      erroBusca
    );

    return;
  }


  /* =========================
     REATIVAR SE ELE VOLTOU
     A FAZER LOGIN
  ========================= */

  if (
    dispositivoExistente &&
    dispositivoExistente.ativo === false
  ) {

    const {
      error: erroReativar
    } =
      await supabaseClient
        .from("dispositivos")
        .update({
          ativo: true,
          tipo,
          navegador,
          sistema,
          ultimo_acesso:
            new Date().toISOString()
        })
        .eq(
          "id",
          dispositivoExistente.id
        );


    if (erroReativar) {

      console.error(
        "Erro ao reativar dispositivo:",
        erroReativar
      );

      return;
    }


    dispositivoExistente.ativo =
      true;
  }


  /* =========================
     ATUALIZAR OU CRIAR
  ========================= */

  if (dispositivoExistente) {

    const { error } =
      await supabaseClient
        .from("dispositivos")
        .update({
          tipo,
          navegador,
          sistema,
          ultimo_acesso:
            new Date().toISOString(),
          ativo: true
        })
        .eq(
          "id",
          dispositivoExistente.id
        );

    if (error) {

      console.error(
        "Erro ao atualizar dispositivo:",
        error
      );

      return;
    }

  } else {

    const { error } =
      await supabaseClient
        .from("dispositivos")
        .insert({
          user_id:
            usuarioAtual.id,

          identificador,

          tipo,

          navegador,

          sistema,

          ativo: true,

          ultimo_acesso:
            new Date().toISOString()
        });


    if (error) {

      console.error(
        "Erro ao registrar dispositivo:",
        error
      );

      return;
    }
  }


  /* =========================
     LISTAR ATIVOS
  ========================= */

  const {
    data: dispositivos,
    error
  } =
    await supabaseClient
      .from("dispositivos")
      .select("*")
      .eq(
        "user_id",
        usuarioAtual.id
      )
      .eq(
        "ativo",
        true
      )
      .order(
        "ultimo_acesso",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Erro ao carregar dispositivos:",
      error
    );

    return;
  }


  const dispositivoAtual =
    dispositivos.find(
      item =>
        item.identificador ===
        identificador
    );


  const outros =
    dispositivos.filter(
      item =>
        item.identificador !==
        identificador
    );


  /* =========================
     DISPOSITIVO ATUAL
  ========================= */

  listaAtual.innerHTML =
    dispositivoAtual
      ? criarCardDispositivo(
          dispositivoAtual,
          true
        )
      : "";


  /* =========================
     OUTROS DISPOSITIVOS
  ========================= */

  if (!outros.length) {

    listaOutros.innerHTML = `
      <div class="device-empty">
        Nenhum outro dispositivo conectado.
      </div>
    `;

  } else {

    listaOutros.innerHTML =
      outros
        .map(
          item =>
            criarCardDispositivo(
              item,
              false
            )
        )
        .join("");
  }
}

function criarCardDispositivo(
  dispositivo,
  atual
) {

  const celular =
    [
      "Android",
      "iPhone",
      "iPad",
      "Celular"
    ].includes(
      dispositivo.tipo
    );


  const icone =
    celular
      ? "📱"
      : "💻";


  const ultimoAcesso =
    new Date(
      dispositivo.ultimo_acesso
    ).toLocaleString(
      "pt-BR",
      {
        dateStyle: "short",
        timeStyle: "short"
      }
    );


  return `
    <div
      class="settings-device-card"
      data-device-id="${dispositivo.id}"
    >

      <div class="settings-device-icon">
        ${icone}
      </div>


      <div>

        <strong>
          ${dispositivo.tipo}
          •
          ${dispositivo.navegador}
        </strong>

        <p>
          ${dispositivo.sistema}
        </p>

        ${
          atual
            ? ""
            : `
              <p>
                Último acesso:
                ${ultimoAcesso}
              </p>
            `
        }

      </div>


      ${
        atual
          ? `
            <span class="settings-current-device">
              Atual
            </span>
          `
          : `
            <button
              type="button"
              class="device-remove-button"
              data-remove-device="${dispositivo.id}"
              aria-label="Encerrar sessão"
              title="Encerrar sessão"
            >
              ×
            </button>
          `
      }

    </div>
  `;

}


/* =========================================================
   MODAL + SENHA + REMOVER 1 OU TODOS
========================================================= */

let acaoDispositivoPendente = null;


const devicePasswordModal =
  document.getElementById(
    "devicePasswordModal"
  );

const devicePasswordInput =
  document.getElementById(
    "devicePasswordInput"
  );

const devicePasswordDescription =
  document.getElementById(
    "devicePasswordDescription"
  );

const devicePasswordError =
  document.getElementById(
    "devicePasswordError"
  );

const devicePasswordConfirm =
  document.getElementById(
    "devicePasswordConfirm"
  );


function abrirConfirmacaoDispositivo(
  acao
) {

  acaoDispositivoPendente =
    acao;


  devicePasswordInput.value =
    "";

  devicePasswordError.textContent =
    "";


  if (
    acao.tipo === "todos"
  ) {

    devicePasswordDescription.textContent =
      "Digite sua senha para encerrar todas as outras sessões da sua conta.";

  } else {

    devicePasswordDescription.textContent =
      "Digite sua senha para encerrar esta sessão.";

  }


  devicePasswordModal
    .classList
    .add("active");


  devicePasswordModal
    .setAttribute(
      "aria-hidden",
      "false"
    );


  setTimeout(
    () =>
      devicePasswordInput.focus(),
    100
  );

}


function fecharConfirmacaoDispositivo() {

  devicePasswordModal
    .classList
    .remove("active");


  devicePasswordModal
    .setAttribute(
      "aria-hidden",
      "true"
    );


  devicePasswordInput.value =
    "";

  devicePasswordError.textContent =
    "";

  acaoDispositivoPendente =
    null;

}


/*
  ENCERRAR TODAS
*/

document
  .getElementById(
    "logoutOtherDevices"
  )
  ?.addEventListener(
    "click",
    () => {

      abrirConfirmacaoDispositivo({
        tipo: "todos"
      });

    }
  );


/*
  X INDIVIDUAL
*/

document
  .getElementById(
    "settingsDevicesList"
  )
  ?.addEventListener(
    "click",
    event => {

      const botao =
        event.target.closest(
          "[data-remove-device]"
        );


      if (!botao) {
        return;
      }


      abrirConfirmacaoDispositivo({
        tipo: "individual",

        deviceId:
          botao.dataset
            .removeDevice
      });

    }
  );


/*
  FECHAR
*/

document
  .getElementById(
    "devicePasswordClose"
  )
  ?.addEventListener(
    "click",
    fecharConfirmacaoDispositivo
  );


document
  .getElementById(
    "devicePasswordCancel"
  )
  ?.addEventListener(
    "click",
    fecharConfirmacaoDispositivo
  );


devicePasswordModal
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        devicePasswordModal
      ) {

        fecharConfirmacaoDispositivo();

      }

    }
  );


/*
  MOSTRAR SENHA
*/

document
  .getElementById(
    "devicePasswordShow"
  )
  ?.addEventListener(
    "click",
    () => {

      devicePasswordInput.type =
        devicePasswordInput.type ===
        "password"
          ? "text"
          : "password";

    }
  );


/*
  CONFIRMAR
*/

devicePasswordConfirm
  ?.addEventListener(
    "click",
    confirmarRemocaoDispositivo
  );


devicePasswordInput
  ?.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        confirmarRemocaoDispositivo();

      }

    }
  );


async function confirmarRemocaoDispositivo() {

  if (
    !acaoDispositivoPendente ||
    !usuarioAtual
  ) {
    return;
  }


  const senha =
    devicePasswordInput
      .value;


  if (!senha) {

    devicePasswordError.textContent =
      "Digite sua senha.";

    return;
  }


  devicePasswordConfirm.disabled =
    true;

  devicePasswordConfirm.textContent =
    "Verificando...";

  devicePasswordError.textContent =
    "";


  try {

    /*
      REAUTENTICA O USUÁRIO
      PARA CONFIRMAR A SENHA.
    */

    const {
      error: erroSenha
    } =
      await supabaseClient
        .auth
        .signInWithPassword({
          email:
            usuarioAtual.email,

          password:
            senha
        });


    if (erroSenha) {

      devicePasswordError.textContent =
        "Senha incorreta.";

      return;
    }


    const identificadorAtual =
      localStorage.getItem(
        "shiro_device_id"
      );


    /*
      REMOVER TODOS
    */

    if (
      acaoDispositivoPendente
        .tipo === "todos"
    ) {

      const {
        error: erroBanco
      } =
        await supabaseClient
          .from("dispositivos")
          .update({
            ativo: false
          })
          .eq(
            "user_id",
            usuarioAtual.id
          )
          .neq(
            "identificador",
            identificadorAtual
          );


      if (erroBanco) {
        throw erroBanco;
      }


      /*
        Também revoga todas as outras
        sessões Supabase Auth.
      */

      const {
        error: erroAuth
      } =
        await supabaseClient
          .auth
          .signOut({
            scope: "others"
          });


      if (erroAuth) {
        throw erroAuth;
      }

    }


    /*
      REMOVER APENAS UM
    */

    if (
      acaoDispositivoPendente
        .tipo === "individual"
    ) {

      const {
        error: erroBanco
      } =
        await supabaseClient
          .from("dispositivos")
          .update({
            ativo: false
          })
          .eq(
            "user_id",
            usuarioAtual.id
          )
          .eq(
            "id",
            acaoDispositivoPendente
              .deviceId
          );


      if (erroBanco) {
        throw erroBanco;
      }

    }


    fecharConfirmacaoDispositivo();


    await carregarDispositivoAtual();


    if (
      typeof mostrarToast ===
      "function"
    ) {

      mostrarToast(
        "Sessão encerrada com sucesso."
      );

    }


  } catch (erro) {

    console.error(
      "Erro ao encerrar dispositivo:",
      erro
    );


    devicePasswordError.textContent =
      "Não foi possível encerrar a sessão.";

  } finally {

    devicePasswordConfirm.disabled =
      false;

    devicePasswordConfirm.textContent =
      "Confirmar";

  }

}


/* =========================================================
   STATUS DA CONTA
========================================================= */

async function carregarStatusConta() {

  if (!usuarioAtual) {
    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("status_contas")
      .select("*")
      .eq(
        "user_id",
        usuarioAtual.id
      )
      .maybeSingle();


  if (error) {

    console.error(
      "Erro ao carregar status da conta:",
      error
    );

    return;
  }


  const status =
    data?.status || "ok";

  const motivo =
    data?.motivo || null;


  renderizarStatusConta(
    status,
    motivo
  );

}


function renderizarStatusConta(
  status,
  motivo
) {

  const titulo =
    document.getElementById(
      "accountStatusTitle"
    );

  const descricao =
    document.getElementById(
      "accountStatusDescription"
    );

  const icone =
    document.getElementById(
      "accountStatusIcon"
    );


  const estados = {

    ok: {
      titulo:
        "toda em ordem",

      descricao:
        "Sua conta ShiroDev está ativa e pode acessar normalmente o painel do cliente.",

      icone:
        "✓",

      cor:
        "#4ade80",

      fundo:
        "rgba(34,197,94,0.16)"
    },


    limitado: {
      titulo:
        "limitada",

      descricao:
        motivo ||
        "Alguns recursos da sua conta estão temporariamente limitados.",

      icone:
        "!",

      cor:
        "#fbbf24",

      fundo:
        "rgba(245,158,11,0.16)"
    },


    restrito: {
      titulo:
        "restrita",

      descricao:
        motivo ||
        "Sua conta possui restrições e alguns recursos podem não estar disponíveis.",

      icone:
        "!",

      cor:
        "#fb923c",

      fundo:
        "rgba(249,115,22,0.16)"
    },


    suspenso: {
      titulo:
        "suspensa",

      descricao:
        motivo ||
        "O acesso desta conta foi suspenso.",

      icone:
        "×",

      cor:
        "#f87171",

      fundo:
        "rgba(239,68,68,0.16)"
    }

  };


  const atual =
    estados[status] ||
    estados.ok;


  titulo.textContent =
    atual.titulo;


  descricao.textContent =
    atual.descricao;


  icone.textContent =
    atual.icone;


  icone.style.color =
    atual.cor;


  icone.style.background =
    atual.fundo;


  titulo.style.color =
    atual.cor;


  const ordem = [
    "ok",
    "limitado",
    "restrito",
    "suspenso"
  ];


  const indiceAtual =
    ordem.indexOf(status);


  document
    .querySelectorAll(
      ".account-status-step"
    )
    .forEach(
      (
        step,
        index
      ) => {

        const circulo =
          step.querySelector(
            "span"
          );


        step.classList.remove(
          "active"
        );


        circulo.textContent =
          "";


        circulo.style.background =
          "";

        circulo.style.color =
          "";


        if (
          index <= indiceAtual
        ) {

          step.classList.add(
            "active"
          );


          circulo.textContent =
            index === indiceAtual
              ? atual.icone
              : "✓";


          circulo.style.background =
            atual.cor;


          circulo.style.color =
            "#07100a";

        }

      }
    );

}


/* =========================================================
   CONFIGURAÇÕES DO USUÁRIO
========================================================= */

async function carregarConfiguracoesUsuario() {

  if (!usuarioAtual) return;

  const { data, error } = await supabaseClient
    .from("configuracoes")
    .select("*")
    .eq("user_id", usuarioAtual.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (!data) {

    const { data: novaConfig, error: erroCriar } =
      await supabaseClient
        .from("configuracoes")
        .insert({
          user_id: usuarioAtual.id
        })
        .select()
        .single();

    if (erroCriar) {
      console.error(erroCriar);
      return;
    }

    configuracoesUsuario = novaConfig;

  } else {

    configuracoesUsuario = data;

  }

  atualizarInterfaceConfiguracoes();

}


function atualizarInterfaceConfiguracoes() {

  const mapa = {

    notificationPanel:
      configuracoesUsuario.notificacoes_painel,

    notificationProgress:
      configuracoesUsuario.notificar_atendimento,

    notificationDelivery:
      configuracoesUsuario.notificar_entrega,

    notificationSound:
      configuracoesUsuario.som_entrega,

    notificationEmail:
      configuracoesUsuario.email_atualizacoes,

    notificationEmailMarketing:
      configuracoesUsuario.email_marketing,

    notificationEmailTips:
      configuracoesUsuario.email_dicas,

    notificationRealtime:
      configuracoesUsuario.realtime_ativo

  };

  Object.entries(mapa).forEach(([id, valor]) => {

    const el = document.getElementById(id);

    if (el) {
      el.checked = !!valor;
    }

  });

}


async function salvarConfiguracao(chave, valor) {

  configuracoesUsuario[chave] = valor;

  const { error } =
    await supabaseClient
      .from("configuracoes")
      .update({
        [chave]: valor,
        updated_at: new Date()
      })
      .eq("user_id", usuarioAtual.id);

  if (error) {

    console.error(error);

    mostrarToast(
      "Erro ao salvar configuração.",
      "error"
    );

    return;

  }

  mostrarToast(
    "Configuração salva.",
    "success"
  );

}


document.getElementById("notificationPanel")
  .addEventListener("change", e => {
    salvarConfiguracao("notificacoes_painel", e.target.checked);
  });

document.getElementById("notificationProgress")
  .addEventListener("change", e => {
    salvarConfiguracao("notificar_atendimento", e.target.checked);
  });

document.getElementById("notificationDelivery")
  .addEventListener("change", e => {
    salvarConfiguracao("notificar_entrega", e.target.checked);
  });

document
  .getElementById("notificationSound")
  .addEventListener(
    "change",
    async event => {

      const ativo =
        event.target.checked;


      await salvarConfiguracao(
        "som_entrega",
        ativo
      );


      if (ativo) {

        try {

          audioEntrega.pause();
          audioEntrega.currentTime = 0;

          await audioEntrega.play();

          console.log(
            "🔊 Som de teste reproduzido."
          );

        } catch (error) {

          console.error(
            "Erro no som de teste:",
            error
          );

        }

      }

    }
  );

document.getElementById("notificationEmail")
  .addEventListener("change", e => {
    salvarConfiguracao("email_atualizacoes", e.target.checked);
  });

document.getElementById("notificationEmailMarketing")
  .addEventListener("change", e => {
    salvarConfiguracao("email_marketing", e.target.checked);
  });

document.getElementById("notificationEmailTips")
  .addEventListener("change", e => {
    salvarConfiguracao("email_dicas", e.target.checked);
  });

document.getElementById("notificationRealtime")
  .addEventListener("change", e => {
    salvarConfiguracao("realtime_ativo", e.target.checked);
  });


/* =========================================================
   TOASTS
========================================================= */

function mostrarToast(
  mensagem,
  tipo = "success"
) {

  const container =
    document.getElementById("toastContainer");

  const toast =
    document.createElement("div");

  toast.className =
    `toast ${tipo}`;


  let icone = "✓";

  if (tipo === "error")
    icone = "✕";

  if (tipo === "info")
    icone = "◆";

  if (tipo === "warning")
    icone = "⚠";


  toast.innerHTML = `
    <span class="toast-icon">
      ${icone}
    </span>

    <span class="toast-text">
      ${escapeHtml(mensagem)}
    </span>
  `;


  container.appendChild(toast);


  setTimeout(() => {

    toast.style.opacity = "0";

    toast.style.transform =
      "translateX(20px)";

    toast.style.transition =
      "0.2s";

    setTimeout(() => {
      toast.remove();
    }, 200);

  }, 3500);

}


/* =========================================================
   REALTIME
========================================================= */

function iniciarRealtimeCliente() {

  if (!usuarioAtual)
    return;


  if (realtimePedidosChannel) {
    supabaseClient.removeChannel(
      realtimePedidosChannel
    );
  }

  if (realtimeEntregasChannel) {
    supabaseClient.removeChannel(
      realtimeEntregasChannel
    );
  }


  realtimePedidosChannel =
    supabaseClient
      .channel(
        `pedidos-${usuarioAtual.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `user_id=eq.${usuarioAtual.id}`
        },
        async payload => {

          if (!configuracoesUsuario.realtime_ativo) {
            return;
          }

          console.log(
            "Pedido atualizado em tempo real:",
            payload
          );

          await carregarPedidos();
          await carregarContadores();

          if (payload.eventType === "UPDATE") {

            const novoStatus =
              payload.new.status;

            if (novoStatus === "em_andamento") {

              mostrarToast(
                "Seu pedido entrou em atendimento.",
                "info"
              );

            }

            if (novoStatus === "concluido") {

              mostrarToast(
                "Seu pedido foi concluído!",
                "success"
              );

            }

          }

        }
      )
      .subscribe();


  realtimeEntregasChannel =
    supabaseClient
      .channel(`entregas-${usuarioAtual.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "entregas",
          filter: `user_id=eq.${usuarioAtual.id}`
        },
        async payload => {

          console.log(
            "Nova entrega recebida:",
            payload
          );

          console.log(
            "Config atual:",
            configuracoesUsuario
          );

          console.log(
            "som_entrega:",
            configuracoesUsuario?.som_entrega
          );

          await carregarEntregas();


          if (
            configuracoesUsuario
              ?.notificacoes_painel
            &&
            configuracoesUsuario
              ?.notificar_entrega
          ) {

            mostrarToast(
              "Uma nova entrega está disponível.",
              "success"
            );

          }


          if (
            configuracoesUsuario
              ?.som_entrega === true
          ) {

            console.log(
              "🔊 Chamando som da entrega..."
            );

            await tocarSomEntrega();

          } else {

            console.log(
              "🔇 Som de entrega está desligado na configuração."
            );

          }

        }
      )
      .subscribe(status => {

        console.log(
          "Realtime entregas:",
          status
        );

      });

}


/* =========================================================
   REALTIME DISPOSITIVOS
========================================================= */

function iniciarRealtimeDispositivos() {

  if (!usuarioAtual) {
    return;
  }

  const identificadorAtual =
    localStorage.getItem("shiro_device_id");

  if (!identificadorAtual) {
    return;
  }

  if (realtimeDispositivosChannel) {

    supabaseClient.removeChannel(
      realtimeDispositivosChannel
    );

    realtimeDispositivosChannel = null;
  }

  realtimeDispositivosChannel =
    supabaseClient
      .channel(
        `dispositivos-${usuarioAtual.id}-${identificadorAtual}`
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dispositivos",
          filter: `user_id=eq.${usuarioAtual.id}`
        },
        async payload => {

          console.log(
            "Novo dispositivo conectado:",
            payload.new
          );

          await carregarDispositivoAtual();

        }
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dispositivos",
          filter: `user_id=eq.${usuarioAtual.id}`
        },
        async payload => {

          const dispositivo =
            payload.new;

          console.log(
            "Dispositivo atualizado:",
            dispositivo
          );

          /*
            ESTE navegador foi removido
          */
          if (
            dispositivo.identificador ===
              identificadorAtual &&
            dispositivo.ativo === false
          ) {

            console.log(
              "Sessão encerrada remotamente."
            );

            localStorage.removeItem(
              "shiro_device_id"
            );

            await supabaseClient.auth.signOut({
              scope: "local"
            });

            window.location.href =
              "index.html";

            return;
          }

          /*
            OUTRO dispositivo foi removido
          */
          if (dispositivo.ativo === false) {

            const card =
              document.querySelector(
                `[data-device-id="${dispositivo.id}"]`
              );

            if (card) {
              card.remove();
            }

            const listaOutros =
              document.getElementById(
                "settingsDevicesList"
              );

            if (
              listaOutros &&
              !listaOutros.querySelector(
                ".settings-device-card"
              )
            ) {
              listaOutros.innerHTML = `
                <div class="device-empty">
                  Nenhum outro dispositivo conectado.
                </div>
              `;
            }

            return;
          }

          // NÃO chamar carregarDispositivoAtual() aqui

        }
      )

      .subscribe(status => {

        console.log(
          "Realtime dispositivos:",
          status
        );

      });

}


/* =========================================================
   ETAPAS DO FORMULÁRIO
========================================================= */

function mostrarEtapa(numero) {

  etapaAtual =
    numero;


  document
    .querySelectorAll(
      ".form-step"
    )
    .forEach(
      item =>
        item.classList.remove(
          "active"
        )
    );


  document
    .getElementById(
      `formStep${numero}`
    )
    .classList.add(
      "active"
    );


  for (
    let i = 1;
    i <= 3;
    i++
  ) {

    const indicador =
      document.getElementById(
        `indicator${i}`
      );


    indicador.classList.remove(
      "active",
      "completed"
    );


    if (
      i === numero
    ) {

      indicador.classList.add(
        "active"
      );

    }


    if (
      i < numero
    ) {

      indicador.classList.add(
        "completed"
      );

    }

  }

}


document
  .getElementById(
    "irParte2"
  )
  .addEventListener(
    "click",
    () => {

      const projeto =
        document
          .getElementById(
            "pedidoProjeto"
          )
          .value
          .trim();

      const titulo =
        document
          .getElementById(
            "pedidoTitulo"
          )
          .value
          .trim();

      const descricao =
        document
          .getElementById(
            "pedidoDescricao"
          )
          .value
          .trim();


      if (
        !projeto ||
        !titulo ||
        !descricao
      ) {

        mostrarToast(
          "Preencha Projeto, Título e Descrição.",
          "error"
        );

        return;

      }


      mostrarEtapa(2);

    }
  );


document
  .getElementById(
    "voltarParte1"
  )
  .addEventListener(
    "click",
    () => {

      mostrarEtapa(1);

    }
  );


document
  .getElementById(
    "irParte3"
  )
  .addEventListener(
    "click",
    () => {

      atualizarRevisao();

      mostrarEtapa(3);

    }
  );


/* =========================================================
   ARQUIVOS
========================================================= */

document
  .getElementById(
    "pedidoArquivos"
  )
  .addEventListener(
    "change",
    event => {

      const novosArquivos =
        Array.from(
          event.target.files
        );

      novosArquivos.forEach(
        arquivo => {

          const jaExiste =
            arquivosSelecionados.some(
              existente =>
                existente.name === arquivo.name &&
                existente.size === arquivo.size &&
                existente.lastModified === arquivo.lastModified
            );

          if (!jaExiste) {
            arquivosSelecionados.push(
              arquivo
            );
          }

        }
      );

      event.target.value =
        "";

      renderizarArquivos();

    }
  );


function renderizarArquivos() {

  const lista =
    document.getElementById(
      "selectedFiles"
    );

  lista.innerHTML =
    "";


  arquivosSelecionados.forEach(
    (arquivo, index) => {

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "selected-file";


      const info =
        document.createElement(
          "div"
        );

      info.className =
        "selected-file-info";


      const nome =
        document.createElement(
          "span"
        );

      nome.className =
        "selected-file-name";

      nome.textContent =
        arquivo.name;


      const tamanho =
        document.createElement(
          "span"
        );

      tamanho.textContent =
        formatarTamanho(
          arquivo.size
        );


      info.appendChild(
        nome
      );


      const actions =
        document.createElement(
          "div"
        );

      actions.className =
        "selected-file-actions";


      const visualizar =
        document.createElement(
          "button"
        );

      visualizar.type =
        "button";

      visualizar.className =
        "file-action-button";

      visualizar.title =
        "Visualizar anexo";

      visualizar.innerHTML =
        "👁";

      visualizar.addEventListener(
        "click",
        () => {

          visualizarArquivo(
            arquivo
          );

        }
      );


      const excluir =
        document.createElement(
          "button"
        );

      excluir.type =
        "button";

      excluir.className =
        "file-action-button file-delete-button";

      excluir.title =
        "Remover anexo";

      excluir.innerHTML =
        "🗑";

      excluir.addEventListener(
        "click",
        () => {

          arquivosSelecionados.splice(
            index,
            1
          );

          renderizarArquivos();

        }
      );


      actions.appendChild(
        visualizar
      );

      actions.appendChild(
        excluir
      );


      item.appendChild(
        info
      );

      item.appendChild(
        tamanho
      );

      item.appendChild(
        actions
      );


      lista.appendChild(
        item
      );

    }
  );

}


function visualizarArquivo(
  arquivo
) {

  const modal =
    document.getElementById(
      "filePreviewModal"
    );

  const content =
    document.getElementById(
      "filePreviewContent"
    );

  const name =
    document.getElementById(
      "filePreviewName"
    );


  content.innerHTML =
    "";

  name.textContent =
    arquivo.name;


  const url =
    URL.createObjectURL(
      arquivo
    );


  if (
    arquivo.type.startsWith(
      "image/"
    )
  ) {

    const imagem =
      document.createElement(
        "img"
      );

    imagem.src =
      url;

    imagem.onload =
      () => {

        URL.revokeObjectURL(
          url
        );

      };

    content.appendChild(
      imagem
    );

  }

  else if (
    arquivo.type.startsWith(
      "video/"
    )
  ) {

    const video =
      document.createElement(
        "video"
      );

    video.src =
      url;

    video.controls =
      true;

    video.autoplay =
      false;

    video.onloadeddata =
      () => {

        URL.revokeObjectURL(
          url
        );

      };

    content.appendChild(
      video
    );

  }


  modal.classList.add(
    "visible"
  );

}


function fecharPreview() {

  const modal =
    document.getElementById(
      "filePreviewModal"
    );

  const content =
    document.getElementById(
      "filePreviewContent"
    );


  const video =
    content.querySelector(
      "video"
    );

  if (video) {
    video.pause();
  }


  content.innerHTML =
    "";

  modal.classList.remove(
    "visible"
  );

}


document
  .getElementById(
    "filePreviewClose"
  )
  .addEventListener(
    "click",
    fecharPreview
  );


document
  .getElementById(
    "filePreviewModal"
  )
  .addEventListener(
    "click",
    event => {

      if (
        event.target.id ===
        "filePreviewModal"
      ) {

        fecharPreview();

      }

    }
  );


function formatarTamanho(bytes) {

  if (
    bytes < 1024 * 1024
  ) {

    return (
      bytes / 1024
    ).toFixed(1) +
    " KB";

  }


  return (
    bytes /
    1024 /
    1024
  ).toFixed(1) +
  " MB";

}


/* =========================================================
   REVISÃO
========================================================= */

function atualizarRevisao() {

  const projeto =
    document
      .getElementById(
        "pedidoProjeto"
      )
      .value
      .trim();

  const titulo =
    document
      .getElementById(
        "pedidoTitulo"
      )
      .value
      .trim();

  const descricao =
    document
      .getElementById(
        "pedidoDescricao"
      )
      .value
      .trim();

  const link =
    document
      .getElementById(
        "pedidoLink"
      )
      .value
      .trim();


  document
    .getElementById(
      "reviewProjeto"
    )
    .textContent =
      projeto;


  document
    .getElementById(
      "reviewTitulo"
    )
    .textContent =
      titulo;


  document
    .getElementById(
      "reviewDescricao"
    )
    .textContent =
      descricao;


  document
    .getElementById(
      "reviewLink"
    )
    .textContent =
      link || "Nenhum link informado";


  document
    .getElementById(
      "reviewArquivos"
    )
    .textContent =
      arquivosSelecionados.length
        ? arquivosSelecionados
            .map(
              arquivo =>
                arquivo.name
            )
            .join(", ")
        : "Nenhum arquivo anexado";

}


/* =========================================================
   EDITAR
========================================================= */

const editOptions =
  document.getElementById(
    "editOptions"
  );


document
  .getElementById(
    "editarPedido"
  )
  .addEventListener(
    "click",
    () => {

      editOptions
        .classList
        .toggle(
          "visible"
        );

    }
  );


document
  .querySelectorAll(
    "[data-edit-step]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          editOptions
            .classList
            .remove(
              "visible"
            );


          mostrarEtapa(
            Number(
              button.dataset.editStep
            )
          );

        }
      );

    }
  );


/* =========================================================
   ENVIAR PEDIDO
========================================================= */

document
  .getElementById(
    "enviarPedido"
  )
  .addEventListener(
    "click",
    enviarPedido
  );


async function enviarPedido() {

  const botao =
    document.getElementById(
      "enviarPedido"
    );

  const success =
    document.getElementById(
      "pedidoSuccess"
    );

  const errorBox =
    document.getElementById(
      "pedidoError"
    );


  success.style.display =
    "none";

  errorBox.style.display =
    "none";


  const projeto =
    document
      .getElementById(
        "pedidoProjeto"
      )
      .value
      .trim();

  const titulo =
    document
      .getElementById(
        "pedidoTitulo"
      )
      .value
      .trim();

  const descricao =
    document
      .getElementById(
        "pedidoDescricao"
      )
      .value
      .trim();

  const link =
    document
      .getElementById(
        "pedidoLink"
      )
      .value
      .trim();


  if (
    !projeto ||
    !titulo ||
    !descricao
  ) {

    errorBox.textContent =
      "Existem campos obrigatórios faltando.";

    errorBox.style.display =
      "block";

    return;

  }


  botao.disabled =
    true;

  botao.textContent =
    "Enviando...";


  try {

    const {
      data: pedido,
      error: pedidoError
    } =
      await supabaseClient
        .from("pedidos")
        .insert({
          user_id:
            usuarioAtual.id,

          projeto:
            projeto,

          titulo:
            titulo,

          descricao:
            descricao,

          link:
            link || null,

          status:
            "pendente"
        })
        .select()
        .single();


    if (pedidoError) {

      throw pedidoError;

    }


    for (
      const arquivo
      of arquivosSelecionados
    ) {

      const nomeSeguro =
        arquivo.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );


      const arquivoPath =
        `${usuarioAtual.id}/${pedido.id}/${Date.now()}-${nomeSeguro}`;


      const {
        error: uploadError
      } =
        await supabaseClient
          .storage
          .from(
            "pedido-anexos"
          )
          .upload(
            arquivoPath,
            arquivo,
            {
              cacheControl:
                "3600",

              upsert:
                false
            }
          );


      if (uploadError) {

        throw uploadError;

      }


      const {
        error: anexoError
      } =
        await supabaseClient
          .from(
            "pedido_anexos"
          )
          .insert({
            pedido_id:
              pedido.id,

            user_id:
              usuarioAtual.id,

            nome_arquivo:
              arquivo.name,

            tipo_arquivo:
              arquivo.type,

            arquivo_path:
              arquivoPath
          });


      if (anexoError) {

        throw anexoError;

      }

    }


    success.style.display =
      "block";


    botao.textContent =
      "Enviado ✓";


    await carregarContadores();


    setTimeout(
      () => {

        limparFormulario();

        abrirPagina(
          "pedidos"
        );

      },
      1300
    );


  } catch (error) {

    console.error(
      "Erro ao enviar pedido:",
      error
    );


    errorBox.textContent =
      "Não foi possível enviar o pedido: " +
      (
        error.message ||
        "erro desconhecido"
      );


    errorBox.style.display =
      "block";


    botao.disabled =
      false;

    botao.textContent =
      "Enviar Pedido";

  }

}


function limparFormulario() {

  document
    .getElementById(
      "pedidoProjeto"
    )
    .value =
      "";

  document
    .getElementById(
      "pedidoTitulo"
    )
    .value =
      "";

  document
    .getElementById(
      "pedidoDescricao"
    )
    .value =
      "";

  document
    .getElementById(
      "pedidoLink"
    )
    .value =
      "";

  document
    .getElementById(
      "pedidoArquivos"
    )
    .value =
      "";

  document
    .getElementById(
      "selectedFiles"
    )
    .innerHTML =
      "";

  arquivosSelecionados =
    [];

  mostrarEtapa(1);


  const botao =
    document.getElementById(
      "enviarPedido"
    );


  botao.disabled =
    false;

  botao.textContent =
    "Enviar Pedido";


  document
    .getElementById(
      "pedidoSuccess"
    )
    .style
    .display =
      "none";

}


/* =========================================================
   CARREGAR PEDIDOS
========================================================= */

async function carregarPedidos() {

  const lista =
    document.getElementById(
      "ordersList"
    );


  lista.innerHTML =
    `
      <div class="empty">
        Carregando pedidos...
      </div>
    `;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("pedidos")
      .select("*")
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );


  if (error) {

    console.error(
      error
    );


    lista.innerHTML =
      `
        <div class="empty">
          Não foi possível carregar os pedidos.
        </div>
      `;

    return;

  }


  if (
    !data ||
    data.length === 0
  ) {

    lista.innerHTML =
      `
        <div class="empty">
          Você ainda não enviou nenhum pedido.
        </div>
      `;

    pedidosCarregados = [];

    return;

  }


  pedidosCarregados =
    data;


  lista.innerHTML =
    "";


  data.forEach(
    pedido => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "order-item";

      item.dataset.pedidoId =
        pedido.id;


      const dataPedido =
        new Date(
          pedido.created_at
        );


      item.innerHTML =
        `

          <div>

            <div class="order-title">
              ${escapeHtml(pedido.titulo)}
            </div>

            <div class="order-meta">

              ${escapeHtml(pedido.projeto)}

              ·

              ${dataPedido.toLocaleString(
                "pt-BR"
              )}

            </div>

          </div>


          <div
            class="
              status
              status-${pedido.status}
            "
          >
            ${traduzirStatus(
              pedido.status
            )}
          </div>

        `;


      lista.appendChild(
        item
      );

    }
  );


  aplicarFiltroPedidos();

}


function aplicarFiltroPedidos() {

  const lista =
    document.getElementById(
      "ordersList"
    );


  const busca =
    document
      .getElementById(
        "filtroPedidosBusca"
      )
      .value
      .trim()
      .toLowerCase();


  const status =
    document
      .getElementById(
        "filtroPedidosStatus"
      )
      .value;


  const filtrados =
    pedidosCarregados.filter(
      pedido => {

        const correspondeBusca =
          pedido.titulo
            .toLowerCase()
            .includes(busca)
          ||
          pedido.projeto
            .toLowerCase()
            .includes(busca);


        const correspondeStatus =
          status === "todos"
          ||
          pedido.status === status;


        return (
          correspondeBusca &&
          correspondeStatus
        );

      }
    );


  lista.innerHTML =
    "";


  if (filtrados.length === 0) {

    lista.innerHTML = `
      <div class="empty">
        Nenhum pedido encontrado.
      </div>
    `;

    return;
  }


  filtrados.forEach(
    pedido => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "order-item";


      item.dataset.pedidoId =
        pedido.id;


      const dataPedido =
        new Date(
          pedido.created_at
        );


      item.innerHTML = `

        <div>

          <div class="order-title">
            ${escapeHtml(pedido.titulo)}
          </div>

          <div class="order-meta">

            ${escapeHtml(pedido.projeto)}

            ·

            ${dataPedido.toLocaleString(
              "pt-BR"
            )}

          </div>

        </div>


        <div
          class="
            status
            status-${pedido.status}
          "
        >

          ${traduzirStatus(
            pedido.status
          )}

        </div>

      `;


      lista.appendChild(
        item
      );

    }
  );

}


document
  .getElementById(
    "filtroPedidosBusca"
  )
  .addEventListener(
    "input",
    aplicarFiltroPedidos
  );


document
  .getElementById(
    "filtroPedidosStatus"
  )
  .addEventListener(
    "change",
    aplicarFiltroPedidos
  );


async function carregarContadores() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("pedidos")
      .select("status");


  if (error) {

    console.error(
      error
    );

    return;

  }


  const pendentes =
    data.filter(
      pedido =>
        pedido.status ===
        "pendente"
    ).length;


  const concluidos =
    data.filter(
      pedido =>
        pedido.status ===
        "concluido"
    ).length;


  document
    .getElementById(
      "contadorPendentes"
    )
    .textContent =
      pendentes;


  document
    .getElementById(
      "contadorConcluidos"
    )
    .textContent =
      concluidos;

}


/* =========================================================
   CARREGAR ENTREGAS
========================================================= */

async function carregarEntregas() {

  const lista =
    document.getElementById("entregasLista");

  if (!lista || !usuarioAtual)
    return;

  lista.innerHTML = `
    <div class="empty-state">
      Carregando entregas...
    </div>
  `;


  const {
    data: entregas,
    error
  } = await supabaseClient
    .from("entregas")
    .select("*")
    .eq("user_id", usuarioAtual.id)
    .order("created_at", {
      ascending: false
    });


  if (error) {

    console.error(
      "Erro ao carregar entregas:",
      error
    );

    lista.innerHTML = `
      <div class="empty-state">
        Não foi possível carregar suas entregas.
      </div>
    `;

    return;
  }


  if (!entregas || entregas.length === 0) {

    entregasCarregadas = [];

    lista.innerHTML = `
      <div class="empty-state">
        Nenhuma entrega disponível no momento.
      </div>
    `;

    return;
  }


  lista.innerHTML = "";

  entregasCarregadas = [];


  for (const entrega of entregas) {

    const {
      data: pedido
    } = await supabaseClient
      .from("pedidos")
      .select("titulo, projeto")
      .eq("id", entrega.pedido_id)
      .single();


    entregasCarregadas.push({
      ...entrega,

      pedido_titulo:
        pedido?.titulo || "Pedido",

      pedido_projeto:
        pedido?.projeto || ""
    });

  }


  aplicarFiltroEntregas();

}


function aplicarFiltroEntregas() {

  const lista =
    document.getElementById(
      "entregasLista"
    );


  const busca =
    document
      .getElementById(
        "filtroEntregasBusca"
      )
      .value
      .trim()
      .toLowerCase();


  const filtradas =
    entregasCarregadas.filter(
      entrega => {

        const tituloEntrega =
          (entrega.titulo || "")
            .toLowerCase();


        const tituloPedido =
          (entrega.pedido_titulo || "")
            .toLowerCase();


        const projeto =
          (entrega.pedido_projeto || "")
            .toLowerCase();


        return (
          tituloEntrega.includes(busca)
          ||
          tituloPedido.includes(busca)
          ||
          projeto.includes(busca)
        );

      }
    );


  lista.innerHTML =
    "";


  if (filtradas.length === 0) {

    lista.innerHTML = `
      <div class="empty-state">
        Nenhuma entrega encontrada.
      </div>
    `;

    return;
  }


  filtradas.forEach(
    entrega => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "entrega-card";


      item.innerHTML = `

        <div class="entrega-card-info">

          <strong>
            ${escapeHtml(
              entrega.titulo
            )}
          </strong>

          <span>
            ${escapeHtml(
              entrega.pedido_titulo
            )}
          </span>

          <span>
            ${escapeHtml(
              entrega.pedido_projeto
            )}
          </span>

          <span>
            ${new Date(
              entrega.created_at
            ).toLocaleString(
              "pt-BR"
            )}
          </span>

        </div>


        <button
          type="button"
          class="entrega-ver-button"
          data-entrega-id="${entrega.id}"
        >
          Ver entrega
        </button>

      `;


      lista.appendChild(
        item
      );

    }
  );

}


document
  .getElementById(
    "filtroEntregasBusca"
  )
  .addEventListener(
    "input",
    aplicarFiltroEntregas
  );


/* =========================================================
   ABRIR ENTREGA DETALHADA
========================================================= */

async function abrirEntregaDetalhada(entregaId) {

  const {
    data: entrega,
    error
  } = await supabaseClient
    .from("entregas")
    .select("*")
    .eq("id", entregaId)
    .single();


  if (error || !entrega) {

    console.error(error);

    mostrarToast(
      "Não foi possível carregar a entrega.",
      "error"
    );

    return;
  }


  entregaAtual = entrega;


  const {
    data: pedido
  } = await supabaseClient
    .from("pedidos")
    .select("titulo, projeto")
    .eq("id", entrega.pedido_id)
    .single();


  document
    .getElementById("entregaDetalheTitulo")
    .textContent =
      entrega.titulo;


  document
    .getElementById("entregaDetalhePedido")
    .textContent =
      pedido
        ? `${pedido.titulo} • ${pedido.projeto}`
        : "Pedido";


  document
    .getElementById("entregaDetalheDescricao")
    .textContent =
      entrega.descricao;


  document
    .getElementById("entregaDetalheData")
    .textContent =
      new Date(
        entrega.created_at
      ).toLocaleString("pt-BR");


  const linkContainer =
    document.getElementById(
      "entregaDetalheLink"
    );


  if (entrega.link) {

    const link =
      document.createElement("a");

    link.href =
      entrega.link;

    link.target =
      "_blank";

    link.rel =
      "noopener noreferrer";

    link.textContent =
      "Abrir link enviado";


    linkContainer.innerHTML =
      "";

    linkContainer.appendChild(
      link
    );

  } else {

    linkContainer.textContent =
      "Nenhum link enviado.";

  }


  await carregarAnexosEntrega(
    entrega.id
  );


  document
    .getElementById("entregaDetalheModal")
    .classList.add("visible");

}


async function carregarAnexosEntrega(entregaId) {

  const container =
    document.getElementById(
      "entregaDetalheAnexos"
    );


  container.textContent =
    "Carregando anexos...";


  const {
    data: anexos,
    error
  } = await supabaseClient
    .from("entrega_anexos")
    .select("*")
    .eq("entrega_id", entregaId)
    .order("created_at", {
      ascending: true
    });


  if (error) {

    console.error(error);

    container.textContent =
      "Não foi possível carregar os anexos.";

    return;
  }


  if (!anexos || anexos.length === 0) {

    anexosEntregaAtual = [];

    container.textContent =
      "Nenhum anexo enviado.";

    return;
  }


  anexosEntregaAtual = anexos || [];


  container.innerHTML = "";


  for (const anexo of anexos) {

    const {
      data: signedData,
      error: signedError
    } = await supabaseClient
      .storage
      .from("entrega-anexos")
      .createSignedUrl(
        anexo.arquivo_path,
        3600
      );


    const item =
      document.createElement("div");

    item.className =
      "entrega-anexo-item";


    const nome =
      document.createElement("span");

    nome.textContent =
      anexo.nome_arquivo;


    const botoes =
      document.createElement("div");

    botoes.className =
      "entrega-anexo-botoes";


    if (
      !signedError &&
      signedData?.signedUrl
    ) {

      const visualizar =
        document.createElement("button");

      visualizar.type =
        "button";

      visualizar.textContent =
        "Visualizar";

      visualizar.addEventListener(
        "click",
        () => {

          window.open(
            signedData.signedUrl,
            "_blank",
            "noopener,noreferrer"
          );

        }
      );


      const baixar =
        document.createElement("button");

      baixar.type =
        "button";

      baixar.textContent =
        "Baixar";

      baixar.addEventListener(
        "click",
        () => {

          const link =
            document.createElement("a");

          link.href =
            signedData.signedUrl;

          link.download =
            anexo.nome_arquivo;

          link.target =
            "_blank";

          link.click();

        }
      );


      botoes.appendChild(
        visualizar
      );

      botoes.appendChild(
        baixar
      );

    }


    item.appendChild(nome);
    item.appendChild(botoes);

    container.appendChild(item);

  }

}


document
  .getElementById("entregasLista")
  .addEventListener(
    "click",
    event => {

      const botao =
        event.target.closest(
          ".entrega-ver-button"
        );

      if (!botao)
        return;


      abrirEntregaDetalhada(
        Number(
          botao.dataset.entregaId
        )
      );

    }
  );


document
  .getElementById("entregaDetalheClose")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById("entregaDetalheModal")
        .classList.remove("visible");

    }
  );


/* =========================================================
   MODAL PEDIDO DO CLIENTE
========================================================= */

async function abrirPedidoCliente(pedidoId) {

  const {
    data: pedido,
    error
  } = await supabaseClient
    .from("pedidos")
    .select("*")
    .eq("id", pedidoId)
    .single();


  if (error || !pedido) {

    console.error(
      "Erro ao carregar pedido:",
      error
    );

    mostrarToast(
      "Não foi possível abrir o pedido.",
      "error"
    );

    return;
  }


  document
    .getElementById("pedidoClienteTitulo")
    .textContent =
      pedido.titulo;


  document
    .getElementById("pedidoClienteProjeto")
    .textContent =
      pedido.projeto;


  document
    .getElementById("pedidoClienteDescricao")
    .textContent =
      pedido.descricao;


  document
    .getElementById("pedidoClienteData")
    .textContent =
      new Date(
        pedido.created_at
      ).toLocaleString("pt-BR");


  const statusContainer =
    document.getElementById(
      "pedidoClienteStatus"
    );


  let statusTexto =
    "Pendente";

  let statusClasse =
    "status-pendente";


  if (
    pedido.status ===
    "em_andamento"
  ) {

    statusTexto =
      "Em andamento";

    statusClasse =
      "status-andamento";

  }


  if (
    pedido.status ===
    "concluido"
  ) {

    statusTexto =
      "Concluído";

    statusClasse =
      "status-concluido";

  }


  statusContainer.innerHTML = `
    <span class="status ${statusClasse}">
      ${statusTexto}
    </span>
  `;


  const linkContainer =
    document.getElementById(
      "pedidoClienteLink"
    );


  if (pedido.link) {

    linkContainer.innerHTML = "";

    const link =
      document.createElement("a");

    link.href =
      pedido.link;

    link.target =
      "_blank";

    link.rel =
      "noopener noreferrer";

    link.textContent =
      "Abrir link enviado";

    linkContainer.appendChild(link);

  } else {

    linkContainer.textContent =
      "Nenhum link enviado.";

  }


  await carregarAnexosPedidoCliente(
    pedido.id
  );


  const areaEntrega =
    document.getElementById(
      "pedidoClienteEntrega"
    );


  areaEntrega.style.display =
    "none";


  if (
    pedido.status ===
    "concluido"
  ) {

    await carregarEntregaPedidoCliente(
      pedido.id
    );

  }


  document
    .getElementById("pedidoClienteModal")
    .classList.add("active");

}


async function carregarAnexosPedidoCliente(
  pedidoId
) {

  const container =
    document.getElementById(
      "pedidoClienteAnexos"
    );


  container.textContent =
    "Carregando anexos...";


  const {
    data: anexos,
    error
  } = await supabaseClient
    .from("pedido_anexos")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("created_at", {
      ascending: true
    });


  if (error) {

    console.error(error);

    container.textContent =
      "Não foi possível carregar os anexos.";

    return;
  }


  if (!anexos || anexos.length === 0) {

    container.textContent =
      "Nenhum anexo enviado.";

    return;
  }


  container.innerHTML = "";


  for (const anexo of anexos) {

    const {
      data: signedData
    } = await supabaseClient
      .storage
      .from("pedido-anexos")
      .createSignedUrl(
        anexo.arquivo_path,
        3600
      );


    const item =
      document.createElement("div");

    item.className =
      "pedido-cliente-anexo";


    const nome =
      document.createElement("span");

    nome.textContent =
      anexo.nome_arquivo;


    const botao =
      document.createElement("button");

    botao.type =
      "button";

    botao.textContent =
      "Visualizar";


    if (signedData?.signedUrl) {

      botao.addEventListener(
        "click",
        () => {

          window.open(
            signedData.signedUrl,
            "_blank",
            "noopener,noreferrer"
          );

        }
      );

    } else {

      botao.disabled =
        true;

      botao.textContent =
        "Indisponível";

    }


    item.appendChild(nome);
    item.appendChild(botao);

    container.appendChild(item);

  }

}


async function carregarEntregaPedidoCliente(
  pedidoId
) {

  const {
    data: entrega,
    error
  } = await supabaseClient
    .from("entregas")
    .select("*")
    .eq("pedido_id", pedidoId)
    .maybeSingle();


  if (error || !entrega) {

    if (error) {
      console.error(error);
    }

    return;
  }


  document
    .getElementById(
      "pedidoClienteEntregaTitulo"
    )
    .textContent =
      entrega.titulo;


  document
    .getElementById(
      "pedidoClienteEntregaDescricao"
    )
    .textContent =
      entrega.descricao;


  document
    .getElementById(
      "pedidoClienteEntregaData"
    )
    .textContent =
      new Date(
        entrega.created_at
      ).toLocaleString("pt-BR");


  const linkContainer =
    document.getElementById(
      "pedidoClienteEntregaLink"
    );


  if (entrega.link) {

    linkContainer.innerHTML = "";

    const link =
      document.createElement("a");

    link.href =
      entrega.link;

    link.target =
      "_blank";

    link.rel =
      "noopener noreferrer";

    link.textContent =
      "Abrir link da entrega";

    linkContainer.appendChild(link);

  } else {

    linkContainer.textContent =
      "Nenhum link enviado.";

  }


  await carregarAnexosEntregaPedidoCliente(
    entrega.id
  );


  document
    .getElementById(
      "pedidoClienteEntrega"
    )
    .style.display =
      "block";

}


async function carregarAnexosEntregaPedidoCliente(
  entregaId
) {

  const container =
    document.getElementById(
      "pedidoClienteEntregaAnexos"
    );


  container.textContent =
    "Carregando anexos...";


  const {
    data: anexos,
    error
  } = await supabaseClient
    .from("entrega_anexos")
    .select("*")
    .eq("entrega_id", entregaId)
    .order("created_at", {
      ascending: true
    });


  if (error) {

    console.error(error);

    container.textContent =
      "Não foi possível carregar os anexos.";

    return;
  }


  if (!anexos || anexos.length === 0) {

    container.textContent =
      "Nenhum anexo enviado.";

    return;
  }


  container.innerHTML = "";


  for (const anexo of anexos) {

    const {
      data: signedData
    } = await supabaseClient
      .storage
      .from("entrega-anexos")
      .createSignedUrl(
        anexo.arquivo_path,
        3600
      );


    const item =
      document.createElement("div");

    item.className =
      "pedido-cliente-anexo";


    const nome =
      document.createElement("span");

    nome.textContent =
      anexo.nome_arquivo;


    const botao =
      document.createElement("button");

    botao.type =
      "button";

    botao.textContent =
      "Visualizar";


    if (signedData?.signedUrl) {

      botao.addEventListener(
        "click",
        () => {

          window.open(
            signedData.signedUrl,
            "_blank",
            "noopener,noreferrer"
          );

        }
      );

    } else {

      botao.disabled =
        true;

      botao.textContent =
        "Indisponível";

    }


    item.appendChild(nome);
    item.appendChild(botao);

    container.appendChild(item);

  }

}


document
  .getElementById("ordersList")
  .addEventListener(
    "click",
    event => {

      const item =
        event.target.closest(".order-item");

      if (!item) return;

      abrirPedidoCliente(
        Number(item.dataset.pedidoId)
      );

    }
  );


document
  .getElementById("fecharPedidoCliente")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "pedidoClienteModal"
        )
        .classList.remove("active");

    }
  );


document
  .getElementById("pedidoClienteModal")
  .addEventListener(
    "click",
    event => {

      if (
        event.target.id ===
        "pedidoClienteModal"
      ) {

        event.currentTarget
          .classList.remove("active");

      }

    }
  );


/* =========================================================
   GERAR RELATÓRIO PDF
========================================================= */

async function urlParaBase64(url) {

  const resposta =
    await fetch(url);

  const blob =
    await resposta.blob();


  return await new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onloadend =
        () => resolve(
          reader.result
        );


      reader.onerror =
        reject;


      reader.readAsDataURL(
        blob
      );

    }
  );

}


async function gerarRelatorioPDF() {

  if (!entregaAtual) {
    mostrarToast(
      "Nenhuma entrega selecionada.",
      "error"
    );
    return;
  }

  const botao =
    document.getElementById("exportarRelatorioButton");

  const textoOriginal =
    botao.textContent;

  botao.disabled = true;
  botao.textContent = "Gerando PDF...";


  try {

    const {
      jsPDF
    } = window.jspdf;


    const pdf =
      new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });


    const larguraPagina =
      pdf.internal.pageSize.getWidth();

    const alturaPagina =
      pdf.internal.pageSize.getHeight();

    const margem =
      18;

    const larguraConteudo =
      larguraPagina - margem * 2;


    let y = 0;


    function novaPaginaSeNecessario(alturaNecessaria = 20) {

      if (
        y + alturaNecessaria >
        alturaPagina - 18
      ) {

        pdf.addPage();

        y = 20;

        desenharCabecalhoSecundario();

      }

    }


    function desenharCabecalhoSecundario() {

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);

      pdf.setTextColor(
        88,
        101,
        242
      );

      pdf.text(
        "ShiroDev - Relatório de Entrega",
        margem,
        12
      );


      pdf.setDrawColor(
        225,
        228,
        235
      );

      pdf.line(
        margem,
        15,
        larguraPagina - margem,
        15
      );

    }


    pdf.setFillColor(
      17,
      21,
      32
    );

    pdf.rect(
      0,
      0,
      larguraPagina,
      48,
      "F"
    );


    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(
      23
    );

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.text(
      "ShiroDev",
      margem,
      20
    );


    pdf.setFontSize(
      11
    );

    pdf.setTextColor(
      175,
      183,
      204
    );

    pdf.text(
      "Relatório de Entrega",
      margem,
      28
    );


    pdf.setFontSize(
      9
    );

    pdf.text(
      new Date(
        entregaAtual.created_at
      ).toLocaleString("pt-BR"),
      margem,
      37
    );


    y = 62;


    pdf.setTextColor(
      30,
      35,
      48
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(
      20
    );


    const tituloLinhas =
      pdf.splitTextToSize(
        entregaAtual.titulo,
        larguraConteudo
      );


    pdf.text(
      tituloLinhas,
      margem,
      y
    );


    y +=
      tituloLinhas.length * 8 + 4;


    const pedidoTexto =
      document
        .getElementById(
          "entregaDetalhePedido"
        )
        .textContent;


    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(
      10
    );

    pdf.setTextColor(
      105,
      112,
      130
    );


    const pedidoLinhas =
      pdf.splitTextToSize(
        pedidoTexto,
        larguraConteudo
      );


    pdf.text(
      pedidoLinhas,
      margem,
      y
    );


    y +=
      pedidoLinhas.length * 5 + 10;


    novaPaginaSeNecessario(30);


    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(
      10
    );

    pdf.setTextColor(
      88,
      101,
      242
    );

    pdf.text(
      "DESCRIÇÃO",
      margem,
      y
    );


    y += 7;


    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(
      11
    );

    pdf.setTextColor(
      45,
      50,
      65
    );


    const descricaoLinhas =
      pdf.splitTextToSize(
        entregaAtual.descricao,
        larguraConteudo
      );


    descricaoLinhas.forEach(
      linha => {

        novaPaginaSeNecessario(7);

        pdf.text(
          linha,
          margem,
          y
        );

        y += 6;

      }
    );


    y += 8;


    if (entregaAtual.link) {

      novaPaginaSeNecessario(22);


      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(
        10
      );

      pdf.setTextColor(
        88,
        101,
        242
      );

      pdf.text(
        "LINK",
        margem,
        y
      );


      y += 7;


      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(
        10
      );

      pdf.setTextColor(
        70,
        85,
        200
      );


      pdf.textWithLink(
        entregaAtual.link,
        margem,
        y,
        {
          url: entregaAtual.link
        }
      );


      y += 14;

    }


    novaPaginaSeNecessario(25);


    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(
      10
    );

    pdf.setTextColor(
      88,
      101,
      242
    );

    pdf.text(
      "ANEXOS",
      margem,
      y
    );


    y += 8;


    if (
      !anexosEntregaAtual ||
      anexosEntregaAtual.length === 0
    ) {

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setTextColor(
        100,
        105,
        120
      );

      pdf.text(
        "Nenhum anexo enviado.",
        margem,
        y
      );


      y += 10;

    }


    for (
      const anexo
      of anexosEntregaAtual
    ) {

      novaPaginaSeNecessario(35);


      const {
        data: signedData,
        error
      } =
        await supabaseClient
          .storage
          .from("entrega-anexos")
          .createSignedUrl(
            anexo.arquivo_path,
            3600
          );


      if (
        error ||
        !signedData?.signedUrl
      ) {

        continue;

      }


      const url =
        signedData.signedUrl;


      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(
        10
      );

      pdf.setTextColor(
        35,
        40,
        55
      );


      pdf.text(
        anexo.nome_arquivo,
        margem,
        y
      );


      y += 6;


      if (
        anexo.tipo_arquivo &&
        anexo.tipo_arquivo
          .startsWith("image/")
      ) {

        try {

          const imagemBase64 =
            await urlParaBase64(
              url
            );


          const propriedades =
            pdf.getImageProperties(
              imagemBase64
            );


          let larguraImagem =
            larguraConteudo;


          let alturaImagem =
            (
              propriedades.height *
              larguraImagem
            )
            /
            propriedades.width;


          const alturaMaxima =
            115;


          if (
            alturaImagem >
            alturaMaxima
          ) {

            alturaImagem =
              alturaMaxima;

            larguraImagem =
              (
                propriedades.width *
                alturaImagem
              )
              /
              propriedades.height;

          }


          novaPaginaSeNecessario(
            alturaImagem + 12
          );


          pdf.addImage(
            imagemBase64,
            propriedades.fileType,
            margem,
            y,
            larguraImagem,
            alturaImagem
          );


          y +=
            alturaImagem + 10;

        }
        catch (erroImagem) {

          console.error(
            erroImagem
          );

          pdf.setFont(
            "helvetica",
            "normal"
          );

          pdf.setTextColor(
            100,
            105,
            120
          );

          pdf.textWithLink(
            "Abrir imagem",
            margem,
            y,
            {
              url
            }
          );


          y += 10;

        }

      }

      else if (
        anexo.tipo_arquivo &&
        anexo.tipo_arquivo
          .startsWith("video/")
      ) {

        pdf.setFillColor(
          244,
          245,
          249
        );


        pdf.roundedRect(
          margem,
          y,
          larguraConteudo,
          22,
          3,
          3,
          "F"
        );


        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.setFontSize(
          10
        );

        pdf.setTextColor(
          45,
          50,
          65
        );


        pdf.text(
          "Vídeo anexado",
          margem + 6,
          y + 8
        );


        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.setTextColor(
          88,
          101,
          242
        );


        pdf.textWithLink(
          "Abrir vídeo",
          margem + 6,
          y + 16,
          {
            url
          }
        );


        y += 30;

      }

    }


    const totalPaginas =
      pdf.internal.getNumberOfPages();


    for (
      let pagina = 1;
      pagina <= totalPaginas;
      pagina++
    ) {

      pdf.setPage(
        pagina
      );


      pdf.setFontSize(
        8
      );

      pdf.setTextColor(
        145,
        150,
        165
      );


      pdf.text(
        `ShiroDev • Página ${pagina} de ${totalPaginas}`,
        margem,
        alturaPagina - 8
      );

    }


    const nomeArquivo =
      entregaAtual.titulo
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );


    pdf.save(
      `ShiroDev_${nomeArquivo}.pdf`
    );

  }
  catch (error) {

    console.error(
      "Erro ao gerar relatório:",
      error
    );


    mostrarToast(
      "Não foi possível gerar o relatório PDF.",
      "error"
    );

  }
  finally {

    botao.disabled =
      false;

    botao.textContent =
      textoOriginal;

  }

}


document
  .getElementById("exportarRelatorioButton")
  .addEventListener(
    "click",
    gerarRelatorioPDF
  );


function traduzirStatus(
  status
) {

  if (
    status === "pendente"
  ) {

    return "Pendente";

  }


  if (
    status ===
    "em_andamento"
  ) {

    return "Em andamento";

  }


  if (
    status === "concluido"
  ) {

    return "Concluído";

  }


  return status;

}


function escapeHtml(texto) {

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    texto ?? "";


  return div.innerHTML;

}


/* =========================================================
   CONFIGURAÇÕES (UI)
========================================================= */

const settingsButton =
  document.getElementById("settingsButton");

const settingsPage =
  document.getElementById("settingsPage");

const settingsClose =
  document.getElementById("settingsClose");

const mainPages =
  document.querySelectorAll(".page");

const settingsMenuItems =
  document.querySelectorAll(
    "[data-settings-section]"
  );


function abrirConfiguracoes() {

  document.body.style.overflow = "hidden";

  settingsPage.classList.add("active");

  document
    .getElementById(
      "settingsUserEmail"
    )
    .textContent =
      usuarioAtual?.email || "";


  document
    .getElementById(
      "settingsAccountEmail"
    )
    .textContent =
      usuarioAtual?.email || "-";


  if (clienteAtual) {

    document
      .getElementById(
        "settingsUserName"
      )
      .textContent =
        clienteAtual.nome || "Cliente";


    document
      .getElementById(
        "settingsAccountName"
      )
      .textContent =
        clienteAtual.nome || "-";


    document
      .getElementById(
        "settingsAccountProject"
      )
      .textContent =
        clienteAtual.projeto || "-";

  }

}


function fecharConfiguracoes() {

  settingsPage.classList.remove("active");

  document.body.style.overflow = "";

}


function abrirSecaoConfiguracoes(secao) {

  document
    .querySelectorAll(".settings-section")
    .forEach(section => {
      section.classList.remove("active");
    });


  document
    .getElementById(
      `settings-${secao}`
    )
    .classList.add("active");


  settingsMenuItems.forEach(item => {

    item.classList.toggle(
      "active",
      item.dataset.settingsSection === secao
    );

  });

}


settingsButton.addEventListener(
  "click",
  abrirConfiguracoes
);


settingsClose.addEventListener(
  "click",
  fecharConfiguracoes
);


settingsPage.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      settingsPage
    ) {

      fecharConfiguracoes();

    }

  }
);


settingsMenuItems.forEach(item => {

  item.addEventListener(
    "click",
    () => {

      abrirSecaoConfiguracoes(
        item.dataset.settingsSection
      );

    }
  );

});


/* =========================================================
   EDITAR NOME DO CLIENTE
========================================================= */

const accountEditNameModal =
  document.getElementById(
    "accountEditNameModal"
  );

const accountEditNameInput =
  document.getElementById(
    "accountEditNameInput"
  );

const accountEditNameSave =
  document.getElementById(
    "accountEditNameSave"
  );


function abrirModalEditarNome() {

  accountEditNameInput.value =
    clienteAtual?.nome || "";

  accountEditNameModal
    .classList
    .add("active");

  setTimeout(() => {
    accountEditNameInput.focus();
  }, 100);

}


function fecharModalEditarNome() {

  accountEditNameModal
    .classList
    .remove("active");

}


document
  .getElementById("settingsEditName")
  .addEventListener(
    "click",
    abrirModalEditarNome
  );


document
  .getElementById("accountEditNameClose")
  .addEventListener(
    "click",
    fecharModalEditarNome
  );


document
  .getElementById("accountEditNameCancel")
  .addEventListener(
    "click",
    fecharModalEditarNome
  );


accountEditNameModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      accountEditNameModal
    ) {
      fecharModalEditarNome();
    }

  }
);


accountEditNameSave.addEventListener(
  "click",
  async () => {

    const novoNome =
      accountEditNameInput
        .value
        .trim();

    if (
      novoNome.length < 2
      || novoNome.length > 60
    ) {

      mostrarToast(
        "Digite um nome válido.",
        "warning"
      );

      return;
    }


    accountEditNameSave.disabled = true;

    accountEditNameSave.textContent =
      "Salvando...";


    try {

      const {
        error
      } =
        await supabaseClient
          .rpc(
            "atualizar_meu_nome",
            {
              novo_nome: novoNome
            }
          );


      if (error) {
        throw error;
      }


      clienteAtual.nome =
        novoNome;


      document
        .getElementById(
          "settingsAccountName"
        )
        .textContent =
          novoNome;


      document
        .getElementById(
          "settingsUserName"
        )
        .textContent =
          novoNome;


      document
        .getElementById(
          "welcomeTitle"
        )
        .textContent =
          `Bem-vindo, ${novoNome}.`;


      fecharModalEditarNome();


      mostrarToast(
        "Nome atualizado com sucesso!",
        "success"
      );

    }
    catch (error) {

      console.error(
        "Erro ao atualizar nome:",
        error
      );

      mostrarToast(
        "Não foi possível atualizar o nome.",
        "error"
      );

    }
    finally {

      accountEditNameSave.disabled =
        false;

      accountEditNameSave.textContent =
        "Salvar";

    }

  }
);


/* =========================================================
   LOGOUT
========================================================= */

logoutButton.addEventListener(
  "click",
  async () => {

    if (realtimePedidosChannel) {
      supabaseClient.removeChannel(
        realtimePedidosChannel
      );
    }

    if (realtimeEntregasChannel) {
      supabaseClient.removeChannel(
        realtimeEntregasChannel
      );
    }

    if (realtimeDispositivosChannel) {

      await supabaseClient.removeChannel(
        realtimeDispositivosChannel
      );

      realtimeDispositivosChannel = null;
    }

    await supabaseClient
      .auth
      .signOut();


    window.location.href =
      "index.html";

  }
);


/* =========================================================
   SOM DE NOTIFICAÇÃO DE ENTREGA
========================================================= */

const audioEntrega =
  new Audio(
    "assets/audio/notificacao.mp3"
  );

console.log(
  "Caminho do áudio:",
  audioEntrega.src
);

audioEntrega.addEventListener(
  "canplaythrough",
  () => {
    console.log(
      "Áudio carregado e pronto."
    );
  }
);

audioEntrega.addEventListener(
  "error",
  () => {
    console.error(
      "Erro ao carregar MP3:",
      audioEntrega.error
    );
  }
);

audioEntrega.preload = "auto";
audioEntrega.volume = 0.75;

let audioEntregaDesbloqueado = false;


async function desbloquearAudioEntrega() {

  if (audioEntregaDesbloqueado) {
    return;
  }

  try {

    const volumeOriginal =
      audioEntrega.volume;

    audioEntrega.volume = 0;

    await audioEntrega.play();

    audioEntrega.pause();

    audioEntrega.currentTime = 0;

    audioEntrega.volume =
      volumeOriginal;

    audioEntregaDesbloqueado = true;

    console.log(
      "Som de notificações desbloqueado."
    );

  } catch (error) {

    console.warn(
      "Áudio ainda bloqueado:",
      error
    );

  }

}


document.addEventListener(
  "pointerdown",
  desbloquearAudioEntrega,
  { once: true }
);

document.addEventListener(
  "keydown",
  desbloquearAudioEntrega,
  { once: true }
);


async function tocarSomEntrega() {

  console.log(
    "Tentando tocar som..."
  );

  console.log(
    "som_entrega:",
    configuracoesUsuario?.som_entrega
  );

  console.log(
    "readyState:",
    audioEntrega.readyState
  );

  try {

    audioEntrega.currentTime = 0;

    await audioEntrega.play();

    console.log(
      "Som reproduzido com sucesso."
    );

  } catch (error) {

    console.error(
      "PLAY FALHOU:",
      error.name,
      error.message
    );

  }

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

verificarLogin();