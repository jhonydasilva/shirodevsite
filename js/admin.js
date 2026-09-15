const SUPABASE_URL =
  "https://rvtsrnnuhkmqxutlbeyr.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_zDv6yIvfB-4HtNlqwSsXGw_CjAx9nOm";


const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


const loading =
  document.getElementById(
    "loading"
  );

const app =
  document.getElementById(
    "app"
  );

const adminEmail =
  document.getElementById(
    "adminEmail"
  );

const pedidosBody =
  document.getElementById(
    "pedidosBody"
  );

const empty =
  document.getElementById(
    "empty"
  );


let pedidoAtual = null;

let arquivosEntregaSelecionados = [];

let realtimeAdminPedidos = null;

let pendenciasCarregadas = [];

let andamentoCarregados = [];

let concluidosCarregados = [];

let clientesCarregados = [];


async function verificarAdmin() {

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


  const usuario =
    data.session.user;


  const {
    data: admin,
    error: adminError
  } =
    await supabaseClient
      .from("admins")
      .select("user_id")
      .eq(
        "user_id",
        usuario.id
      )
      .maybeSingle();


  if (
    adminError ||
    !admin
  ) {

    await supabaseClient
      .auth
      .signOut();

    window.location.href =
      "index.html";

    return;
  }


  adminEmail.textContent =
    usuario.email;


  await registrarDispositivoAdmin();

  iniciarRealtimeDispositivosAdmin();


  await carregarTudo();


  iniciarRealtimeAdmin();


  loading.classList.add(
    "saindo"
  );


  setTimeout(
    () => {

      loading.style.display =
        "none";

      app.classList.add(
        "visible"
      );

    },
    450
  );
}


async function carregarTudo() {

  await Promise.all([
    carregarPendencias(),
    carregarEmAndamento(),
    carregarConcluidos(),
    carregarClientesAdmin()
  ]);


  atualizarVisaoGeral();
}


async function carregarPendencias() {

  pedidosBody.innerHTML =
    "";


  const {
    data: pedidos,
    error
  } =
    await supabaseClient
      .from("pedidos")
      .select("*")
      .eq(
        "status",
        "pendente"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Erro ao carregar pendências:",
      error
    );

    mostrarToast(
      "Erro ao carregar pedidos.",
      "error"
    );

    return;
  }


  pendenciasCarregadas = [];


  if (
    !pedidos ||
    pedidos.length === 0
  ) {

    empty.style.display =
      "block";

    aplicarFiltroPendencias();

    return;
  }


  empty.style.display =
    "none";


  for (
    const pedido of pedidos
  ) {

    const {
      data: cliente
    } =
      await supabaseClient
        .from("clientes")
        .select("nome")
        .eq(
          "user_id",
          pedido.user_id
        )
        .single();


    const pedidoCompleto = {
      ...pedido,

      cliente_nome:
        cliente?.nome ||
        "Cliente"
    };


    pendenciasCarregadas.push(
      pedidoCompleto
    );


    const tr =
      document.createElement(
        "tr"
      );


    const dataPedido =
      new Date(
        pedido.created_at
      )
        .toLocaleString(
          "pt-BR"
        );


    tr.innerHTML = `

      <td>
        ${escapeHtml(
          pedidoCompleto.cliente_nome
        )}
      </td>

      <td>
        ${escapeHtml(
          pedido.titulo
        )}
      </td>

      <td>
        ${escapeHtml(
          pedido.projeto
        )}
      </td>

      <td>
        ${dataPedido}
      </td>

      <td>
        <span
          class="
            status
            status-pendente
          "
        >
          Pendente
        </span>
      </td>

      <td>
        <button
          type="button"
          class="details-button"
          data-id="${pedido.id}"
        >
          Pedido detalhado
        </button>
      </td>

    `;


    pedidosBody.appendChild(
      tr
    );

  }


  aplicarFiltroPendencias();

}


/* =========================================================
   FILTRO DE PENDÊNCIAS
========================================================= */

function aplicarFiltroPendencias() {

  const campo =
    document.getElementById(
      "filtroPendenciasBusca"
    );


  if (!campo) {
    return;
  }


  const busca =
    campo
      .value
      .trim()
      .toLowerCase();


  const linhas =
    document.querySelectorAll(
      "#pedidosBody tr"
    );


  linhas.forEach(
    (linha, index) => {

      const pedido =
        pendenciasCarregadas[index];


      if (!pedido) {

        linha.style.display =
          "none";

        return;
      }


      const cliente =
        (
          pedido.cliente_nome ||
          ""
        )
          .toLowerCase();


      const titulo =
        (
          pedido.titulo ||
          ""
        )
          .toLowerCase();


      const projeto =
        (
          pedido.projeto ||
          ""
        )
          .toLowerCase();


      const encontrou =
        cliente.includes(busca)
        ||
        titulo.includes(busca)
        ||
        projeto.includes(busca);


      linha.style.display =
        encontrou
          ? ""
          : "none";

    }
  );


  const algumaVisivel =
    Array
      .from(linhas)
      .some(
        linha =>
          linha.style.display !==
          "none"
      );


  if (
    empty &&
    pendenciasCarregadas.length > 0
  ) {

    empty.style.display =
      algumaVisivel
        ? "none"
        : "block";


    if (!algumaVisivel) {

      empty.textContent =
        "Nenhuma pendência encontrada.";

    }

  }

}


/* =========================================================
   CAMPO DE BUSCA DAS PENDÊNCIAS
========================================================= */

const filtroPendenciasBusca =
  document.getElementById(
    "filtroPendenciasBusca"
  );


if (filtroPendenciasBusca) {

  filtroPendenciasBusca
    .addEventListener(
      "input",
      aplicarFiltroPendencias
    );

}


async function carregarEmAndamento() {

  const andamentoBody =
    document.getElementById(
      "andamentoBody"
    );

  const andamentoEmpty =
    document.getElementById(
      "andamentoEmpty"
    );


  andamentoBody.innerHTML =
    "";


  const {
    data: pedidos,
    error
  } =
    await supabaseClient
      .from("pedidos")
      .select("*")
      .eq(
        "status",
        "em_andamento"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Erro ao carregar pedidos em andamento:",
      error
    );

    mostrarToast(
      "Erro ao carregar pedidos em andamento.",
      "error"
    );

    return;
  }


  andamentoCarregados = [];


  if (
    !pedidos ||
    pedidos.length === 0
  ) {

    andamentoEmpty.style.display =
      "block";

    aplicarFiltroAndamento();

    return;
  }


  andamentoEmpty.style.display =
    "none";


  for (
    const pedido of pedidos
  ) {

    const {
      data: cliente
    } =
      await supabaseClient
        .from("clientes")
        .select("nome")
        .eq(
          "user_id",
          pedido.user_id
        )
        .single();


    const pedidoCompleto = {
      ...pedido,

      cliente_nome:
        cliente?.nome ||
        "Cliente"
    };


    andamentoCarregados.push(
      pedidoCompleto
    );


    const tr =
      document.createElement(
        "tr"
      );


    const dataPedido =
      new Date(
        pedido.created_at
      )
        .toLocaleString(
          "pt-BR"
        );


    tr.innerHTML = `

      <td>
        ${escapeHtml(
          pedidoCompleto.cliente_nome
        )}
      </td>

      <td>
        ${escapeHtml(
          pedido.titulo
        )}
      </td>

      <td>
        ${escapeHtml(
          pedido.projeto
        )}
      </td>

      <td>
        ${dataPedido}
      </td>

      <td>
        <span
          class="
            status
            status-andamento
          "
        >
          Em andamento
        </span>
      </td>

      <td>
        <button
          type="button"
          class="details-button"
          data-id="${pedido.id}"
        >
          Pedido detalhado
        </button>
      </td>

    `;


    andamentoBody.appendChild(
      tr
    );

  }


  aplicarFiltroAndamento();

}


/* =========================================================
   FILTRO DE EM ANDAMENTO
========================================================= */

function aplicarFiltroAndamento() {

  const busca =
    document
      .getElementById(
        "filtroAndamentoBusca"
      )
      .value
      .trim()
      .toLowerCase();


  const linhas =
    document
      .querySelectorAll(
        "#andamentoBody tr"
      );


  linhas.forEach((linha, index) => {

    const pedido =
      andamentoCarregados[index];

    if (!pedido) {

      linha.style.display =
        "none";

      return;
    }


    const cliente =
      (
        pedido.clientes?.nome ||
        pedido.cliente_nome ||
        ""
      )
        .toLowerCase();


    const titulo =
      (
        pedido.titulo ||
        ""
      )
        .toLowerCase();


    const projeto =
      (
        pedido.projeto ||
        ""
      )
        .toLowerCase();


    const encontrou =
      cliente.includes(busca)
      ||
      titulo.includes(busca)
      ||
      projeto.includes(busca);


    linha.style.display =
      encontrou
        ? ""
        : "none";

  });


  const algumaVisivel =
    Array
      .from(linhas)
      .some(
        linha =>
          linha.style.display !==
          "none"
      );


  const vazio =
    document.getElementById(
      "andamentoEmpty"
    );


  if (
    andamentoCarregados.length > 0
  ) {

    vazio.style.display =
      algumaVisivel
        ? "none"
        : "block";


    if (!algumaVisivel) {

      vazio.textContent =
        "Nenhum pedido em andamento encontrado.";
    }

  }

}


const filtroAndamentoBusca =
  document.getElementById(
    "filtroAndamentoBusca"
  );


if (filtroAndamentoBusca) {

  filtroAndamentoBusca
    .addEventListener(
      "input",
      aplicarFiltroAndamento
    );

}


/* =========================================================
   CONCLUÍDOS
========================================================= */

async function carregarConcluidos() {

  const concluidosBody =
    document.getElementById(
      "concluidosBody"
    );


  const concluidosEmpty =
    document.getElementById(
      "concluidosEmpty"
    );


  if (!concluidosBody) {
    return;
  }


  concluidosBody.innerHTML =
    "";


  const {
    data: pedidos,
    error
  } =
    await supabaseClient
      .from("pedidos")
      .select("*")
      .eq(
        "status",
        "concluido"
      )
      .order(
        "concluido_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Erro ao carregar concluídos:",
      error
    );

    mostrarToast(
      "Erro ao carregar pedidos concluídos.",
      "error"
    );

    return;
  }


  concluidosCarregados = [];


  if (
    !pedidos ||
    pedidos.length === 0
  ) {

    if (concluidosEmpty) {

      concluidosEmpty.style.display =
        "block";
    }

    return;
  }


  if (concluidosEmpty) {

    concluidosEmpty.style.display =
      "none";
  }


  for (
    const pedido of pedidos
  ) {

    const {
      data: cliente
    } =
      await supabaseClient
        .from("clientes")
        .select("nome")
        .eq(
          "user_id",
          pedido.user_id
        )
        .maybeSingle();


    const pedidoCompleto = {
      ...pedido,

      cliente_nome:
        cliente?.nome ||
        "Cliente"
    };


    concluidosCarregados.push(
      pedidoCompleto
    );


    const tr =
      document.createElement(
        "tr"
      );


    const dataConcluido =
      new Date(
        pedido.concluido_at ||
        pedido.updated_at ||
        pedido.created_at
      )
        .toLocaleString(
          "pt-BR"
        );


    tr.innerHTML = `

      <td>
        ${escapeHtml(
          pedidoCompleto.cliente_nome
        )}
      </td>

      <td>
        ${escapeHtml(
          pedido.titulo
        )}
      </td>

      <td>
        ${escapeHtml(
          pedido.projeto
        )}
      </td>

      <td>
        ${dataConcluido}
      </td>

      <td>
        <span
          class="
            status
            status-concluido
          "
        >
          Concluído
        </span>
      </td>

      <td>

        <button
          type="button"
          class="details-button"
          data-id="${pedido.id}"
        >
          Pedido detalhado
        </button>

      </td>

    `;


    concluidosBody.appendChild(
      tr
    );

  }


  aplicarFiltroConcluidos();

}


/* =========================================================
   FILTRO CONCLUÍDOS
========================================================= */

function aplicarFiltroConcluidos() {

  const campo =
    document.getElementById(
      "filtroConcluidosBusca"
    );


  if (!campo) {
    return;
  }


  const busca =
    campo
      .value
      .trim()
      .toLowerCase();


  const linhas =
    document.querySelectorAll(
      "#concluidosBody tr"
    );


  linhas.forEach(
    (linha, index) => {

      const pedido =
        concluidosCarregados[
          index
        ];


      if (!pedido) {

        linha.style.display =
          "none";

        return;
      }


      const cliente =
        (
          pedido.cliente_nome ||
          ""
        )
          .toLowerCase();


      const titulo =
        (
          pedido.titulo ||
          ""
        )
          .toLowerCase();


      const projeto =
        (
          pedido.projeto ||
          ""
        )
          .toLowerCase();


      const encontrou =
        cliente.includes(busca)
        ||
        titulo.includes(busca)
        ||
        projeto.includes(busca);


      linha.style.display =
        encontrou
          ? ""
          : "none";

    }
  );


  const algumaVisivel =
    Array
      .from(linhas)
      .some(
        linha =>
          linha.style.display !==
          "none"
      );


  const vazio =
    document.getElementById(
      "concluidosEmpty"
    );


  if (
    vazio &&
    concluidosCarregados.length > 0
  ) {

    vazio.style.display =
      algumaVisivel
        ? "none"
        : "block";


    if (!algumaVisivel) {

      vazio.textContent =
        "Nenhum pedido concluído encontrado.";
    }

  }

}


const filtroConcluidosBusca =
  document.getElementById(
    "filtroConcluidosBusca"
  );


if (filtroConcluidosBusca) {

  filtroConcluidosBusca
    .addEventListener(
      "input",
      aplicarFiltroConcluidos
    );

}


/* =========================================================
   CLIENTES
========================================================= */

async function carregarClientesAdmin() {

  const container =
    document.getElementById(
      "adminClientesLista"
    );

  container.innerHTML = `
    <div class="clientes-loading">
      Carregando clientes...
    </div>
  `;


  const {
    data: clientes,
    error
  } =
    await supabaseClient
      .from("clientes")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Erro ao carregar clientes:",
      error
    );

    container.innerHTML = `
      <div class="clientes-empty">
        Erro ao carregar clientes.
      </div>
    `;

    return;
  }


  if (
    !clientes ||
    clientes.length === 0
  ) {

    container.innerHTML = `
      <div class="clientes-empty">
        Nenhum cliente cadastrado.
      </div>
    `;

    return;
  }


  container.innerHTML = "";

  clientesCarregados = [];


  for (
    const cliente of clientes
  ) {

    const {
      data: pedidos
    } =
      await supabaseClient
        .from("pedidos")
        .select(
          "id, status"
        )
        .eq(
          "user_id",
          cliente.user_id
        );


    const totalPedidos =
      pedidos?.length || 0;


    const emAndamento =
      pedidos?.filter(
        pedido =>
          pedido.status ===
          "em_andamento"
      ).length || 0;


    const concluidos =
      pedidos?.filter(
        pedido =>
          pedido.status ===
          "concluido"
      ).length || 0;


    clientesCarregados.push({
      ...cliente,

      total_pedidos:
        totalPedidos,

      em_andamento:
        emAndamento,

      concluidos:
        concluidos
    });


    const card =
      document.createElement(
        "button"
      );


    card.type =
      "button";


    card.className =
      "admin-cliente-card";


    card.dataset.userId =
      cliente.user_id;


    card.innerHTML = `

      <div class="admin-cliente-main">

        <div class="admin-cliente-avatar">
          ${escapeHtml(
            (
              cliente.nome ||
              "C"
            )
              .charAt(0)
              .toUpperCase()
          )}
        </div>


        <div>

          <strong>
            ${escapeHtml(
              cliente.nome ||
              "Cliente"
            )}
          </strong>

          <span>
            ${escapeHtml(
              cliente.projeto ||
              "Sem projeto definido"
            )}
          </span>

        </div>

      </div>


      <div class="admin-cliente-stats">

        <div>
          <span>Pedidos</span>
          <strong>
            ${totalPedidos}
          </strong>
        </div>

        <div>
          <span>Em andamento</span>
          <strong>
            ${emAndamento}
          </strong>
        </div>

        <div>
          <span>Concluídos</span>
          <strong>
            ${concluidos}
          </strong>
        </div>

      </div>


      <div class="admin-cliente-arrow">
        ›
      </div>

    `;


    container.appendChild(
      card
    );

  }


  aplicarFiltroClientes();

}


/* =========================================================
   FILTRO DE CLIENTES
========================================================= */

function aplicarFiltroClientes() {

  const busca =
    document
      .getElementById(
        "filtroClientesBusca"
      )
      .value
      .trim()
      .toLowerCase();


  const cards =
    document
      .querySelectorAll(
        "#adminClientesLista .admin-cliente-card"
      );


  cards.forEach(
    (card, index) => {

      const cliente =
        clientesCarregados[
          index
        ];


      if (!cliente) {

        card.style.display =
          "none";

        return;
      }


      const nome =
        (
          cliente.nome ||
          ""
        )
          .toLowerCase();


      const projeto =
        (
          cliente.projeto ||
          ""
        )
          .toLowerCase();


      const encontrou =
        nome.includes(
          busca
        )
        ||
        projeto.includes(
          busca
        );


      card.style.display =
        encontrou
          ? ""
          : "none";

    }
  );


  const algumaVisivel =
    Array
      .from(cards)
      .some(
        card =>
          card.style.display !==
          "none"
      );


  let mensagem =
    document.getElementById(
      "clientesFiltroEmpty"
    );


  if (!mensagem) {

    mensagem =
      document.createElement(
        "div"
      );


    mensagem.id =
      "clientesFiltroEmpty";


    mensagem.className =
      "clientes-empty";


    mensagem.textContent =
      "Nenhum cliente encontrado.";


    document
      .getElementById(
        "adminClientesLista"
      )
      .appendChild(
        mensagem
      );

  }


  mensagem.style.display =
    clientesCarregados.length > 0
    &&
    !algumaVisivel
      ? "block"
      : "none";

}


const filtroClientesBusca =
  document.getElementById(
    "filtroClientesBusca"
  );


if (filtroClientesBusca) {

  filtroClientesBusca
    .addEventListener(
      "input",
      aplicarFiltroClientes
    );

}


/* =========================================================
   PERFIL DO CLIENTE
========================================================= */

async function abrirPerfilCliente(
  userId
) {

  const lista =
    document.getElementById(
      "adminClientesLista"
    );


  const perfil =
    document.getElementById(
      "adminClientePerfil"
    );


  const {
    data: cliente,
    error: erroCliente
  } =
    await supabaseClient
      .from("clientes")
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .single();


  if (
    erroCliente ||
    !cliente
  ) {

    console.error(
      "Erro ao carregar cliente:",
      erroCliente
    );

    mostrarToast(
      "Não foi possível carregar o cliente.",
      "error"
    );

    return;
  }


  const {
    data: pedidos,
    error: erroPedidos
  } =
    await supabaseClient
      .from("pedidos")
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (erroPedidos) {

    console.error(
      "Erro ao carregar pedidos:",
      erroPedidos
    );

    return;
  }


  const listaPedidos =
    pedidos || [];


  const pendentes =
    listaPedidos.filter(
      pedido =>
        pedido.status ===
        "pendente"
    ).length;


  const andamento =
    listaPedidos.filter(
      pedido =>
        pedido.status ===
        "em_andamento"
    ).length;


  const concluidos =
    listaPedidos.filter(
      pedido =>
        pedido.status ===
        "concluido"
    ).length;


  document
    .getElementById(
      "clientePerfilNome"
    )
    .textContent =
      cliente.nome ||
      "Cliente";


  document
    .getElementById(
      "clientePerfilProjeto"
    )
    .textContent =
      cliente.projeto ||
      "Sem projeto definido";


  document
    .getElementById(
      "clientePerfilAvatar"
    )
    .textContent =
      (
        cliente.nome ||
        "C"
      )
        .charAt(0)
        .toUpperCase();


  document
    .getElementById(
      "clientePerfilTotalPedidos"
    )
    .textContent =
      listaPedidos.length;


  document
    .getElementById(
      "clientePerfilPendentes"
    )
    .textContent =
      pendentes;


  document
    .getElementById(
      "clientePerfilAndamento"
    )
    .textContent =
      andamento;


  document
    .getElementById(
      "clientePerfilConcluidos"
    )
    .textContent =
      concluidos;


  const historico =
    document.getElementById(
      "clienteHistoricoLista"
    );


  historico.innerHTML =
    "";


  if (
    listaPedidos.length === 0
  ) {

    historico.innerHTML = `
      <div
        style="
          padding:25px;
          color:#7f899f;
          text-align:center;
        "
      >
        Este cliente ainda não possui pedidos.
      </div>
    `;

  }
  else {

    for (
      const pedido of listaPedidos
    ) {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "cliente-historico-item";


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


      const data =
        new Date(
          pedido.created_at
        )
          .toLocaleString(
            "pt-BR"
          );


      item.innerHTML = `

        <div class="cliente-historico-info">

          <strong>
            ${escapeHtml(
              pedido.titulo
            )}
          </strong>

          <span>
            ${data}
          </span>

        </div>


        <div class="cliente-historico-projeto">

          ${escapeHtml(
            pedido.projeto
          )}

        </div>


        <div>

          <span
            class="
              status
              ${statusClasse}
            "
          >
            ${statusTexto}
          </span>

        </div>


        <div>

          <button
            type="button"
            class="cliente-historico-acao"
            data-pedido-id="${pedido.id}"
          >
            Ver pedido
          </button>

        </div>

      `;


      historico.appendChild(
        item
      );

    }

  }


  lista.style.display =
    "none";


  perfil.style.display =
    "block";

}


/* =========================================================
   CLIQUE NO CLIENTE
========================================================= */

const adminClientesLista =
  document.getElementById(
    "adminClientesLista"
  );


if (adminClientesLista) {

  adminClientesLista
    .addEventListener(
      "click",
      event => {

        const card =
          event.target.closest(
            ".admin-cliente-card"
          );


        if (!card) {
          return;
        }


        abrirPerfilCliente(
          card.dataset.userId
        );

      }
    );

}


/* =========================================================
   VOLTAR PARA CLIENTES
========================================================= */

const voltarClientes =
  document.getElementById(
    "voltarClientes"
  );


if (voltarClientes) {

  voltarClientes
    .addEventListener(
      "click",
      () => {

        document
          .getElementById(
            "adminClientePerfil"
          )
          .style.display =
            "none";


        document
          .getElementById(
            "adminClientesLista"
          )
          .style.display =
            "grid";

      }
    );

}


/* =========================================================
   HISTÓRICO DO CLIENTE
========================================================= */

const clienteHistoricoLista =
  document.getElementById(
    "clienteHistoricoLista"
  );


if (clienteHistoricoLista) {

  clienteHistoricoLista
    .addEventListener(
      "click",
      event => {

        const botao =
          event.target.closest(
            ".cliente-historico-acao"
          );


        if (!botao) {
          return;
        }


        abrirPedidoDetalhado(
          Number(
            botao.dataset.pedidoId
          )
        );

      }
    );

}


/* =========================================================
   CLIQUES NOS PEDIDOS
========================================================= */

document
  .getElementById("pedidosBody")
  .addEventListener(
    "click",
    event => {

      const botao =
        event.target.closest(
          ".details-button"
        );

      if (!botao) {
        return;
      }

      abrirPedidoDetalhado(
        Number(
          botao.dataset.id
        )
      );

    }
  );


document
  .getElementById("andamentoBody")
  .addEventListener(
    "click",
    event => {

      const botao =
        event.target.closest(
          ".details-button"
        );

      if (!botao) {
        return;
      }

      abrirPedidoDetalhado(
        Number(
          botao.dataset.id
        )
      );

    }
  );


document
  .getElementById("concluidosBody")
  .addEventListener(
    "click",
    event => {

      const botao =
        event.target.closest(
          ".details-button"
        );

      if (!botao) {
        return;
      }

      abrirPedidoDetalhado(
        Number(
          botao.dataset.id
        )
      );

    }
  );


/* =========================================================
   FUNÇÃO DE SEGURANÇA PARA TEXTO
========================================================= */

function escapeHtml(
  texto
) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    texto ?? "";

  return div.innerHTML;
}


/* =========================================================
   MODAL PEDIDO DETALHADO
========================================================= */

async function abrirPedidoDetalhado(
  id
) {

  const {
    data: pedido,
    error
  } =
    await supabaseClient
      .from("pedidos")
      .select("*")
      .eq(
        "id",
        id
      )
      .single();


  if (
    error ||
    !pedido
  ) {

    mostrarToast(
      "Não foi possível carregar o pedido.",
      "error"
    );

    return;
  }


  pedidoAtual =
    pedido;


  const {
    data: cliente
  } =
    await supabaseClient
      .from("clientes")
      .select("nome")
      .eq(
        "user_id",
        pedido.user_id
      )
      .single();


  document
    .getElementById(
      "modalTitulo"
    )
    .textContent =
      pedido.titulo;


  document
    .getElementById(
      "modalCliente"
    )
    .textContent =
      cliente?.nome ||
      "Cliente";


  document
    .getElementById(
      "modalProjeto"
    )
    .textContent =
      pedido.projeto;


  document
    .getElementById(
      "modalData"
    )
    .textContent =
      new Date(
        pedido.created_at
      )
        .toLocaleString(
          "pt-BR"
        );


  document
    .getElementById(
      "modalDescricao"
    )
    .textContent =
      pedido.descricao;


  document
    .getElementById(
      "modalStatus"
    )
    .textContent =
      formatarStatus(
        pedido.status
      );


  if (
    pedido.status ===
    "concluido"
  ) {

    await carregarEntregaDoPedido(
      pedido.id
    );

  }
  else {

    document
      .getElementById(
        "pedidoEntregaAdmin"
      )
      .style.display =
        "none";

  }


  const modalLink =
    document.getElementById(
      "modalLink"
    );


  if (pedido.link) {

    modalLink.innerHTML = `
      <a
        href="${escapeHtml(
          pedido.link
        )}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir link enviado
      </a>
    `;

  }
  else {

    modalLink.textContent =
      "Nenhum link enviado.";

  }


  await carregarAnexosDoPedido(
    pedido.id
  );


  const iniciarButton =
    document.getElementById(
      "iniciarAtendimentoButton"
    );


  const concluirButton =
    document.getElementById(
      "concluirPedidoButton"
    );


  if (
    pedido.status ===
    "pendente"
  ) {

    iniciarButton.style.display =
      "inline-block";

    concluirButton.style.display =
      "none";

  }
  else if (
    pedido.status ===
    "em_andamento"
  ) {

    iniciarButton.style.display =
      "none";

    concluirButton.style.display =
      "inline-block";

  }
  else {

    iniciarButton.style.display =
      "none";

    concluirButton.style.display =
      "none";

  }


  document
    .getElementById(
      "pedidoModal"
    )
    .classList
    .add("visible");

}


/* =========================================================
   FECHAR MODAL DO PEDIDO
========================================================= */

function fecharPedidoModal() {

  const modal =
    document.getElementById(
      "pedidoModal"
    );


  modal.classList.remove(
    "visible"
  );


  pedidoAtual =
    null;

}


const pedidoModalClose =
  document.getElementById(
    "pedidoModalClose"
  );


if (pedidoModalClose) {

  pedidoModalClose
    .addEventListener(
      "click",
      fecharPedidoModal
    );

}


const pedidoModal =
  document.getElementById(
    "pedidoModal"
  );


if (pedidoModal) {

  pedidoModal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        pedidoModal
      ) {

        fecharPedidoModal();

      }

    }
  );

}


/* =========================================================
   ANEXOS DO PEDIDO
========================================================= */

async function carregarAnexosDoPedido(
  pedidoId
) {

  const container =
    document.getElementById(
      "modalAnexos"
    );


  container.innerHTML =
    "";


  const {
    data: anexos,
    error
  } =
    await supabaseClient
      .from("pedido_anexos")
      .select("*")
      .eq(
        "pedido_id",
        pedidoId
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Erro ao carregar anexos:",
      error
    );

    container.innerHTML = `
      <span>
        Não foi possível carregar os anexos.
      </span>
    `;

    return;
  }


  if (
    !anexos ||
    anexos.length === 0  ) {

    container.innerHTML = `
      <span>
        Nenhum anexo enviado.
      </span>
    `;

    return;
  }


  for (
    const anexo of anexos
  ) {

    const item =
      document.createElement(
        "div"
      );


    item.className =
      "modal-anexo-item";


    const {
      data: signedData,
      error: signedError
    } =
      await supabaseClient
        .storage
        .from(
          "pedido-anexos"
        )
        .createSignedUrl(
          anexo.storage_path,
          3600
        );


    if (
      signedError ||
      !signedData?.signedUrl
    ) {

      item.innerHTML = `
        <span>
          ${escapeHtml(
            anexo.nome_arquivo ||
            "Arquivo"
          )}
        </span>

        <small>
          Não foi possível abrir
        </small>
      `;

    }
    else {

      item.innerHTML = `
        <a
          href="${escapeHtml(
            signedData.signedUrl
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHtml(
            anexo.nome_arquivo ||
            "Abrir arquivo"
          )}
        </a>
      `;

    }


    container.appendChild(
      item
    );

  }

}


/* =========================================================
   ABRIR MODAL DE CONCLUSÃO
========================================================= */

const concluirPedidoButton =
  document.getElementById(
    "concluirPedidoButton"
  );


if (
  concluirPedidoButton
) {

  concluirPedidoButton
    .addEventListener(
      "click",
      () => {

        if (!pedidoAtual) {
          return;
        }


        document
          .getElementById(
            "entregaTitulo"
          )
          .value =
            pedidoAtual.titulo ||
            "";


        document
          .getElementById(
            "entregaDescricao"
          )
          .value =
            "";


        document
          .getElementById(
            "entregaLink"
          )
          .value =
            "";


        arquivosEntregaSelecionados =
          [];


        atualizarListaArquivosEntrega();


        document
          .getElementById(
            "entregaModal"
          )
          .classList
          .add("active");

      }
    );

}


/* =========================================================
   FECHAR MODAL DE ENTREGA
========================================================= */

function fecharEntregaModal() {

  document
    .getElementById(
      "entregaModal"
    )
    .classList
    .remove(
      "visible"
    );


  arquivosEntregaSelecionados =
    [];


  atualizarListaArquivosEntrega();

}


const entregaModalClose =
  document.getElementById(
    "entregaModalClose"
  );


if (entregaModalClose) {

  entregaModalClose
    .addEventListener(
      "click",
      fecharEntregaModal
    );

}


const cancelarEntregaButton =
  document.getElementById(
    "cancelarEntregaButton"
  );


if (cancelarEntregaButton) {

  cancelarEntregaButton
    .addEventListener(
      "click",
      fecharEntregaModal
    );

}


/* =========================================================
   ARQUIVOS DA ENTREGA
========================================================= */

const entregaArquivosInput =
  document.getElementById(
    "entregaArquivos"
  );


if (entregaArquivosInput) {

  entregaArquivosInput
    .addEventListener(
      "change",
      event => {

        arquivosEntregaSelecionados =
          Array.from(
            event.target.files ||
            []
          );


        atualizarListaArquivosEntrega();

      }
    );

}


function atualizarListaArquivosEntrega() {

  const container =
    document.getElementById(
      "entregaArquivosLista"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  if (
    arquivosEntregaSelecionados.length ===
    0
  ) {

    container.innerHTML = `
      <span class="entrega-sem-arquivos">
        Nenhum arquivo selecionado.
      </span>
    `;

    return;
  }


  arquivosEntregaSelecionados.forEach(
    arquivo => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "entrega-arquivo-item";


      item.textContent =
        arquivo.name;


      container.appendChild(
        item
      );

    }
  );

}

/* =========================================================
   TOASTS
========================================================= */

function mostrarToast(
  mensagem,
  tipo = "success"
) {

  const container =
    document.getElementById(
      "toastContainer"
    );

  const toast =
    document.createElement(
      "div"
    );

  toast.className =
    `toast ${tipo}`;


  let icone =
    "✓";


  if (
    tipo === "error"
  ) {
    icone = "✕";
  }


  if (
    tipo === "warning"
  ) {
    icone = "⚠";
  }


  toast.innerHTML = `
    <span class="toast-icon">
      ${icone}
    </span>

    <span class="toast-text">
      ${escapeHtml(
        mensagem
      )}
    </span>
  `;


  container.appendChild(
    toast
  );


  setTimeout(
    () => {

      toast.style.opacity =
        "0";

      toast.style.transform =
        "translateX(20px)";

      toast.style.transition =
        "0.2s";


      setTimeout(
        () => {
          toast.remove();
        },
        200
      );

    },
    3500
  );

}


/* =========================================================
   NAVEGAÇÃO DO ADMIN
========================================================= */

document
  .querySelectorAll(
    ".admin-menu-item"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const section =
            button.dataset.adminSection;


          document
            .querySelectorAll(
              ".admin-menu-item"
            )
            .forEach(
              item => {
                item.classList.remove(
                  "active"
                );
              }
            );


          document
            .querySelectorAll(
              ".admin-section"
            )
            .forEach(
              item => {
                item.classList.remove(
                  "active"
                );
              }
            );


          button.classList.add(
            "active"
          );


          document
            .getElementById(
              `admin-section-${section}`
            )
            .classList.add(
              "active"
            );

        }
      );

    }
  );


/* =========================================================
   VISÃO GERAL
========================================================= */

async function carregarVisaoGeral() {

  const {
    data: pedidos,
    error
  } =
    await supabaseClient
      .from("pedidos")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      error
    );

    return;
  }


  const lista =
    pedidos || [];


  document
    .getElementById(
      "adminTotalPendentes"
    )
    .textContent =
      lista.filter(
        pedido =>
          pedido.status ===
          "pendente"
      ).length;


  document
    .getElementById(
      "adminTotalAndamento"
    )
    .textContent =
      lista.filter(
        pedido =>
          pedido.status ===
          "em_andamento"
      ).length;


  document
    .getElementById(
      "adminTotalConcluidos"
    )
    .textContent =
      lista.filter(
        pedido =>
          pedido.status ===
          "concluido"
      ).length;


  const {
    count: totalClientes
  } =
    await supabaseClient
      .from("clientes")
      .select(
        "*",
        {
          count: "exact",
          head: true
        }
      );


  document
    .getElementById(
      "adminTotalClientes"
    )
    .textContent =
      totalClientes || 0;


  const ultimos =
    lista.slice(
      0,
      5
    );


  const container =
    document.getElementById(
      "adminUltimosPedidos"
    );


  container.innerHTML =
    "";


  if (
    ultimos.length === 0
  ) {

    container.innerHTML = `
      <div class="empty">
        Nenhum pedido recebido ainda.
      </div>
    `;

    return;
  }


  for (
    const pedido of ultimos
  ) {

    const {
      data: cliente
    } =
      await supabaseClient
        .from("clientes")
        .select("nome")
        .eq(
          "user_id",
          pedido.user_id
        )
        .single();


    const item =
      document.createElement(
        "div"
      );


    item.className =
      "anexo-item";


    item.innerHTML = `

      <div>

        <strong>
          ${escapeHtml(
            pedido.titulo
          )}
        </strong>

        <div
          style="
            margin-top:4px;
            color:#7f899f;
            font-size:12px;
          "
        >

          ${escapeHtml(
            cliente?.nome ||
            "Cliente"
          )}

          ·

          ${new Date(
            pedido.created_at
          ).toLocaleString(
            "pt-BR"
          )}

        </div>

      </div>

      <span
        class="
          status
          status-${pedido.status}
        "
      >
        ${formatarStatus(
          pedido.status
        )}
      </span>

    `;


    container.appendChild(
      item
    );

  }


  /* =======================================================
     ATIVIDADE RECENTE
  ======================================================= */

  await carregarAtividadeRecente();

}


/*
  Nas partes anteriores usamos esse nome.
  Ele simplesmente chama a função original.
*/
async function atualizarVisaoGeral() {

  await carregarVisaoGeral();

}


/* =========================================================
   REALTIME ADMIN
========================================================= */

function iniciarRealtimeAdmin() {

  if (
    realtimeAdminPedidos
  ) {

    supabaseClient
      .removeChannel(
        realtimeAdminPedidos
      );

  }


  realtimeAdminPedidos =
    supabaseClient
      .channel(
        "admin-pedidos"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos"
        },
        async payload => {

          console.log(
            "Pedido atualizado no admin:",
            payload
          );


          const tipoEvento =
            payload.eventType;


          if (
            tipoEvento === "INSERT"
          ) {

            const novoPedido =
              payload.new;


            const notificacoesAtivas =
              localStorage.getItem(
                "shiro_admin_notification_pedidos"
              );


            const somAtivo =
              localStorage.getItem(
                "shiro_admin_notification_sound"
              );


            const deveNotificar =
              notificacoesAtivas === null
                ? true
                : notificacoesAtivas === "true";


            const deveTocarSom =
              somAtivo === null
                ? true
                : somAtivo === "true";


            /* BUSCAR NOME DO CLIENTE */

            let nomeCliente =
              "Cliente";


            if (novoPedido?.user_id) {

              const {
                data: cliente
              } =
                await supabaseClient
                  .from("clientes")
                  .select("nome")
                  .eq(
                    "user_id",
                    novoPedido.user_id
                  )
                  .maybeSingle();


              if (cliente?.nome) {

                nomeCliente =
                  cliente.nome;

              }

            }


            /* MOSTRAR NOTIFICAÇÃO */

            if (deveNotificar) {

              mostrarNotificacaoPedidoAdmin(
                novoPedido,
                nomeCliente
              );

            }


            /* SOM */

            if (
              deveNotificar &&
              deveTocarSom
            ) {

              try {

                const audio =
                  new Audio(
                    "assets/audio/notificacao.mp3"
                  );


                audio.volume =
                  0.7;


                await audio.play();

              }
              catch (error) {

                console.warn(
                  "Não foi possível reproduzir o som:",
                  error
                );

              }

            }

          }


          await carregarPendencias();

          await carregarEmAndamento();

          await carregarConcluidos();

          await carregarVisaoGeral();

          await carregarClientesAdmin();

        }
      )
      .subscribe();

}


/* =========================================================
   ALIAS ABRIR PEDIDO
========================================================= */

function abrirPedido(
  id
) {

  return abrirPedidoDetalhado(
    id
  );

}


/* =========================================================
   FORMATAR STATUS
========================================================= */

function formatarStatus(
  status
) {

  if (
    status === "pendente"
  ) {
    return "Pendente";
  }


  if (
    status === "em_andamento"
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


/* =========================================================
   CARREGAR ENTREGA CONCLUÍDA
========================================================= */

async function carregarEntregaDoPedido(
  pedidoId
) {

  const areaEntrega =
    document.getElementById(
      "pedidoEntregaAdmin"
    );


  areaEntrega.style.display =
    "none";


  const {
    data: entrega,
    error
  } =
    await supabaseClient
      .from("entregas")
      .select("*")
      .eq(
        "pedido_id",
        pedidoId
      )
      .maybeSingle();


  if (error) {

    console.error(
      "Erro ao carregar entrega:",
      error
    );

    return;
  }


  if (!entrega) {
    return;
  }


  document
    .getElementById(
      "adminEntregaTitulo"
    )
    .textContent =
      entrega.titulo;


  document
    .getElementById(
      "adminEntregaDescricao"
    )
    .textContent =
      entrega.descricao;


  document
    .getElementById(
      "adminEntregaData"
    )
    .textContent =
      new Date(
        entrega.created_at
      )
        .toLocaleString(
          "pt-BR"
        );


  const linkContainer =
    document.getElementById(
      "adminEntregaLink"
    );


  if (entrega.link) {

    linkContainer.innerHTML =
      "";


    const link =
      document.createElement(
        "a"
      );


    link.href =
      entrega.link;

    link.target =
      "_blank";

    link.rel =
      "noopener noreferrer";

    link.textContent =
      "Abrir link enviado";


    linkContainer.appendChild(
      link
    );

  }
  else {

    linkContainer.textContent =
      "Nenhum link enviado.";

  }


  await carregarAnexosEntregaAdmin(
    entrega.id
  );


  areaEntrega.style.display =
    "block";

}


/* =========================================================
   ANEXOS DA ENTREGA
========================================================= */

async function carregarAnexosEntregaAdmin(
  entregaId
) {

  const container =
    document.getElementById(
      "adminEntregaAnexos"
    );


  container.textContent =
    "Carregando anexos...";


  const {
    data: anexos,
    error
  } =
    await supabaseClient
      .from(
        "entrega_anexos"
      )
      .select("*")
      .eq(
        "entrega_id",
        entregaId
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      error
    );


    container.textContent =
      "Não foi possível carregar os anexos.";

    return;
  }


  if (
    !anexos ||
    anexos.length === 0
  ) {

    container.textContent =
      "Nenhum anexo enviado.";

    return;
  }


  container.innerHTML =
    "";


  for (
    const anexo of anexos
  ) {

    const {
      data: signedData,
      error: signedError
    } =
      await supabaseClient
        .storage
        .from(
          "entrega-anexos"
        )
        .createSignedUrl(
          anexo.arquivo_path,
          3600
        );


    const item =
      document.createElement(
        "div"
      );


    item.className =
      "admin-entrega-anexo";


    const nome =
      document.createElement(
        "span"
      );


    nome.textContent =
      anexo.nome_arquivo;


    const botao =
      document.createElement(
        "button"
      );


    botao.type =
      "button";


    if (
      signedError ||
      !signedData?.signedUrl
    ) {

      botao.textContent =
        "Indisponível";


      botao.disabled =
        true;

    }
    else {

      botao.textContent =
        "Visualizar";


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

    }


    item.appendChild(
      nome
    );


    item.appendChild(
      botao
    );


    container.appendChild(
      item
    );

  }

}


/* =========================================================
   ENVIAR ENTREGA
========================================================= */

async function enviarEntrega() {

  if (!pedidoAtual) {

    mostrarToast(
      "Nenhum pedido selecionado.",
      "error"
    );

    return;
  }


  const titulo =
    document
      .getElementById(
        "entregaTitulo"
      )
      .value
      .trim();


  const descricao =
    document
      .getElementById(
        "entregaDescricao"
      )
      .value
      .trim();


  const link =
    document
      .getElementById(
        "entregaLink"
      )
      .value
      .trim();


  if (!titulo) {

    mostrarToast(
      "Digite o título da entrega.",
      "warning"
    );

    return;
  }


  if (!descricao) {

    mostrarToast(
      "Digite a descrição da entrega.",
      "warning"
    );

    return;
  }


  const botao =
    document.getElementById(
      "enviarEntregaButton"
    );


  botao.disabled =
    true;


  botao.textContent =
    "Enviando...";


  try {

    const {
      data: entrega,
      error: entregaError
    } =
      await supabaseClient
        .from("entregas")
        .insert({
          pedido_id:
            pedidoAtual.id,

          user_id:
            pedidoAtual.user_id,

          titulo,

          descricao,

          link:
            link || null
        })
        .select()
        .single();


    if (entregaError) {

      if (
        entregaError.code ===
        "23505"
      ) {

        mostrarToast(
          "Este pedido já possui uma entrega.",
          "warning"
        );

        fecharEntregaModal();

        return;

      }


      throw entregaError;

    }


    for (
      const arquivo
      of arquivosEntregaSelecionados
    ) {

      const nomeSeguro =
        arquivo.name
          .normalize(
            "NFD"
          )
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );


      const caminho =
        `${pedidoAtual.user_id}/${entrega.id}/${Date.now()}-${nomeSeguro}`;


      const {
        error: uploadError
      } =
        await supabaseClient
          .storage
          .from(
            "entrega-anexos"
          )
          .upload(
            caminho,
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
            "entrega_anexos"
          )
          .insert({

            entrega_id:
              entrega.id,

            user_id:
              pedidoAtual.user_id,

            nome_arquivo:
              arquivo.name,

            tipo_arquivo:
              arquivo.type ||
              "arquivo",

            arquivo_path:
              caminho

          });


      if (anexoError) {
        throw anexoError;
      }

    }


    const {
      error: pedidoError
    } =
      await supabaseClient
        .from("pedidos")
        .update({

          status:
            "concluido",

          concluido_at:
            new Date()
              .toISOString(),

          updated_at:
            new Date()
              .toISOString()

        })
        .eq(
          "id",
          pedidoAtual.id
        );


    if (pedidoError) {
      throw pedidoError;
    }


    mostrarToast(
      "Entrega enviada com sucesso!",
      "success"
    );


    document
      .getElementById(
        "entregaTitulo"
      )
      .value =
        "";


    document
      .getElementById(
        "entregaDescricao"
      )
      .value =
        "";


    document
      .getElementById(
        "entregaLink"
      )
      .value =
        "";


    arquivosEntregaSelecionados =
      [];


    atualizarListaArquivosEntrega();


    fecharEntregaModal();


    pedidoAtual =
      null;


    await carregarPendencias();

    await carregarEmAndamento();

    await carregarConcluidos();

    await carregarClientesAdmin();

    await carregarVisaoGeral();

  }
  catch (error) {

    console.error(
      "Erro ao enviar entrega:",
      error
    );


    mostrarToast(
      "Erro ao enviar entrega: " +
      (
        error.message ||
        "erro desconhecido"
      ),
      "error"
    );

  }
  finally {

    botao.disabled =
      false;


    botao.textContent =
      "Enviar entrega";

  }

}


const enviarEntregaButton =
  document.getElementById(
    "enviarEntregaButton"
  );


if (enviarEntregaButton) {

  enviarEntregaButton
    .addEventListener(
      "click",
      enviarEntrega
    );

}


/* =========================================================
   LOGOUT
========================================================= */

const logoutButton =
  document.getElementById(
    "logoutButton"
  );


if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async () => {

      if (
        realtimeAdminPedidos
      ) {

        supabaseClient
          .removeChannel(
            realtimeAdminPedidos
          );

      }


      await supabaseClient
        .auth
        .signOut();


      window.location.href =
        "index.html";

    }
  );

}


/* =========================================================
   AÇÕES DO MODAL DE PEDIDO
========================================================= */

document.addEventListener(
  "click",
  async event => {

    const iniciar =
      event.target.closest(
        "#iniciarAtendimentoButton"
      );

    if (iniciar) {

      if (!pedidoAtual) {
        return;
      }

      iniciar.disabled = true;
      iniciar.textContent =
        "Iniciando...";

      try {

        const {
          error
        } =
          await supabaseClient
            .from("pedidos")
            .update({
              status:
                "em_andamento",

              updated_at:
                new Date()
                  .toISOString()
            })
            .eq(
              "id",
              pedidoAtual.id
            );


        if (error) {
          throw error;
        }


        mostrarToast(
          "Pedido movido para Em andamento.",
          "success"
        );


        fecharPedidoModal();


        await carregarPendencias();

        await carregarEmAndamento();

        await carregarConcluidos();

        await carregarClientesAdmin();

        await carregarVisaoGeral();

      }
      catch (error) {

        console.error(
          "Erro ao iniciar atendimento:",
          error
        );


        mostrarToast(
          "Não foi possível iniciar o atendimento.",
          "error"
        );

      }
      finally {

        iniciar.disabled =
          false;

        iniciar.textContent =
          "Iniciar atendimento";

      }

      return;
    }


    const concluir =
      event.target.closest(
        "#concluirPedidoButton"
      );

    if (concluir) {

      if (!pedidoAtual) {
        return;
      }


      document
        .getElementById(
          "pedidoModal"
        )
        .classList
        .remove(
          "visible"
        );


      document
        .getElementById(
          "entregaTitulo"
        )
        .value =
          pedidoAtual.titulo ||
          "";


      document
        .getElementById(
          "entregaDescricao"
        )
        .value =
          "";


      document
        .getElementById(
          "entregaLink"
        )
        .value =
          "";


      arquivosEntregaSelecionados =
        [];


      atualizarListaArquivosEntrega();


      document
        .getElementById(
          "entregaModal"
        )
        .classList
        .add(
          "visible"
        );

    }

  }
);


/* =========================================================
   CORREÇÃO MODAL DE ENTREGA
========================================================= */

document.addEventListener(
  "click",
  event => {

    const fecharEntrega =
      event.target.closest(
        "#entregaModalClose"
      );

    if (fecharEntrega) {

      event.preventDefault();
      event.stopPropagation();

      document
        .getElementById(
          "entregaModal"
        )
        .classList
        .remove(
          "visible"
        );

      return;
    }

  }
);


/* =========================================================
   CONFIGURAÇÕES ADMIN
========================================================= */

const adminSettingsButton =
  document.getElementById(
    "adminSettingsButton"
  );

const adminSettingsModal =
  document.getElementById(
    "adminSettingsModal"
  );

const adminSettingsClose =
  document.getElementById(
    "adminSettingsClose"
  );


async function abrirConfiguracoesAdmin() {

  adminSettingsModal
    .classList
    .add(
      "visible"
    );


  const {
    data
  } =
    await supabaseClient
      .auth
      .getSession();


  const email =
    data.session?.user?.email ||
    "Administrador";


  document
    .getElementById(
      "adminSettingsEmail"
    )
    .textContent =
      email;


  document
    .getElementById(
      "adminAccountEmail"
    )
    .textContent =
      email;


  await carregarNomeAdmin();

}


function fecharConfiguracoesAdmin() {

  adminSettingsModal
    .classList
    .remove(
      "visible"
    );

}


if (adminSettingsButton) {

  adminSettingsButton
    .addEventListener(
      "click",
      abrirConfiguracoesAdmin
    );

}


if (adminSettingsClose) {

  adminSettingsClose
    .addEventListener(
      "click",
      fecharConfiguracoesAdmin
    );

}


if (adminSettingsModal) {

  adminSettingsModal
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          adminSettingsModal
        ) {

          fecharConfiguracoesAdmin();

        }

      }
    );

}


/* =========================================================
   NAVEGAÇÃO DAS CONFIGURAÇÕES
========================================================= */

document
  .querySelectorAll(
    ".admin-settings-nav"
  )
  .forEach(
    botao => {

      botao.addEventListener(
        "click",
        () => {

          const pagina =
            botao.dataset.settingsPage;


          document
            .querySelectorAll(
              ".admin-settings-nav"
            )
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );


          document
            .querySelectorAll(
              ".admin-settings-page"
            )
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );


          botao.classList.add(
            "active"
          );


          document
            .querySelector(
              `[data-settings-content="${pagina}"]`
            )
            ?.classList
            .add(
              "active"
            );

        }
      );

    }
  );


/* =========================================================
   DISPOSITIVOS DO ADMIN
========================================================= */

function detectarNavegadorAdmin() {

  const ua =
    navigator.userAgent;


  if (ua.includes("Edg/")) {
    return "Microsoft Edge";
  }

  if (ua.includes("Chrome/")) {
    return "Google Chrome";
  }

  if (ua.includes("Firefox/")) {
    return "Mozilla Firefox";
  }

  if (
    ua.includes("Safari/") &&
    !ua.includes("Chrome/")
  ) {
    return "Safari";
  }


  return "Navegador";
}


function detectarSistemaAdmin() {

  const ua =
    navigator.userAgent;


  if (ua.includes("Windows")) {
    return "Windows";
  }

  if (ua.includes("Android")) {
    return "Android";
  }

  if (
    ua.includes("iPhone") ||
    ua.includes("iPad")
  ) {
    return "iOS";
  }

  if (ua.includes("Mac OS")) {
    return "macOS";
  }

  if (ua.includes("Linux")) {
    return "Linux";
  }


  return "Sistema desconhecido";
}


function obterIdentificadorAdmin() {

  let identificador =
    localStorage.getItem(
      "shiro_admin_device_id"
    );


  if (!identificador) {

    identificador =
      crypto.randomUUID();


    localStorage.setItem(
      "shiro_admin_device_id",
      identificador
    );

  }


  return identificador;
}


async function registrarDispositivoAdmin() {

  const {
    data
  } =
    await supabaseClient
      .auth
      .getSession();


  const user =
    data.session?.user;


  if (!user) {
    return;
  }


  const identificador =
    obterIdentificadorAdmin();


  const navegador =
    detectarNavegadorAdmin();


  const sistema =
    detectarSistemaAdmin();


  const {
    data: existente
  } =
    await supabaseClient
      .from("dispositivos")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "identificador",
        identificador
      )
      .maybeSingle();


  if (existente) {

    await supabaseClient
      .from("dispositivos")
      .update({
        navegador,
        sistema,
        tipo:
          "Administrador",

        ultimo_acesso:
          new Date()
            .toISOString(),

        ativo:
          true
      })
      .eq(
        "id",
        existente.id
      );

  }
  else {

    await supabaseClient
      .from("dispositivos")
      .insert({
        user_id:
          user.id,

        identificador,

        navegador,

        sistema,

        tipo:
          "Administrador",

        ativo:
          true
      });

  }

}


async function carregarDispositivosAdmin() {

  const container =
    document.getElementById(
      "adminDevicesList"
    );


  if (!container) {
    return;
  }


  container.innerHTML = `
    <div class="admin-settings-placeholder">
      Carregando dispositivos...
    </div>
  `;


  const {
    data: sessionData
  } =
    await supabaseClient
      .auth
      .getSession();


  const user =
    sessionData.session?.user;


  if (!user) {
    return;
  }


  const identificadorAtual =
    obterIdentificadorAdmin();


  const {
    data: dispositivos,
    error
  } =
    await supabaseClient
      .from("dispositivos")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "ativo",
        true
      )
      .order(
        "ultimo_acesso",
        {
          ascending:
            false
        }
      );


  if (error) {

    console.error(
      "Erro ao carregar dispositivos do admin:",
      error
    );


    container.innerHTML = `
      <div class="admin-settings-placeholder">
        Não foi possível carregar os dispositivos.
      </div>
    `;

    return;
  }


  container.innerHTML =
    "";


  if (
    !dispositivos ||
    dispositivos.length === 0
  ) {

    container.innerHTML = `
      <div class="admin-settings-placeholder">
        Nenhum dispositivo encontrado.
      </div>
    `;

    return;
  }


  dispositivos.forEach(
    dispositivo => {

      const atual =
        dispositivo.identificador ===
        identificadorAtual;


      const card =
        document.createElement(
          "div"
        );


      card.className =
        "admin-device-card";


      card.innerHTML = `

        <div class="admin-device-info">

          <div class="admin-device-icon">
            ▣
          </div>

          <div class="admin-device-text">

            <strong>
              ${escapeHtml(
                dispositivo.navegador ||
                "Navegador"
              )}
            </strong>

            <span>
              ${escapeHtml(
                dispositivo.sistema ||
                "Sistema"
              )}
            </span>

            ${
              atual
                ? `
                  <span class="admin-device-current">
                    Este dispositivo
                  </span>
                `
                : ""
            }

          </div>

        </div>

        ${
          atual
            ? ""
            : `
              <button
                type="button"
                class="admin-device-remove"
                data-device-id="${dispositivo.id}"
                title="Encerrar sessão"
              >
                ×
              </button>
            `
        }

      `;


      container.appendChild(
        card
      );

    }
  );

}


async function encerrarDispositivoAdmin(
  dispositivoId
) {

  const {
    error
  } =
    await supabaseClient
      .from("dispositivos")
      .update({
        ativo:
          false
      })
      .eq(
        "id",
        dispositivoId
      );


  if (error) {

    console.error(
      error
    );


    mostrarToast(
      "Não foi possível encerrar essa sessão.",
      "error"
    );

    return;
  }


  mostrarToast(
    "Sessão encerrada.",
    "success"
  );


  await carregarDispositivosAdmin();

}


const adminDevicesList =
  document.getElementById(
    "adminDevicesList"
  );


if (adminDevicesList) {

  adminDevicesList
    .addEventListener(
      "click",
      event => {

        const botao =
          event.target.closest(
            ".admin-device-remove"
          );


        if (!botao) {
          return;
        }


        encerrarDispositivoAdmin(
          botao.dataset.deviceId
        );

      }
    );

}


/* =========================================================
   ENCERRAR OUTRAS SESSÕES
========================================================= */

const adminLogoutOthersButton =
  document.getElementById(
    "adminLogoutOthersButton"
  );


if (
  adminLogoutOthersButton
) {

  adminLogoutOthersButton
    .addEventListener(
      "click",
      async () => {

        const {
          data
        } =
          await supabaseClient
            .auth
            .getSession();


        const user =
          data.session?.user;


        if (!user) {
          return;
        }


        const identificadorAtual =
          obterIdentificadorAdmin();


        const {
          error
        } =
          await supabaseClient
            .from("dispositivos")
            .update({
              ativo:
                false
            })
            .eq(
              "user_id",
              user.id
            )
            .neq(
              "identificador",
              identificadorAtual
            );


        if (error) {

          console.error(
            error
          );


          mostrarToast(
            "Não foi possível encerrar as outras sessões.",
            "error"
          );

          return;
        }


        mostrarToast(
          "Outras sessões encerradas.",
          "success"
        );


        await carregarDispositivosAdmin();

      }
    );

}


/* =========================================================
   CARREGAR DISPOSITIVOS AO ABRIR A ABA
========================================================= */

const adminDevicesTab =
  document.querySelector(
    '[data-settings-page="dispositivos"]'
  );


let carregandoDispositivosAdmin =
  false;


if (adminDevicesTab) {

  adminDevicesTab.addEventListener(
    "click",
    async () => {

      if (
        carregandoDispositivosAdmin
      ) {
        return;
      }


      carregandoDispositivosAdmin =
        true;


      try {

        await carregarDispositivosAdmin();

      }
      finally {

        carregandoDispositivosAdmin =
          false;

      }

    }
  );

}


/* =========================================================
   PREFERÊNCIAS DE NOTIFICAÇÃO DO ADMIN
========================================================= */

const adminNotificationPedidos =
  document.getElementById(
    "adminNotificationPedidos"
  );

const adminNotificationSound =
  document.getElementById(
    "adminNotificationSound"
  );


function carregarNotificacoesAdmin() {

  const pedidos =
    localStorage.getItem(
      "shiro_admin_notification_pedidos"
    );

  const som =
    localStorage.getItem(
      "shiro_admin_notification_sound"
    );


  if (adminNotificationPedidos) {

    adminNotificationPedidos.checked =
      pedidos === null
        ? true
        : pedidos === "true";

  }


  if (adminNotificationSound) {

    adminNotificationSound.checked =
      som === null
        ? true
        : som === "true";

  }

}


if (adminNotificationPedidos) {

  adminNotificationPedidos
    .addEventListener(
      "change",
      () => {

        localStorage.setItem(
          "shiro_admin_notification_pedidos",
          String(
            adminNotificationPedidos.checked
          )
        );

      }
    );

}


if (adminNotificationSound) {

  adminNotificationSound
    .addEventListener(
      "change",
      () => {

        localStorage.setItem(
          "shiro_admin_notification_sound",
          String(
            adminNotificationSound.checked
          )
        );

      }
    );

}


carregarNotificacoesAdmin();


/* =========================================================
   NOTIFICAÇÃO DE NOVO PEDIDO
========================================================= */

function mostrarNotificacaoPedidoAdmin(
  pedido,
  nomeCliente
) {

  const container =
    document.getElementById(
      "toastContainer"
    );


  if (!container) {
    return;
  }


  const toast =
    document.createElement(
      "div"
    );


  toast.className =
    "toast admin-order-toast";


  toast.innerHTML = `

    <div class="admin-order-toast-icon">
      +
    </div>

    <div class="admin-order-toast-content">

      <strong>
        Novo pedido recebido!
      </strong>

      <span>
        ${escapeHtml(nomeCliente)}
        —
        ${escapeHtml(
          pedido?.titulo ||
          "Novo pedido"
        )}
      </span>

      <small>
        Clique para visualizar
      </small>

    </div>

  `;


  toast.addEventListener(
    "click",
    async () => {

      toast.remove();


      if (!pedido?.id) {
        return;
      }


      await abrirPedidoDetalhado(
        Number(
          pedido.id
        )
      );

    }
  );


  container.appendChild(
    toast
  );


  setTimeout(
    () => {

      if (!toast.isConnected) {
        return;
      }


      toast.classList.add(
        "toast-leaving"
      );


      setTimeout(
        () => {

          toast.remove();

        },
        250
      );

    },
    7000
  );

}


/* =========================================================
   REALTIME - DISPOSITIVOS DO ADMIN
========================================================= */

let adminDevicesRealtimeChannel = null;


function iniciarRealtimeDispositivosAdmin() {

  const identificadorAtual =
    localStorage.getItem(
      "shiro_admin_device_id"
    );


  if (!identificadorAtual) {
    return;
  }


  /* Evita criar vários canais Realtime */
  if (adminDevicesRealtimeChannel) {

    supabaseClient
      .removeChannel(
        adminDevicesRealtimeChannel
      );

  }


  adminDevicesRealtimeChannel =
    supabaseClient
      .channel(
        "admin-devices-realtime"
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dispositivos"
        },

        async payload => {

          const dispositivo =
            payload.new;


          if (!dispositivo) {
            return;
          }


          /*
           * O dispositivo atual foi
           * encerrado por outra sessão.
           */

          if (
            dispositivo.identificador ===
              identificadorAtual &&
            dispositivo.ativo === false
          ) {

            localStorage.removeItem(
              "shiro_admin_device_id"
            );


            await supabaseClient
              .auth
              .signOut({
                scope: "local"
              });


            window.location.href =
              "index.html";


            return;
          }


          /*
           * Atualiza a lista somente
           * se a aba de dispositivos
           * estiver aberta.
           */

          const paginaDispositivos =
            document.querySelector(
              '[data-settings-content="dispositivos"]'
            );


          if (
            paginaDispositivos &&
            paginaDispositivos.classList.contains(
              "active"
            )
          ) {

            await carregarDispositivosAdmin();

          }

        }
      )

      .subscribe();

}


/* =========================================================
   EDITAR NOME DO ADMIN
========================================================= */

const adminEditNameButton =
  document.getElementById(
    "adminEditNameButton"
  );

const adminEditNameModal =
  document.getElementById(
    "adminEditNameModal"
  );

const adminEditNameClose =
  document.getElementById(
    "adminEditNameClose"
  );

const adminEditNameCancel =
  document.getElementById(
    "adminEditNameCancel"
  );

const adminEditNameInput =
  document.getElementById(
    "adminEditNameInput"
  );

const adminEditNameSave =
  document.getElementById(
    "adminEditNameSave"
  );


async function carregarNomeAdmin() {

  const {
    data: {
      user
    }
  } =
    await supabaseClient
      .auth
      .getUser();


  if (!user) {
    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("admins")
      .select("nome")
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();


  if (error) {

    console.error(
      "Erro ao carregar nome do admin:",
      error
    );

    return;
  }


  const nome =
    data?.nome ||
    "Administrador";


  const nomeConta =
    document.getElementById(
      "adminAccountName"
    );


  if (nomeConta) {
    nomeConta.textContent =
      nome;
  }


  const nomeTopo =
    document.getElementById(
      "adminSettingsName"
    );


  if (nomeTopo) {
    nomeTopo.textContent =
      nome;
  }


  return nome;
}


function fecharModalNomeAdmin() {

  if (!adminEditNameModal) {
    return;
  }


  adminEditNameModal
    .classList
    .remove(
      "visible"
    );

}


if (adminEditNameButton) {

  adminEditNameButton
    .addEventListener(
      "click",
      async () => {

        const nomeAtual =
          await carregarNomeAdmin();


        if (adminEditNameInput) {

          adminEditNameInput.value =
            nomeAtual ||
            "";

        }


        adminEditNameModal
          ?.classList
          .add(
            "visible"
          );


        setTimeout(
          () => {

            adminEditNameInput
              ?.focus();

            adminEditNameInput
              ?.select();

          },
          50
        );

      }
    );

}


if (adminEditNameClose) {

  adminEditNameClose
    .addEventListener(
      "click",
      fecharModalNomeAdmin
    );

}


if (adminEditNameCancel) {

  adminEditNameCancel
    .addEventListener(
      "click",
      fecharModalNomeAdmin
    );

}


if (adminEditNameModal) {

  adminEditNameModal
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          adminEditNameModal
        ) {

          fecharModalNomeAdmin();

        }

      }
    );

}


if (adminEditNameSave) {

  adminEditNameSave
    .addEventListener(
      "click",
      async () => {

        const novoNome =
          adminEditNameInput
            ?.value
            .trim();


        if (
          !novoNome ||
          novoNome.length < 2
        ) {

          mostrarToast(
            "Digite um nome válido.",
            "error"
          );

          return;
        }


        adminEditNameSave.disabled =
          true;

        adminEditNameSave.textContent =
          "Salvando...";


        try {

          const {
            error
          } =
            await supabaseClient
              .rpc(
                "atualizar_nome_admin",
                {
                  novo_nome:
                    novoNome
                }
              );


          if (error) {
            throw error;
          }


          await carregarNomeAdmin();


          fecharModalNomeAdmin();


          mostrarToast(
            "Nome atualizado com sucesso.",
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

          adminEditNameSave.disabled =
            false;

          adminEditNameSave.textContent =
            "Salvar";

        }

      }
    );

}


if (adminEditNameInput) {

  adminEditNameInput
    .addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Enter"
        ) {

          adminEditNameSave
            ?.click();

        }

      }
    );

}


/* =========================================================
   VISÃO GERAL - ATIVIDADE RECENTE
========================================================= */

async function carregarAtividadeRecente() {

  const lista =
    document.getElementById(
      "adminRecentActivityList"
    );

  if (!lista) {
    return;
  }


  lista.innerHTML = `
    <div class="admin-recent-loading">
      Carregando atividades...
    </div>
  `;


  try {

    const {
      data: pedidos,
      error
    } =
      await supabaseClient
        .from("pedidos")
        .select("*")
        .order(
          "updated_at",
          {
            ascending: false
          }
        )
        .limit(8);


    if (error) {
      throw error;
    }


    if (
      !pedidos ||
      pedidos.length === 0
    ) {

      lista.innerHTML = `
        <div class="admin-recent-empty">
          Nenhuma atividade recente.
        </div>
      `;

      return;
    }


    lista.innerHTML = "";


    for (
      const pedido of pedidos
    ) {

      let nomeCliente =
        "Cliente";


      const {
        data: cliente
      } =
        await supabaseClient
          .from("clientes")
          .select("nome")
          .eq(
            "user_id",
            pedido.user_id
          )
          .maybeSingle();


      if (cliente?.nome) {

        nomeCliente =
          cliente.nome;

      }


      let textoAcao =
        "enviou um novo pedido";

      let simbolo =
        "+";


      if (
        pedido.status ===
        "em_andamento"
      ) {

        textoAcao =
          "teve um pedido iniciado";

        simbolo =
          "→";

      }


      if (
        pedido.status ===
        "concluido"
      ) {

        textoAcao =
          "teve um pedido concluído";

        simbolo =
          "✓";

      }


      const dataPedido =
        pedido.updated_at ||
        pedido.created_at;


      const dataFormatada =
        new Date(
          dataPedido
        ).toLocaleString(
          "pt-BR",
          {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          }
        );


      const item =
        document.createElement(
          "div"
        );


      item.className =
        "admin-recent-item";


      item.innerHTML = `

        <div class="admin-recent-icon">
          ${simbolo}
        </div>

        <div class="admin-recent-content">

          <strong>
            ${escapeHtml(
              nomeCliente
            )}
            ${textoAcao}
          </strong>

          <span>
            ${escapeHtml(
              pedido.titulo ||
              "Pedido"
            )}
          </span>

        </div>

        <div class="admin-recent-time">
          ${dataFormatada}
        </div>

      `;


      item.style.cursor =
        "pointer";


      item.addEventListener(
        "click",
        async () => {

          await abrirPedidoDetalhado(
            Number(
              pedido.id
            )
          );

        }
      );


      lista.appendChild(
        item
      );

    }

  }
  catch (error) {

    console.error(
      "Erro ao carregar atividade recente:",
      error
    );


    lista.innerHTML = `
      <div class="admin-recent-empty">
        Não foi possível carregar as atividades.
      </div>
    `;

  }

}


/* =========================================================
   BOTÃO DE ATUALIZAR ATIVIDADE RECENTE
========================================================= */

const refreshRecentActivity =
  document.getElementById(
    "refreshRecentActivity"
  );


if (refreshRecentActivity) {

  refreshRecentActivity
    .addEventListener(
      "click",
      async () => {

        await carregarAtividadeRecente();

      }
    );

}


/* =========================================================
   DETALHES DO CLIENTE
========================================================= */

const clientDetailsModal =
  document.getElementById(
    "clientDetailsModal"
  );

const clientDetailsClose =
  document.getElementById(
    "clientDetailsClose"
  );


function fecharDetalhesCliente() {

  clientDetailsModal
    ?.classList
    .remove(
      "visible"
    );

}


async function abrirDetalhesCliente(
  userId
) {

  try {

    const {
      data: cliente,
      error: clienteError
    } =
      await supabaseClient
        .from("clientes")
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();


    if (clienteError) {
      throw clienteError;
    }


    if (!cliente) {

      mostrarToast(
        "Cliente não encontrado.",
        "error"
      );

      return;
    }


    /* PEDIDOS DO CLIENTE */

    const {
      data: pedidos,
      error: pedidosError
    } =
      await supabaseClient
        .from("pedidos")
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (pedidosError) {
      throw pedidosError;
    }


    /* STATUS DA CONTA */

    let statusConta =
      "Normal";


    const {
      data: statusData
    } =
      await supabaseClient
        .from("status_contas")
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();


    if (statusData?.status) {

      const mapaStatus = {
        ok: "Normal",
        limitado: "Limitado",
        restrito: "Restrito",
        suspenso: "Suspenso"
      };


      statusConta =
        mapaStatus[
          statusData.status
        ] ||
        statusData.status;

    }


    /* CONTADORES */

    const listaPedidos =
      pedidos || [];


    const pendentes =
      listaPedidos.filter(
        pedido =>
          pedido.status ===
          "pendente"
      ).length;


    const andamento =
      listaPedidos.filter(
        pedido =>
          pedido.status ===
          "em_andamento"
      ).length;


    const concluidos =
      listaPedidos.filter(
        pedido =>
          pedido.status ===
          "concluido"
      ).length;


    /* PREENCHER CABEÇALHO */

    const nome =
      cliente.nome ||
      "Cliente";


    const avatar =
      nome
        .trim()
        .charAt(0)
        .toUpperCase();


    document.getElementById(
      "clientDetailsAvatar"
    ).textContent =
      avatar;


    document.getElementById(
      "clientDetailsName"
    ).textContent =
      nome;


    /*
     * A tabela clientes não possui
     * coluna de e-mail.
     *
     * Por enquanto mostramos o ID
     * da conta no local do e-mail.
     */

    document.getElementById(
      "clientDetailsEmail"
    ).textContent =
      `ID: ${userId}`;


    document.getElementById(
      "clientDetailsProject"
    ).textContent =
      cliente.projeto ||
      "-";


    document.getElementById(
      "clientDetailsStatusBadge"
    ).textContent =
      cliente.status ||
      "Ativo";


    document.getElementById(
      "clientDetailsAccountStatus"
    ).textContent =
      statusConta;


    /* DATA DE CADASTRO */

    const cadastro =
      cliente.created_at
        ? new Date(
            cliente.created_at
          ).toLocaleDateString(
            "pt-BR",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            }
          )
        : "-";


    document.getElementById(
      "clientDetailsCreatedAt"
    ).textContent =
      cadastro;


    /* CONTADORES */

    document.getElementById(
      "clientOrdersPending"
    ).textContent =
      pendentes;


    document.getElementById(
      "clientOrdersProgress"
    ).textContent =
      andamento;


    document.getElementById(
      "clientOrdersCompleted"
    ).textContent =
      concluidos;


    document.getElementById(
      "clientDetailsOrdersCount"
    ).textContent =
      `${listaPedidos.length} ${
        listaPedidos.length === 1
          ? "pedido"
          : "pedidos"
      }`;


    /* ÚLTIMOS PEDIDOS */

    const latestOrders =
      document.getElementById(
        "clientLatestOrders"
      );


    if (
      !listaPedidos.length
    ) {

      latestOrders.innerHTML = `
        <div class="client-latest-empty">
          Nenhum pedido encontrado.
        </div>
      `;

    }
    else {

      latestOrders.innerHTML =
        "";


      listaPedidos
        .slice(
          0,
          5
        )
        .forEach(
          pedido => {

            const item =
              document.createElement(
                "div"
              );


            item.className =
              "client-latest-order";


            const statusMap = {
              pendente: "Pendente",
              em_andamento:
                "Em andamento",
              concluido:
                "Concluído"
            };


            const data =
              pedido.created_at
                ? new Date(
                    pedido.created_at
                  ).toLocaleDateString(
                    "pt-BR"
                  )
                : "";


            item.innerHTML = `

              <div class="client-latest-order-info">

                <strong>
                  ${escapeHtml(
                    pedido.titulo ||
                    "Pedido"
                  )}
                </strong>

                <span>
                  ${data}
                </span>

              </div>

              <div class="client-latest-order-status">
                ${
                  statusMap[
                    pedido.status
                  ] ||
                  pedido.status
                }
              </div>

            `;


            item.addEventListener(
              "click",
              async () => {

                fecharDetalhesCliente();


                await abrirPedidoDetalhado(
                  Number(
                    pedido.id
                  )
                );

              }
            );


            latestOrders
              .appendChild(
                item
              );

          }
        );

    }


    clientDetailsModal
      ?.classList
      .add(
        "visible"
      );

  }
  catch (error) {

    console.error(
      "Erro ao abrir cliente:",
      error
    );


    mostrarToast(
      "Não foi possível carregar o cliente.",
      "error"
    );

  }

}


if (clientDetailsClose) {

  clientDetailsClose
    .addEventListener(
      "click",
      fecharDetalhesCliente
    );

}


if (clientDetailsModal) {

  clientDetailsModal
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          clientDetailsModal
        ) {

          fecharDetalhesCliente();

        }

      }
    );

}


/* =========================================================
   INICIALIZAÇÃO DO ADMIN
========================================================= */

verificarAdmin();